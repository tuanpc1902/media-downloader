# Cloudflare Pages Deployment Guide

## Setup Instructions

1. **Connect Repository to Cloudflare Pages**
   - Go to Cloudflare Dashboard → Pages → Create a project
   - Connect your Git repository
   - Select the `frontend` folder as the root directory

2. **Build Settings**
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (or leave empty if frontend is root)

3. **Environment Variables**
   Add these in Cloudflare Pages → Settings → Environment variables:
   ```
   VITE_API_URL=https://your-backend-app.fly.dev/api
   VITE_WS_URL=https://your-backend-app.fly.dev
   ```

4. **Deploy**
   - Cloudflare Pages will automatically deploy on every push to your main branch
   - Or manually trigger deployment from the dashboard

## Custom Domain (Optional)
- Go to Pages → Your project → Custom domains
- Add your custom domain
- Cloudflare will automatically configure DNS

