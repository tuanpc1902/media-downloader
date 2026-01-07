# ⚡ Quick Deploy Backend - 3 Bước

Frontend URL: **https://media-downloader-brc.pages.dev/**

## Bước 1: Set Secrets

```bash
# Frontend URL (QUAN TRỌNG - cho CORS)
fly secrets set FRONTEND_URL=https://media-downloader-brc.pages.dev

# Production environment
fly secrets set NODE_ENV=production

# Redis (Optional - nếu có)
# fly secrets set REDIS_URL=redis://default:password@host.upstash.io:6379
```

## Bước 2: Deploy

```bash
# Từ root directory (fly.toml đã config sẵn)
fly deploy

# Hoặc từ backend directory
cd backend
fly deploy
```

## Bước 3: Update Frontend Env Vars

Sau khi backend deploy xong, update frontend:

1. Cloudflare Dashboard → Pages → media-downloader
2. Settings → Environment variables
3. Update:
   ```
   VITE_API_URL=https://media-downloader-uge-da.fly.dev/api
   VITE_WS_URL=https://media-downloader-uge-da.fly.dev
   ```
4. Redeploy frontend

## ✅ Test

```bash
# Check backend
curl https://media-downloader-uge-da.fly.dev/api/health

# Check logs
fly logs
```

## 🎉 Done!

Backend: `https://media-downloader-uge-da.fly.dev`  
Frontend: `https://media-downloader-brc.pages.dev`

