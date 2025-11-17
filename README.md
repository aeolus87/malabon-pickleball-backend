# Malabon Pickleball Backend

## Environment Variables

The following environment variables are required:

```
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Super Admin Access (Required)
SUPER_ADMIN_USERNAME=your_super_admin_username
SUPER_ADMIN_PASSWORD=your_secure_password  # Use a strong password!
```

**Important Security Note:** Never commit actual values of these environment variables to the repository. Use a secure method to manage and distribute these credentials.

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
JWT_SECRET=your_development_jwt_secret

# Client Configuration
CLIENT_URL=http://localhost:5173

# Google OAuth (development)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Email Configuration (development) - Resend
RESEND_API_KEY=your_resend_api_key_here
DOMAIN=malabonpickleballers.com

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
CLIENT_URL=https://malabon-pickleball-client.vercel.app


# Google OAuth (production)
GOOGLE_CLIENT_ID=your_production_google_client_id_here
GOOGLE_CLIENT_SECRET=your_production_google_client_secret_here

# Email Configuration (production) - Resend
RESEND_API_KEY=your_production_resend_api_key_here
DOMAIN=malabonpickleballers.com

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

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your environment variables in a `.env` file
4. Run the development server: `npm run dev`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server 