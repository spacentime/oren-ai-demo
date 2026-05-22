 param(
  [int]$Port = 8000
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js is required to run server.js. Please install Node.js and try again.'
  exit 1
}

Write-Host "Starting local server at http://localhost:$Port/" -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop.' -ForegroundColor Yellow
node server.js $Port
