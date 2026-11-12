#!/usr/bin/env node

/**
 * Ring Spam Blocker — core logic test suite.
 *
 * The Web app (spam-blocker/index.html) is a single self-contained HTML
 * file. Its pure logic lives between the ==CORE-START== / ==CORE-END==
 * markers; this suite extracts that block and exercises it directly,
 * so the shipped code itself is what gets tested.
 *
 * Run: node tests/spam-blocker.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---------------------------------------------------------------
// Tiny standalone test framework (same style as other repo suites)
// ---------------------------------------------------------------
let testCount = 0;
let passCount = 0;
let failCount = 0;
let currentSuite = '';
const failedTests = [];

function describe(suiteName, fn) {
  currentSuite = suiteName;
  console.log(`\n📋 ${suiteName}`);
  fn();
}

function it(testName, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`  ✅ ${testName}`);
  } catch (e) {
    failCount++;
    failedTests.push(`${currentSuite} :: ${testName} :: ${e.message}`);
    console.log(`  ❌ ${testName}\n     ${e.message}`);
  }
}

// ---------------------------------------------------------------
// Load the core logic out of the shipped HTML file
// ---------------------------------------------------------------
const htmlPath = path.join(__dirname, '..', 'spam-blocker', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/\/\* ==CORE-START== \*\/([\s\S]*?)\/\* ==CORE-END== \*\//);
assert(m, 'CORE markers not found in spam-blocker/index.html');
const sandbox = {};
vm.createContext(sandbox);
const Core = vm.runInContext(m[1] + '\nRingBlockerCore;', sandbox);
const {
  normalizePhoneNumber, formatNational, canonicalPrefixRule,
  checkNumber, countReports, exportBlockList, importBlockList,
  SAMPLE_SPAM_DB
} = Core;

// Core runs in a vm realm; normalize its return values before deepStrictEqual.
const plain = (v) => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------
// Number normalization — JP domestic
// ---------------------------------------------------------------
describe('normalizePhoneNumber: JP domestic', () => {
  it('parses an IP phone number with hyphens', () => {
    const n = normalizePhoneNumber('050-1234-5678');
    assert.strictEqual(n.valid, true);
    assert.strictEqual(n.national, '05012345678');
    assert.strictEqual(n.e164, '+815012345678');
    assert.strictEqual(n.type, 'ip');
    assert.strictEqual(n.country, 'JP');
  });

  it('parses a mobile number with spaces', () => {
    const n = normalizePhoneNumber('090 1234 5678');
    assert.strictEqual(n.valid, true);
    assert.strictEqual(n.type, 'mobile');
    assert.strictEqual(n.e164, '+819012345678');
  });

  it('classifies 070/080 as mobile', () => {
    assert.strictEqual(normalizePhoneNumber('07012345678').type, 'mobile');
    assert.strictEqual(normalizePhoneNumber('08012345678').type, 'mobile');
  });

  it('classifies 0800 and 0120 as toll-free', () => {
    assert.strictEqual(normalizePhoneNumber('0800-123-4567').type, 'tollfree');
    assert.strictEqual(normalizePhoneNumber('0120-123-456').type, 'tollfree');
  });

  it('classifies 0570 as navi dial', () => {
    assert.strictEqual(normalizePhoneNumber('0570-123-456').type, 'navi');
  });

  it('classifies a Tokyo landline as fixedline', () => {
    const n = normalizePhoneNumber('03-1234-5678');
    assert.strictEqual(n.type, 'fixedline');
    assert.strictEqual(n.e164, '+81312345678');
  });

  it('accepts full-width digits', () => {
    const n = normalizePhoneNumber('０９０１２３４５６７８');
    assert.strictEqual(n.valid, true);
    assert.strictEqual(n.national, '09012345678');
  });

  it('accepts parentheses and dots as separators', () => {
    assert.strictEqual(normalizePhoneNumber('(03) 1234-5678').valid, true);
  });
});

// ---------------------------------------------------------------
// Number normalization — international forms of JP numbers
// ---------------------------------------------------------------
describe('normalizePhoneNumber: international', () => {
  it('parses +81 mobile and drops the trunk 0 correctly', () => {
    const n = normalizePhoneNumber('+81 90-1234-5678');
    assert.strictEqual(n.valid, true);
    assert.strictEqual(n.national, '09012345678');
    assert.strictEqual(n.e164, '+819012345678');
    assert.strictEqual(n.type, 'mobile');
  });

  it('parses 0081 prefix', () => {
    const n = normalizePhoneNumber('0081-50-1234-5678');
    assert.strictEqual(n.valid, true);
    assert.strictEqual(n.national, '05012345678');
  });

  it('parses a non-JP international number', () => {
    const n = normalizePhoneNumber('+1 202-555-0123');
    assert.strictEqual(n.valid, true);
    assert.strictEqual(n.e164, '+12025550123');
    assert.strictEqual(n.type, 'international');
    assert.strictEqual(n.country, 'INTL');
  });

  it('rejects invalid inputs without throwing', () => {
    for (const bad of ['', '12345', 'abcd', '090-123', 'phone-number', null, undefined, '   ']) {
      const n = normalizePhoneNumber(bad);
      assert.strictEqual(n.valid, false, `expected invalid for ${String(bad)}`);
      assert.strictEqual(n.type, 'invalid');
    }
  });

  it('rejects a JP number not starting with 0', () => {
    assert.strictEqual(normalizePhoneNumber('1234567890').valid, false);
  });
});

// ---------------------------------------------------------------
// Display formatting
// ---------------------------------------------------------------
describe('formatNational', () => {
  it('groups 11-digit numbers 3-4-4', () => {
    assert.strictEqual(formatNational('05012345678'), '050-1234-5678');
    assert.strictEqual(formatNational('08001234567'), '080-0123-4567');
  });

  it('groups 0120 numbers 4-3-3', () => {
    assert.strictEqual(formatNational('0120123456'), '0120-123-456');
  });

  it('groups Tokyo landlines 2-4-4', () => {
    assert.strictEqual(formatNational('0312345678'), '03-1234-5678');
  });

  it('returns empty string for empty input', () => {
    assert.strictEqual(formatNational(''), '');
    assert.strictEqual(formatNational(null), '');
  });
});

// ---------------------------------------------------------------
// Prefix rules
// ---------------------------------------------------------------
describe('canonicalPrefixRule', () => {
  it('accepts a national prefix', () => {
    assert.deepStrictEqual(plain(canonicalPrefixRule('0800')), { prefix: '0800', scope: 'national' });
    assert.deepStrictEqual(plain(canonicalPrefixRule('050-1234')), { prefix: '0501234', scope: 'national' });
  });

  it('accepts an e164 prefix', () => {
    assert.deepStrictEqual(plain(canonicalPrefixRule('+8190')), { prefix: '8190', scope: 'e164' });
  });

  it('rejects unusable rules', () => {
    assert.strictEqual(canonicalPrefixRule(''), null);
    assert.strictEqual(canonicalPrefixRule('ab'), null);
    assert.strictEqual(canonicalPrefixRule('90'), null);       // too short
    assert.strictEqual(canonicalPrefixRule('1234'), null);     // national must start with 0
    assert.strictEqual(canonicalPrefixRule('+090'), null);    // e164 must not start with 0
    assert.strictEqual(canonicalPrefixRule(null), null);
  });
});

// ---------------------------------------------------------------
// Judgement
// ---------------------------------------------------------------
describe('checkNumber', () => {
  const empty = { allow: [], blockExact: [], prefixes: [], reports: [] };

  it('returns none for an unknown clean number', () => {
    const r = checkNumber('090-1234-5678', empty);
    assert.strictEqual(r.action, 'none');
    assert.strictEqual(r.reason, 'no-match');
  });

  it('returns invalid for a malformed number', () => {
    assert.strictEqual(checkNumber('123', empty).action, 'invalid');
  });

  it('blocks an exact blocklist match', () => {
    const lists = { ...empty, blockExact: ['+819012345678'] };
    const r = checkNumber('09012345678', lists);
    assert.strictEqual(r.action, 'block');
    assert.strictEqual(r.reason, 'blocklist-exact');
  });

  it('allowlist wins over blocklist', () => {
    const lists = { allow: ['+819012345678'], blockExact: ['+819012345678'], prefixes: [], reports: [] };
    assert.strictEqual(checkNumber('+81 90-1234-5678', lists).action, 'allow');
  });

  it('blocks by national prefix rule', () => {
    const lists = { ...empty, prefixes: [canonicalPrefixRule('0800')] };
    const r = checkNumber('0800-999-8888', lists);
    assert.strictEqual(r.action, 'block');
    assert.strictEqual(r.reason, 'blocklist-prefix');
  });

  it('blocks by e164 prefix rule', () => {
    const lists = { ...empty, prefixes: [canonicalPrefixRule('+8190')] };
    assert.strictEqual(checkNumber('090-1111-2222', lists).action, 'block');
    assert.strictEqual(checkNumber('080-1111-2222', lists).action, 'none');
  });

  it('warns on a known sample spam number with its category', () => {
    const fraud = SAMPLE_SPAM_DB.find((e) => e.category === 'fraud');
    const r = checkNumber(fraud.number, empty);
    assert.strictEqual(r.action, 'warn');
    assert.strictEqual(r.reason, 'known-spam');
    assert.strictEqual(r.category, 'fraud');
    assert.strictEqual(r.reportCount, fraud.reportCount);
    assert.strictEqual(r.sample, true);
  });

  it('prefix block beats the sample-db warning', () => {
    const sample = SAMPLE_SPAM_DB[0]; // 0800...
    const lists = { ...empty, prefixes: [canonicalPrefixRule('0800')] };
    assert.strictEqual(checkNumber(sample.number, lists).action, 'block');
  });

  it('warns on a number the user reported before', () => {
    const lists = { ...empty, reports: [{ number: '+819012345678', category: 'sales', ts: 1 }] };
    const r = checkNumber('09012345678', lists);
    assert.strictEqual(r.action, 'warn');
    assert.strictEqual(r.reason, 'reported-by-you');
    assert.strictEqual(r.reportCount, 1);
  });

  it('aggregates own reports onto a sample entry count', () => {
    const sample = SAMPLE_SPAM_DB[0];
    const e164 = '+81' + sample.number.slice(1);
    const lists = { ...empty, reports: [{ number: e164, category: 'other', ts: 1 }, { number: e164, category: 'other', ts: 2 }] };
    const r = checkNumber(sample.number, lists);
    assert.strictEqual(r.reportCount, sample.reportCount + 2);
  });

  it('countReports counts only matching entries', () => {
    const reports = [{ number: '+811' }, { number: '+812' }, { number: '+811' }];
    assert.strictEqual(countReports('+811', reports), 2);
    assert.strictEqual(countReports('+819', reports), 0);
    assert.strictEqual(countReports(null, reports), 0);
  });
});

// ---------------------------------------------------------------
// Sample data integrity
// ---------------------------------------------------------------
describe('SAMPLE_SPAM_DB integrity', () => {
  it('every sample is flagged as sample data', () => {
    assert(SAMPLE_SPAM_DB.length >= 5);
    for (const e of SAMPLE_SPAM_DB) assert.strictEqual(e.sample, true);
  });

  it('every sample number is a valid, normalizable format example', () => {
    for (const e of SAMPLE_SPAM_DB) {
      const n = normalizePhoneNumber(e.number);
      assert.strictEqual(n.valid, true, `sample ${e.number} should normalize`);
    }
  });

  it('no sample number collides with the clean test number', () => {
    for (const e of SAMPLE_SPAM_DB) assert.notStrictEqual(e.number, '09012345678');
  });
});

// ---------------------------------------------------------------
// Block list JSON schema v1
// ---------------------------------------------------------------
describe('exportBlockList / importBlockList', () => {
  it('round-trips a populated list', () => {
    const lists = {
      allow: ['+81312345678'],
      blockExact: ['+819012345678'],
      prefixes: [{ prefix: '0800', scope: 'national' }],
      reports: [{ number: '+815012345678', category: 'fraud', ts: 42 }]
    };
    const back = importBlockList(exportBlockList(lists));
    assert.deepStrictEqual(plain(back), lists);
  });

  it('export includes version 1', () => {
    const obj = JSON.parse(exportBlockList({}));
    assert.strictEqual(obj.version, 1);
  });

  it('import rejects wrong versions and junk', () => {
    assert.throws(() => importBlockList('{"version":2}'), /unsupported/);
    assert.throws(() => importBlockList('not json'), /invalid JSON/);
  });

  it('import filters malformed entries instead of crashing', () => {
    const back = importBlockList(JSON.stringify({
      version: 1,
      allow: ['+811', 42, null],
      blockExact: 'oops',
      prefixes: [{ prefix: '0800', scope: 'national' }, { prefix: 1, scope: 'x' }, null],
      reports: [{ number: '+811' }, { nope: true }]
    }));
    assert.deepStrictEqual(plain(back.allow), ['+811']);
    assert.deepStrictEqual(plain(back.blockExact), []);
    assert.deepStrictEqual(plain(back.prefixes), [{ prefix: '0800', scope: 'national' }]);
    assert.strictEqual(back.reports.length, 1);
  });
});

// ---------------------------------------------------------------
// Shipped-HTML structural guarantees (privacy & i18n)
// ---------------------------------------------------------------
describe('index.html structural guarantees', () => {
  it('loads no external resources (privacy: zero network requests)', () => {
    assert(!/src\s*=\s*"https?:\/\//.test(html), 'external script/image src found');
    assert(!/href\s*=\s*"https?:\/\//.test(html), 'external href found');
    assert(!/url\(\s*https?:\/\//.test(html), 'external CSS url found');
  });

  it('states the privacy policy in both languages', () => {
    assert(html.includes('通話履歴や連絡先にアクセスしません'));
    assert(html.includes('never accesses your call history or contacts'));
    assert(html.includes('localStorage'));
  });

  it('carries both ja and en dictionaries with matching key sets', () => {
    const jaBlock = html.match(/ja:\s*\{([\s\S]*?)\n  \},\n  en:/);
    const enBlock = html.match(/en:\s*\{([\s\S]*?)\n  \}\n\};/);
    assert(jaBlock && enBlock, 'i18n dictionaries not found');
    const keys = (s) => [...s.matchAll(/^\s{4}([A-Za-z]+):/gm)].map((x) => x[1]).sort();
    assert.deepStrictEqual(keys(jaBlock[1]), keys(enBlock[1]));
  });

  it('warns that sample data is dummy data in the UI text', () => {
    assert(html.includes('ダミーデータ'));
    assert(html.includes('dummy test data'));
  });
});

// ---------------------------------------------------------------
console.log('\n=================================================');
console.log(`Total: ${testCount}  Passed: ${passCount}  Failed: ${failCount}`);
if (failedTests.length) {
  console.log('\nFailed tests:');
  failedTests.forEach((f) => console.log(' - ' + f));
}
console.log('=================================================');
process.exit(failCount ? 1 : 0);
