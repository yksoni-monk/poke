#!/bin/sh

if [ "$ENVIRONMENT" = "PROD" ]; then
    certbot certonly --webroot -w /var/www/html -d $API_DOMAIN --email admin@heymonk.app --agree-tos --non-interactive
    
    # If certificates were generated successfully, copy HTTPS config
    if [ -f "/etc/letsencrypt/live/$API_DOMAIN/fullchain.pem" ]; then
        echo "Certificates generated successfully, enabling HTTPS..."
        envsubst '$CORS_ORIGIN $API_DOMAIN $ENVIRONMENT' < /etc/nginx/nginx-https.conf.template > /etc/nginx/nginx-https.conf
        # Reload nginx to pick up the new HTTPS config
        nginx -s reload || true
    fi
else
    echo "Skipping SSL certificate generation for development environment"
    exit 0
fi 