# --- Frontend Base Stage ---
FROM node:20-alpine as frontend
WORKDIR /app
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# --- Backend Build Stage ---
FROM golang:1.22-alpine as backend-builder
WORKDIR /app
COPY . .
RUN mkdir -p dist/kiruna && touch dist/kiruna/x
COPY --from=frontend /app/node_modules ./node_modules
RUN go run ./cmd/build
RUN CGO_ENABLED=0 GOOS=linux go build -mod=readonly -v -o /app/server ./cmd/app

# --- Final Stage ---
FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates
COPY --from=backend-builder /app/server /app
RUN adduser -D myuser
USER myuser
ENTRYPOINT ["/app/server"]
