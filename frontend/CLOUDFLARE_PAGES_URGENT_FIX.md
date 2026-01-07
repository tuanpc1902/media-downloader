# 🚨 URGENT FIX: Cloudflare Pages Wrangler Error

## Vấn đề
Cloudflare Pages đang cố dùng Wrangler (Workers) thay vì Pages deploy, gây lỗi:
```
error occurred while running deploy command
wrangler versions upload
```

## ✅ Giải pháp NGAY LẬP TỨC

### Option 1: Fix trong Dashboard (Recommended)

1. **Vào Cloudflare Dashboard**
   - https://dash.cloudflare.com → Pages → Your project

2. **XÓA project và tạo lại** (Nếu build settings không work)
   - Settings → General → Delete project
   - Tạo project mới với settings đúng

3. **Khi tạo project mới:**
   - **Framework preset**: Chọn **"Vite"** (KHÔNG chọn Workers!)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/frontend` (nếu frontend là subfolder)

4. **Environment Variables** (sau khi tạo):
   ```
   VITE_API_URL=https://your-backend.fly.dev/api
   VITE_WS_URL=https://your-backend.fly.dev
   ```

### Option 2: Deploy từ CLI (100% chắc chắn work)

Nếu dashboard vẫn không work, dùng CLI:

```bash
# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Login
wrangler login

# 3. Build project
cd frontend
npm install
npm run build

# 4. Deploy với Pages command (KHÔNG phải Workers!)
wrangler pages deploy dist --project-name=your-project-name
```

**Lưu ý**: Dùng `wrangler pages deploy` (Pages), KHÔNG phải `wrangler deploy` (Workers)!

### Option 3: Tạo project mới với CLI

```bash
# 1. Build
cd frontend
npm run build

# 2. Tạo project mới
wrangler pages project create your-project-name

# 3. Deploy
wrangler pages deploy dist --project-name=your-project-name
```

## 🔍 Kiểm tra

Sau khi deploy, check:
- ✅ URL: `https://your-project-name.pages.dev`
- ✅ App load được
- ✅ API calls work (check browser console)
- ✅ WebSocket connects

## ⚠️ Lưu ý quan trọng

1. **KHÔNG có file `wrangler.toml`** trong frontend folder
2. **KHÔNG dùng `wrangler deploy`** (đây là Workers command)
3. **CHỈ dùng `wrangler pages deploy`** (đây là Pages command)
4. **Framework preset PHẢI là Vite hoặc None**, KHÔNG phải Workers

## 🐛 Nếu vẫn lỗi

1. **Check project type trong Dashboard**:
   - Vào Settings → General
   - Đảm bảo project type là "Pages", không phải "Workers"

2. **Xóa và tạo lại project**:
   - Đôi khi Cloudflare cache settings cũ
   - Xóa project và tạo lại với settings đúng

3. **Dùng CLI thay vì Dashboard**:
   - CLI luôn work và rõ ràng hơn
   - `wrangler pages deploy` là command đúng

