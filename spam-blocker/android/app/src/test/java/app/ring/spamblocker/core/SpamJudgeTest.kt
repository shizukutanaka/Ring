package app.ring.spamblocker.core

/**
 * Golden-vector tests for the native judgement engine.
 *
 * These mirror the Web layer's tests (tests/spam-blocker.test.js) case by
 * case so both layers are verified against the same inputs and expected
 * outputs. The harness is dependency-free (no JUnit) so it can run with a
 * plain kotlinc + JDK, without the Android SDK:
 *
 *   spam-blocker/android/run-tests.sh
 *
 * Exit code is non-zero when any case fails.
 */

private var passed = 0
private var failed = 0

private fun check(name: String, condition: Boolean) {
    if (condition) {
        passed++
    } else {
        failed++
        println("FAIL: $name")
    }
}

private fun <T> checkEq(name: String, expected: T, actual: T) {
    if (expected == actual) {
        passed++
    } else {
        failed++
        println("FAIL: $name\n  expected: $expected\n  actual:   $actual")
    }
}

private fun normalizeTests() {
    // JP domestic
    PhoneNumbers.normalize("050-1234-5678").let { n ->
        checkEq("050 valid", true, n.valid)
        checkEq("050 national", "05012345678", n.national)
        checkEq("050 e164", "+815012345678", n.e164)
        checkEq("050 type", "ip", n.type)
        checkEq("050 country", "JP", n.country)
    }
    PhoneNumbers.normalize("090 1234 5678").let { n ->
        checkEq("090 valid", true, n.valid)
        checkEq("090 type", "mobile", n.type)
        checkEq("090 e164", "+819012345678", n.e164)
    }
    checkEq("070 mobile", "mobile", PhoneNumbers.normalize("07012345678").type)
    checkEq("080 mobile", "mobile", PhoneNumbers.normalize("08012345678").type)
    checkEq("0800 tollfree", "tollfree", PhoneNumbers.normalize("0800-123-4567").type)
    checkEq("0120 tollfree", "tollfree", PhoneNumbers.normalize("0120-123-456").type)
    checkEq("0570 navi", "navi", PhoneNumbers.normalize("0570-123-456").type)
    PhoneNumbers.normalize("03-1234-5678").let { n ->
        checkEq("03 type", "fixedline", n.type)
        checkEq("03 e164", "+81312345678", n.e164)
    }
    PhoneNumbers.normalize("０９０１２３４５６７８").let { n ->
        checkEq("fullwidth valid", true, n.valid)
        checkEq("fullwidth national", "09012345678", n.national)
    }
    checkEq("parens valid", true, PhoneNumbers.normalize("(03) 1234-5678").valid)

    // International
    PhoneNumbers.normalize("+81 90-1234-5678").let { n ->
        checkEq("+81 valid", true, n.valid)
        checkEq("+81 national", "09012345678", n.national)
        checkEq("+81 e164", "+819012345678", n.e164)
        checkEq("+81 type", "mobile", n.type)
    }
    PhoneNumbers.normalize("0081-50-1234-5678").let { n ->
        checkEq("0081 valid", true, n.valid)
        checkEq("0081 national", "05012345678", n.national)
    }
    PhoneNumbers.normalize("01081-90-1234-5678").let { n ->
        checkEq("01081 valid", true, n.valid)
        checkEq("01081 national", "09012345678", n.national)
    }
    PhoneNumbers.normalize("+1 202-555-0123").let { n ->
        checkEq("+1 valid", true, n.valid)
        checkEq("+1 e164", "+12025550123", n.e164)
        checkEq("+1 type", "international", n.type)
        checkEq("+1 country", "INTL", n.country)
    }
    for (bad in listOf("", "12345", "abcd", "090-123", "phone-number", "   ")) {
        val n = PhoneNumbers.normalize(bad)
        check("invalid for '$bad'", !n.valid && n.type == "invalid")
    }
    check("invalid for null", !PhoneNumbers.normalize(null).valid)
    checkEq("no-leading-0 invalid", false, PhoneNumbers.normalize("1234567890").valid)
}

