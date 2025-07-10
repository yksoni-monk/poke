#!/bin/bash

# Manual certificate generation script
# Usage: ./generate-certs.sh <domain>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <domain>"
    echo "Example: $0 api.example.com"
    exit 1
fi

DOMAIN=$1
EMAIL="admin@heymonk.app"

echo "Generating SSL certificates for domain: $DOMAIN"
echo "Email: $EMAIL"

# Create directories if they don't exist
mkdir -p certbot-certs
mkdir -p certbot-webroot

# Start a temporary nginx container for ACME challenge
echo "Starting temporary nginx for ACME challenge..."
docker run -d --name temp-nginx \
    -p 80:80 \
    -v $(pwd)/certbot-webroot:/var/www/html \
    -v $(pwd)/nginx-challenge.conf:/etc/nginx/nginx.conf \
    nginx:latest

# Wait for nginx to start
sleep 5

# Generate certificates using certbot
echo "Generating certificates..."
docker run --rm \
    -v $(pwd)/certbot-certs:/etc/letsencrypt \
    -v $(pwd)/certbot-webroot:/var/www/html \
    certbot/certbot:latest \
    certonly --webroot -w /var/www/html \
    -d $DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive

# Stop temporary nginx
echo "Stopping temporary nginx..."
docker stop temp-nginx
docker rm temp-nginx

# Check if certificates were generated
if [ -f "certbot-certs/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ Certificates generated successfully!"
    echo "Certificate location: certbot-certs/live/$DOMAIN/"
    echo ""
    echo "You can now start your services with:"
    echo "docker-compose up -d"
else
    echo "❌ Certificate generation failed!"
    exit 1
fi 