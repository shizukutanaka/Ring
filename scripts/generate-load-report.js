const fs = require('fs');
const path = require('path');

const reportFile = process.argv[2];

if (!reportFile || !fs.existsSync(reportFile)) {
    console.error('Usage: node generate-load-report.js <path-to-json-report>');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
const timestamp = new Date().toISOString();
const htmlFile = reportFile.replace('.json', '.html');

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report - ${timestamp}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
        .metric-label { color: #666; font-size: 14px; }
        .chart-container { position: relative; height: 400px; margin-bottom: 30px; }
        .status-pass { color: green; }
        .status-fail { color: red; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Load Test Report</h1>
        <p>Generated: ${timestamp}</p>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Total Requests</div>
                <div class="metric-value">${data.metrics.http_reqs.count}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Avg Response Time</div>
                <div class="metric-value">${data.metrics.http_req_duration.avg.toFixed(2)} ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">P95 Response Time</div>
                <div class="metric-value">${data.metrics.http_req_duration['p(95)'].toFixed(2)} ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Failure Rate</div>
                <div class="metric-value" style="color: ${data.metrics.http_req_failed.rate > 0.01 ? 'red' : 'green'}">
                    ${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%
                </div>
            </div>
        </div>

        <h2>Response Time Distribution</h2>
        <div class="chart-container">
            <canvas id="responseTimeChart"></canvas>
        </div>
    </div>

    <script>
        const ctx = document.getElementById('responseTimeChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Min', 'Avg', 'Median', 'P90', 'P95', 'Max'],
                datasets: [{
                    label: 'Response Time (ms)',
                    data: [
                        ${data.metrics.http_req_duration.min},
                        ${data.metrics.http_req_duration.avg},
                        ${data.metrics.http_req_duration.med},
                        ${data.metrics.http_req_duration['p(90)']},
                        ${data.metrics.http_req_duration['p(95)']},
                        ${data.metrics.http_req_duration.max}
                    ],
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Milliseconds' }
                    }
                }
            }
        });
    </script>
</body>
</html>
`;

fs.writeFileSync(htmlFile, htmlContent);
console.log(`Report generated: ${htmlFile}`);
