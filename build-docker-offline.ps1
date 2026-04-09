# Script para construir las imágenes Docker sin descargar del internet
# Usa código pre-compilado y crea contenedores ligeros

param(
    [switch]$help
)

if ($help) {
    Write-Host "Usage: .\build-docker-offline.ps1"
    Write-Host "Este script construye las imágenes Docker usando código pre-compilado"
    Write-Host "Sin necesidad de descargar imágenes base de Docker Hub"
    exit 0
}

$ErrorActionPreference = "Stop"

# Función para construir servicio
function Build-Service {
    param(
        [string]$ServiceName,
        [string]$ServicePath,
        [int]$Port
    )
    
    Write-Host "`n=== Construyendo $ServiceName ===" -ForegroundColor Cyan
    
    # 1. Compilar TypeScript
    Write-Host "Compilando $ServiceName..." -ForegroundColor Yellow
    Push-Location $ServicePath
    pnpm install --frozen-lockfile 2>&1 | Out-Null
    pnpm build 2>&1 | Out-Null
    Pop-Location
    
    # 2. Crear Dockerfile temporal
    $dockerfile = @"
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

COPY prisma ./prisma 2>/dev/null || true
COPY dist ./dist

EXPOSE $Port

CMD ["node", "dist/main"]
"@
    
    $dockerfilePath = "$ServicePath/Dockerfile.offline"
    Set-Content -Path $dockerfilePath -Value $dockerfile
    
    # 3. Construir imagen
    Write-Host "Construyendo imagen Docker..." -ForegroundColor Yellow
    docker build -f "$ServicePath/Dockerfile.offline" -t "microservices-$ServiceName:latest" "$ServicePath" 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error construyendo $ServiceName" -ForegroundColor Red
        return $false
    }
    
    Remove-Item -Path $dockerfilePath
    
    Write-Host "✓ $ServiceName construido exitosamente" -ForegroundColor Green
    return $true
}

# Servicios a construir
$services = @(
    @{ Name = "identity"; Path = "./services/identity"; Port = 3010 },
    @{ Name = "whatsapp"; Path = "./services/whatsapp"; Port = 3001 },
    @{ Name = "slack"; Path = "./services/slack"; Port = 3002 },
    @{ Name = "notion"; Path = "./services/notion"; Port = 3003 },
    @{ Name = "instagram"; Path = "./services/instagram"; Port = 3004 },
    @{ Name = "tiktok"; Path = "./services/tiktok"; Port = 3005 },
    @{ Name = "facebook"; Path = "./services/facebook"; Port = 3006 },
    @{ Name = "gateway"; Path = "./gateway"; Port = 3000 }
)

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Construcción de Imágenes Docker       ║" -ForegroundColor Cyan
Write-Host "║  Modo Offline (sin descargas)          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan

$successCount = 0
$failCount = 0

foreach ($service in $services) {
    if (Build-Service -ServiceName $service.Name -ServicePath $service.Path -Port $service.Port) {
        $successCount++
    } else {
        $failCount++
    }
}

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Resultado Final                       ║" -ForegroundColor Green
Write-Host "║  Exitosas: $successCount                          ║" -ForegroundColor Green
Write-Host "║  Fallidas: $failCount                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green

if ($failCount -eq 0) {
    Write-Host "`n✓ Todas las imágenes construidas exitosamente" -ForegroundColor Green
    Write-Host "Ejecuta: docker-compose up" -ForegroundColor Yellow
} else {
    Write-Host "`n✗ Algunas imágenes fallaron" -ForegroundColor Red
    exit 1
}
