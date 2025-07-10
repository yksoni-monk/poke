#!/bin/sh

if [ "$ENVIRONMENT" = "PROD" ]; then
    certbot certonly --standalone -d $API_DOMAIN --email admin@heymonk.app --agree-tos --non-interactive
else
    echo "Skipping SSL certificate generation for development environment"
    exit 0
fi 