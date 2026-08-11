# Multi-stage Dockerfile for QuickBite API Gateway Service (NestJS)

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

# Copy compiled dist from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (Render automatically injects PORT env variable)
EXPOSE 3001

# Start NestJS application
CMD ["node", "dist/main.js"]
