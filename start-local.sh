#!/bin/bash
# Script para levantar los microservicios localmente sin Docker
# Uso: ./start-local.sh

set -e

echo "================================================"
echo "  Iniciando Microservicios - Modo Local"
echo "================================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que Node está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js instalado: $(node --version)"

# Verificar que pnpm está instalado
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} pnpm no instalado. Instalando..."
    npm install -g pnpm
fi

echo -e "${GREEN}✓${NC} pnpm instalado: $(pnpm --version)"
echo ""

# Función para mostrar instrucciones de inicio
show_setup_instructions() {
    echo ""
    echo -e "${YELLOW}📋 INSTRUCCIONES PREVIAS NECESARIAS:${NC}"
    echo ""
    echo "1️⃣  RABBITMQ:"
    echo "   - Opción A (Docker): docker run -d -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=password rabbitmq:3-management-alpine"
    echo "   - Opción B (Local): Instala RabbitMQ desde https://www.rabbitmq.com/download.html"
    echo ""
    echo "2️⃣  POSTGRESQL:"
    echo "   - Instala PostgreSQL desde https://www.postgresql.org/download/"
    echo "   - Crea dos BDs:"
    echo "     psql -U postgres -c \"CREATE DATABASE gateway_db;\""
    echo "     psql -U postgres -c \"CREATE DATABASE whatsapp_db;\""
    echo ""
    echo "3️⃣  VARIABLES DE ENTORNO:"
    echo "   - Verifica que .env contiene las URLs correctas"
    echo ""
}

# Verificar y pedir confirmación
if [ ! -f .env ]; then
    show_setup_instructions
    echo -e "${RED}❌ .env no encontrado${NC}"
    echo "Copia .env.example a .env y configura las URLs"
    exit 1
fi

echo -e "${GREEN}✓${NC} .env encontrado"
echo ""

# Pedir confirmación de que RabbitMQ y PostgreSQL están corriendo
read -p "¿RabbitMQ está corriendo en localhost:5672? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    show_setup_instructions
    exit 1
fi

read -p "¿PostgreSQL está corriendo en localhost:5432? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    show_setup_instructions
    exit 1
fi

echo ""
echo -e "${YELLOW}🚀 Levantando servicios...${NC}"
echo ""

# Gateway
echo -e "${YELLOW}[1/2]${NC} Iniciando Gateway..."
cd gateway
pnpm install --quiet 2>/dev/null || true
echo "Ejecutando migraciones de Prisma..."
pnpm exec prisma migrate deploy --skip-generate 2>/dev/null || true

# Lanzar en background
pnpm start:dev > /tmp/gateway.log 2>&1 &
GATEWAY_PID=$!
echo -e "${GREEN}✓${NC} Gateway iniciado (PID: $GATEWAY_PID)"

sleep 3

# WhatsApp
echo -e "${YELLOW}[2/2]${NC} Iniciando WhatsApp Service..."
cd ../services/whatsapp
pnpm install --quiet 2>/dev/null || true
echo "Ejecutando migraciones de Prisma..."
pnpm exec prisma migrate deploy --skip-generate 2>/dev/null || true

# Lanzar en background
pnpm start:dev > /tmp/whatsapp.log 2>&1 &
WHATSAPP_PID=$!
echo -e "${GREEN}✓${NC} WhatsApp Service iniciado (PID: $WHATSAPP_PID)"

cd ../..

sleep 2

echo ""
echo -e "${GREEN}================================================"
echo "  ✅ SERVICIOS LEVANTADOS EXITOSAMENTE"
echo "================================================${NC}"
echo ""
echo "📊 Estado de servicios:"
echo "  • Gateway:         http://localhost:3000/api"
echo "  • WhatsApp:        http://localhost:3001"
echo "  • RabbitMQ Admin:  http://localhost:15672 (admin/password)"
echo ""
echo "📝 Logs en tiempo real:"
echo "  • Gateway:    tail -f /tmp/gateway.log"
echo "  • WhatsApp:   tail -f /tmp/whatsapp.log"
echo ""
echo "🧪 Para testing:"
echo "  • Abre Insomnia e importa: insomnia-collection.json"
echo "  • Prueba: POST http://localhost:3000/api/v1/messages/send"
echo ""
echo "🛑 Para detener:"
echo "  kill $GATEWAY_PID $WHATSAPP_PID"
echo ""

# Mantener script abierto para ver logs
wait
