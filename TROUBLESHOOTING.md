# Troubleshooting Guide

## Next.js Cache Corruption Issues

### Symptoms:
```
Error: ENOENT: no such file or directory, open '.next/static/development/_buildManifest.js.tmp.xxxxx'
Error: ENOENT: no such file or directory, open '.next/server/app/page/app-build-manifest.json'
```

### Quick Fix:
```bash
# Run the cache clearing script
./scripts/clear-cache.sh

# Or manually:
rm -rf .next .swc node_modules/.cache
npm run build
```

### Common Causes:
1. **Interrupted builds** - Stopping `npm run build` or `npm run dev` mid-process
2. **File system permissions** - Sometimes cache files get corrupted permissions
3. **Turbopack cache issues** - Next.js 15 with Turbopack can sometimes have cache conflicts
4. **Concurrent processes** - Running multiple `npm run dev` or build processes simultaneously

### Prevention:
1. **Clean shutdowns** - Always use Ctrl+C to stop dev server cleanly
2. **Single process** - Don't run multiple dev servers simultaneously
3. **Regular cache clearing** - Run `./scripts/clear-cache.sh` if you encounter issues
4. **Use the script** - The provided script handles all cache clearing automatically

### If Issues Persist:
1. Check disk space: `df -h`
2. Check file permissions: `ls -la .next` (if directory exists)
3. Try without Turbopack: Change `"dev": "next dev"` in package.json temporarily
4. Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install`

## Other Common Issues

### TypeScript Compilation Errors
- Run: `npx tsc --noEmit` to check for type errors
- Most common: Missing imports or interface mismatches

### Database Connection Issues  
- Check `.env` file has correct Supabase credentials
- Verify network connectivity to Supabase

### Environment Variables Not Loading
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Restart dev server after changing `.env` file

### Build Size Issues
- Check bundle analyzer: `npm run build && npx @next/bundle-analyzer`
- Look for large dependencies that could be optimized

## Performance Tips

### Development
- Use `npm run dev` for development (includes hot reload)
- Use `npm run build` for production testing
- Clear cache if you see stale data or weird behavior

### Production
- Always run `npm run build` before deployment
- Use the unified `supabase/schema.sql` for database setup
- Enable Row Level Security policies in production

## Quick Commands

```bash
# Clear all caches
./scripts/clear-cache.sh

# Full rebuild
rm -rf .next node_modules/.cache && npm run build

# Check TypeScript
npx tsc --noEmit

# Check bundle size
npm run build && du -sh .next

# Start fresh development
npm run dev
```