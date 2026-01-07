# 🚀 Deployment Guide: Fly.io + Cloudflare Pages

Hướng dẫn deploy backend lên Fly.io và frontend lên Cloudflare Pages.

## 📋 Tổng quan

- **Backend**: Fly.io (Node.js + yt-dlp + ffmpeg)
- **Frontend**: Cloudflare Pages (React + Vite)
- **Redis**: Upstash hoặc Fly.io Redis (optional)

---

## 🔧 Backend Deployment (Fly.io)

### Bước 1: Cài đặt Fly CLI

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### Bước 2: Login và tạo app

```bash
# Login
fly auth login

# Tạo app mới
cd backend
fly apps create your-app-name-backend
```

### Bước 3: Cấu hình fly.toml

File `backend/fly.toml` đã được tạo sẵn. Chỉ cần sửa:
- `app = "your-app-name-backend"` → tên app của bạn
- `primary_region = "iad"` → region gần bạn (iad, sjc, lhr, etc.)

### Bước 4: Setup Redis (Recommended)

#### Option A: Upstash Redis (Free tier available)
1. Tạo account tại https://upstash.com
2. Tạo Redis database
3. Copy connection URL
4. Set secret:
```bash
fly secrets set REDIS_URL=redis://default:password@host:port
```

#### Option B: Fly.io Redis (Beta)
```bash
fly redis create
# Follow prompts
```

### Bước 5: Set Environment Variables

```bash
# Required
fly secrets set NODE_ENV=production
fly secrets set FRONTEND_URL=https://your-frontend.pages.dev

# Redis (if using)
fly secrets set REDIS_URL=redis://...

# Optional
fly secrets set LOG_LEVEL=info
fly secrets set MAX_CONCURRENT_DOWNLOADS=3
```

### Bước 6: Deploy

```bash
cd backend
fly deploy
```

### Bước 7: Kiểm tra

```bash
# Xem logs
fly logs

# Check status
fly status

# Test API
curl https://your-app-name-backend.fly.dev/api/health
```

---

## 🎨 Frontend Deployment (Cloudflare Pages)

### Bước 1: Connect Repository

1. Vào Cloudflare Dashboard → Pages
2. Click "Create a project"
3. Connect Git repository (GitHub/GitLab)
4. Chọn repository và branch

### Bước 2: Build Settings

- **Framework preset**: Vite
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/frontend` (nếu frontend là subfolder)

### Bước 3: Environment Variables

Vào Settings → Environment variables, thêm:

```
VITE_API_URL=https://your-app-name-backend.fly.dev/api
VITE_WS_URL=https://your-app-name-backend.fly.dev
```

**Lưu ý**: 
- Thay `your-app-name-backend.fly.dev` bằng URL thực tế của backend
- Không có trailing slash cho `VITE_API_URL`

### Bước 4: Deploy

Cloudflare Pages sẽ tự động deploy khi:
- Push code lên branch chính
- Hoặc trigger manual từ dashboard

### Bước 5: Custom Domain (Optional)

1. Vào Pages → Your project → Custom domains
2. Add domain
3. Cloudflare sẽ tự động setup DNS

---

## 🔗 Kết nối Backend và Frontend

### 1. Update Frontend Environment Variables

Sau khi backend deploy xong, update frontend env vars:

```
VITE_API_URL=https://your-backend.fly.dev/api
VITE_WS_URL=https://your-backend.fly.dev
```

### 2. Update Backend CORS

Đảm bảo backend cho phép frontend domain:

```bash
fly secrets set FRONTEND_URL=https://your-frontend.pages.dev
```

### 3. Redeploy

- Frontend: Trigger redeploy từ Cloudflare Pages
- Backend: `fly deploy` (nếu cần)

---

## 📝 Environment Variables Reference

### Backend (Fly.io Secrets)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment | `production` |
| `FRONTEND_URL` | Yes | Frontend URL | `https://app.pages.dev` |
| `REDIS_URL` | No* | Redis connection | `redis://...` |
| `REDIS_HOST` | No* | Redis host | `host.upstash.io` |
| `REDIS_PORT` | No* | Redis port | `6379` |
| `REDIS_PASSWORD` | No* | Redis password | `password` |
| `LOG_LEVEL` | No | Log level | `info` |
| `MAX_CONCURRENT_DOWNLOADS` | No | Max concurrent | `3` |

