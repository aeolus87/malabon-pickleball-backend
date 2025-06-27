# PowerShell script for deploying to Fly.io on Windows

Write-Host "===== Deploying Backend to Fly.io =====" -ForegroundColor Green

# 1. Check if logged in to Fly.io
Write-Host "Step 1: Checking Fly.io login status..." -ForegroundColor Yellow
$loginStatus = fly auth whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in to Fly.io. Please run 'fly auth login' first." -ForegroundColor Red
    exit 1
}

# 2. Ensure .env.production exists
Write-Host "Step 2: Checking production environment file..." -ForegroundColor Yellow
if (-not (Test-Path .env.production)) {
    Write-Host "Error: .env.production file not found!" -ForegroundColor Red
    Write-Host "Please create this file with your production environment variables." -ForegroundColor Red
    exit 1
}

# 3. First-time setup or deployment?
Write-Host "Step 3: Checking if this is a first-time deployment..." -ForegroundColor Yellow
$appExists = (fly apps list) -match "malabon-pickleball-api"
if (-not $appExists) {
    Write-Host "First time deployment detected. Launching app..." -ForegroundColor Yellow
    fly launch --dockerfile Dockerfile --region sjc --no-deploy
    Write-Host "App created on Fly.io!" -ForegroundColor Green
} else {
    Write-Host "Existing app detected. Will deploy updates." -ForegroundColor Green
}

# 4. Set secrets from .env.production
Write-Host "Step 4: Setting secrets from .env.production..." -ForegroundColor Yellow
$envFile = Get-Content .env.production
foreach ($line in $envFile) {
    # Skip comments and empty lines
    if ((-not $line.StartsWith("#")) -and ($line.Trim() -ne "")) {
        # Extract key and value
        $parts = $line.Split("=", 2)
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            
            # Set secret if it contains value
            if (($key -ne "") -and ($value -ne "")) {
                Write-Host "Setting secret: $key" -ForegroundColor Cyan
                fly secrets set "$key=$value" --app malabon-pickleball-api
            }
        }
    }
}

# 5. Deploy the application
Write-Host "Step 5: Deploying application..." -ForegroundColor Yellow
fly deploy

Write-Host "===== Deployment Complete =====" -ForegroundColor Green
Write-Host "Your API is now available at: https://malabon-pickleball-api.fly.dev" -ForegroundColor Green 