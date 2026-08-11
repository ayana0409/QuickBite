# Multi-stage Dockerfile for QuickBite Payment Service (Spring Boot - Java 21)

# Stage 1: Build stage
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml ./
RUN mvn dependency:go-offline -B

# Copy source code and package application
COPY src ./src
RUN mvn package -DskipTests

# Stage 2: Production runtime stage
FROM eclipse-temurin:21-jre-alpine AS runner

WORKDIR /app

# Copy built jar file from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose default port
EXPOSE 8084

# Execute application with dynamic PORT support for Render
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8084} -jar app.jar"]
