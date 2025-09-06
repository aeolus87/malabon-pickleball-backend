#!/usr/bin/env bash
set -euo pipefail

# Helper to set Fly.io secrets for production. Prompts for values if not set.

require() {
  local key="$1"; local prompt="$2"; local default="${3-}"
  local val="${!key-}"
  if [[ -z "${val}" ]]; then
    read -r -p "${prompt}${default:+ [${default}]}: " val
    if [[ -z "${val}" && -n "${default}" ]]; then val="${default}"; fi
  fi
  printf '%s' "$val"
}

SERVER_URL=$(require SERVER_URL "Server public URL" "https://malabon-pickleball-api.fly.dev")
CLIENT_URL=$(require CLIENT_URL "Frontend URL (prod)")
JWT_SECRET=$(require JWT_SECRET "JWT secret (random string)")
MONGODB_URI_PROD=$(require MONGODB_URI_PROD "MongoDB URI (prod)")
GOOGLE_CLIENT_ID=$(require GOOGLE_CLIENT_ID "Google Client ID")
GOOGLE_CLIENT_SECRET=$(require GOOGLE_CLIENT_SECRET "Google Client Secret")
CLOUDINARY_CLOUD_NAME=$(require CLOUDINARY_CLOUD_NAME "Cloudinary cloud name")
CLOUDINARY_API_KEY=$(require CLOUDINARY_API_KEY "Cloudinary API key")
CLOUDINARY_API_SECRET=$(require CLOUDINARY_API_SECRET "Cloudinary API secret")
RESEND_API_KEY=$(require RESEND_API_KEY "Resend API key (optional)" "")
DOMAIN=$(require DOMAIN "Email domain" "malabonpickleballers.com")
SUPER_ADMIN_USERNAME=$(require SUPER_ADMIN_USERNAME "Super admin username")
SUPER_ADMIN_PASSWORD=$(require SUPER_ADMIN_PASSWORD "Super admin password")

echo "\nSetting Fly.io secrets..."
flyctl secrets set \
  NODE_ENV=production \
  SERVER_URL="${SERVER_URL}" \
  CLIENT_URL="${CLIENT_URL}" \
  JWT_SECRET="${JWT_SECRET}" \
  MONGODB_URI_PROD="${MONGODB_URI_PROD}" \
  GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}" \
  GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET}" \
  CLOUDINARY_CLOUD_NAME="${CLOUDINARY_CLOUD_NAME}" \
  CLOUDINARY_API_KEY="${CLOUDINARY_API_KEY}" \
  CLOUDINARY_API_SECRET="${CLOUDINARY_API_SECRET}" \
  DOMAIN="${DOMAIN}" \
  SUPER_ADMIN_USERNAME="${SUPER_ADMIN_USERNAME}" \
  SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD}" ${RESEND_API_KEY:+RESEND_API_KEY="${RESEND_API_KEY}"}

echo "\nDone. Deploy with: flyctl deploy --remote-only"

