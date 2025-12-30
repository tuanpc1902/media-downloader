# Redis Layer Refactoring - Production-Grade Implementation

## 🎯 Mục tiêu

Refactor Redis layer để:
- ✅ App không crash khi Redis fail
- ✅ Graceful degradation (app vẫn chạy, chỉ queue features bị disable)
- ✅ Ưu tiên REDIS_URL, fallback REDIS_HOST+PORT
- ✅ Không hard-code localhost trong production
- ✅ Retry logic với exponential backoff
- ✅ Health check endpoints

## 📁 Files đã thay đổi

### 1. `src/lib/redis.ts` (NEW)
**Production-grade Redis connection manager**

**Features:**
- Async initialization với retry logic
- Ưu tiên `REDIS_URL` > `REDIS_HOST` + `REDIS_PORT`
- Không hard-code localhost trong production
- Graceful error handling (không throw ở global scope)
- Connection state tracking: `redisAvailable`, `redisClient`, `redisConnection`
- Health check function: `checkRedisHealth()`

**Key Functions:**
```typescript
export async function initializeRedis(): Promise<void>
export function getRedisClient(): Redis | null
export function getRedisConnection(): Redis | null
export function isRedisAvailable(): boolean
export async function disconnectRedis(): Promise<void>
export async function checkRedisHealth(): Promise<{...}>
```

### 2. `src/config/index.ts`
**Removed hard-coded localhost fallback**

- `host` và `port` giờ là `undefined` nếu không có env vars
- Chỉ dùng cho backward compatibility
- Logic thực tế nằm trong `src/lib/redis.ts`

### 3. `src/queue/index.ts`
**Queue initialization với lazy connection**

- Tạo connection ngay cả khi Redis chưa connect
- BullMQ sẽ tự retry khi Redis available
- Log warning nếu Redis chưa ready

### 4. `src/index.ts`
**Bootstrap không crash khi Redis fail**

**Before:**
```typescript
checkRedis().then((available) => {
  if (!available) {
    throw new Error('Redis connection failed'); // ❌ Crash server
  }
})
```

**After:**
```typescript
await initializeRedis(); // ✅ Non-blocking
if (isRedisAvailable()) {
  // Start workers
} else {
  logger.warn('Redis unavailable - running without queue features'); // ✅ Continue
}
```

### 5. `src/routes/index.ts`
**Health check endpoints**

- `GET /api/health` - General health với Redis status
- `GET /api/health/redis` - Detailed Redis health check

### 6. `src/services/download.service.ts` & `src/services/tiktok-download.service.ts`
**Check Redis before adding jobs**

- Trả về error message rõ ràng nếu Redis unavailable
- User biết chính xác vấn đề là gì

### 7. `env.example`
**Updated với Redis config documentation**

- Giải thích REDIS_URL vs REDIS_HOST+PORT
- Priority order
- Local vs Production notes

## 🔄 Flow mới

### Startup Flow:
1. ✅ Check dependencies (yt-dlp, ffmpeg) - có thể fail
2. ✅ Initialize Redis (non-blocking) - không crash nếu fail
3. ✅ Initialize WebSocket (always available)
4. ✅ Start workers (chỉ nếu Redis available)
5. ✅ Start HTTP server (always starts)

### Redis Connection Flow:
1. Check `REDIS_URL` → nếu có, dùng
2. Check `REDIS_HOST` + `REDIS_PORT` → nếu có, dùng
3. Development: fallback `localhost:6379`
4. Production: không fallback → Redis unavailable

### Queue Operations:
1. Check `isRedisAvailable()` trước khi add job
2. Nếu không available → trả về 503 với message rõ ràng
3. Nếu available → add job bình thường

## 🚫 Vấn đề cũ

### ❌ Vấn đề 1: Redis khởi tạo ở global scope
```typescript
// queue/index.ts (OLD)
const connection = new Redis({...}); // ❌ Khởi tạo ngay, có thể fail
```

**Fix:** Lazy initialization trong `redis.ts`, chỉ tạo khi cần

### ❌ Vấn đề 2: Hard-code localhost
```typescript
// config/index.ts (OLD)
host: process.env.REDIS_HOST || 'localhost', // ❌ Always fallback localhost
```

**Fix:** Không fallback trong production, chỉ development

### ❌ Vấn đề 3: Redis fail → crash server
```typescript
// index.ts (OLD)
if (!available) {
  throw new Error('Redis connection failed'); // ❌ Crash
}
```

**Fix:** Log warning, continue startup

### ❌ Vấn đề 4: Thiếu retry logic
**Fix:** Exponential backoff trong `redis.ts`

## ✅ Kết quả

### App Startup:
- ✅ Luôn start thành công (trừ khi thiếu yt-dlp/ffmpeg)
- ✅ Redis fail → app vẫn chạy, chỉ queue disabled
- ✅ Log rõ ràng: `[Redis] Connected` hoặc `[Redis] Unavailable`

### Health Check:
```bash
GET /api/health
{
  "status": "ok",
  "redis": "connected" | "disconnected",
  "redisDetails": {...}
}
```

### Error Messages:
- User-friendly: "Redis is not available. Download queue is disabled."
- Developer-friendly: Logs với đầy đủ config và env vars

## 🔧 Environment Variables

### Priority Order:
1. `REDIS_URL` (highest priority)
2. `REDIS_HOST` + `REDIS_PORT` + `REDIS_PASSWORD`
3. Development: `localhost:6379` (auto)
4. Production: Redis unavailable (no fallback)

### Examples:

**Local Development:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Render/Cloud:**
```env
REDIS_URL=redis://:password@d-redis-xxx.render.com:6379
```

Hoặc:
```env
REDIS_HOST=d-redis-xxx.render.com
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

## 📊 Monitoring

### Logs:
- `[Redis] Connecting using REDIS_URL`
- `[Redis] Connected and ready`
- `[Redis] Unavailable – running without Redis`
- `[Queue] Queues initialized - Redis connected`
- `[Queue] Queues initialized - Redis not yet connected`

### Health Endpoints:
- `/api/health` - Quick status
- `/api/health/redis` - Detailed Redis info

## 🎉 Benefits

1. **Resilience**: App không crash khi Redis fail
2. **Observability**: Logs và health checks rõ ràng
3. **Flexibility**: Support nhiều cách config Redis
4. **User Experience**: Error messages rõ ràng
5. **Production-Ready**: Không hard-code, không assume Redis luôn tồn tại

