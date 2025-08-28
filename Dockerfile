FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache \
    build-base \
    python3 \
    ffmpeg \
    ffmpeg-dev
    
COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads processed

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

CMD ["node", "app.js"]