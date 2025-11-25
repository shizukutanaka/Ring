#!/usr/bin/env node

/**
 * WebRTC Call Recorder - Enhanced Management CLI
 * Command-line tool for server administration with Tier 1 features
 */

const yargs = require('yargs');
const chalk = require('chalk');
const axios = require('axios');
const Table = require('cli-table3');
const fs = require('fs');

const API_URL = process.env.WEBRTC_API_URL || 'http://localhost:3000';
const API_TOKEN = process.env.WEBRTC_API_TOKEN || '';

// Create API client
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

// Codec Management Commands
const codecCommands = {
    'list': async () => {
        try {
            const response = await api.get('/api/codecs/stats');
            const stats = response.data;

            console.log(chalk.cyan('\\n=== Codec Usage Statistics ===\\n'));

            const table = new Table({
                head: ['Codec', 'Selections', 'Percentage', 'Avg Quality'],
                colWidths: [12, 15, 15, 15]
            });

            stats.codecs.forEach(codec => {
                table.push([
                    codec.name,
                    codec.count,
                    `${codec.percentage.toFixed(2)}%`,
                    codec.avg_quality.toFixed(2)
                ]);
            });

            console.log(table.toString());
        } catch (error) {
            console.error(chalk.red('Error:', error.message));
            process.exit(1);
        }
    },

    'quality': async () => {
        try {
            const response = await api.get('/api/codecs/quality');
            const quality = response.data;

            console.log(chalk.cyan('\\n=== Codec Quality Metrics ===\\n'));

            quality.forEach(codec => {
                console.log(chalk.bold(`${codec.name}:`));
                console.log(`  Current: ${codec.current_quality}/10`);
                console.log(`  Average: ${codec.avg_quality.toFixed(2)}/10`);
                console.log(`  Trend: ${codec.trend}`);
                console.log();
            });
        } catch (error) {
            console.error(chalk.red('Error:', error.message));
            process.exit(1);
        }
    },

    'adaptations': async (argv) => {
        try {
            const response = await api.get('/api/codecs/adaptations', {
                params: { limit: argv.limit || 50 }
            });
            const adaptations = response.data;

            if (adaptations.length === 0) {
                console.log(chalk.yellow('No adaptations found'));
                return;
            }

            const table = new Table({
                head: ['Time', 'Call ID', 'From', 'To', 'Reason'],
                colWidths: [20, 12, 8, 8, 30]
            });

            adaptations.forEach(a => {
                table.push([
                    new Date(a.timestamp).toLocaleString(),
                    a.call_id.substring(0, 8),
                    a.from_codec,
                    a.to_codec,
                    a.reason
                ]);
            });

            console.log(table.toString());
        } catch (error) {
            console.error(chalk.red('Error:', error.message));
            process.exit(1);
        }
    }
};

