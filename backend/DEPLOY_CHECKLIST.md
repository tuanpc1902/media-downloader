# ✅ Backend Deploy Checklist

## Trước khi deploy

- [ ] Fly CLI đã install: `fly version`
- [ ] Đã login: `fly auth login`
- [ ] App đã tạo: `fly apps create media-downloader-uge-da` (hoặc dùng app hiện có)
- [ ] fly.toml đã được config đúng

## Environment Variables (Secrets)

Set các secrets sau:

```bash
# 1. Frontend URL (QUAN TRỌNG - cho CORS)
fly secrets set FRONTEND_URL=https://media-downloader-brc.pages.dev

# 2. Production environment
fly secrets set NODE_ENV=production

# 3. Redis (Optional - nếu có)
# fly secrets set REDIS_URL=redis://default:password@host.upstash.io:6379
```

## Deploy

```bash
# Từ root directory (fly.toml đã config sẵn)
fly deploy

# Hoặc từ backend directory
cd backend
fly deploy
```

## Sau khi deploy

- [ ] Check logs: `fly logs`
- [ ] Check status: `fly status`
- [ ] Test health: `curl https://media-downloader-uge-da.fly.dev/api/health`
- [ ] Test Redis (nếu có): `curl https://media-downloader-uge-da.fly.dev/api/health/redis`

## Update Frontend

Sau khi backend deploy xong, update frontend env vars:

1. Cloudflare Dashboard → Pages → media-downloader
2. Settings → Environment variables
3. Update:
   ```
   VITE_API_URL=https://media-downloader-uge-da.fly.dev/api
   VITE_WS_URL=https://media-downloader-uge-da.fly.dev
   ```
4. Redeploy frontend

## Test Integration

- [ ] Frontend có thể call backend API
- [ ] WebSocket connects
- [ ] Download jobs work
- [ ] No CORS errors

