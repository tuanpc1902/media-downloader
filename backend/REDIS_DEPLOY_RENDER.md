# 🚀 Hướng dẫn Deploy Redis trên Render.com

## 📋 Tổng quan

Có **2 cách** để deploy Redis trên Render:
1. **Dùng Blueprint (render.yaml)** - Tự động, khuyến nghị ✅
2. **Manual Setup** - Tự tạo và link Redis

---

## 🎯 Cách 1: Dùng Blueprint (render.yaml) - Khuyến nghị

### Bước 1: Chuẩn bị file render.yaml

File `backend/render.yaml` đã được cấu hình sẵn với Redis database definition:

```yaml
databases:
  - name: redis
    databaseName: redis
    plan: free
    type: redis
```

**Lưu ý:** Redis environment variables (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`) sẽ **KHÔNG** được tự động link trong Blueprint. Bạn cần link manually sau khi deploy (xem Bước 3).

### Bước 2: Deploy Blueprint

1. **Truy cập [render.com](https://render.com)** và đăng nhập

2. **Click "New" → "Blueprint"**

3. **Connect GitHub Repository:**
   - Chọn repository của bạn
   - Render sẽ tự động detect `backend/render.yaml`

4. **Review Blueprint:**
   - Render sẽ hiển thị preview:
     - Web Service: `yt-downloader-backend`
     - Redis Database: `redis`
   - Kiểm tra các environment variables

5. **Click "Apply" để deploy:**
   - Render sẽ tự động:
     - ✅ Tạo Redis service
     - ✅ Tạo Web Service
     - ⚠️ **Redis chưa được link** - cần link manually (xem Bước 3)

### Bước 3: Link Redis với Web Service (QUAN TRỌNG - BẮT BUỘC)

**QUAN TRỌNG:** Blueprint sẽ tạo Redis service nhưng **KHÔNG tự động link** với Web Service. Bạn **PHẢI** link manually:

1. **Vào Web Service** → **Settings** → **Environment**

2. **Click "Add Environment Variable"**

3. **Chọn "Link from Redis"** (không phải manual input!)

4. **Chọn Redis service** đã được tạo (tên: `redis`)

5. **Render sẽ tự động thêm 3 biến:**
   - `REDIS_HOST` = Internal Hostname từ Redis (ví dụ: `d-redis-xxx.render.com`)
   - `REDIS_PORT` = Port từ Redis (thường là `6379`)
   - `REDIS_PASSWORD` = Password từ Redis (có thể empty)

6. **Verify:**
   - Trong Environment Variables, phải thấy:
     - `REDIS_HOST` = `d-redis-xxx.render.com` (không phải localhost!)
     - `REDIS_PORT` = `6379`
     - `REDIS_PASSWORD` = (có thể empty)

### Bước 4: Restart Web Service

Sau khi link Redis:

1. **Vào Web Service** → **Manual Deploy**
2. **Chọn "Clear build cache & deploy"**
3. **Click "Deploy"**

Hoặc đơn giản hơn:
- Click **"Restart"** nếu service đang chạy

### Bước 5: Verify Redis đã được tạo

1. Vào **Dashboard** → Tìm service **"redis"**
2. Status phải là **"Available"** (màu xanh)
3. Click vào Redis service để xem thông tin:
   - **Internal Hostname**: `d-redis-xxx.render.com`
   - **Port**: `6379`
   - **Password**: (có thể empty hoặc có giá trị)

### Bước 6: Verify Redis Connection

Sau khi Web Service deploy xong:

1. **Check Health Endpoint:**
   ```bash
   curl https://your-backend.onrender.com/api/health/redis
   ```

2. **Response phải có:**
   ```json
   {
     "status": "ok",
     "redis": {
       "connected": true,
       "host": "d-redis-xxx.render.com",
       "port": 6379
     }
   }
   ```

3. **Check Logs:**
   - Vào Web Service → **Logs**
   - Phải thấy: `[Redis] Connected and ready`
   - KHÔNG được thấy: `localhost:6379`

---

## 🔧 Cách 2: Manual Setup

Nếu Blueprint không tự động link Redis, hoặc bạn muốn tự control:

### Bước 1: Tạo Redis Service

1. **Truy cập [render.com](https://render.com)** và đăng nhập

2. **Click "New" → "Redis"**

3. **Cấu hình Redis:**
   - **Name**: `redis` (hoặc tên bạn muốn)
   - **Database Name**: `redis` (hoặc để default)
   - **Region**: Chọn cùng region với Web Service (ví dụ: `Singapore`)
   - **Plan**: 
     - **Free**: 25MB, phù hợp cho development/testing
     - **Starter**: $10/month, 100MB, phù hợp cho production nhỏ
     - **Standard**: $25/month, 1GB, phù hợp cho production lớn

4. **Click "Create Redis"**

5. **Đợi Redis deploy:**
   - Status sẽ chuyển từ "Creating" → "Available" (màu xanh)
   - Thường mất 1-2 phút

### Bước 2: Lấy thông tin Redis

1. **Vào Redis service** → **Info** tab
2. **Copy các thông tin sau:**
   - **Internal Hostname**: `d-redis-xxx.render.com`
   - **Port**: `6379`
   - **Password**: (có thể empty hoặc có giá trị)

### Bước 3: Link Redis với Web Service

**QUAN TRỌNG**: Phải dùng "Link from Redis", không set manual!

1. **Vào Web Service** → **Settings** → **Environment**

2. **Click "Add Environment Variable"**

3. **Chọn "Link from Redis"** (không phải manual input!)

4. **Chọn Redis service** đã tạo ở Bước 1

5. **Render sẽ tự động thêm 3 biến:**
   - `REDIS_HOST` = Internal Hostname từ Redis
   - `REDIS_PORT` = Port từ Redis
   - `REDIS_PASSWORD` = Password từ Redis (có thể empty)

6. **Verify:**
   - Trong Environment Variables, phải thấy:
     - `REDIS_HOST` = `d-redis-xxx.render.com` (không phải localhost!)
     - `REDIS_PORT` = `6379`
     - `REDIS_PASSWORD` = (có thể empty)

### Bước 4: Restart Web Service

Sau khi link Redis:

1. **Vào Web Service** → **Manual Deploy**
2. **Chọn "Clear build cache & deploy"**
3. **Click "Deploy"**

Hoặc đơn giản hơn:
- Click **"Restart"** nếu service đang chạy

### Bước 5: Verify Connection

Xem [Bước 5: Verify Redis Connection](#bước-5-verify-redis-connection) ở trên.

---

## 🔍 Troubleshooting

### ❌ Lỗi: "Redis connection failed. Please make sure Redis is running at localhost:6379"

**Nguyên nhân:** Redis chưa được link với Web Service

**Fix:**
1. Vào Web Service → Settings → Environment
2. Kiểm tra có `REDIS_HOST` không
3. Nếu thấy `localhost` hoặc không có → Redis chưa link
4. Link Redis theo [Bước 3: Link Redis](#bước-3-link-redis-với-web-service)

### ❌ Lỗi: "Redis is not available. Download queue is disabled"

**Nguyên nhân:** Redis không connect được

**Fix:**
1. **Check Redis service status:**
   - Vào Redis service → Status phải là "Available"
   - Nếu "Paused" → Click "Resume"
   - Nếu "Error" → Xem logs và restart

2. **Check Environment Variables:**
   - `REDIS_HOST` phải có giá trị (không phải localhost)
   - `REDIS_PORT` phải có giá trị
   - `REDIS_PASSWORD` có thể empty

3. **Check Region:**
   - Redis và Web Service phải cùng region
   - Nếu khác region → Tạo Redis mới cùng region

4. **Restart Web Service:**
   - Manual Deploy → Clear build cache & deploy

### ❌ App start nhưng không có workers

**Nguyên nhân:** Redis unavailable

**Check:**
```bash
curl https://your-backend.onrender.com/api/health/redis
```

**Response:**
```json
{
  "status": "error",
  "redis": {
    "connected": false
  }
}
```

**Fix:**
- Xem logs để biết lý do
- Verify Redis service đang running
- Verify environment variables đã được set đúng

### ❌ Blueprint không tự động link Redis

**Nguyên nhân:** Blueprint **KHÔNG tự động link** Redis với Web Service. Đây là behavior bình thường của Render.

**Fix:**
- **BẮT BUỘC** phải link Redis manually sau khi deploy Blueprint
- Xem [Bước 3: Link Redis](#bước-3-link-redis-với-web-service-quan-trọng---bắt-buộc) ở trên

---

## 📊 Redis Plans trên Render

| Plan | Price | Memory | Max Connections | Use Case |
|------|-------|--------|----------------|----------|
| **Free** | $0 | 25MB | 10 | Development, Testing |
| **Starter** | $10/month | 100MB | 25 | Small Production |
| **Standard** | $25/month | 1GB | 100 | Medium Production |
| **Pro** | $100/month | 10GB | 500 | Large Production |

**Khuyến nghị:**
- **Development**: Free plan
- **Production nhỏ**: Starter plan
- **Production lớn**: Standard hoặc Pro

---

## ✅ Checklist Deploy Redis

- [ ] Redis service đã được tạo
- [ ] Redis status = "Available"
- [ ] Redis và Web Service cùng region
- [ ] Redis đã được link với Web Service
- [ ] Environment variables đã được inject:
  - [ ] `REDIS_HOST` (không phải localhost)
  - [ ] `REDIS_PORT`
  - [ ] `REDIS_PASSWORD`
- [ ] Web Service đã được restart sau khi link Redis
- [ ] Health check: `/api/health/redis` trả về `connected: true`
- [ ] Logs hiển thị: `[Redis] Connected and ready`

---

## 🎉 Kết quả mong đợi

Sau khi deploy thành công:

1. **Redis Service:**
   - Status: "Available" (màu xanh)
   - Internal Hostname: `d-redis-xxx.render.com`

2. **Web Service:**
   - Environment variables có `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
   - Logs: `[Redis] Connected and ready`
   - Workers: `✅ Download worker started`, `✅ TikTok download worker started`

3. **Health Check:**
   ```bash
   curl https://your-backend.onrender.com/api/health/redis
   ```
   Response: `"connected": true`

---

## 📚 Tài liệu tham khảo

- [Render Redis Documentation](https://render.com/docs/redis)
- [Render Blueprint Documentation](https://render.com/docs/blueprint-spec)
- [Backend PRODUCTION_ENV.md](./PRODUCTION_ENV.md)
- [Backend REDIS_REFACTOR.md](./REDIS_REFACTOR.md)

