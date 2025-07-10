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

# Create certbot directories
mkdir -p certbot-logs
mkdir -p certbot-work

# Generate certificates using certbot
echo "Generating certificates..."
docker run --rm \
    -v $(pwd)/certbot-certs:/etc/letsencrypt \
    -v $(pwd)/certbot-webroot:/var/www/html \
    -v $(pwd)/certbot-logs:/var/log/letsencrypt \
    -v $(pwd)/certbot-work:/var/lib/letsencrypt \
    --user $(id -u):$(id -g) \
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

# Fix certificate permissions so nginx can read them
echo "Fixing certificate permissions..."
sudo chmod -R 755 certbot-certs/
sudo chmod 644 certbot-certs/live/$DOMAIN/fullchain.pem
sudo chmod 644 certbot-certs/live/$DOMAIN/privkey.pem

# Check if certificates were generated
echo "Checking for generated certificates..."
if [ -f "certbot-certs/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ Certificates generated successfully!"
    echo "Certificate location: certbot-certs/live/$DOMAIN/"
    echo ""
    echo "You can now start your services with:"
    echo "docker-compose up -d"
else
    echo "❌ Certificate generation failed!"
    echo "Expected file: certbot-certs/live/$DOMAIN/fullchain.pem"
    echo "Checking what files exist:"
    ls -la certbot-certs/ 2>/dev/null || echo "No certbot-certs directory found"
    ls -la certbot-certs/live/ 2>/dev/null || echo "No live directory found"
    exit 1
fi 