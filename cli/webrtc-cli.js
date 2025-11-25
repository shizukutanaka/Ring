#!/usr/bin/env node

/**
 * WebRTC Call Recorder - Management CLI
 * Command-line tool for server administration
 */

const yargs = require('yargs');
const chalk = require('chalk');
const axios = require('axios');
const Table = require('cli-table3');
const fs = require('fs');
const path = require('path');

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

// User Management Commands
const userCommands = {
  'list': async () => {
    try {
      const response = await api.get('/api/admin/users?limit=50');
      const users = response.data;

      if (users.length === 0) {
        console.log(chalk.yellow('No users found'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Email', 'Name', 'Role', 'Created At'],
        colWidths: [40, 25, 20, 15, 20]
      });

      users.forEach(user => {
        table.push([
          user.id,
          user.email,
          user.name,
          user.role,
          new Date(user.created_at).toLocaleDateString()
        ]);
      });

      console.log(table.toString());
    } catch (error) {
      console.error(chalk.red('Error fetching users:', error.message));
      process.exit(1);
    }
  },

  'create': async (argv) => {
    if (!argv.email || !argv.password) {
      console.error(chalk.red('Email and password are required'));
      process.exit(1);
    }

    try {
      const response = await api.post('/api/admin/users', {
        email: argv.email,
        password: argv.password,
        name: argv.name || argv.email.split('@')[0],
        role: argv.role || 'user'
      });

      console.log(chalk.green('✓ User created successfully'));
      console.log(`ID: ${response.data.id}`);
      console.log(`Email: ${response.data.email}`);
    } catch (error) {
      console.error(chalk.red('Error creating user:', error.response?.data?.message || error.message));
      process.exit(1);
    }
  },

  'delete': async (argv) => {
    if (!argv.id) {
      console.error(chalk.red('User ID is required'));
      process.exit(1);
    }

    try {
      await api.delete(`/api/admin/users/${argv.id}`);
      console.log(chalk.green('✓ User deleted successfully'));
    } catch (error) {
      console.error(chalk.red('Error deleting user:', error.response?.data?.message || error.message));
      process.exit(1);
    }
  },

  'reset-password': async (argv) => {
    if (!argv.id || !argv.password) {
      console.error(chalk.red('User ID and new password are required'));
      process.exit(1);
    }

    try {
      await api.post(`/api/admin/users/${argv.id}/reset-password`, {
        password: argv.password
      });
      console.log(chalk.green('✓ Password reset successfully'));
    } catch (error) {
      console.error(chalk.red('Error resetting password:', error.response?.data?.message || error.message));
      process.exit(1);
    }
  }
};

// Call Management Commands
const callCommands = {
  'list': async (argv) => {
    try {
      const params = {
        limit: argv.limit || 50,
        offset: argv.offset || 0
      };

      if (argv.status) params.status = argv.status;
      if (argv.days) {
        const date = new Date();
        date.setDate(date.getDate() - argv.days);
        params.from = date.toISOString();
      }

      const response = await api.get('/api/admin/calls', { params });
      const calls = response.data;

      if (calls.length === 0) {
        console.log(chalk.yellow('No calls found'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Initiator', 'Recipient', 'Duration', 'Status', 'Started'],
        colWidths: [40, 20, 20, 12, 12, 20]
      });

      calls.forEach(call => {
        table.push([
          call.id.substring(0, 8) + '...',
          call.initiator_id.substring(0, 8),
          call.recipient_id.substring(0, 8),
          call.duration_seconds ? `${call.duration_seconds}s` : '-',
          call.status,
          new Date(call.started_at).toLocaleString()
        ]);
      });

      console.log(table.toString());
      console.log(`\nTotal: ${calls.length}`);
    } catch (error) {
      console.error(chalk.red('Error fetching calls:', error.message));
      process.exit(1);
    }
  },

  'details': async (argv) => {
    if (!argv.id) {
      console.error(chalk.red('Call ID is required'));
      process.exit(1);
    }

    try {
      const response = await api.get(`/api/admin/calls/${argv.id}`);
      const call = response.data;

      console.log(chalk.cyan('\n=== Call Details ===\n'));
      console.log(`ID: ${call.id}`);
      console.log(`Initiator: ${call.initiator_id}`);
      console.log(`Recipient: ${call.recipient_id}`);
      console.log(`Status: ${call.status}`);
      console.log(`Duration: ${call.duration_seconds}s`);
      console.log(`Started: ${new Date(call.started_at).toLocaleString()}`);
      if (call.ended_at) {
        console.log(`Ended: ${new Date(call.ended_at).toLocaleString()}`);
      }
      console.log(`Recorded: ${call.recorded ? 'Yes' : 'No'}`);
    } catch (error) {
      console.error(chalk.red('Error fetching call details:', error.message));
      process.exit(1);
    }
  }
};

// Server Status Commands
const statusCommands = {
  'health': async () => {
    try {
      const response = await api.get('/api/health');
      const health = response.data;

      console.log(chalk.cyan('\n=== Server Health ===\n'));
      console.log(`Status: ${chalk.green(health.status)}`);
      console.log(`Uptime: ${health.uptime_seconds}s`);
      console.log(`Timestamp: ${new Date(health.timestamp).toLocaleString()}`);
      console.log(`\nDatabase: ${health.database ? chalk.green('✓') : chalk.red('✗')}`);
      console.log(`Cache: ${health.cache ? chalk.green('✓') : chalk.red('✗')}`);
      console.log(`Metrics: ${health.metrics ? chalk.green('✓') : chalk.red('✗')}`);
    } catch (error) {
      console.error(chalk.red('Server is not responding:', error.message));
      process.exit(1);
    }
  },

  'metrics': async () => {
    try {
      const response = await api.get('/api/metrics');
      const metrics = response.data;

      console.log(chalk.cyan('\n=== Server Metrics ===\n'));
      console.log(`HTTP Requests: ${metrics.http_requests_total}`);
      console.log(`Errors: ${metrics.errors_total}`);
      console.log(`Active Calls: ${metrics.active_calls}`);
      console.log(`Uptime: ${Math.round(metrics.uptime_seconds / 3600)} hours`);

      if (metrics.http_request_duration_ms) {
        console.log(`\nResponse Times (ms):`);
        console.log(`  P50: ${metrics.http_request_duration_ms.p50}`);
        console.log(`  P95: ${metrics.http_request_duration_ms.p95}`);
        console.log(`  P99: ${metrics.http_request_duration_ms.p99}`);
      }
    } catch (error) {
      console.error(chalk.red('Error fetching metrics:', error.message));
      process.exit(1);
    }
  },

  'stats': async (argv) => {
    try {
      const params = {};
      if (argv.days) {
        const date = new Date();
        date.setDate(date.getDate() - argv.days);
        params.from = date.toISOString();
      }

      const response = await api.get('/api/admin/stats', { params });
      const stats = response.data;

      console.log(chalk.cyan('\n=== System Statistics ===\n'));
      console.log(`Total Users: ${stats.total_users}`);
      console.log(`Active Users (24h): ${stats.active_users_24h}`);
      console.log(`Total Calls: ${stats.total_calls}`);
      console.log(`Calls (24h): ${stats.calls_24h}`);
      console.log(`Total Consent Records: ${stats.total_consents}`);
      console.log(`Consent Rate: ${(stats.consent_rate * 100).toFixed(2)}%`);
      console.log(`Average Call Duration: ${stats.avg_call_duration}s`);
      console.log(`Storage Used: ${(stats.storage_bytes / 1024 / 1024 / 1024).toFixed(2)} GB`);
    } catch (error) {
      console.error(chalk.red('Error fetching statistics:', error.message));
      process.exit(1);
    }
  }
};

// Database Commands
const dbCommands = {
  'backup': async (argv) => {
    try {
      const filename = argv.file || `backup-${Date.now()}.sql`;

      console.log(chalk.cyan(`Creating backup to ${filename}...`));

      const response = await api.post('/api/admin/database/backup', {});

      fs.writeFileSync(filename, response.data);

      console.log(chalk.green(`✓ Backup created successfully: ${filename}`));
    } catch (error) {
      console.error(chalk.red('Error creating backup:', error.message));
      process.exit(1);
    }
  },

  'migrate': async () => {
    try {
      console.log(chalk.cyan('Running database migrations...'));

      const response = await api.post('/api/admin/database/migrate', {});

      console.log(chalk.green('✓ Migrations completed'));
      console.log(`Applied ${response.data.count} migrations`);
    } catch (error) {
      console.error(chalk.red('Error running migrations:', error.message));
      process.exit(1);
    }
  },

  'seed': async () => {
    try {
      console.log(chalk.cyan('Seeding database...'));

      const response = await api.post('/api/admin/database/seed', {});

      console.log(chalk.green('✓ Database seeded successfully'));
      console.log(`Created ${response.data.count} records`);
    } catch (error) {
      console.error(chalk.red('Error seeding database:', error.message));
      process.exit(1);
    }
  }
};

// Codec Management Commands
const codecCommands = {
  'list': async () => {
    try {
      const response = await api.get('/api/codecs/stats');
      const stats = response.data;

      console.log(chalk.cyan('\n=== Codec Usage Statistics ===\n'));

      const table = new Table({
        head: ['Codec', 'Total Selections', 'Percentage', 'Avg Quality'],
        colWidths: [15, 20, 15, 15]
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
      console.error(chalk.red('Error fetching codec stats:', error.message));
      process.exit(1);
    }
  },

  'quality': async () => {
    try {
      const response = await api.get('/api/codecs/quality');
      const quality = response.data;

      console.log(chalk.cyan('\n=== Codec Quality Metrics ===\n'));

      quality.forEach(codec => {
        console.log(chalk.bold(`${codec.name}:`));
        console.log(`  Current Quality: ${codec.current_quality}/10`);
        console.log(`  Average Quality: ${codec.avg_quality.toFixed(2)}/10`);
        console.log(`  Min Quality: ${codec.min_quality}/10`);
        console.log(`  Max Quality: ${codec.max_quality}/10`);
        console.log(`  Trend: ${codec.trend}`);
        console.log();
      });
    } catch (error) {
      console.error(chalk.red('Error fetching quality metrics:', error.message));
      process.exit(1);
    }
  },

  'adaptations': async (argv) => {
    try {
      const params = { limit: argv.limit || 50 };
      const response = await api.get('/api/codecs/adaptations', { params });
      const adaptations = response.data;

      if (adaptations.length === 0) {
        console.log(chalk.yellow('No codec adaptations found'));
        return;
      }

      const table = new Table({
        head: ['Timestamp', 'Call ID', 'From', 'To', 'Reason'],
        colWidths: [20, 15, 10, 10, 30]
      });

      adaptations.forEach(adapt => {
        table.push([
          new Date(adapt.timestamp).toLocaleString(),
          adapt.call_id.substring(0, 8) + '...',
          adapt.from_codec,
          adapt.to_codec,
          adapt.reason
        ]);
      });

      console.log(table.toString());
    } catch (error) {
      console.error(chalk.red('Error fetching adaptations:', error.message));
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
        console.log(chalk.yellow('No consent requests found'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Call ID', 'Jurisdiction', 'Status', 'Created'],
        colWidths: [15, 15, 15, 12, 20]
      });

      requests.forEach(req => {
        table.push([
          req.id.substring(0, 8) + '...',
          req.call_id.substring(0, 8) + '...',
          req.jurisdiction,
          req.status,
          new Date(req.created_at).toLocaleString()
        ]);
      });

      console.log(table.toString());
    } catch (error) {
      console.error(chalk.red('Error fetching consent requests:', error.message));
      process.exit(1);
    }
  },

  'stats': async () => {
    try {
      const response = await api.get('/api/consent/stats');
      const stats = response.data;

      console.log(chalk.cyan('\n=== Consent Statistics ===\n'));

      console.log(`Total Requests: ${stats.total_requests}`);
      console.log(`Granted: ${stats.granted} (${stats.grant_rate.toFixed(2)}%)`);
      console.log(`Rejected: ${stats.rejected}`);
      console.log(`Pending: ${stats.pending}`);
      console.log();

      console.log(chalk.bold('By Jurisdiction:'));
      const table = new Table({
        head: ['Jurisdiction', 'Requests', 'Grant Rate', 'Compliance'],
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
      console.error(chalk.red('Error fetching consent stats:', error.message));
      process.exit(1);
    }
  },

  'verify': async (argv) => {
    if (!argv.id) {
      console.error(chalk.red('Consent request ID is required'));
      process.exit(1);
    }

    try {
      const response = await api.post(`/api/consent/verify/${argv.id}`);
      const result = response.data;

      console.log(chalk.cyan('\n=== Signature Verification ===\n'));
      console.log(`Request ID: ${result.request_id}`);
      console.log(`Signature Valid: ${result.valid ? chalk.green('✓ Yes') : chalk.red('✗ No')}`);
      console.log(`Signed At: ${new Date(result.signed_at).toLocaleString()}`);
      console.log(`Signer: ${result.signer}`);
      console.log(`Algorithm: ${result.algorithm}`);

      if (!result.valid) {
        console.log(chalk.red(`\nReason: ${result.reason}`));
      }
    } catch (error) {
      console.error(chalk.red('Error verifying signature:', error.message));
      process.exit(1);
    }
  },

  'export': async (argv) => {
    if (!argv.userId) {
      console.error(chalk.red('User ID is required for data export'));
      process.exit(1);
    }

    try {
      console.log(chalk.cyan('Generating data export...'));

      const response = await api.post('/api/consent/export', {
        user_id: argv.userId
      });

      const filename = argv.file || `consent-export-${argv.userId}-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(response.data, null, 2));

      console.log(chalk.green(`✓ Data exported successfully: ${filename}`));
    } catch (error) {
      console.error(chalk.red('Error exporting data:', error.message));
      process.exit(1);
    }
  }
};

// Main CLI
const cli = yargs
  .command('user <subcommand>', 'Manage users', (yargs) => {
    return yargs
      .command('list', 'List all users', {}, () => userCommands.list())
      .command('create', 'Create a new user', {
        email: { describe: 'User email', type: 'string' },
        password: { describe: 'User password', type: 'string' },
        name: { describe: 'User name', type: 'string' },
        role: { describe: 'User role (user/admin)', type: 'string', default: 'user' }
      }, (argv) => userCommands.create(argv))
      .command('delete', 'Delete a user', {
        id: { describe: 'User ID', type: 'string', required: true }
      }, (argv) => userCommands.delete(argv))
      .command('reset-password', 'Reset user password', {
        id: { describe: 'User ID', type: 'string', required: true },
        password: { describe: 'New password', type: 'string', required: true }
      }, (argv) => userCommands['reset-password'](argv));
  })
  .command('call <subcommand>', 'Manage calls', (yargs) => {
    return yargs
      .command('list', 'List calls', {
        limit: { describe: 'Limit', type: 'number', default: 50 },
        offset: { describe: 'Offset', type: 'number', default: 0 },
        status: { describe: 'Filter by status', type: 'string' },
        days: { describe: 'Last N days', type: 'number' }
      }, (argv) => callCommands.list(argv))
      .command('details', 'Get call details', {
        id: { describe: 'Call ID', type: 'string', required: true }
      }, (argv) => callCommands.details(argv));
  })
  .command('status <subcommand>', 'Check server status', (yargs) => {
    return yargs
      .command('health', 'Health check', {}, () => statusCommands.health())
      .command('metrics', 'Show metrics', {}, () => statusCommands.metrics())
      .command('stats', 'Show statistics', {
        days: { describe: 'Last N days', type: 'number' }
      }, (argv) => statusCommands.stats(argv));
  })
  .command('db <subcommand>', 'Database management', (yargs) => {
    return yargs
      .command('backup', 'Create backup', {
        file: { describe: 'Backup filename', type: 'string' }
      }, (argv) => dbCommands.backup(argv))
      .command('migrate', 'Run migrations', {}, () => dbCommands.migrate())
      .command('seed', 'Seed database', {}, () => dbCommands.seed());
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
