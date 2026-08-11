# Multi-stage Dockerfile for QuickBite Order Service (.NET 10 / ABP Framework)

# Stage 1: Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS builder

WORKDIR /app

# Copy solution configuration and project files for restore caching
COPY common.props ./
COPY src/QuickBite.Order.HttpApi.Host/QuickBite.Order.HttpApi.Host.csproj src/QuickBite.Order.HttpApi.Host/
COPY src/QuickBite.Order.Application/QuickBite.Order.Application.csproj src/QuickBite.Order.Application/
COPY src/QuickBite.Order.Application.Contracts/QuickBite.Order.Application.Contracts.csproj src/QuickBite.Order.Application.Contracts/
COPY src/QuickBite.Order.Domain/QuickBite.Order.Domain.csproj src/QuickBite.Order.Domain/
COPY src/QuickBite.Order.Domain.Shared/QuickBite.Order.Domain.Shared.csproj src/QuickBite.Order.Domain.Shared/
COPY src/QuickBite.Order.EntityFrameworkCore/QuickBite.Order.EntityFrameworkCore.csproj src/QuickBite.Order.EntityFrameworkCore/
COPY src/QuickBite.Order.HttpApi/QuickBite.Order.HttpApi.csproj src/QuickBite.Order.HttpApi/
COPY src/QuickBite.Order.HttpApi.Client/QuickBite.Order.HttpApi.Client.csproj src/QuickBite.Order.HttpApi.Client/
COPY src/QuickBite.Order.Infrastructure/QuickBite.Order.Infrastructure.csproj src/QuickBite.Order.Infrastructure/

# Restore dependencies
RUN dotnet restore src/QuickBite.Order.HttpApi.Host/QuickBite.Order.HttpApi.Host.csproj

# Copy remaining source code and publish
COPY . .
RUN dotnet publish src/QuickBite.Order.HttpApi.Host/QuickBite.Order.HttpApi.Host.csproj -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Production runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runner

WORKDIR /app

# Set default port
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=builder /app/publish .

ENTRYPOINT ["dotnet", "QuickBite.Order.HttpApi.Host.dll"]
