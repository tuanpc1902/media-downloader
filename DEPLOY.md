# 🚀 Hướng dẫn Deploy lên Vercel/Netlify

## 📋 Tổng quan

Project này gồm 2 phần:
- **Frontend**: React app có thể deploy lên Vercel/Netlify
- **Backend**: Node.js server cần deploy riêng (Render/Railway) vì cần Redis, yt-dlp, FFmpeg

**Khuyến nghị**: Sử dụng **Render** cho backend (dễ cấu hình, hỗ trợ tốt system packages)

## 🎯 Chiến lược Deploy

### Option 1: Frontend trên Vercel/Netlify + Backend trên Render (Khuyến nghị)

### Option 2: Full-stack trên Vercel (Frontend + Serverless Functions - phức tạp hơn)

---

## 🌐 Deploy Frontend lên Vercel

### Bước 1: Chuẩn bị

1. **Cập nhật environment variables trong frontend**

Tạo file `frontend/.env.production`:
```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_WS_URL=wss://your-backend.onrender.com
```

2. **Đảm bảo build script hoạt động**
```bash
cd frontend
npm run build
```

### Bước 2: Deploy qua Vercel CLI

```bash
# Cài đặt Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Deploy production
vercel --prod
```

### Bước 3: Deploy qua Vercel Dashboard

