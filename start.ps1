param()

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  Write-Host "npm was not found. Install Node.js 20+ first, then rerun this script." -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path (Join-Path $projectRoot 'node_modules'))) {
  Write-Host "Installing dependencies..." -ForegroundColor Cyan
  npm.cmd install
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

npm.cmd run dev
exit $LASTEXITCODE