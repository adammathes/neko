#!/bin/sh

echo "Running pre-push hooks..."
make check

RESULT=$?

if [ $RESULT -ne 0 ]; then
    echo "Pre-push check failed. Please fix issues before pushing."
    exit 1
fi

echo "Pre-push check passed."
exit 0
