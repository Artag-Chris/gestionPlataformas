#!/bin/bash
# Build all Docker images from pre-compiled local source

set -e

echo "Building all microservices Docker images..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to build an image
build_image() {
  local service_name=$1
  local service_path=$2
  local port=$3
  
  echo -e "${BLUE}Building $service_name...${NC}"
  
  docker build \
    -f "$service_path/Dockerfile" \
    -t "microservices-$service_name:latest" \
    --build-arg SERVICE_NAME="$service_name" \
    "$service_path"
  
  echo -e "${GREEN}✓ $service_name built successfully${NC}"
}

# Build Gateway
echo -e "${BLUE}=== Building Gateway ===${NC}"
docker build -f gateway/Dockerfile -t microservices-gateway:latest gateway

# Build Identity Service
echo -e "${BLUE}=== Building Identity Service ===${NC}"
docker build -f services/identity/Dockerfile -t microservices-identity:latest services/identity

# Build WhatsApp Service
echo -e "${BLUE}=== Building WhatsApp Service ===${NC}"
docker build -f services/whatsapp/Dockerfile -t microservices-whatsapp:latest services/whatsapp

# Build Slack Service
echo -e "${BLUE}=== Building Slack Service ===${NC}"
docker build -f services/slack/Dockerfile -t microservices-slack:latest services/slack

# Build Notion Service
echo -e "${BLUE}=== Building Notion Service ===${NC}"
docker build -f services/notion/Dockerfile -t microservices-notion:latest services/notion

# Build Instagram Service
echo -e "${BLUE}=== Building Instagram Service ===${NC}"
docker build -f services/instagram/Dockerfile -t microservices-instagram:latest services/instagram

# Build TikTok Service
echo -e "${BLUE}=== Building TikTok Service ===${NC}"
docker build -f services/tiktok/Dockerfile -t microservices-tiktok:latest services/tiktok

# Build Facebook Service
echo -e "${BLUE}=== Building Facebook Service ===${NC}"
docker build -f services/facebook/Dockerfile -t microservices-facebook:latest services/facebook

echo -e "${GREEN}=== All images built successfully ===${NC}"
echo -e "${BLUE}Run: docker compose up${NC}"
