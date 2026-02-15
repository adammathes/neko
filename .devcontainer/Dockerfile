FROM mcr.microsoft.com/devcontainers/go:1.24-bullseye

# Install additional OS packages for CGO, SQLite, and devcontainer networking
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    build-essential \
    sqlite3 \
    libsqlite3-dev \
    socat \
    curl \
    procps \
    git

# Install golangci-lint (for ticket NK-arckp3)
RUN curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.64.5

# Install Node.js 20 directly (so this image works with vanilla Docker without devcontainer features)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs
