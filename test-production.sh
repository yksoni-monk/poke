#!/bin/bash

echo "Testing production setup with HTTPS..."

# Set production environment variables
export ENVIRONMENT=PROD
export CORS_ORIGIN=https://poke.heymonk.app
export API_DOMAIN=pokeapi.heymonk.app

echo "Environment variables set:"
echo "ENVIRONMENT: $ENVIRONMENT"
echo "CORS_ORIGIN: $CORS_ORIGIN"
echo "API_DOMAIN: $API_DOMAIN"

echo ""
echo "Starting services in production mode..."
docker compose down
ENVIRONMENT=$ENVIRONMENT CORS_ORIGIN=$CORS_ORIGIN API_DOMAIN=$API_DOMAIN docker compose up

echo ""
echo "Services started. Check the logs:"
echo "docker-compose logs certbot"
echo "docker-compose logs nginx"
echo ""
echo "Note: In production, you'll need to:"
echo "1. Replace 'yourdomain.com' with your actual domain"
echo "2. Ensure your domain points to this server"
echo "3. Open ports 80 and 443 in your firewall"
echo "4. The certbot will automatically generate SSL certificates" 
