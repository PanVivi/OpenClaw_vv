$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'CodexTaskPanelClient.ps1'
$output = & $scriptPath -Action Test | ConvertFrom-Json
if (-not $output.passed) {
    throw "CodexTaskPanelClient offline tests failed: $($output.failed -join ', ')"
}
$output | ConvertTo-Json -Depth 10
