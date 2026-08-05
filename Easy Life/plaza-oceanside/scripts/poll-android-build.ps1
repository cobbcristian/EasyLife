$ErrorActionPreference = "Continue"
$buildId = "77d21a2d-8c6b-4a8d-92fc-a897e77f6ba4"
$statusPath = Join-Path $PSScriptRoot "STATUS.md"
if (-not $PSScriptRoot) { $statusPath = "STATUS.md" }

function Write-Status([string]$msg) {
  Add-Content -Path $statusPath -Value $msg
  Write-Output $msg
}

for ($i = 1; $i -le 60; $i++) {
  Start-Sleep -Seconds 120
  $raw = npx eas-cli build:view $buildId --json --non-interactive 2>&1 | Out-String
  $jsonLine = ($raw -split "`n" | Where-Object { $_.Trim().StartsWith("{") } | Select-Object -Last 1)
  if (-not $jsonLine) {
    Write-Status "- Check ${i}: failed to query"
    continue
  }
  try {
    $b = $jsonLine | ConvertFrom-Json
    $st = [string]$b.status
    Write-Status "- Check ${i} ($(Get-Date -Format 'HH:mm')): $st"
    Write-Output "AGENT_LOOP_TICK_oceanside build=$st"
    if ($st -eq "FINISHED") {
      $url = $b.artifacts.applicationArchiveUrl
      Write-Status ""
      Write-Status "## DONE"
      Write-Status "- AAB: $url"
      Write-Status "- Upload to Play Internal testing next."
      Write-Output "BUILD_FINISHED $url"
      break
    }
    if ($st -eq "ERRORED" -or $st -eq "CANCELED") {
      Write-Status ""
      Write-Status "## FAILED: $st"
      Write-Status "- Open Expo build logs."
      Write-Output "BUILD_FAILED $st"
      break
    }
  } catch {
    Write-Status "- Check ${i}: parse error"
  }
}
