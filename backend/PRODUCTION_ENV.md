# Production Environment Variables Guide

## ⚠️ QUAN TRỌNG: Production không dùng file `.env`

Trong production (Render, Railway, etc.), bạn **KHÔNG** dùng file `.env`. Thay vào đó, bạn set environment variables trong dashboard của platform.

## 📋 Environment Variables cho Production

### Bắt buộc (Required)

```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend.vercel.app
DOWNLOAD_DIR=/opt/render/project/src/downloads
LOG_FILE=/opt/render/project/src/logs/app.log
```

### Redis Configuration (Bắt buộc cho queue features)

**Option 1: Dùng REDIS_URL (Khuyến nghị)**
```bash
REDIS_URL=redis://:password@d-redis-xxx.render.com:6379
```

**Option 2: Dùng individual variables**
```bash
REDIS_HOST=d-redis-xxx.render.com
REDIS_PORT=6379
REDIS_PASSWORD=your-password-here
```

**Priority:** `REDIS_URL` > `REDIS_HOST` + `REDIS_PORT`

**Lưu ý:**
- Nếu không có Redis config trong production, app vẫn start nhưng queue features sẽ disabled
- Check `/api/health/redis` để verify Redis connection

### Optional (Có thể để default)

```bash
# yt-dlp (sẽ được cài trong build command)
YTDLP_PATH=yt-dlp

# FFmpeg (sẽ được cài trong build command)
FFMPEG_PATH=ffmpeg

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10

# Logging
LOG_LEVEL=info
```

## 🚀 Render.com Setup

### Cách 1: Dùng Blueprint (render.yaml) - Khuyến nghị

File `backend/render.yaml` đã được cấu hình sẵn. Khi deploy Blueprint:
- Redis service sẽ được tạo tự động
- Environment variables sẽ được inject tự động
- Bạn chỉ cần verify trong dashboard

### Cách 2: Manual Setup

1. **Tạo Redis Service:**
   - New → Redis
   - Name: `redis`
   - Plan: Free hoặc Starter

2. **Link Redis với Web Service:**
   - Vào Web Service → Settings → Environment
   - Click "Add Environment Variable"
   - Chọn "Link from Redis" (không phải manual input)
   - Chọn Redis service
   - Render sẽ tự động thêm: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

3. **Set các env vars khác:**
   - `NODE_ENV=production`
   - `PORT=3001`
   - `FRONTEND_URL=https://your-frontend.vercel.app`
   - `DOWNLOAD_DIR=/opt/render/project/src/downloads`
   - `LOG_FILE=/opt/render/project/src/logs/app.log`

## ✅ Verify Setup

Sau khi deploy, check:

1. **Health Check:**
   ```bash
   curl https://your-backend.onrender.com/api/health
   ```
   Response phải có `"redis": "connected"`

2. **Redis Health Check:**
   ```bash
   curl https://your-backend.onrender.com/api/health/redis
   ```
   Response phải có `"connected": true`

3. **Logs:**
   - Phải thấy: `[Redis] Connected and ready`
   - Không được thấy: `localhost:6379` (nếu thấy = Redis chưa link đúng)

## 🔍 Troubleshooting

### Lỗi: "Redis connection failed. Please make sure Redis is running at localhost:6379"

**Nguyên nhân:** Redis chưa được link với Web Service

**Fix:**
1. Vào Web Service → Settings → Environment
2. Verify có `REDIS_HOST` (không phải localhost)
3. Nếu không có, link Redis service (xem trên)

### Lỗi: "Redis is not available. Download queue is disabled"

**Nguyên nhân:** Redis không connect được

**Fix:**
1. Check Redis service status (phải là "Available")
2. Check `/api/health/redis` để xem chi tiết
3. Verify environment variables đã được set đúng
4. Restart Web Service

### App start nhưng không có workers

**Nguyên nhân:** Redis unavailable

**Fix:**
- App vẫn chạy nhưng queue features disabled
- Fix Redis connection để enable workers
- Check logs: `[Queue] Queues initialized - Redis not yet connected`

## 📝 Notes

- **Development:** Có thể dùng file `.env` với `localhost:6379`
- **Production:** Phải set environment variables trong platform dashboard
- **Priority:** `REDIS_URL` > `REDIS_HOST` + `REDIS_PORT`
- **Fallback:** Development auto-fallback to localhost, Production không fallback

