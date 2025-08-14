FROM node:18-alpine

WORKDIR /app

# Install system dependencies for video processing
RUN apk add --no-cache build-base python3

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create necessary directories
RUN mkdir -p uploads processed

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "app.js"]