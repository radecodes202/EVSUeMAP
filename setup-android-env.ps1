# Android Environment Setup Script for EVSUeMAP
# Run this script as Administrator or set environment variables manually

Write-Host "Setting up Android environment variables..." -ForegroundColor Green

$androidSdkPath = "$env:LOCALAPPDATA\Android\Sdk"

if (Test-Path $androidSdkPath) {
    Write-Host "[OK] Android SDK found at: $androidSdkPath" -ForegroundColor Green
    
    # Set ANDROID_HOME for current session
    $env:ANDROID_HOME = $androidSdkPath
    Write-Host "[OK] ANDROID_HOME set for current session" -ForegroundColor Green
    
    # Set system-wide environment variable (requires admin)
    try {
        [System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidSdkPath, [System.EnvironmentVariableTarget]::User)
        Write-Host "[OK] ANDROID_HOME set for user" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Could not set system-wide variable. Run PowerShell as Administrator for permanent setup." -ForegroundColor Yellow
    }
    
    # Add to PATH
    $pathsToAdd = @(
        "$androidSdkPath\platform-tools",
        "$androidSdkPath\tools",
        "$androidSdkPath\tools\bin"
    )
    
    $currentPath = [System.Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::User)
    
    foreach ($path in $pathsToAdd) {
        if (Test-Path $path) {
            if ($currentPath -notlike "*$path*") {
                $newPath = "$currentPath;$path"
                [System.Environment]::SetEnvironmentVariable("Path", $newPath, [System.EnvironmentVariableTarget]::User)
                Write-Host "[OK] Added to PATH: $path" -ForegroundColor Green
            } else {
                Write-Host "[OK] Already in PATH: $path" -ForegroundColor Cyan
            }
        } else {
            Write-Host "[WARNING] Path not found: $path" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "[OK] Environment setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: You may need to restart your terminal or IDE for changes to take effect." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To verify, run: `$env:ANDROID_HOME" -ForegroundColor Cyan
    
} else {
    Write-Host "[ERROR] Android SDK not found at: $androidSdkPath" -ForegroundColor Red
    Write-Host "Please install Android Studio first." -ForegroundColor Yellow
}

