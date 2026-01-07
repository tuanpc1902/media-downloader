# 🚀 Deploy Backend lên Fly.io - Hướng dẫn nhanh

## Frontend URL
Frontend của bạn: **https://media-downloader-brc.pages.dev/**

## ✅ Các bước deploy

### Bước 1: Đảm bảo bạn đang ở đúng folder

```bash
# Từ root directory
cd backend
```

Hoặc deploy từ root với fly.toml đã được config sẵn.

### Bước 2: Set Environment Variables (Secrets)

```bash
# Set frontend URL (QUAN TRỌNG cho CORS)
fly secrets set FRONTEND_URL=https://media-downloader-brc.pages.dev

# Set production environment
fly secrets set NODE_ENV=production

# Redis (Optional - nếu có)
# fly secrets set REDIS_URL=redis://...
```

**⚠️ QUAN TRỌNG**: 
- Frontend URL phải có trailing slash: `https://media-downloader-brc.pages.dev`
- Hoặc không có trailing slash: `https://media-downloader-brc.pages.dev` (cả 2 đều work)

### Bước 3: Deploy

```bash
# Nếu deploy từ backend folder
cd backend
fly deploy

# Hoặc từ root folder (fly.toml đã config sẵn)
fly deploy
```

### Bước 4: Kiểm tra

```bash
# Xem logs
fly logs

# Check status
fly status

# Test API
curl https://media-downloader-uge-da.fly.dev/api/health
```

### Bước 5: Update Frontend Environment Variables

Sau khi backend deploy xong, update frontend env vars trong Cloudflare Pages:

1. Vào: https://dash.cloudflare.com → Pages → media-downloader
2. Settings → Environment variables
3. Update:
   ```
   VITE_API_URL=https://media-downloader-uge-da.fly.dev/api
   VITE_WS_URL=https://media-downloader-uge-da.fly.dev
   ```
4. Redeploy frontend để apply env vars

## ✅ Checklist

- [ ] FRONTEND_URL đã set: `https://media-downloader-brc.pages.dev`
- [ ] NODE_ENV=production
- [ ] Backend deploy thành công
- [ ] Health check work: `/api/health`
- [ ] Frontend env vars đã update với backend URL
- [ ] Frontend redeploy để apply env vars
- [ ] Test: Frontend có thể call backend API
- [ ] Test: WebSocket connects

## 🔍 Troubleshooting

### CORS Error
- Check FRONTEND_URL secret: `fly secrets list`
- Đảm bảo URL đúng: `https://media-downloader-brc.pages.dev`
- Check backend logs: `fly logs`

### API calls fail
- Check backend URL trong frontend env vars
- Check CORS settings
- Check browser console

### WebSocket không connect
- Check VITE_WS_URL trong frontend
- Check backend WebSocket endpoint
- Check browser console

