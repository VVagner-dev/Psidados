# PowerShell helper to start backend and frontend via the Python script
$script = Join-Path $PSScriptRoot 'start_servers.py'
if (-Not (Test-Path $script)) {
  Write-Error "start_servers.py not found at $script"
  exit 1
}
python $script --wait
