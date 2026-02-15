FROM mcr.microsoft.com/devcontainers/go:1.24-bullseye

# Install additional OS packages for CGO and SQLite
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends build-essential sqlite3 libsqlite3-dev

# [Optional] Install Node.js is handled by features in devcontainer.json