private fun formatTests() {
    checkEq("fmt 11-digit", "050-1234-5678", PhoneNumbers.formatNational("05012345678"))
    checkEq("fmt 11-digit 0800", "080-0123-4567", PhoneNumbers.formatNational("08001234567"))
    checkEq("fmt 0120", "0120-123-456", PhoneNumbers.formatNational("0120123456"))
    checkEq("fmt 03", "03-1234-5678", PhoneNumbers.formatNational("0312345678"))
    checkEq("fmt empty", "", PhoneNumbers.formatNational(""))
    checkEq("fmt null", "", PhoneNumbers.formatNational(null))
}

private fun prefixRuleTests() {
    checkEq("rule 0800", PrefixRule("0800", "national"), canonicalPrefixRule("0800"))
    checkEq("rule 050-1234", PrefixRule("0501234", "national"), canonicalPrefixRule("050-1234"))
    checkEq("rule +8190", PrefixRule("8190", "e164"), canonicalPrefixRule("+8190"))
    checkEq("rule empty", null, canonicalPrefixRule(""))
    checkEq("rule ab", null, canonicalPrefixRule("ab"))
    checkEq("rule too short", null, canonicalPrefixRule("90"))
    checkEq("rule national must start 0", null, canonicalPrefixRule("1234"))
    checkEq("rule e164 must not start 0", null, canonicalPrefixRule("+090"))
    checkEq("rule null", null, canonicalPrefixRule(null))
}

private fun judgeTests() {
    val empty = BlockLists()

    SpamJudge.check("090-1234-5678", empty).let { r ->
        checkEq("clean action", VerdictAction.NONE, r.action)
        checkEq("clean reason", "no-match", r.reason)
    }
    checkEq("malformed invalid", VerdictAction.INVALID, SpamJudge.check("123", empty).action)
    checkEq("null invalid", VerdictAction.INVALID, SpamJudge.check(null, empty).action)

    BlockLists(blockExact = listOf("+819012345678")).let { lists ->
        val r = SpamJudge.check("09012345678", lists)
        checkEq("exact action", VerdictAction.BLOCK, r.action)
        checkEq("exact reason", "blocklist-exact", r.reason)
    }

    // Allowlist wins over blocklist.
    BlockLists(allow = listOf("+819012345678"), blockExact = listOf("+819012345678")).let { lists ->
        checkEq("allow wins", VerdictAction.ALLOW, SpamJudge.check("+81 90-1234-5678", lists).action)
    }

    BlockLists(prefixes = listOf(canonicalPrefixRule("0800")!!)).let { lists ->
        val r = SpamJudge.check("0800-999-8888", lists)
        checkEq("prefix national action", VerdictAction.BLOCK, r.action)
        checkEq("prefix national reason", "blocklist-prefix", r.reason)
    }

    BlockLists(prefixes = listOf(canonicalPrefixRule("+8190")!!)).let { lists ->
        checkEq("prefix e164 block", VerdictAction.BLOCK, SpamJudge.check("090-1111-2222", lists).action)
        checkEq("prefix e164 none", VerdictAction.NONE, SpamJudge.check("080-1111-2222", lists).action)
    }

    // Known sample spam (first fraud entry in the sample DB).
    val fraud = SpamJudge.SAMPLE_SPAM_DB.first { it.category == "fraud" }
    SpamJudge.check(fraud.number, empty).let { r ->
        checkEq("known action", VerdictAction.WARN, r.action)
        checkEq("known reason", "known-spam", r.reason)
        checkEq("known category", "fraud", r.category)
        checkEq("known count", fraud.reportCount, r.reportCount)
        checkEq("known sample flag", true, r.sample)
    }

    // Prefix block beats the sample-db warning.
    val sample0 = SpamJudge.SAMPLE_SPAM_DB[0] // 0800...
    BlockLists(prefixes = listOf(canonicalPrefixRule("0800")!!)).let { lists ->
        checkEq("prefix beats sample", VerdictAction.BLOCK, SpamJudge.check(sample0.number, lists).action)
    }

    BlockLists(reports = listOf(ReportEntry("+819012345678", "sales", ts = 1))).let { lists ->
        val r = SpamJudge.check("09012345678", lists)
        checkEq("reported action", VerdictAction.WARN, r.action)
        checkEq("reported reason", "reported-by-you", r.reason)
        checkEq("reported count", 1, r.reportCount)
    }

    // Own reports aggregate onto a sample entry's count.
    val e164OfSample0 = "+81" + sample0.number.substring(1)
    BlockLists(
        reports = listOf(
            ReportEntry(e164OfSample0, "other", ts = 1),
            ReportEntry(e164OfSample0, "other", ts = 2)
        )
    ).let { lists ->
        val r = SpamJudge.check(sample0.number, lists)
        checkEq("aggregated count", sample0.reportCount + 2, r.reportCount)
    }

    val reports = listOf(ReportEntry("+811"), ReportEntry("+812"), ReportEntry("+811"))
    checkEq("countReports match", 2, SpamJudge.countReports("+811", reports))
    checkEq("countReports none", 0, SpamJudge.countReports("+819", reports))
    checkEq("countReports null", 0, SpamJudge.countReports(null, reports))

    // Sample data integrity.
    check("sample db size >= 5", SpamJudge.SAMPLE_SPAM_DB.size >= 5)
    for (entry in SpamJudge.SAMPLE_SPAM_DB) {
        check("sample ${entry.number} normalizes", PhoneNumbers.normalize(entry.number).valid)
        check("sample ${entry.number} not the clean number", entry.number != "09012345678")
    }
}

