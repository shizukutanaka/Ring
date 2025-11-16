#!/usr/bin/env node

/**
 * Production Health Check Script
 *
 * Validates server health, database connectivity, and system readiness
 * Usage: node scripts/health-check.js [--verbose] [--endpoint http://localhost:3000]
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

class HealthChecker {
  constructor(options = {}) {
    this.endpoint = options.endpoint || 'http://localhost:3000';
    this.verbose = options.verbose || false;
    this.timeout = 5000;
    this.results = {
      timestamp: new Date().toISOString(),
      checks: [],
      overall_status: 'unknown',
      ready_for_production: false
    };
  }

  /**
   * Log with verbosity control
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (this.verbose || level !== 'debug') {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Check health endpoint
   */
  async checkHealthEndpoint() {
    this.log('Checking health endpoint...');

    return new Promise((resolve) => {
      const startTime = performance.now();
      const url = new URL('/health', this.endpoint);
      const client = url.protocol === 'https:' ? https : http;

      const req = client.request(url, { method: 'GET' }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;

          const result = {
            name: 'Health Endpoint',
            status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
            details: {
              status_code: res.statusCode,
              response_time_ms: responseTime.toFixed(2),
              response: data
            }
          };

          this.log(`✓ Health check: ${result.status} (${responseTime.toFixed(2)}ms)`);
          this.results.checks.push(result);
          resolve();
        });
      });

      req.on('error', (error) => {
        this.log(`✗ Health check failed: ${error.message}`, 'error');
        this.results.checks.push({
          name: 'Health Endpoint',
          status: 'error',
          details: { error: error.message }
        });
        resolve();
      });

      req.setTimeout(this.timeout);
      req.end();
    });
  }

  /**
   * Check API authentication
   */
  async checkAuthentication() {
    this.log('Checking authentication...');

    return new Promise((resolve) => {
      const url = new URL('/api/login', this.endpoint);
      const client = url.protocol === 'https:' ? https : http;

      const data = JSON.stringify({
        username: process.env.TEST_USERNAME || 'admin',
        password: process.env.TEST_PASSWORD || 'admin123'
      });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = client.request(url, options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          const result = {
            name: 'Authentication',
            status: res.statusCode === 200 ? 'working' : 'failed',
            details: {
              status_code: res.statusCode,
              has_token: body.includes('token')
            }
          };

          this.log(`✓ Authentication: ${result.status}`);
          this.results.checks.push(result);
          resolve();
        });
      });

      req.on('error', (error) => {
        this.log(`✗ Authentication check failed: ${error.message}`, 'error');
        this.results.checks.push({
          name: 'Authentication',
          status: 'error',
          details: { error: error.message }
        });
        resolve();
      });

      req.setTimeout(this.timeout);
      req.write(data);
      req.end();
    });
  }

  /**
   * Check legal DB
   */
  async checkLegalDB() {
    this.log('Checking legal database...');

    return new Promise((resolve) => {
      const url = new URL('/api/legaldb/latest', this.endpoint);
      const client = url.protocol === 'https:' ? https : http;

      const req = client.request(url, { method: 'GET' }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const result = {
              name: 'Legal Database',
              status: res.statusCode === 200 ? 'available' : 'unavailable',
              details: {
                version: json.version,
                supported_countries: json.supported_countries || 0
              }
            };

            this.log(`✓ Legal DB: v${json.version} (${json.supported_countries} countries)`);
            this.results.checks.push(result);
          } catch (err) {
            this.results.checks.push({
              name: 'Legal Database',
              status: 'error',
              details: { error: 'Invalid JSON response' }
            });
          }
          resolve();
        });
      });

      req.on('error', (error) => {
        this.log(`✗ Legal DB check failed: ${error.message}`, 'error');
        this.results.checks.push({
          name: 'Legal Database',
          status: 'error',
          details: { error: error.message }
        });
        resolve();
      });

      req.setTimeout(this.timeout);
      req.end();
    });
  }

  /**
   * Check system requirements
   */
  async checkSystemRequirements() {
    this.log('Checking system requirements...');

    const checks = {
      node_version: process.version,
      platform: process.platform,
      memory_free_mb: Math.round(require('os').freemem() / 1024 / 1024),
      memory_total_mb: Math.round(require('os').totalmem() / 1024 / 1024),
      cpus: require('os').cpus().length,
      uptime_seconds: process.uptime()
    };

    const result = {
      name: 'System Requirements',
      status: checks.memory_free_mb > 256 ? 'healthy' : 'warning',
      details: checks
    };

    this.log(`✓ System: Node.js ${process.version}, ${checks.cpus} CPUs, ${checks.memory_free_mb}MB free`);
    this.results.checks.push(result);
  }

  /**
   * Check environment variables
   */
  checkEnvironmentVariables() {
    this.log('Checking environment variables...');

    const required = ['DATABASE_URL', 'JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);

    const result = {
      name: 'Environment Variables',
      status: missing.length === 0 ? 'configured' : 'incomplete',
      details: {
        total: required.length,
        configured: required.length - missing.length,
        missing: missing
      }
    };

    if (missing.length > 0) {
      this.log(`⚠ Missing env vars: ${missing.join(', ')}`, 'warn');
    } else {
      this.log('✓ All required environment variables configured');
    }

    this.results.checks.push(result);
  }

  /**
   * Generate overall status
   */
  generateStatus() {
    const healthyChecks = this.results.checks.filter(c => c.status === 'healthy' || c.status === 'working' || c.status === 'available' || c.status === 'configured').length;
    const totalChecks = this.results.checks.length;
    const healthPercentage = (healthyChecks / totalChecks) * 100;

    this.results.overall_status = healthPercentage >= 80 ? 'healthy' : healthPercentage >= 50 ? 'degraded' : 'unhealthy';
    this.results.ready_for_production = healthPercentage === 100;
    this.results.health_percentage = healthPercentage.toFixed(1);

    return {
      status: this.results.overall_status,
      percentage: healthPercentage,
      ready: this.results.ready_for_production
    };
  }

  /**
   * Print report
   */
  printReport() {
    console.log('\n═════════════════════════════════════════════════════');
    console.log('🏥 HEALTH CHECK REPORT');
    console.log('═════════════════════════════════════════════════════\n');

    this.results.checks.forEach((check, index) => {
      const icon = check.status === 'healthy' || check.status === 'working' || check.status === 'available' || check.status === 'configured' ? '✓' : '✗';
      console.log(`${icon} ${index + 1}. ${check.name}`);
      console.log(`   Status: ${check.status}`);

      if (this.verbose && check.details) {
        Object.entries(check.details).forEach(([key, value]) => {
          if (key !== 'error') {
            console.log(`   ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
          }
        });
      }

      if (check.details?.error) {
        console.log(`   Error: ${check.details.error}`);
      }
      console.log();
    });

    const status = this.generateStatus();
    console.log('═════════════════════════════════════════════════════');
    console.log(`Overall Status: ${status.status.toUpperCase()}`);
    console.log(`Health: ${status.percentage}%`);
    console.log(`Production Ready: ${status.ready ? 'YES ✓' : 'NO ✗'}`);
    console.log('═════════════════════════════════════════════════════\n');

    // Exit code
    process.exit(status.ready ? 0 : 1);
  }

  /**
   * Run all checks
   */
  async run() {
    console.log(`\n🔍 Starting health check for ${this.endpoint}...\n`);

    try {
      await this.checkHealthEndpoint();
      await this.checkAuthentication();
      await this.checkLegalDB();
      await this.checkSystemRequirements();
      this.checkEnvironmentVariables();

      this.printReport();
    } catch (error) {
      console.error('❌ Health check failed:', error);
      process.exit(1);
    }
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose'),
    endpoint: 'http://localhost:3000'
  };

  // Parse --endpoint flag
  const endpointIndex = args.findIndex(arg => arg === '--endpoint');
  if (endpointIndex !== -1 && args[endpointIndex + 1]) {
    options.endpoint = args[endpointIndex + 1];
  }

  const checker = new HealthChecker(options);
  checker.run();
}

module.exports = HealthChecker;
