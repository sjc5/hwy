# Install and Build Stage
FROM oven/bun:alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build

# Production stage
FROM oven/bun:alpine AS production
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production
COPY --from=builder /app/dist ./
COPY --from=builder /app/public/dist ./
COPY --from=builder /app/markdown ./
COPY --from=builder /app/package.json ./
CMD ["bun", "start"]
