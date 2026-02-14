#!/bin/bash
set -e

# Cleanup function to kill the neko process and remove the test db
cleanup() {
    echo "Cleaning up..."
    if [ -n "$NEKO_PID" ]; then
        kill $NEKO_PID 2>/dev/null || true
    fi
    rm -f neko_test.db
}

# Register cleanup to run on exit
trap cleanup EXIT

echo "Building neko..."
go build -o neko .

echo "Starting neko backend on port 4994..."
./neko -d neko_test.db -s 4994 > /dev/null 2>&1 &
NEKO_PID=$!

echo "Waiting for backend to start..."
# simple wait loop
for i in {1..10}; do
    if nc -z localhost 4994; then
        echo "Backend is up!"
        break
    fi
    sleep 1
done

echo "Running Playwright tests..."
cd frontend
# Ensure we use the correct credentials/config if needed by the tests
# The tests currently hardcode /v2/login but don't seem to have the password hardcoded in the fill step yet?
# Looking at e2e.spec.ts: await page.fill('#password', ''); - it fills empty string?
# usage of 'secret' matches nothing in the test.
# Let's check e2e.spec.ts again to match expectations exactly.
# In e2e.spec.ts: await page.fill('#password', '');
# It implies it expects no password or ignores it?
# Or maybe the previous test run failed because of this too.
# I will set a simple password 'secret' and we might need to update the test to use it.
# Actually, let's look at the test content again.

npm run test:e2e
