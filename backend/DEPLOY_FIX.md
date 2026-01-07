# 🔧 Fix Docker Build Error

## Vấn đề
Lỗi: `Could not read package.json: Error: ENOENT: no such file or directory`

## Nguyên nhân
- Dockerfile ở root directory đang được dùng thay vì `backend/Dockerfile`
- Build context không đúng

## ✅ Giải pháp

### Option 1: Deploy từ backend folder (Recommended)

```bash
# 1. Vào backend folder
cd backend

# 2. Deploy
fly deploy
```

### Option 2: Deploy từ root với fly.toml đúng

```bash
# Từ root directory
fly deploy --config fly.toml
```

## ✅ Đã fix

- [x] Xóa Dockerfile ở root (không cần thiết)
- [x] Update `backend/fly.toml` với app name đúng
- [x] Đảm bảo build context đúng

## 🚀 Deploy ngay

```bash
# Từ backend folder
cd backend
fly deploy
```

Hoặc:

```bash
# Từ root
fly deploy --config fly.toml
```

