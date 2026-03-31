# Script para levantar los microservicios localmente sin Docker en Windows
# Uso: .\start-local.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Iniciando Microservicios - Modo Local" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Node está instalado
$nodeVersion = & node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js no está instalado" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js instalado: $nodeVersion" -ForegroundColor Green

# Verificar que pnpm está instalado
$pnpmVersion = & pnpm --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ pnpm no instalado. Instalando..." -ForegroundColor Yellow
    npm install -g pnpm
}
$pnpmVersion = & pnpm --version 2>&1
Write-Host "✓ pnpm instalado: $pnpmVersion" -ForegroundColor Green
Write-Host ""

function Show-SetupInstructions {
    Write-Host ""
    Write-Host "📋 INSTRUCCIONES PREVIAS NECESARIAS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1️⃣  RABBITMQ:" -ForegroundColor White
    Write-Host "   - Opción A (Docker): docker run -d -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=password rabbitmq:3-management-alpine" -ForegroundColor DarkGray
    Write-Host "   - Opción B (Local): Instala RabbitMQ desde https://www.rabbitmq.com/download.html" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "2️⃣  POSTGRESQL:" -ForegroundColor White
    Write-Host "   - Instala PostgreSQL desde https://www.postgresql.org/download/" -ForegroundColor DarkGray
    Write-Host "   - Crea dos BDs en psql:" -ForegroundColor DarkGray
    Write-Host "     CREATE DATABASE gateway_db;" -ForegroundColor DarkGray
    Write-Host "     CREATE DATABASE whatsapp_db;" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "3️⃣  VARIABLES DE ENTORNO:" -ForegroundColor White
    Write-Host "   - Verifica que .env contiene las URLs correctas" -ForegroundColor DarkGray
    Write-Host ""
}

# Verificar .env
if (-not (Test-Path .env)) {
    Show-SetupInstructions
    Write-Host "❌ .env no encontrado" -ForegroundColor Red
    Write-Host "Copia .env.example a .env y configura las URLs"
    exit 1
}
Write-Host "✓ .env encontrado" -ForegroundColor Green
Write-Host ""

# Pedir confirmación de que RabbitMQ y PostgreSQL están corriendo
$rabbitmqReady = Read-Host "¿RabbitMQ está corriendo en localhost:5672? (s/n)"
if ($rabbitmqReady -ne "s") {
    Show-SetupInstructions
    exit 1
}

$postgresReady = Read-Host "¿PostgreSQL está corriendo en localhost:5432? (s/n)"
if ($postgresReady -ne "s") {
    Show-SetupInstructions
    exit 1
}

Write-Host ""
Write-Host "🚀 Levantando servicios..." -ForegroundColor Yellow
Write-Host ""

# Gateway
Write-Host "[1/2] Iniciando Gateway..." -ForegroundColor Yellow
Set-Location gateway
Write-Host "Instalando dependencias..." -ForegroundColor DarkGray
& pnpm install --quiet 2>&1 | Out-Null
Write-Host "Ejecutando migraciones de Prisma..." -ForegroundColor DarkGray
& pnpm exec prisma migrate deploy --skip-generate 2>&1 | Out-Null

# Lanzar en background
$gatewayProcess = Start-Process pwsh -ArgumentList "-NoExit", "-Command", "pnpm start:dev" -PassThru -ErrorAction SilentlyContinue
Write-Host "✓ Gateway iniciado (PID: $($gatewayProcess.Id))" -ForegroundColor Green

Start-Sleep -Seconds 3

# WhatsApp
Write-Host "[2/2] Iniciando WhatsApp Service..." -ForegroundColor Yellow
Set-Location ../services/whatsapp
Write-Host "Instalando dependencias..." -ForegroundColor DarkGray
& pnpm install --quiet 2>&1 | Out-Null
Write-Host "Ejecutando migraciones de Prisma..." -ForegroundColor DarkGray
& pnpm exec prisma migrate deploy --skip-generate 2>&1 | Out-Null

# Lanzar en background
$whatsappProcess = Start-Process pwsh -ArgumentList "-NoExit", "-Command", "pnpm start:dev" -PassThru -ErrorAction SilentlyContinue
Write-Host "✓ WhatsApp Service iniciado (PID: $($whatsappProcess.Id))" -ForegroundColor Green

Set-Location ../..

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ✅ SERVICIOS LEVANTADOS EXITOSAMENTE" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Estado de servicios:" -ForegroundColor Cyan
Write-Host "  • Gateway:         http://localhost:3000/api"
Write-Host "  • WhatsApp:        http://localhost:3001"
Write-Host "  • RabbitMQ Admin:  http://localhost:15672 (admin/password)"
Write-Host ""
Write-Host "🧪 Para testing:" -ForegroundColor Cyan
Write-Host "  • Abre Insomnia e importa: insomnia-collection.json"
Write-Host "  • Prueba: POST http://localhost:3000/api/v1/messages/send"
Write-Host ""
Write-Host "🛑 Para detener:" -ForegroundColor Cyan
Write-Host "  Stop-Process -Id $($gatewayProcess.Id), $($whatsappProcess.Id)"
Write-Host ""

# Mantener el script abierto
Write-Host "Presiona Ctrl+C para detener todos los servicios"
Read-Host
