param(
  [int]$Port = 8000
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Error 'Python is required to run the server. Please install Python and try again.'
  exit 1
}

Write-Host "Starting local server at http://localhost:$Port/" -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop.' -ForegroundColor Yellow
python -m http.server $Port