1. Truy cập [vercel.com](https://vercel.com)
2. Import project từ GitHub
3. Cấu hình:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Thêm Environment Variables:
   - `VITE_API_URL`: URL của backend
   - `VITE_WS_URL`: WebSocket URL của backend
5. Click Deploy

### Bước 4: Cấu hình Custom Domain (Optional)

Trong Vercel Dashboard → Settings → Domains

---

## 🌐 Deploy Frontend lên Netlify

### Bước 1: Chuẩn bị

Tương tự như Vercel, tạo `frontend/.env.production` với các biến môi trường.

### Bước 2: Deploy qua Netlify CLI

```bash
# Cài đặt Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
cd frontend
netlify deploy

# Deploy production
netlify deploy --prod
```

### Bước 3: Deploy qua Netlify Dashboard

1. Truy cập [netlify.com](https://netlify.com)
2. Add new site → Import from Git
3. Chọn repository
4. Cấu hình:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. Thêm Environment Variables trong Site settings → Environment variables
6. Click Deploy site

---

## 🔧 Deploy Backend lên Render (Khuyến nghị)

Railway hỗ trợ tốt cho Node.js apps với Redis và có thể cài đặt yt-dlp/FFmpeg.

### Bước 1: Chuẩn bị

1. Tạo file `railway.json` trong thư mục backend:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. Tạo `backend/nixpacks.toml`:
```toml
[providers]
node = "18"

[phases.setup]
nixPkgs = ["nodejs-18_x", "python3", "ffmpeg"]

[phases.install]
cmds = [
  "pip3 install --upgrade pip",
  "pip3 install yt-dlp",
  "npm install"
]

[phases.build]
cmds = [
  "npm run build"
]

[start]
cmd = "npm start"
```

**Lưu ý**: Nếu gặp lỗi "Error creating build plan with Nixpacks", hãy:
- Đảm bảo file `package.json` có trong thư mục backend
- Kiểm tra `railway.json` có đúng cấu trúc
- Thử sử dụng Dockerfile thay vì Nixpacks (xem phần Alternative bên dưới)

### Bước 2: Deploy

1. Truy cập [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Chọn repository
4. **Quan trọng**: Khi add service, chọn **Root Directory** là `backend` (không phải root của repo)
5. Add Redis service (New → Redis)
6. Cấu hình Environment Variables:
   ```
   PORT=3001
   NODE_ENV=production
   REDIS_HOST=${{Redis.REDIS_HOST}}
   REDIS_PORT=${{Redis.REDIS_PORT}}
   REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
   FRONTEND_URL=https://your-frontend.vercel.app
   DOWNLOAD_DIR=/app/downloads
   ```
7. Generate Domain trong Settings → Networking

### Alternative: Sử dụng Dockerfile (nếu Nixpacks không hoạt động)

Nếu gặp lỗi với Nixpacks, bạn có thể sử dụng Dockerfile:

1. Trong Railway Dashboard → Service Settings → Build & Deploy
2. Chọn **Dockerfile** thay vì Nixpacks
3. Đảm bảo Dockerfile đã có trong `backend/Dockerfile`
4. Railway sẽ tự động detect và sử dụng Dockerfile

### Bước 3: Troubleshooting

**Nếu gặp lỗi "Error creating build plan with Nixpacks":**

1. **Kiểm tra Root Directory**: 
   - Trong Railway Dashboard → Service Settings → Source
   - Đảm bảo **Root Directory** được set là `backend` (không phải root của repo)

2. **Sử dụng Dockerfile thay vì Nixpacks**:
   - Trong Railway Dashboard → Service Settings → Build & Deploy
   - Chọn **Dockerfile** thay vì Nixpacks
   - Railway sẽ tự động detect `backend/Dockerfile`

3. **Kiểm tra file cấu hình**:
   - Đảm bảo `backend/package.json` tồn tại
   - Đảm bảo `backend/nixpacks.toml` hoặc `backend/Dockerfile` tồn tại
   - Đảm bảo `backend/railway.json` có đúng cấu trúc

4. **Manual build command** (nếu cần):
   ```bash
   pip3 install yt-dlp && npm install && npm run build
   ```

---

## 🔧 Deploy Backend lên Render

Render là một platform tốt cho Node.js apps với hỗ trợ Redis và có thể cài đặt system packages.

### Bước 1: Chuẩn bị

File `backend/render.yaml` đã được cấu hình sẵn với:
- Build command cài đặt Python, FFmpeg, yt-dlp
- Cấu hình Redis database
- Environment variables cần thiết

### Bước 2: Deploy qua Render Dashboard

1. **Truy cập [render.com](https://render.com)** và đăng nhập

2. **New → Blueprint** (nếu muốn dùng render.yaml tự động) hoặc **New → Web Service**

3. **Nếu dùng Blueprint:**
   - Connect GitHub repository
   - Render sẽ tự động detect `backend/render.yaml`
   - Click "Apply" để deploy

4. **Nếu dùng Web Service (manual):**
   - Connect GitHub repository
   - Cấu hình:
     - **Name**: `yt-downloader-backend`
     - **Root Directory**: `backend`
     - **Environment**: `Node`
     - **Build Command**: 
       ```bash
       apt-get update && apt-get install -y python3 python3-pip ffmpeg && pip3 install --upgrade pip && pip3 install yt-dlp && npm install && npm run build
       ```
     - **Start Command**: `npm start`
     - **Plan**: Starter ($7/month) hoặc Free (có giới hạn)

5. **Add Redis Database:**
   - New → Redis
   - Name: `redis`
   - Plan: Free (hoặc Starter nếu cần)
   - Click "Create"

6. **Cấu hình Environment Variables:**
   Trong Web Service → Environment:
   ```
   NODE_ENV=production
   PORT=3001
   REDIS_HOST=<từ Redis service>
   REDIS_PORT=<từ Redis service>
   REDIS_PASSWORD=<từ Redis service>
   FRONTEND_URL=https://your-frontend.vercel.app
   DOWNLOAD_DIR=/opt/render/project/src/downloads
   LOG_FILE=/opt/render/project/src/logs/app.log
   ```
   
   **Lưu ý**: Render tự động inject `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` nếu bạn link Redis service.

7. **Link Redis Service:**
   - Trong Web Service → Settings → Environment
   - Add Environment Variable → Link from Redis
   - Chọn Redis service đã tạo

8. **Deploy:**
   - Click "Save Changes"
   - Render sẽ tự động build và deploy

### Bước 3: Cấu hình Custom Domain (Optional)

1. Trong Web Service → Settings → Custom Domains
2. Add domain của bạn
3. Follow DNS instructions

### Bước 4: Troubleshooting

**Nếu build fail:**

1. **Kiểm tra Root Directory:**
   - Đảm bảo Root Directory là `backend` (không phải root của repo)

2. **Kiểm tra Build Command:**
   - Render cần quyền sudo để cài system packages
   - Build command phải cài Python, FFmpeg trước khi cài yt-dlp

3. **Kiểm tra Logs:**
   - Xem build logs trong Render Dashboard
   - Kiểm tra runtime logs nếu service không start

4. **Kiểm tra Redis Connection:**
   - Đảm bảo Redis service đã được link
   - Kiểm tra environment variables `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

5. **Disk Space:**
   - Free plan có giới hạn disk space
   - Downloads folder có thể nhanh chóng hết dung lượng
   - Consider sử dụng external storage hoặc cleanup old files

**Lưu ý quan trọng:**
- Render Free plan có **sleep mode** - service sẽ sleep sau 15 phút không có traffic
- Starter plan ($7/month) không có sleep mode
- Downloads folder sẽ bị xóa khi service restart (ephemeral storage)
- Consider sử dụng external storage (S3, etc.) cho production

---

## 🔧 Deploy Backend lên VPS (Alternative)

Nếu bạn có VPS, có thể deploy trực tiếp:

### Bước 1: Setup Server

```bash
# Cài đặt Node.js, Redis, yt-dlp, FFmpeg
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs redis-server ffmpeg
pip3 install yt-dlp

# Clone repository
git clone <your-repo-url>
cd yt-download/backend
npm install
npm run build
```

### Bước 2: Sử dụng PM2

```bash
npm install -g pm2
pm2 start dist/index.js --name yt-downloader-backend
pm2 save
pm2 startup
```

### Bước 3: Setup Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ✅ Checklist sau khi deploy

### Frontend
- [ ] Environment variables đã được set
- [ ] Build thành công
- [ ] Frontend có thể kết nối đến backend API
- [ ] WebSocket connection hoạt động
- [ ] Custom domain (nếu có) đã được cấu hình

### Backend
- [ ] Environment variables đã được set
- [ ] Redis connection hoạt động
- [ ] yt-dlp và FFmpeg đã được cài đặt
- [ ] Backend có thể nhận requests từ frontend
- [ ] CORS đã được cấu hình đúng
- [ ] WebSocket server hoạt động

### Testing
- [ ] Test analyze video
- [ ] Test download video
- [ ] Test WebSocket progress updates
- [ ] Test TikTok download
- [ ] Test YouTube search

---

## 🔒 Security Notes

1. **CORS**: Đảm bảo `FRONTEND_URL` trong backend trỏ đúng đến frontend URL
2. **Rate Limiting**: Đã được cấu hình trong backend
3. **Environment Variables**: Không commit `.env` files
4. **HTTPS**: Vercel/Netlify tự động cung cấp HTTPS

---

## 🐛 Troubleshooting

### Frontend không kết nối được backend
- Kiểm tra CORS settings trong backend
- Kiểm tra environment variables `VITE_API_URL` và `VITE_WS_URL`
- Kiểm tra backend URL có đúng không

### Backend lỗi Redis connection
- Kiểm tra Redis service đang chạy
- Kiểm tra `REDIS_HOST` và `REDIS_PORT`
- Kiểm tra firewall settings

### Download không hoạt động
- Kiểm tra yt-dlp đã được cài: `yt-dlp --version`
- Kiểm tra FFmpeg đã được cài: `ffmpeg -version`
- Kiểm tra disk space trên server
- Kiểm tra logs: `backend/logs/app.log`

---

## 📚 Tài liệu tham khảo

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)

---

## 💡 Tips

1. **Free Tier Limits**: 
   - Vercel: 100GB bandwidth/month
   - Netlify: 100GB bandwidth/month
   - Render: Free plan có sleep mode, Starter $7/month (Khuyến nghị)
   - Railway: $5 credit/month (Alternative)
   - Render: Free tier có giới hạn

2. **Cost Optimization**:
   - Sử dụng CDN cho static assets
   - Optimize build size
   - Monitor usage

3. **Monitoring**:
   - Sử dụng Vercel Analytics / Netlify Analytics
   - Setup error tracking (Sentry)
   - Monitor backend logs

