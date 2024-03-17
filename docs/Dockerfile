# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm run build
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./
COPY --from=builder /app/public/dist ./public/dist
RUN npm prune --production
CMD [ "node", "dist/main.js" ]