*Redis is optional but recommended for queue features

### Frontend (Cloudflare Pages)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API URL | `https://backend.fly.dev/api` |
| `VITE_WS_URL` | Yes | WebSocket URL | `https://backend.fly.dev` |

---

## 🐛 Troubleshooting

### Backend Issues

**App không start:**
```bash
fly logs
fly ssh console
```

**Redis connection failed:**
- Check `REDIS_URL` hoặc `REDIS_HOST` + `REDIS_PORT`
- Test connection: `fly ssh console` → `redis-cli -h ... ping`

**Out of memory:**
```bash
fly scale vm shared-cpu-2x --memory 4096
```

### Frontend Issues

**API calls fail:**
- Check `VITE_API_URL` trong Cloudflare Pages env vars
- Check CORS settings trong backend
- Check browser console for errors

**WebSocket không connect:**
- Check `VITE_WS_URL`
- Check backend WebSocket endpoint: `/socket.io`

**Build fails:**
- Check build logs trong Cloudflare Pages
- Test build locally: `npm run build`

---

## 💰 Cost Estimation

### Fly.io
- **Free tier**: 3 shared-cpu-1x VMs (256MB RAM each)
- **Paid**: ~$1.94/month per VM (shared-cpu-1x, 256MB)
- **Recommended**: 1 VM với 2GB RAM = ~$15/month

### Cloudflare Pages
- **Free tier**: Unlimited requests, 500 builds/month
- **Paid**: $20/month (unlimited builds)

### Redis (Upstash)
- **Free tier**: 10,000 commands/day
- **Paid**: Pay-as-you-go

**Total (Free tier)**: ~$0-5/month
**Total (Production)**: ~$20-35/month

---

## 🔒 Security Notes

1. **Never commit secrets**: Use Fly secrets và Cloudflare env vars
2. **CORS**: Backend chỉ cho phép frontend domain
3. **Rate limiting**: Đã được config trong backend
4. **HTTPS**: Tự động enabled trên cả Fly.io và Cloudflare

---

## 📚 Useful Commands

### Fly.io
```bash
# Deploy
fly deploy

# View logs
fly logs

# SSH into machine
fly ssh console

# Scale
fly scale count 2
fly scale vm shared-cpu-2x --memory 4096

# Secrets
fly secrets list
fly secrets set KEY=value
fly secrets unset KEY

# Restart
fly apps restart your-app-name
```

### Cloudflare Pages
- Deploy: Automatic on git push
- Manual deploy: Dashboard → Deployments → Retry deployment
- View logs: Dashboard → Deployments → View build logs

---

## ✅ Checklist

### Backend (Fly.io)
- [ ] Fly CLI installed
- [ ] App created
- [ ] fly.toml configured
- [ ] Redis setup (optional)
- [ ] Environment variables set
- [ ] Deployed successfully
- [ ] Health check works: `/api/health`

### Frontend (Cloudflare Pages)
- [ ] Repository connected
- [ ] Build settings configured
- [ ] Environment variables set
- [ ] Deployed successfully
- [ ] API calls work
- [ ] WebSocket connects

### Integration
- [ ] Frontend can call backend API
- [ ] WebSocket connection works
- [ ] CORS configured correctly
- [ ] Custom domain setup (if needed)

---

## 🎉 Done!

Sau khi hoàn thành, bạn sẽ có:
- Backend: `https://your-app.fly.dev`
- Frontend: `https://your-app.pages.dev`
- Full-stack app hoạt động!

Nếu gặp vấn đề, check logs và troubleshooting section ở trên.

