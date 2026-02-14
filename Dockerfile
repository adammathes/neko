# Stage 1: Frontend Build
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Backend Build
FROM golang:1.23-bullseye AS backend-builder
RUN go install github.com/GeertJohan/go.rice/rice@latest

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Embed assets and build the binary
RUN rice -i ./web embed-go
RUN go build -o neko .

# Stage 3: Final Image
FROM debian:bullseye-slim
WORKDIR /app
COPY --from=backend-builder /app/neko .
COPY --from=backend-builder /app/static ./static

# Ensure data directory exists
RUN mkdir -p /app/data

# Default environment variables
ENV NEKO_PORT=8080
ENV NEKO_DB=/app/data/neko.db

EXPOSE 8080

CMD ["./neko", "-s", "8080", "-d", "/app/data/neko.db"]
