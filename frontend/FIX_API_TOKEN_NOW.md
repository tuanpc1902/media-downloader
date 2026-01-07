# 🚨 FIX API TOKEN NGAY - Step by Step

## Vấn đề
API token không có quyền Cloudflare Pages, mặc dù bạn có Super Admin.

## ✅ Giải pháp NGAY (Chọn 1 trong 3)

### ⭐ Option 1: Dùng OAuth Login (Dễ nhất - 2 phút)

**Bước 1: Unset API token**
```powershell
# Windows PowerShell (chạy trong terminal)
Remove-Item Env:\CLOUDFLARE_API_TOKEN

# Hoặc trong CMD
set CLOUDFLARE_API_TOKEN=
```

**Bước 2: Login với OAuth**
```bash
wrangler login
```
Browser sẽ mở, login và authorize.

**Bước 3: Deploy**
```bash
cd frontend
npm run build
wrangler pages deploy dist --project-name=media-downloader
```

✅ **Xong!** Không cần quản lý token nữa.

---

### Option 2: Tạo API Token mới với đúng permissions

**Bước 1: Tạo token mới**
1. Vào: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Chọn "Create Custom Token"
4. Set:
   - **Token name**: `Cloudflare Pages Deploy`
   - **Permissions**:
     - `Account` → `Cloudflare Pages` → `Edit` ✅
     - `Account` → `Account Settings` → `Read` ✅
   - **Account Resources**: 
     - Include → `ffa264cebf9c29cea3b04eebc08c51d3` (your account)
5. Click "Continue to summary" → "Create Token"
6. **COPY TOKEN** (chỉ hiện 1 lần!)

**Bước 2: Set token mới**
```powershell
# Windows PowerShell
$env:CLOUDFLARE_API_TOKEN="your-new-token-here"

# Hoặc trong CMD
set CLOUDFLARE_API_TOKEN=your-new-token-here
```

**Bước 3: Deploy**
```bash
cd frontend
npm run build
wrangler pages deploy dist --project-name=media-downloader
```

---

### Option 3: Deploy từ Dashboard (Không cần CLI)

**⚠️ QUAN TRỌNG**: Nếu project hiện tại đang lỗi, **XÓA và TẠO LẠI** project mới!

**Bước 1: Xóa Project cũ (nếu có lỗi)**
- Pages → Your project → Settings → General → Delete project

**Bước 2: Tạo Project MỚI**
- Pages → "Create a project"
- Connect Git repository
- Chọn branch

**Bước 3: Build Settings (CRITICAL)**
- **Framework preset**: **"Vite"** (KHÔNG chọn Workers!)
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/frontend`

**Bước 4: Environment Variables**
- Settings → Environment variables → Add:
  ```
  VITE_API_URL=https://your-backend.fly.dev/api
  VITE_WS_URL=https://your-backend.fly.dev
  ```

**Bước 5: Deploy**
- Click "Save and Deploy"
- Hoặc push code lên Git → Auto deploy

✅ **Xong!** Không cần CLI, không cần token.

**Nếu vẫn lỗi**: Xem `frontend/CLOUDFLARE_DASHBOARD_FIX.md` để fix chi tiết.

---

## 🔍 Kiểm tra Token hiện tại

```bash
# Check token permissions
wrangler whoami
```

Nếu thấy "User API Token", token đang được dùng nhưng thiếu quyền.

## ✅ Khuyến nghị

**Dùng Option 1 (OAuth)** vì:
- ✅ Đơn giản nhất
- ✅ Không cần quản lý token
- ✅ Tự động có đủ quyền
- ✅ An toàn hơn

**Hoặc Option 3 (Dashboard)** nếu:
- ✅ Muốn auto-deploy từ Git
- ✅ Không muốn dùng CLI
- ✅ Dễ quản lý hơn

