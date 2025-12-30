FROM node:18-slim

# Cài đặt Python và yt-dlp dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && pip3 install --upgrade pip \
    && pip3 install yt-dlp

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


