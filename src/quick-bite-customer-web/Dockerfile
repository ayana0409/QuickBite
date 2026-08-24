# Multi-stage Dockerfile for QuickBite Customer Web Portal (Next.js 16 + React 19 + Tailwind CSS 4)

# ==========================================
# Stage 1: Dependency Installation Stage
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# ==========================================
# Stage 2: Application Build Stage
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build arguments for public client-side environment variables only
ARG NEXT_PUBLIC_API_GATEWAY_URL
ARG NEXT_PUBLIC_IDENTITY_URL
ARG NEXT_PUBLIC_ORDER_URL
ARG NEXT_PUBLIC_CATALOG_URL
ARG NEXT_PUBLIC_INVENTORY_URL
ARG NEXT_PUBLIC_PAYMENT_URL
ARG NEXT_PUBLIC_MERCHANT_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Expose public build arguments to Next.js compiler
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL
ENV NEXT_PUBLIC_IDENTITY_URL=$NEXT_PUBLIC_IDENTITY_URL
ENV NEXT_PUBLIC_ORDER_URL=$NEXT_PUBLIC_ORDER_URL
ENV NEXT_PUBLIC_CATALOG_URL=$NEXT_PUBLIC_CATALOG_URL
ENV NEXT_PUBLIC_INVENTORY_URL=$NEXT_PUBLIC_INVENTORY_URL
ENV NEXT_PUBLIC_PAYMENT_URL=$NEXT_PUBLIC_PAYMENT_URL
ENV NEXT_PUBLIC_MERCHANT_URL=$NEXT_PUBLIC_MERCHANT_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js in standalone mode
RUN npm run build

# ==========================================
# Stage 3: Production Runtime Stage
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Create non-root user for security best practices
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public directory and standalone build artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Expose container port (Render dynamically assigns $PORT at runtime)
EXPOSE 3000

# Launch standalone Next.js Node server
# Note: Sensitive runtime variables (NEXTAUTH_SECRET, OIDC_CLIENT_SECRET, NEXTAUTH_URL, etc.)
# are injected securely at runtime via Render Dashboard Environment Variables or 'docker run -e'.
CMD ["node", "server.js"]
