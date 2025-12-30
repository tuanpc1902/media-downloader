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

## Bước 2: Cài đặt yt-dlp và FFmpeg

### Windows
```bash
pip install yt-dlp
# FFmpeg: Tải từ https://ffmpeg.org/download.html và thêm vào PATH
```

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
```bash
# Tải từ https://redis.io/download
# Hoặc dùng Docker:
docker run -d -p 6379:6379 redis
```

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

- `SETUP.md` - Hướng dẫn setup chi tiết
- `USAGE.md` - Hướng dẫn sử dụng
- `ARCHITECTURE.md` - Kiến trúc hệ thống
- `PROJECT_SUMMARY.md` - Tóm tắt dự án

## 🎉 Xong!

Bây giờ bạn có thể bắt đầu sử dụng YouTube Downloader!

