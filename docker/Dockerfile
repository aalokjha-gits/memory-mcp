# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Default configuration
ENV QDRANT_URL=http://qdrant:6333
ENV EMBEDDING_PROVIDER=local
ENV EMBEDDING_URL=http://embeddings:8080
ENV PORT=3000
ENV LOG_LEVEL=info

EXPOSE 3000

CMD ["node", "dist/index.js"]
