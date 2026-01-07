# 🔧 Fix Cloudflare API Token Permission Error

## Vấn đề
```
Authentication error [code: 10000]
The API Token is read from the CLOUDFLARE_API_TOKEN environment variable.
```

## Nguyên nhân
API token hiện tại không có quyền truy cập Cloudflare Pages projects.

## ✅ Giải pháp

### Option 1: Tạo API Token mới với đúng permissions (Recommended)

1. **Vào Cloudflare Dashboard**
   - https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"

2. **Chọn template "Edit Cloudflare Workers"** hoặc tạo custom:
   - **Permissions**: 
     - `Account` → `Cloudflare Pages` → `Edit`
     - `Account` → `Account Settings` → `Read`
   - **Account Resources**: 
     - Include → All accounts (hoặc chọn account cụ thể)

3. **Copy token** và set environment variable:
   ```bash
   # Windows PowerShell
   $env:CLOUDFLARE_API_TOKEN="your-new-token-here"
   
   # Windows CMD
   set CLOUDFLARE_API_TOKEN=your-new-token-here
   
   # Linux/Mac
   export CLOUDFLARE_API_TOKEN="your-new-token-here"
   ```

4. **Thử deploy lại**:
   ```bash
   cd frontend
   npm run build
   wrangler pages deploy dist --project-name=media-downloader
   ```

### Option 2: Dùng OAuth Login (Không cần API token)

Xóa API token và dùng OAuth:

```bash
# 1. Unset API token
# Windows PowerShell
Remove-Item Env:\CLOUDFLARE_API_TOKEN

# Windows CMD
set CLOUDFLARE_API_TOKEN=

# Linux/Mac
unset CLOUDFLARE_API_TOKEN

# 2. Login với OAuth
wrangler login

# 3. Deploy
cd frontend
npm run build
wrangler pages deploy dist --project-name=media-downloader
```

### Option 3: Deploy từ Dashboard (Không cần CLI)

1. **Vào Cloudflare Dashboard**
   - Pages → Your project (hoặc Create new project)

2. **Connect Git repository**
   - Chọn repo và branch

3. **Set build settings**:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/frontend`

4. **Environment variables**:
   ```
   VITE_API_URL=https://your-backend.fly.dev/api
   VITE_WS_URL=https://your-backend.fly.dev
   ```

5. **Deploy tự động** khi push code

## 🔍 Kiểm tra Token Permissions

1. Vào https://dash.cloudflare.com/profile/api-tokens
2. Click vào token hiện tại
3. Check permissions:
   - ✅ Cần có: `Cloudflare Pages` → `Edit`
   - ✅ Cần có: `Account Settings` → `Read`

## ✅ Checklist

Sau khi fix:
- [ ] API token có quyền `Cloudflare Pages` → `Edit`
- [ ] Hoặc dùng OAuth login (`wrangler login`)
- [ ] Hoặc deploy từ Dashboard (không cần token)
- [ ] Deploy thành công

## 🐛 Nếu vẫn lỗi

1. **Check token permissions**: Đảm bảo có quyền Pages
2. **Thử OAuth**: `wrangler login` thay vì API token
3. **Dùng Dashboard**: Deploy từ web UI thay vì CLI

