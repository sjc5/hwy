# Install and Build Stage
FROM oven/bun:alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN bun install
COPY . .
RUN bun run build

# Production stage
FROM oven/bun:alpine AS production
WORKDIR /app
COPY package*.json ./
RUN bun install --ci
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public/dist ./public/dist
COPY --from=builder /app/markdown ./markdown
COPY --from=builder /app/package.json ./package.json
CMD ["bun", "start"]
