# 🔧 Fix Fly.io Build Error

## Vấn đề
Fly.io build fail với lỗi:
```
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory
```

## Nguyên nhân
Fly.io đang build từ root directory, nhưng Dockerfile và package.json đều ở trong `backend/` folder.

## ✅ Giải pháp

### Cách 1: Deploy từ backend folder (Recommended)

```bash
# Chạy từ backend folder
cd backend
fly deploy
```

Fly.io sẽ tự động detect `fly.toml` trong backend folder và build đúng.

### Cách 2: Update fly.toml ở root

Nếu bạn muốn deploy từ root, file `fly.toml` ở root đã được update với:
```toml
[build]
  dockerfile = "backend/Dockerfile"
  build_context = "backend"
```

Sau đó chạy:
```bash
# Từ root directory
fly deploy
```

## ✅ Checklist

Sau khi fix:
- [ ] `fly.toml` có `build_context = "backend"` (nếu deploy từ root)
- [ ] Hoặc chạy `fly deploy` từ trong `backend/` folder
- [ ] Build thành công (check logs)
- [ ] App start được (check `fly logs`)

## 🐛 Nếu vẫn lỗi

1. **Check bạn đang ở đúng folder**:
   ```bash
   # Nếu deploy từ root
   ls backend/package.json  # Phải thấy file
   
   # Hoặc deploy từ backend
   cd backend
   ls package.json  # Phải thấy file
   ```

2. **Check fly.toml**:
   - Nếu deploy từ root: `fly.toml` phải có `build_context = "backend"`
   - Nếu deploy từ backend: `backend/fly.toml` phải có `dockerfile = "Dockerfile"`

3. **Clear cache và rebuild**:
   ```bash
   fly deploy --no-cache
   ```

