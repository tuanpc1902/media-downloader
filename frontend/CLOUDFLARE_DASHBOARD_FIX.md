# 🚨 FIX Cloudflare Pages Dashboard - Workers Error

## Vấn đề
Cloudflare Pages Dashboard đang cố dùng Workers command (`wrangler versions upload`) thay vì Pages deploy.

## ✅ Giải pháp: XÓA và TẠO LẠI Project

### Bước 1: Xóa Project hiện tại

1. Vào: https://dash.cloudflare.com → Pages
2. Click vào project `media-downloader`
3. Settings → General → Scroll xuống
4. Click **"Delete project"**
5. Confirm delete

### Bước 2: Tạo Project MỚI

1. **Click "Create a project"**
2. **Connect Git repository**
   - Chọn repository
   - Chọn branch (thường là `main` hoặc `master`)

3. **⚠️ QUAN TRỌNG: Build Settings**
   - **Project name**: `media-downloader` (hoặc tên bạn muốn)
   - **Framework preset**: **Chọn "Vite"** (KHÔNG chọn Workers!)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/frontend` (vì frontend là subfolder)

4. **Environment Variables** (Add variables):
   ```
   VITE_API_URL=https://your-backend.fly.dev/api
   VITE_WS_URL=https://your-backend.fly.dev
   ```
   (Thay `your-backend.fly.dev` bằng URL thực tế)

5. **Click "Save and Deploy"**

### Bước 3: Kiểm tra

- ✅ Build logs không có lỗi "wrangler versions upload"
- ✅ Build thành công
- ✅ App deploy được

## 🔍 Nếu vẫn lỗi

### Check Build Logs

1. Vào Pages → Your project → Deployments
2. Click vào deployment mới nhất
3. Xem build logs

**Nếu thấy "wrangler versions upload"**:
- Project vẫn đang detect như Workers
- Xóa và tạo lại project

**Nếu thấy "Framework preset: Workers"**:
- Build settings chưa đúng
- Edit build configuration → Đổi sang "Vite"

### Alternative: Dùng CLI thay vì Dashboard

Nếu Dashboard vẫn không work, dùng CLI:

```bash
# 1. Unset API token
Remove-Item Env:\CLOUDFLARE_API_TOKEN

# 2. Login
wrangler login

# 3. Build và deploy
cd frontend
npm run build
wrangler pages deploy dist --project-name=media-downloader
```

## ✅ Checklist

Sau khi tạo project mới:
- [ ] Framework preset = `Vite` (KHÔNG phải Workers)
- [ ] Build command = `npm run build`
- [ ] Output directory = `dist`
- [ ] Root directory = `/frontend`
- [ ] Environment variables đã set
- [ ] Build thành công (check logs)
- [ ] App hoạt động

## 🎯 Tại sao phải xóa và tạo lại?

Cloudflare Pages có thể cache project type (Workers vs Pages). Khi project được tạo với settings sai, nó sẽ tiếp tục dùng Workers mode. Xóa và tạo lại là cách chắc chắn nhất để reset.

