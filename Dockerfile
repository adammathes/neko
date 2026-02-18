# Stage 1: Frontend Build
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Backend Build
FROM golang:1.24-bullseye AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# Copy built frontend assets from Stage 1
# Ensure the target directory structure matches what embed expects in web/web.go
RUN mkdir -p web/dist/v2
COPY --from=frontend-builder /app/frontend/dist ./web/dist/v2

# Build the binary
RUN go build -o neko ./cmd/neko

# Stage 3: Final Image
FROM debian:bullseye-slim

# Create a non-root user
RUN groupadd -r neko && useradd -r -g neko neko

WORKDIR /app
COPY --from=backend-builder /app/neko .
COPY --from=backend-builder /app/static ./static

# Ensure data directory exists and set permissions
RUN mkdir -p /app/data && chown -R neko:neko /app/data

# Default environment variables
ENV NEKO_PORT=8080
ENV NEKO_DB=/app/data/neko.db

EXPOSE 8080

# Switch to non-root user
USER neko

CMD ["./neko", "-s", "8080", "-d", "/app/data/neko.db"]