// Consent Management Commands
const consentCommands = {
    'list': async (argv) => {
        try {
            const params = {
                limit: argv.limit || 50,
                offset: argv.offset || 0
            };
            if (argv.jurisdiction) params.jurisdiction = argv.jurisdiction;
            if (argv.status) params.status = argv.status;

            const response = await api.get('/api/consent/requests', { params });
            const requests = response.data;

            if (requests.length === 0) {
                console.log(chalk.yellow('No requests found'));
                return;
            }

            const table = new Table({
                head: ['ID', 'Call ID', 'Jurisdiction', 'Status', 'Created'],
                colWidths: [12, 12, 15, 12, 20]
            });

            requests.forEach(r => {
                table.push([
                    r.id.substring(0, 8),
                    r.call_id.substring(0, 8),
                    r.jurisdiction,
                    r.status,
                    new Date(r.created_at).toLocaleString()
                ]);
            });

            console.log(table.toString());
        } catch (error) {
            console.error(chalk.red('Error:', error.message));
            process.exit(1);
        }
    },

    'stats': async () => {
        try {
            const response = await api.get('/api/consent/stats');
            const stats = response.data;

            console.log(chalk.cyan('\\n=== Consent Statistics ===\\n'));
            console.log(`Total: ${stats.total_requests}`);
            console.log(`Granted: ${stats.granted} (${stats.grant_rate.toFixed(2)}%)`);
            console.log(`Rejected: ${stats.rejected}`);
            console.log();

            const table = new Table({
                head: ['Jurisdiction', 'Requests', 'Grant Rate', 'Compliant'],
                colWidths: [15, 12, 12, 12]
            });

            stats.by_jurisdiction.forEach(j => {
                table.push([
                    j.jurisdiction,
                    j.count,
                    `${j.grant_rate.toFixed(2)}%`,
                    j.compliant ? chalk.green('✓') : chalk.red('✗')
                ]);
            });

            console.log(table.toString());
        } catch (error) {
            console.error(chalk.red('Error:', error.message));
            process.exit(1);
        }
    },

    'verify': async (argv) => {
        if (!argv.id) {
            console.error(chalk.red('Request ID required'));
            process.exit(1);
        }

        try {
            const response = await api.post(`/api/consent/verify/${argv.id}`);
            const result = response.data;

            console.log(chalk.cyan('\\n=== Signature Verification ===\\n'));
            console.log(`Request ID: ${result.request_id}`);
            console.log(`Valid: ${result.valid ? chalk.green('✓ Yes') : chalk.red('✗ No')}`);
            console.log(`Signed: ${new Date(result.signed_at).toLocaleString()}`);
            console.log(`Signer: ${result.signer}`);

            if (!result.valid) {
                console.log(chalk.red(`\\nReason: ${result.reason}`));
            }
        } catch (error) {
            console.error(chalk.red('Error:', error.message));
            process.exit(1);
        }
    },

    'export': async (argv) => {
        if (!argv.userId) {
            console.error(chalk.red('User ID required'));
            process.exit(1);
        }

        try {
            console.log(chalk.cyan('Generating export...'));

            const response = await api.post('/api/consent/export', {
                user_id: argv.userId
            });

            const filename = argv.file || `consent-export-${argv.userId}-${Date.now()}.json`;
            fs.writeFileSync(filename, JSON.stringify(response.data, null, 2));

            console.log(chalk.green(`✓ Exported: ${filename}`));
        } catch (error) {
            console.error(chalk.red('Error:', error.message));
            process.exit(1);
        }
    }
};

// Main CLI
const cli = yargs
    .command('codec <subcommand>', 'Manage codecs', (yargs) => {
        return yargs
            .command('list', 'Show usage statistics', {}, () => codecCommands.list())
            .command('quality', 'Show quality metrics', {}, () => codecCommands.quality())
            .command('adaptations', 'Show adaptations', {
                limit: { describe: 'Limit', type: 'number', default: 50 }
            }, (argv) => codecCommands.adaptations(argv));
    })
    .command('consent <subcommand>', 'Manage consent', (yargs) => {
        return yargs
            .command('list', 'List requests', {
                limit: { describe: 'Limit', type: 'number', default: 50 },
                offset: { describe: 'Offset', type: 'number', default: 0 },
                jurisdiction: { describe: 'Filter by jurisdiction', type: 'string' },
                status: { describe: 'Filter by status', type: 'string' }
            }, (argv) => consentCommands.list(argv))
            .command('stats', 'Show statistics', {}, () => consentCommands.stats())
            .command('verify', 'Verify signature', {
                id: { describe: 'Request ID', type: 'string', required: true }
            }, (argv) => consentCommands.verify(argv))
            .command('export', 'Export data (GDPR)', {
                userId: { describe: 'User ID', type: 'string', required: true },
                file: { describe: 'Output file', type: 'string' }
            }, (argv) => consentCommands.export(argv));
    })
    .option('token', {
        describe: 'API token',
        type: 'string',
        env: 'WEBRTC_API_TOKEN'
    })
    .option('url', {
        describe: 'API URL',
        type: 'string',
        env: 'WEBRTC_API_URL',
        default: 'http://localhost:3000'
    })
    .help()
    .alias('h', 'help')
    .version()
    .alias('v', 'version');

cli.argv;
