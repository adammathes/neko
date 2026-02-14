#!/bin/bash
set -e

# Cleanup first
scripts/clean_test_env.sh

echo "Building backend..."
go build -o neko_server ./cmd/neko

echo "Creating data directory..."
mkdir -p .data

echo "Starting backend on port 4994..."
./neko_server --http=4994 --database=.data/test.db > backend.log 2>&1 &
SERVER_PID=$!

echo "Backend PID: $SERVER_PID"

# Wait for server to be ready
echo "Waiting for backend to start..."
for i in {1..30}; do
    if nc -z localhost 4994; then
        echo "Backend is up!"
        break
    fi
    echo "Waiting..."
    sleep 1
done

if ! nc -z localhost 4994; then
    echo "Backend failed to start. Check backend.log"
    cat backend.log
    kill $SERVER_PID || true
    exit 1
fi

echo "Running E2E tests..."
cd frontend
if npm run test:e2e; then
    echo "Tests passed!"
    EXIT_CODE=0
else
    echo "Tests failed!"
    EXIT_CODE=1
fi
cd ..

echo "Cleaning up..."
kill $SERVER_PID || true
scripts/clean_test_env.sh

exit $EXIT_CODE
