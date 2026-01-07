# 🚀 Quick Start Guide

## Bước 1: Cài đặt dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

### Kiểm tra prerequisites (Tùy chọn nhưng khuyến nghị)
```bash
cd backend
npm run check-prerequisites
```

Script này sẽ kiểm tra:
- ✅ Node.js 18+
- ✅ Python 3.8+
- ✅ yt-dlp
- ✅ FFmpeg
- ⚠️  Redis (optional - queue features sẽ bị tắt nếu không có)

## Bước 2: Cài đặt yt-dlp và FFmpeg

### Windows

**1. Cài đặt Python (nếu chưa có):**
- Tải từ [python.org](https://www.python.org/downloads/)
- **Quan trọng**: Chọn "Add Python to PATH" khi cài đặt
- Verify: `python --version`

**2. Cài đặt yt-dlp:**
```bash
pip install yt-dlp
yt-dlp --version  # Verify installation
```

**3. Cài đặt FFmpeg:**
- Tải từ [ffmpeg.org](https://ffmpeg.org/download.html) hoặc [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)
- Giải nén vào `C:\ffmpeg`
- Thêm `C:\ffmpeg\bin` vào PATH:
  - Mở System Properties → Environment Variables
  - Thêm `C:\ffmpeg\bin` vào Path variable
- Verify: `ffmpeg -version`

### Linux
```bash
sudo apt-get install yt-dlp ffmpeg
# hoặc
pip3 install yt-dlp && sudo apt-get install ffmpeg
```

### Mac
```bash
brew install yt-dlp ffmpeg
```

## Bước 3: Cài đặt và chạy Redis

### Windows

**Option 1: Docker (Khuyến nghị - Dễ nhất)**
```bash
# Cần cài Docker Desktop trước: https://www.docker.com/products/docker-desktop
docker run -d -p 6379:6379 --name yt-downloader-redis redis:7-alpine
```

**Option 2: WSL2 + Linux Redis**
```bash
# Trong WSL2 terminal:
sudo apt-get update
sudo apt-get install redis-server
sudo service redis-server start
```

**Option 3: Memurai (Windows-native Redis)**
- Tải từ [memurai.com](https://www.memurai.com/)
- Cài đặt và chạy như Windows service

### Linux
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

### Mac
```bash
brew install redis
brew services start redis
```

## Bước 4: Cấu hình

### Backend
```bash
cd backend
cp env.example .env
# Chỉnh sửa .env nếu cần (mặc định đã OK cho local)
```

### Frontend
```bash
cd frontend
cp env.example .env
# Mặc định đã OK cho local
```

## Bước 5: Chạy ứng dụng

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

## Bước 6: Sử dụng

1. Mở browser: `http://localhost:5173`
2. Nhập URL YouTube
3. Click "Phân tích"
4. Chọn format
5. Click "Bắt đầu tải"
6. Xem progress trong dashboard

## ✅ Kiểm tra

### Backend hoạt động?
```bash
curl http://localhost:3001/api/health
# Nên trả về: {"status":"ok","timestamp":"..."}
```

### Redis hoạt động?
```bash
redis-cli ping
# Nên trả về: PONG
```

### yt-dlp hoạt động?
```bash
yt-dlp --version
# Nên hiển thị version
```

### FFmpeg hoạt động?
```bash
ffmpeg -version
# Nên hiển thị version info
```

## 🐛 Troubleshooting nhanh

### Backend không chạy
- Kiểm tra port 3001 có bị chiếm không
- Kiểm tra Redis đang chạy
- Kiểm tra log: `backend/logs/app.log`

### Frontend không kết nối backend
- Kiểm tra backend đang chạy
- Kiểm tra CORS trong backend .env
- Kiểm tra browser console

### Download không hoạt động
- Kiểm tra yt-dlp: `yt-dlp --version`
- Kiểm tra FFmpeg: `ffmpeg -version`
- Kiểm tra disk space
- Kiểm tra log: `backend/logs/app.log`

## 📚 Tài liệu đầy đủ

- `README.md` - Tổng quan dự án và kiến trúc
- `DEPLOY.md` - Hướng dẫn deploy lên production
- `backend/REDIS_DEPLOY_RENDER.md` - Hướng dẫn cấu hình Redis trên Render
- `backend/PRODUCTION_ENV.md` - Cấu hình môi trường production

## 🎉 Xong!

Bây giờ bạn có thể bắt đầu sử dụng YouTube Downloader!

