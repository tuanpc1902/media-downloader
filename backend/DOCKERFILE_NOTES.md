# Dockerfile Notes for Fly.io

## Current Dockerfile

File `Dockerfile` đã được tối ưu với:
- ✅ Multi-stage build (giảm kích thước image)
- ✅ Security: Non-root user
- ✅ Health check
- ✅ Layer caching optimization
- ✅ Production dependencies only

## Image Size

- **Before optimization**: ~800MB
- **After optimization**: ~400-500MB (giảm ~40%)

## Build Time

- **First build**: ~5-10 minutes
- **Cached build**: ~2-3 minutes

## Features

### Multi-stage Build
1. **Builder stage**: Cài dependencies và build TypeScript
2. **Production stage**: Chỉ copy files cần thiết

### Security
- Non-root user (`appuser`) để chạy app
- Minimal base image (`node:18-slim`)
- No unnecessary packages

### Health Check
- Check `/api/health` endpoint mỗi 30s
- Fly.io sẽ tự động restart nếu health check fail

## Usage

### Build locally
```bash
cd backend
docker build -t media-downloader-backend .
```

### Test locally
```bash
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e FRONTEND_URL=http://localhost:5173 \
  media-downloader-backend
```

### Deploy to Fly.io
```bash
fly deploy
```

Fly.io sẽ tự động build từ Dockerfile.

## Troubleshooting

### Build fails với "yt-dlp not found"
- Check Python version: `python3 --version`
- Try: `python3 -m pip install --upgrade yt-dlp`

### Out of memory during build
- Increase Fly.io VM memory: `fly scale vm shared-cpu-2x --memory 4096`

### Health check fails
- Check app logs: `fly logs`
- Verify `/api/health` endpoint works
- Increase `--start-period` nếu app cần nhiều thời gian để start

## Alternative Dockerfile

File `Dockerfile.optimized` là version tối ưu hơn với:
- Better layer caching
- Smaller final image
- Faster rebuilds

Để dùng:
```bash
# Rename
mv Dockerfile Dockerfile.original
mv Dockerfile.optimized Dockerfile

# Or specify in fly.toml
[build]
  dockerfile = "Dockerfile.optimized"
```

