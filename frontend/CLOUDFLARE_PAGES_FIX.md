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

### Cách 2: Tạo wrangler.toml để force Pages mode

Nếu cách 1 không work, tạo file `wrangler.toml` trong root của project (không phải frontend folder):

```toml
# wrangler.toml (trong root project, KHÔNG phải frontend/)
# File này để force Cloudflare Pages mode

pages_build_output_dir = "frontend/dist"
```

**Lưu ý**: File này chỉ để force Pages mode, không phải Workers config.

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

- Cloudflare Pages KHÔNG cần `wrangler.toml` cho Vite projects
- File `_redirects` trong `public/` đã được tạo để handle SPA routing
- File `_headers` trong `public/` đã được tạo cho security headers

