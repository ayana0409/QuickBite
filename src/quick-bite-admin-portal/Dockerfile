# Multi-stage Dockerfile for QuickBite Admin & Merchant Portal (React 19 + Vite + Tailwind CSS)

# ==========================================
# Stage 1: Build Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for Vite environment variables
ARG VITE_API_GATEWAY_URL=https://quick-bite-gw.onrender.com
ARG VITE_IDENTITY_SERVICE_URL=https://quick-bite-identity.onrender.com
ARG VITE_OIDC_CLIENT_ID=Identity_Swagger
ARG VITE_OIDC_SCOPE="openid profile roles Identity"
ARG VITE_IDENTITY_URL=https://quick-bite-identity.onrender.com
ARG VITE_ORDER_URL=https://quick-bite-order.onrender.com/api/app
ARG VITE_CATALOG_URL=https://quick-bite-catalog.onrender.com
ARG VITE_INVENTORY_URL=https://quick-bite-inventory.onrender.com/api/v1
ARG VITE_PAYMENT_URL=https://quick-bite-payment.onrender.com/v1

# Export arguments as environment variables for the Vite build step
ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL
ENV VITE_IDENTITY_SERVICE_URL=$VITE_IDENTITY_SERVICE_URL
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID
ENV VITE_OIDC_SCOPE=$VITE_OIDC_SCOPE
ENV VITE_IDENTITY_URL=$VITE_IDENTITY_URL
ENV VITE_ORDER_URL=$VITE_ORDER_URL
ENV VITE_CATALOG_URL=$VITE_CATALOG_URL
ENV VITE_INVENTORY_URL=$VITE_INVENTORY_URL
ENV VITE_PAYMENT_URL=$VITE_PAYMENT_URL

# Copy package dependency definitions
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# Copy application source code and configuration files
COPY tsconfig*.json vite.config.ts eslint.config.js index.html ./
COPY public ./public
COPY src ./src

# Compile TypeScript and bundle production assets with Vite
RUN npm run build

# ==========================================
# Stage 2: Production Nginx Server Stage
# ==========================================
FROM nginx:alpine AS runner

# Default fallback port for local docker run (Render automatically overrides PORT=10000)
ENV PORT=80

# Remove default static files and configuration
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration template (Nginx entrypoint automatically substitutes ${PORT} using envsubst)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Launch Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
