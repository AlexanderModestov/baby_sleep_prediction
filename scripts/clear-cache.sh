#!/bin/bash

# Clear Next.js Cache Script
# Run this if you encounter ENOENT build manifest errors

echo "🧹 Clearing Next.js caches..."

# Remove Next.js build cache
rm -rf .next
echo "✅ Removed .next directory"

# Remove SWC cache (Turbopack cache)
rm -rf .swc
echo "✅ Removed .swc directory"

# Remove Node.js cache
rm -rf node_modules/.cache
echo "✅ Removed node_modules/.cache"

# Clear npm cache (ignore errors)
npm cache clean --force 2>/dev/null || echo "⚠️  npm cache clean had issues (this is usually fine)"

echo ""
echo "🎉 Cache cleared! You can now run:"
echo "   npm run build"
echo "   npm run dev"
echo ""