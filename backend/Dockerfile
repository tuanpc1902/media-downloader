FROM node:18-slim

# Cài đặt system dependencies
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python3-dev \
        ffmpeg \
        curl \
        ca-certificates \
        build-essential \
        && rm -rf /var/lib/apt/lists/*

# Cài đặt yt-dlp
# Sử dụng --break-system-packages để bypass externally-managed-environment (Python 3.11+)
RUN set -eux; \
    python3 -m pip install --no-cache-dir --break-system-packages --upgrade pip setuptools wheel; \
    python3 -m pip install --no-cache-dir --break-system-packages yt-dlp

WORKDIR /app

# Copy package files
COPY package*.json ./
# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Tạo thư mục downloads và logs
RUN mkdir -p downloads logs

EXPOSE 3001

CMD ["node", "dist/index.js"]


