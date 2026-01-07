# Cloudflare Pages Deployment Guide

## ⚠️ IMPORTANT: Build Settings

Cloudflare Pages có thể detect sai framework. Hãy làm theo các bước sau:

## Setup Instructions

### 1. Connect Repository
- Go to Cloudflare Dashboard → Pages → Create a project
- Connect your Git repository
- **IMPORTANT**: Chọn framework preset là **"Vite"** hoặc **"None"** (KHÔNG chọn Workers)

### 2. Build Settings (CRITICAL)

Nếu Cloudflare Pages detect sai, bạn cần set manual:

- **Framework preset**: `Vite` hoặc `None`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: 
  - Nếu frontend là root: để trống hoặc `/`
  - Nếu frontend là subfolder: `/frontend`

### 3. Environment Variables
Add these in Cloudflare Pages → Settings → Environment variables:

```
VITE_API_URL=https://your-backend-app.fly.dev/api
VITE_WS_URL=https://your-backend-app.fly.dev
```

**Lưu ý**: 
- Không có trailing slash cho `VITE_API_URL`
- Thay `your-backend-app.fly.dev` bằng URL thực tế của backend

### 4. Node.js Version (Optional)
Nếu build fail, có thể cần set Node.js version:
- **Node version**: `18` hoặc `20`

### 5. Deploy
- Cloudflare Pages sẽ tự động deploy khi push code
- Hoặc trigger manual từ dashboard

## Troubleshooting

### Error: "wrangler versions upload"
**Nguyên nhân**: Cloudflare Pages đang detect project như Workers project

**Giải pháp**:
1. Vào Pages → Your project → Settings → Builds & deployments
2. Xóa build settings hiện tại
3. Set lại:
   - Framework preset: `Vite` hoặc `None`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Save và trigger lại deployment

### Build fails với TypeScript errors
- Check Node.js version (nên dùng 18 hoặc 20)
- Check build logs để xem lỗi cụ thể

### API calls fail
- Check `VITE_API_URL` trong environment variables
- Check CORS settings trong backend
- Check browser console để xem lỗi cụ thể

## Custom Domain (Optional)
- Go to Pages → Your project → Custom domains
- Add your custom domain
- Cloudflare will automatically configure DNS

## File Structure
```
frontend/
├── dist/              # Build output (tự động tạo)
├── public/
│   ├── _redirects    # SPA routing
│   └── _headers      # Security headers
└── src/              # Source code
```

