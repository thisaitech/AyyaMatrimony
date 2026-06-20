# Run this script with Android Studio CLOSED to fix Gradle sync / lock errors.
# Usage: powershell -ExecutionPolicy Bypass -File fix-gradle-cache.ps1

$ErrorActionPreference = "Stop"
$androidDir = $PSScriptRoot
$projectCache = "C:\Users\acer\.gradle-project-cache\ayya-matrimony"

Write-Host "Stopping Gradle daemons..."
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
& "$androidDir\gradlew.bat" --stop 2>$null

Start-Sleep -Seconds 2

Write-Host "Removing conflicting root node_modules (Expo 56 vs app Expo 52)..."
Remove-Item -Recurse -Force "$androidDir\..\..\node_modules" -ErrorAction SilentlyContinue

Write-Host "Removing stale project cache on D:..."
Remove-Item -Recurse -Force "$androidDir\.gradle" -ErrorAction SilentlyContinue

Write-Host "Preparing project cache on C:..."
New-Item -ItemType Directory -Force -Path $projectCache | Out-Null

Write-Host "Done. Reopen Android Studio and click Sync Project with Gradle Files."
Write-Host "Then build APK via: Build > Build Bundle(s) / APK(s) > Build APK(s)"
