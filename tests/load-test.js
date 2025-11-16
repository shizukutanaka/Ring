/**
 * Load Testing Script for WebRTC Call Recorder
 *
 * Usage: node tests/load-test.js [options]
 * Options:
 *   --duration 60000     Test duration in milliseconds (default: 60000)
 *   --rps 100            Requests per second (default: 100)
 *   --endpoints api,ws   Endpoints to test (default: api)
 *   --report html        Report format: json, html, csv (default: json)
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

class LoadTester {
  constructor(options = {}) {
    this.duration = options.duration || 60000;
    this.rps = options.rps || 100;
    this.endpoints = options.endpoints || ['api'];
    this.reportFormat = options.report || 'json';

    this.results = {
      total_requests: 0,
      successful: 0,
      failed: 0,
      response_times: [],
      errors: [],
      start_time: null,
      end_time: null
    };

    this.isRunning = false;
  }

  /**
   * Test API endpoints
   */
  async testApi() {
    const apiTests = [
      { method: 'GET', path: '/health', name: 'Health Check' },
      { method: 'POST', path: '/api/login', name: 'Login', body: { username: 'admin', password: 'admin123' } },
      { method: 'GET', path: '/api/legaldb/latest', name: 'Legal DB Latest' },
      { method: 'GET', path: '/api/legaldb/lookup?country_code=JP', name: 'Legal DB Lookup' }
    ];

    console.log(`🚀 Starting API load test (${this.rps} RPS for ${this.duration}ms)...\n`);

    this.results.start_time = new Date();

    const endTime = Date.now() + this.duration;
    let requestCount = 0;

    while (Date.now() < endTime && this.isRunning) {
      const testToRun = apiTests[requestCount % apiTests.length];
      const timeToWait = (1000 / this.rps) - ((Date.now() - this.results.start_time) % (1000 / this.rps));

      if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }

      await this.sendRequest(testToRun);
      requestCount++;

      // Progress indicator every 100 requests
      if (requestCount % 100 === 0) {
        process.stdout.write(`\r📊 Requests sent: ${requestCount} | Success: ${this.results.successful} | Failed: ${this.results.failed}`);
      }
    }

    this.results.end_time = new Date();
    this.isRunning = false;

    console.log('\n\n✅ Load test completed!\n');
    this.printReport();
  }

  /**
   * Send HTTP request and measure response time
   */
  sendRequest(test) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: test.path,
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;

          this.results.total_requests++;

          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.results.successful++;
          } else {
            this.results.failed++;
            this.results.errors.push({
              test: test.name,
              statusCode: res.statusCode,
              message: data
            });
          }

          this.results.response_times.push(responseTime);
          resolve();
        });
      });

      req.on('error', (error) => {
        this.results.total_requests++;
        this.results.failed++;
        this.results.errors.push({
          test: test.name,
          error: error.message
        });
        resolve();
      });

      req.setTimeout(5000);

      if (test.body) {
        req.write(JSON.stringify(test.body));
      }

      req.end();
    });
  }

  /**
   * Calculate statistics
   */
  calculateStats() {
    if (this.results.response_times.length === 0) {
      return {};
    }

    const sorted = [...this.results.response_times].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      min: Math.min(...sorted),
      max: Math.max(...sorted),
      mean: sum / sorted.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Print report
   */
  printReport() {
    const stats = this.calculateStats();
    const successRate = ((this.results.successful / this.results.total_requests) * 100).toFixed(2);
    const duration = (this.results.end_time - this.results.start_time) / 1000;
    const actualRps = (this.results.total_requests / duration).toFixed(2);

    console.log('═════════════════════════════════════════════════════');
    console.log('📈 LOAD TEST REPORT');
    console.log('═════════════════════════════════════════════════════\n');

    console.log('📊 Summary:');
    console.log(`   Total Requests:     ${this.results.total_requests}`);
    console.log(`   Successful:         ${this.results.successful}`);
    console.log(`   Failed:             ${this.results.failed}`);
    console.log(`   Success Rate:       ${successRate}%`);
    console.log(`   Duration:           ${duration.toFixed(2)}s`);
    console.log(`   Actual RPS:         ${actualRps}\n`);

    console.log('⏱️  Response Times (ms):');
    console.log(`   Min:                ${stats.min?.toFixed(2) || 'N/A'}`);
    console.log(`   Max:                ${stats.max?.toFixed(2) || 'N/A'}`);
    console.log(`   Mean:               ${stats.mean?.toFixed(2) || 'N/A'}`);
    console.log(`   Median:             ${stats.median?.toFixed(2) || 'N/A'}`);
    console.log(`   95th Percentile:    ${stats.p95?.toFixed(2) || 'N/A'}`);
    console.log(`   99th Percentile:    ${stats.p99?.toFixed(2) || 'N/A'}\n`);

    if (this.results.errors.length > 0 && this.results.errors.length <= 10) {
      console.log('❌ Errors:');
      this.results.errors.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.test || 'Unknown'}: ${err.error || err.statusCode}`);
      });
      console.log();
    }

    console.log('═════════════════════════════════════════════════════\n');

    // Save report if needed
    if (this.reportFormat === 'json') {
      console.log('💾 Report saved to: load-test-report.json');
      require('fs').writeFileSync(
        'load-test-report.json',
        JSON.stringify({ ...this.results, stats }, null, 2)
      );
    }
  }

  /**
   * Start load test
   */
  async start() {
    this.isRunning = true;
    await this.testApi();
  }

  /**
   * Stop load test
   */
  stop() {
    this.isRunning = false;
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];

    if (key === 'duration' || key === 'rps') {
      options[key] = parseInt(value);
    } else {
      options[key] = value;
    }
  }

  const tester = new LoadTester(options);

  process.on('SIGINT', () => {
    console.log('\n\n⏹️  Stopping test...');
    tester.stop();
    process.exit(0);
  });

  tester.start().catch(err => {
    console.error('❌ Load test failed:', err);
    process.exit(1);
  });
}

module.exports = LoadTester;
