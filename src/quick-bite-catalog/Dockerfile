# Multi-stage Dockerfile for QuickBite Catalog Service (NestJS)

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package management files
COPY package*.json ./

# Install dependencies (including devDependencies for NestJS compilation)
RUN npm ci

# Copy configuration and source files
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY ca.pem* ./

# Build the NestJS application
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy package management files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled dist and SSL certs from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ca.pem* ./

# Expose port (Render automatically injects PORT env variable)
EXPOSE 3000

# Start NestJS application
CMD ["node", "dist/main.js"]
