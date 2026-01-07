# 🚀 Deploy Cloudflare Pages từ CLI

Hướng dẫn deploy frontend lên Cloudflare Pages bằng CLI (chắc chắn work, không bị lỗi Wrangler).

## Bước 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

## Bước 2: Login

### Option A: OAuth Login (Recommended)

```bash
wrangler login
```

Browser sẽ mở để login Cloudflare account.

### Option B: API Token

Nếu dùng API token, đảm bảo token có quyền:
- `Cloudflare Pages` → `Edit`
- `Account Settings` → `Read`

Set token:
```bash
# Windows PowerShell
$env:CLOUDFLARE_API_TOKEN="your-token"

# Linux/Mac
export CLOUDFLARE_API_TOKEN="your-token"
```

**Lưu ý**: Nếu gặp lỗi authentication, dùng OAuth login thay vì API token.

## Bước 3: Build Project

```bash
cd frontend
npm install
npm run build
```

Đảm bảo folder `dist/` được tạo thành công.

## Bước 4: Tạo Project (Lần đầu)

```bash
wrangler pages project create your-project-name
```

Thay `your-project-name` bằng tên project của bạn.

## Bước 5: Deploy

```bash
# Deploy lần đầu hoặc update
wrangler pages deploy dist --project-name=your-project-name
```

**⚠️ QUAN TRỌNG**: 
- ✅ Dùng: `wrangler pages deploy` (Pages command)
- ❌ KHÔNG dùng: `wrangler deploy` (Workers command)

## Bước 6: Set Environment Variables

Sau khi deploy, set environment variables trong Dashboard:
- Vào Cloudflare Dashboard → Pages → Your project → Settings → Environment variables
- Thêm:
  ```
  VITE_API_URL=https://your-backend.fly.dev/api
  VITE_WS_URL=https://your-backend.fly.dev
  ```
- Redeploy để apply env vars

## Hoặc dùng script trong package.json

Đã thêm script `deploy:pages`:

```bash
cd frontend
npm run deploy:pages -- --project-name=your-project-name
```

## Troubleshooting

### Error: "Project not found"
- Tạo project trước: `wrangler pages project create your-project-name`

### Error: "Authentication required"
- Login lại: `wrangler login`

### Error: "dist folder not found"
- Build trước: `npm run build`
- Check xem folder `dist/` có tồn tại không

## Auto-deploy sau này

Sau khi setup xong, bạn có thể:
1. **Dùng Dashboard auto-deploy**: Connect Git repo và set build settings đúng
2. **Hoặc tiếp tục dùng CLI**: Mỗi lần update, chạy `npm run deploy:pages`

## Lợi ích của CLI

- ✅ Không bị lỗi Wrangler Workers
- ✅ Control hoàn toàn build process
- ✅ Dễ debug (xem output trực tiếp)
- ✅ Có thể script hóa (CI/CD)

