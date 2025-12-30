FROM node:18-alpine

# Cài đặt Python và yt-dlp dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    && pip3 install yt-dlp

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .
RUN npm run build

# Tạo thư mục downloads và logs
RUN mkdir -p downloads logs

EXPOSE 3001

CMD ["node", "dist/index.js"]


