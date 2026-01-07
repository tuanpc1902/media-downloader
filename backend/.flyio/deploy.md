# Fly.io Deployment Guide

## Prerequisites
1. Install Fly CLI: https://fly.io/docs/getting-started/installing-flyctl/
2. Login: `fly auth login`
3. App name: `media-downloader-uge-da` (đã được tạo, check trong fly.toml)

## Initial Setup

1. **Check fly.toml**
   - App name: `media-downloader-uge-da` (đã config sẵn)
   - Primary region: `nrt` (có thể đổi nếu cần)

2. **Set Environment Variables**
   ```bash
   # Required
   fly secrets set NODE_ENV=production
   fly secrets set FRONTEND_URL=https://media-downloader-brc.pages.dev
   
   # Redis (Optional but recommended)
   # fly secrets set REDIS_URL=redis://your-redis-url:6379
   # fly secrets set REDIS_PASSWORD=your-password
   ```
   
   **⚠️ QUAN TRỌNG**: 
   - Frontend URL: `https://media-downloader-brc.pages.dev` (không có trailing slash)
   - URL này sẽ được dùng cho CORS settings

3. **Deploy**
   ```bash
   cd backend
   fly deploy
   ```

## Redis Setup (Optional but Recommended)

### Option 1: Upstash Redis (Recommended)
1. Create account at https://upstash.com
2. Create Redis database
3. Copy connection URL
4. Set as secret: `fly secrets set REDIS_URL=redis://...`

### Option 2: Fly.io Redis (Beta)
```bash
fly redis create
# Follow prompts, then set the connection URL
```

## Scaling
```bash
# Scale to 2 instances
fly scale count 2

# Scale memory
fly scale vm shared-cpu-2x --memory 4096
```

## Monitoring
- View logs: `fly logs`
- SSH into machine: `fly ssh console`
- Check status: `fly status`

## Troubleshooting
- Check logs: `fly logs`
- Restart app: `fly apps restart your-app-name-backend`
- View metrics: `fly metrics`

