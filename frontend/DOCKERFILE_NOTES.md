# Frontend Dockerfile Notes

## Dockerfile Overview

Frontend có 2 Dockerfile:

1. **`Dockerfile`** - Development/Full stack (có proxy đến backend)
2. **`Dockerfile.production`** - Production (static files only, backend deploy riêng)

## Usage

### Development (với docker-compose)

```bash
# Build
docker build -t media-downloader-frontend .

# Run với docker-compose (có backend service)
docker-compose up
```

Dockerfile này sẽ:
- Build Vite app
- Serve static files với nginx
- Proxy `/api` và `/socket.io` đến backend

### Production (deploy riêng)

```bash
# Build
docker build -f Dockerfile.production -t media-downloader-frontend:prod .

# Run
docker run -p 80:80 media-downloader-frontend:prod
```

**Lưu ý**: 
- Backend phải deploy riêng (Fly.io)
- Set environment variables trong build time hoặc runtime
- Frontend sẽ call backend qua `VITE_API_URL` env var

## Cloudflare Pages vs Docker

**Cloudflare Pages** (Recommended):
- ✅ Free tier
- ✅ CDN global
- ✅ Auto HTTPS
- ✅ Git integration
- ✅ Không cần Docker

**Docker** (Self-hosting):
- ✅ Full control
- ✅ Có thể proxy backend
- ❌ Cần manage server
- ❌ Cần setup HTTPS

## Image Size

- **Builder stage**: ~500MB (có node_modules)
- **Production stage**: ~50MB (chỉ nginx + static files)
- **Total**: ~50MB (sau khi build)

## Build Time

- **First build**: ~3-5 minutes
- **Cached build**: ~1-2 minutes

## Environment Variables

Frontend cần env vars trong build time (Vite):
```
VITE_API_URL=https://backend.fly.dev/api
VITE_WS_URL=https://backend.fly.dev
```

### Build với env vars:

```bash
docker build \
  --build-arg VITE_API_URL=https://backend.fly.dev/api \
  --build-arg VITE_WS_URL=https://backend.fly.dev \
  -t media-downloader-frontend .
```

Hoặc dùng `.env` file (cần update Dockerfile để support).

## Nginx Configuration

- **`nginx.conf`**: Development (có proxy)
- **`nginx.production.conf`**: Production (static only)

## Health Check

Dockerfile có health check endpoint:
- Check: `http://localhost/health`
- Interval: 30s
- Timeout: 3s

## Troubleshooting

### Build fails
- Check Node.js version (nên dùng 20)
- Check npm cache: `npm cache clean --force`

### Static files không load
- Check nginx config
- Check file permissions
- Check dist/ folder có files không

### API calls fail
- Check `VITE_API_URL` env var
- Check CORS settings trong backend
- Check browser console

