# ── Stage 1: Build ──────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy csproj first for layer-cached restore
COPY PunchedApi.csproj ./
RUN dotnet restore --runtime linux-musl-x64

# Copy everything else and publish
COPY . ./
RUN dotnet publish -c Release \
    --runtime linux-musl-x64 \
    --self-contained false \
    -o /app/publish \
    /p:UseAppHost=false

# ── Stage 2: Runtime ────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

# Minimal Alpine hardening
RUN addgroup -S punched && adduser -S punched -G punched

COPY --from=build /app/publish .

# Health check against the lightweight /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

# Non-root user
USER punched

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "PunchedApi.dll"]
