# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY public ./public
COPY src ./src

# Build the application
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built app from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]


# Tạo thư mục cache và set permissions
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && \
    chmod -R 777 /var/cache/nginx && \
    chmod -R 777 /var/run && \
    chmod -R 777 /etc/nginx/conf.d

# Copy nginx config và code của bạn
COPY nginx.conf /etc/nginx/nginx.conf
COPY . /usr/share/nginx/html

# Chạy nginx với user nginx (không cần root)
USER nginx