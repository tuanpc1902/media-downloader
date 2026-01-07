# 🔧 Fix Cloudflare Pages Deployment Error

## Vấn đề
Cloudflare Pages đang detect project như Workers project và cố gắng dùng Wrangler, gây ra lỗi:
```
error occurred while running deploy command
wrangler versions upload
```

## ✅ Giải pháp

### Cách 1: Fix trong Cloudflare Dashboard (Recommended)

1. **Vào Cloudflare Dashboard**
   - Pages → Your project → Settings → Builds & deployments

2. **Xóa build settings hiện tại**
   - Click "Edit build configuration"
   - Xóa tất cả settings

3. **Set lại build settings:**
   ```
   Framework preset: Vite (hoặc None)
   Build command: npm run build
   Build output directory: dist
   Root directory: /frontend (nếu frontend là subfolder) hoặc để trống
   ```

4. **Node.js version:**
   ```
   Node version: 18 (hoặc 20)
   ```

5. **Save và trigger lại deployment**

### Cách 2: Xóa wrangler.toml (Nếu có)

**⚠️ QUAN TRỌNG**: Nếu có file `wrangler.toml` trong frontend folder, **XÓA NÓ NGAY**!

File này khiến Cloudflare detect nhầm project như Workers project.

```bash
# Xóa file wrangler.toml
rm frontend/wrangler.toml
```

Cloudflare Pages **KHÔNG CẦN** wrangler.toml cho Vite projects.

### Cách 3: Deploy từ CLI

Nếu dashboard không work, dùng CLI:

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
cd frontend
npm run build
wrangler pages deploy dist --project-name=your-project-name
```

## ✅ Checklist

Sau khi fix, đảm bảo:

- [ ] Framework preset = `Vite` hoặc `None` (KHÔNG phải Workers)
- [ ] Build command = `npm run build`
- [ ] Output directory = `dist`
- [ ] Environment variables đã set:
  - `VITE_API_URL`
  - `VITE_WS_URL`
- [ ] Build thành công (check logs)
- [ ] App hoạt động (test trong browser)

## 🐛 Nếu vẫn lỗi

1. **Check build logs** trong Cloudflare Pages dashboard
2. **Test build locally**:
   ```bash
   cd frontend
   npm run build
   # Kiểm tra xem dist/ folder có được tạo không
   ```
3. **Check Node.js version**: Nên dùng 18 hoặc 20
4. **Clear cache**: Xóa và tạo lại project trong Cloudflare Pages

## 📝 Notes

- **⚠️ QUAN TRỌNG**: Cloudflare Pages KHÔNG cần `wrangler.toml` cho Vite projects
- **XÓA** file `wrangler.toml` nếu có trong frontend folder (nó sẽ khiến Cloudflare detect nhầm như Workers)
- File `_redirects` trong `public/` đã được tạo để handle SPA routing
- File `_headers` trong `public/` đã được tạo cho security headers
- Cloudflare Pages sẽ tự động detect Vite project và build đúng cách

