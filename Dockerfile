FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy build configuration
COPY tsconfig.json ./

# Copy source code
COPY src/ src/

# Install dev dependencies for TypeScript compilation
RUN npm ci && npm run build

# Remove development dependencies
RUN npm prune --production

# We'll use Fly.io secrets instead of copying .env.production

EXPOSE 8080

CMD ["node", "dist/index.js"] 