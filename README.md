# Malabon Pickleball Backend

## Environment Setup

Create the following environment files in the root directory:

### `.env.development`
```bash
# Development Environment Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/malabon_pickleball_dev

# JWT Configuration
JWT_SECRET=your_development_jwt_secret_here

# Client Configuration
CLIENT_URL=http://localhost:5173

# Google OAuth (development)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Email Configuration (development)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here

# Development specific settings
DEBUG=true
VERBOSE_LOGGING=true
```

### `.env.production`
```bash
# Production Environment Configuration
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=your_production_mongodb_uri_here

# JWT Configuration
JWT_SECRET=your_production_jwt_secret_here

# Client Configuration
CLIENT_URL=https://malabonpickleballers.com

# Google OAuth (production)
GOOGLE_CLIENT_ID=your_production_google_client_id_here
GOOGLE_CLIENT_SECRET=your_production_google_client_secret_here

# Email Configuration (production)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_production_email@gmail.com
EMAIL_PASS=your_production_app_password_here

# Production specific settings
DEBUG=false
VERBOSE_LOGGING=false
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start development server (Windows)
npm run dev:win

# Build for development
npm run build:dev

# Clean build directory
npm run clean
```

## Production Commands

```bash
# Build for production
npm run build:prod

# Start production server
npm run start

# Start production server (Windows)
npm run start:win
```

## Features

- ✅ Environment-based configuration (development/production)
- ✅ TypeScript support with hot reloading
- ✅ Socket.IO integration
- ✅ JWT authentication
- ✅ Google OAuth integration
- ✅ MongoDB integration
- ✅ CORS configuration
- ✅ Health check endpoint 