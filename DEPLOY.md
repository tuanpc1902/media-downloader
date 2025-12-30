# 🚀 Hướng dẫn Deploy lên Vercel/Netlify

## 📋 Tổng quan

Project này gồm 2 phần:
- **Frontend**: React app có thể deploy lên Vercel/Netlify
- **Backend**: Node.js server cần deploy riêng (Railway/Render) vì cần Redis, yt-dlp, FFmpeg

## 🎯 Chiến lược Deploy

### Option 1: Frontend trên Vercel/Netlify + Backend trên Railway/Render (Khuyến nghị)

### Option 2: Full-stack trên Vercel (Frontend + Serverless Functions - phức tạp hơn)

---

## 🌐 Deploy Frontend lên Vercel

### Bước 1: Chuẩn bị

1. **Cập nhật environment variables trong frontend**

Tạo file `frontend/.env.production`:
```env
VITE_API_URL=https://your-backend-url.railway.app/api
VITE_WS_URL=wss://your-backend-url.railway.app
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

## 🔧 Deploy Backend lên Railway

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
[phases.setup]
nixPkgs = ["nodejs-18_x", "python3", "ffmpeg"]

[phases.install]
cmds = [
  "pip install yt-dlp",
  "npm install"
]

[start]
cmd = "npm start"
```

### Bước 2: Deploy

1. Truy cập [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Chọn repository
4. Add Service → GitHub Repo → Chọn backend folder
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

### Bước 3: Cài đặt yt-dlp và FFmpeg

Railway sẽ tự động cài qua nixpacks.toml. Nếu không, thêm vào build command:
```bash
pip install yt-dlp && apt-get update && apt-get install -y ffmpeg
```

---

## 🔧 Deploy Backend lên Render

### Bước 1: Chuẩn bị

Tạo `backend/render.yaml`:
```yaml
services:
  - type: web
    name: yt-downloader-backend
    env: node
    buildCommand: pip install yt-dlp && npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: REDIS_HOST
        fromDatabase:
          name: redis
          property: host
      - key: REDIS_PORT
        fromDatabase:
          name: redis
          property: port
      - key: REDIS_PASSWORD
        fromDatabase:
          name: redis
          property: password

databases:
  - name: redis
    databaseName: redis
    plan: free
    type: redis
```

### Bước 2: Deploy

1. Truy cập [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repository
4. Cấu hình:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install yt-dlp && npm install && npm run build`
   - **Start Command**: `npm start`
5. Add Redis Database (New → Redis)
6. Thêm Environment Variables
7. Deploy

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
   - Railway: $5 credit/month
   - Render: Free tier có giới hạn

2. **Cost Optimization**:
   - Sử dụng CDN cho static assets
   - Optimize build size
   - Monitor usage

3. **Monitoring**:
   - Sử dụng Vercel Analytics / Netlify Analytics
   - Setup error tracking (Sentry)
   - Monitor backend logs

