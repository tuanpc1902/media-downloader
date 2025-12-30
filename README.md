# Media Downloader - Production Ready Web Application

## 📋 Tổng quan

Web application cho phép tải video/audio từ YouTube, TikTok và các nền tảng khác với khả năng xử lý video dài, hiệu năng cao và dễ mở rộng.

## ✨ Tính năng chính

- ✅ **Download video/audio** từ YouTube, TikTok, SoundCloud và nhiều nền tảng khác
- ✅ **Tìm kiếm video YouTube** với preview và pagination
- ✅ **Tải TikTok không watermark** với hỗ trợ audio-only
- ✅ **Hỗ trợ video dài** (10h+)
- ✅ **Realtime progress tracking** qua WebSocket
- ✅ **Multiple format options** (video/audio, chất lượng, bitrate)
- ✅ **Queue system** với retry và quản lý job
- ✅ **Dashboard quản lý** download queue
- ✅ **Dark mode UI** và responsive design
- ✅ **Batch download** nhiều video cùng lúc

## 🏗️ Kiến trúc hệ thống

```
Frontend (React + TypeScript)
    ↓ WebSocket / REST API
Backend (Node.js + Express)
    ↓ Queue (BullMQ + Redis)
Worker Process (yt-dlp + FFmpeg)
    ↓ File System
Downloads
```

## 📁 Cấu trúc dự án

```
yt-download/
├── backend/              # Backend API server
│   ├── src/
│   │   ├── controllers/  # API controllers
│   │   ├── services/     # Business logic
│   │   ├── workers/      # Download workers
│   │   ├── queue/        # BullMQ queue setup
│   │   ├── websocket/    # WebSocket server
│   │   └── utils/        # Utilities
│   ├── Dockerfile
│   └── env.example
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── stores/       # Zustand state management
│   │   └── services/     # API clients
│   ├── Dockerfile
│   └── env.example
├── docker-compose.yml    # Docker setup
├── .gitignore
├── README.md
└── QUICKSTART.md         # Hướng dẫn nhanh
```

## 🚀 Quick Start

Xem file [QUICKSTART.md](./QUICKSTART.md) để hướng dẫn chi tiết.

### Prerequisites

- **Node.js** 18+
- **Python** 3.8+ (for yt-dlp)
- **FFmpeg** (for audio conversion)
- **Redis** (for job queue)

### Installation

1. **Clone repository**
```bash
git clone <repository-url>
cd yt-download
```

2. **Backend Setup**
```bash
cd backend
npm install
cp env.example .env
# Chỉnh sửa .env nếu cần
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend
npm install
cp env.example .env
npm run dev
```

4. **Install yt-dlp và FFmpeg**

**Windows:**
```bash
pip install yt-dlp
# FFmpeg: Tải từ https://ffmpeg.org/download.html
```

**Linux:**
```bash
sudo apt-get install yt-dlp ffmpeg
```

**Mac:**
```bash
brew install yt-dlp ffmpeg
```

5. **Start Redis**

**Docker:**
```bash
docker run -d -p 6379:6379 redis
```

**Linux:**
```bash
sudo systemctl start redis
```

**Mac:**
```bash
brew services start redis
```

## 🐳 Docker Deployment

```bash
docker-compose up -d
```

## 🌐 Deploy lên Production

Xem file [DEPLOY.md](./DEPLOY.md) để hướng dẫn chi tiết deploy lên:
- **Frontend**: Vercel, Netlify
- **Backend**: Railway, Render, VPS

### Quick Deploy

**Frontend (Vercel):**
```bash
cd frontend
vercel --prod
```

**Backend (Railway):**
1. Connect GitHub repo
2. Add Redis service
3. Set environment variables
4. Deploy

## 📝 Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGIN=http://localhost:5173
YTDLP_USER_AGENT=...
YTDLP_COOKIE_FILE=...
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

Xem chi tiết trong `backend/env.example` và `frontend/env.example`.

## 🔄 Luồng xử lý

### 1. Phân tích video (Analyze)
```
User Input URL → API /analyze → yt-dlp --dump-json → Parse metadata → Return to frontend
```

### 2. Tải video (Download)
```
User Submit → API /download → Create Job → Queue → Worker Process
    ↓
Worker: yt-dlp download → Progress Events → WebSocket → Frontend
    ↓
Download Complete → Merge/Convert (if needed) → Save File → Update Status
```

### 3. Realtime Progress
```
yt-dlp Progress → Worker → WebSocket Server → Frontend (Dashboard)
```

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** (build tool)
- **TailwindCSS** (styling)
- **Zustand** (state management)
- **Socket.IO Client** (WebSocket)
- **Axios** (HTTP client)
- **React Router** (routing)
- **Lucide React** (icons)

### Backend
- **Node.js** + **TypeScript**
- **Express** (web framework)
- **BullMQ** (job queue)
- **Redis** (queue storage)
- **Socket.IO** (WebSocket server)
- **yt-dlp** (video downloader)
- **FFmpeg** (audio/video processing)
- **Winston** (logging)

## 📚 API Endpoints

### General
- `GET /api/health` - Health check
- `POST /api/analyze` - Analyze video metadata
- `POST /api/download` - Create download job
- `GET /api/job/:id/status` - Get job status
- `GET /api/job/:id/log` - Get job logs

### TikTok
- `POST /api/tiktok/analyze` - Analyze TikTok video
- `POST /api/tiktok/download` - Create TikTok download job
- `GET /api/tiktok/job/:id/status` - Get TikTok job status

### Search
- `POST /api/search/youtube` - Search YouTube videos

## 🐛 Troubleshooting

### Backend không chạy
- Kiểm tra port 3001 có bị chiếm không
- Kiểm tra Redis đang chạy: `redis-cli ping`
- Kiểm tra log: `backend/logs/app.log`

### Download không hoạt động
- Kiểm tra yt-dlp: `yt-dlp --version`
- Kiểm tra FFmpeg: `ffmpeg -version`
- Kiểm tra disk space
- Kiểm tra log: `backend/logs/app.log`

### Frontend không kết nối backend
- Kiểm tra backend đang chạy
- Kiểm tra CORS trong backend .env
- Kiểm tra browser console

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
