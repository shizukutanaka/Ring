<#
.SYNOPSIS
Runs load tests using k6 in Docker.

.DESCRIPTION
This script executes k6 load tests defined in the tests/load directory using the docker-compose service.
It supports selecting specific scenarios and generating HTML reports.

.PARAMETER Scenario
The name of the scenario to run (default: "main").
Options: "main", "codecs", "mixed", "soak", "stress"

.EXAMPLE
.\scripts\run-load-tests.ps1 -Scenario codecs
#>

param (
    [ValidateSet("main", "codecs", "mixed", "soak", "stress")]
    [string]$Scenario = "main"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Load Test: $Scenario" -ForegroundColor Cyan

# Ensure reports directory exists
$ReportDir = Join-Path $PSScriptRoot "..\tests\load\reports"
if (-not (Test-Path $ReportDir)) {
    New-Item -ItemType Directory -Path $ReportDir | Out-Null
}

# Define script path based on scenario
$ScriptMap = @{
    "main"   = "/scripts/load-test-main.js"
    "codecs" = "/scripts/load-test-codecs.js"
    "mixed"  = "/scripts/load-test-mixed.js"
    "soak"   = "/scripts/load-test-soak.js"
    "stress" = "/scripts/load-test-stress.js"
}

$ScriptPath = $ScriptMap[$Scenario]
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$JsonReport = "/scripts/reports/report-${Scenario}-${Timestamp}.json"

Write-Host "📂 Script: $ScriptPath" -ForegroundColor Gray
Write-Host "📊 Report: $JsonReport" -ForegroundColor Gray

# Run k6 via Docker Compose
Write-Host "🐳 Running k6 container..." -ForegroundColor Cyan

try {
    docker-compose run --rm load-tester run $ScriptPath --summary-export $JsonReport
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Load test completed successfully!" -ForegroundColor Green
        
        # Generate HTML Report
        Write-Host "📝 Generating HTML report..." -ForegroundColor Cyan
        node (Join-Path $PSScriptRoot "generate-load-report.js") "$ReportDir\report-${Scenario}-${Timestamp}.json"
    } else {
        Write-Host "❌ Load test failed with exit code $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error executing load test: $_" -ForegroundColor Red
}
