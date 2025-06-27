#!/bin/bash

# Ensure script exits on error
set -e

echo "===== Deploying Backend to Fly.io ====="

# 1. Check if logged in to Fly.io
echo "Step 1: Checking Fly.io login status..."
if ! fly auth whoami &> /dev/null; then
  echo "Not logged in to Fly.io. Please run 'fly auth login' first."
  exit 1
fi

# 2. Ensure .env.production exists
echo "Step 2: Checking production environment file..."
if [ ! -f .env.production ]; then
  echo "Error: .env.production file not found!"
  echo "Please create this file with your production environment variables."
  exit 1
fi

# 3. First-time setup or deployment?
echo "Step 3: Checking if this is a first-time deployment..."
if ! fly apps list | grep -q "malabon-pickleball-api"; then
  echo "First time deployment detected. Launching app..."
  fly launch --dockerfile Dockerfile --region sjc --no-deploy
  echo "App created on Fly.io!"
else
  echo "Existing app detected. Will deploy updates."
fi

# 4. Set secrets from .env.production
echo "Step 4: Setting secrets from .env.production..."
while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip comments and empty lines
  if [[ ! "$line" =~ ^\# && -n "$line" ]]; then
    # Extract key and value
    key=$(echo "$line" | cut -d '=' -f 1)
    value=$(echo "$line" | cut -d '=' -f 2-)
    
    # Set secret if it contains value
    if [[ -n "$key" && -n "$value" ]]; then
      echo "Setting secret: $key"
      fly secrets set "$key=$value" --app malabon-pickleball-api
    fi
  fi
done < .env.production

# 5. Deploy the application
echo "Step 5: Deploying application..."
fly deploy

echo "===== Deployment Complete ====="
echo "Your API is now available at: https://malabon-pickleball-api.fly.dev" 