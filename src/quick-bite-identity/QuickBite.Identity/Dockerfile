# Multi-stage Dockerfile for QuickBite Identity Service (.NET 10 / ABP Framework)

# Stage 1: Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS builder

WORKDIR /app

# Copy solution configuration and project files for restore caching
COPY common.props ./
COPY src/QuickBite.Identity.Web/QuickBite.Identity.Web.csproj src/QuickBite.Identity.Web/
COPY src/QuickBite.Identity.Application/QuickBite.Identity.Application.csproj src/QuickBite.Identity.Application/
COPY src/QuickBite.Identity.Application.Contracts/QuickBite.Identity.Application.Contracts.csproj src/QuickBite.Identity.Application.Contracts/
COPY src/QuickBite.Identity.Domain/QuickBite.Identity.Domain.csproj src/QuickBite.Identity.Domain/
COPY src/QuickBite.Identity.Domain.Shared/QuickBite.Identity.Domain.Shared.csproj src/QuickBite.Identity.Domain.Shared/
COPY src/QuickBite.Identity.EntityFrameworkCore/QuickBite.Identity.EntityFrameworkCore.csproj src/QuickBite.Identity.EntityFrameworkCore/
COPY src/QuickBite.Identity.HttpApi/QuickBite.Identity.HttpApi.csproj src/QuickBite.Identity.HttpApi/
COPY src/QuickBite.Identity.HttpApi.Client/QuickBite.Identity.HttpApi.Client.csproj src/QuickBite.Identity.HttpApi.Client/

# Restore dependencies
RUN dotnet restore src/QuickBite.Identity.Web/QuickBite.Identity.Web.csproj

# Copy remaining source code and publish
COPY . .
RUN dotnet publish src/QuickBite.Identity.Web/QuickBite.Identity.Web.csproj -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Production runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runner

WORKDIR /app

# Set default port
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=builder /app/publish .

ENTRYPOINT ["dotnet", "QuickBite.Identity.Web.dll"]