private fun jsonTests() {
    val lists = BlockLists(
        allow = listOf("+81312345678"),
        blockExact = listOf("+819012345678"),
        prefixes = listOf(PrefixRule("0800", "national")),
        reports = listOf(ReportEntry("+815012345678", "fraud", ts = 42))
    )
    checkEq("json round-trip", lists, BlockListJson.import(BlockListJson.export(lists)))

    val exported = MiniJson.parse(BlockListJson.export(BlockLists())) as Map<*, *>
    checkEq("export version", 1.0, exported["version"])

    checkEq(
        "import v2 rejected", "unsupported blocklist version",
        try {
            BlockListJson.import("{\"version\":2}")
            "no-throw"
        } catch (e: IllegalArgumentException) {
            e.message
        }
    )
    checkEq(
        "import junk rejected", "invalid JSON",
        try {
            BlockListJson.import("not json")
            "no-throw"
        } catch (e: IllegalArgumentException) {
            e.message
        }
    )

    // Malformed entries are filtered, not fatal.
    val filtered = BlockListJson.import(
        """{"version":1,"allow":["+811",42,null],"blockExact":"oops",""" +
            """"prefixes":[{"prefix":"0800","scope":"national"},{"prefix":1,"scope":"x"},null],""" +
            """"reports":[{"number":"+811"},{"nope":true}]}"""
    )
    checkEq("filter allow", listOf("+811"), filtered.allow)
    checkEq("filter blockExact", emptyList(), filtered.blockExact)
    checkEq("filter prefixes", listOf(PrefixRule("0800", "national")), filtered.prefixes)
    checkEq("filter reports size", 1, filtered.reports.size)

    // The schema v1 example from spam-blocker/README.md parses and judges.
    val readmeExample = """
        {
          "version": 1,
          "allow": ["+81312345678"],
          "blockExact": ["+819012345678"],
          "prefixes": [{ "prefix": "0800", "scope": "national" }, { "prefix": "8190", "scope": "e164" }],
          "reports": [{ "number": "+815012345678", "category": "fraud", "note": "", "ts": 1762000000000 }]
        }
    """.trimIndent()
    val parsed = BlockListJson.import(readmeExample)
    checkEq("readme allow", listOf("+81312345678"), parsed.allow)
    checkEq("readme report ts", 1762000000000L, parsed.reports[0].ts)
    checkEq(
        "readme exact judged block", VerdictAction.BLOCK,
        SpamJudge.check("09012345678", parsed).action
    )
    checkEq(
        "readme allow judged allow", VerdictAction.ALLOW,
        SpamJudge.check("0312345678", parsed).action
    )
    checkEq(
        "readme reported judged warn", VerdictAction.WARN,
        SpamJudge.check("05012345678", parsed).action
    )
}

fun main() {
    normalizeTests()
    formatTests()
    prefixRuleTests()
    judgeTests()
    jsonTests()
    println("Kotlin core tests: $passed passed, $failed failed")
    if (failed > 0) kotlin.system.exitProcess(1)
}
