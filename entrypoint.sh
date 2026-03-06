#!/bin/sh
set -e

echo "Pushing database schema..."
npx drizzle-kit push --force
echo "Schema ready."

exec "$@"
