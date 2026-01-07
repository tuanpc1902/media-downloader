#!/bin/bash
# Build script for Cloudflare Pages
# This ensures proper build output

set -e

echo "Installing dependencies..."
npm ci

echo "Building application..."
npm run build

echo "Build complete! Output in ./dist"

