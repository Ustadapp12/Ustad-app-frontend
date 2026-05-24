# Re-apply after npm install — fixes Gradle 9 + IBM_SEMERU build error.
$path = Join-Path $PSScriptRoot "..\node_modules\@react-native\gradle-plugin\settings.gradle.kts"
if (-not (Test-Path $path)) {
  Write-Error "gradle-plugin not found. Run npm install first."
  exit 1
}
$content = Get-Content $path -Raw
$updated = $content -replace 'foojay-resolver-convention"\)\.version\("0\.5\.0"\)', 'foojay-resolver-convention").version("1.0.0")'
if ($content -eq $updated) {
  Write-Host "Foojay patch already applied (or version changed)."
} else {
  Set-Content -Path $path -Value $updated -NoNewline
  Write-Host "Patched foojay-resolver-convention to 1.0.0"
}
