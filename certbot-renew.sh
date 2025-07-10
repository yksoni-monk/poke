#!/bin/sh

if [ "$ENVIRONMENT" = "PROD" ]; then
    trap exit TERM
    while :; do
        certbot renew
        sleep 12h
        wait $${!}
    done
else
    echo "Skipping SSL certificate renewal for development environment"
    while :; do sleep 12h; done
fi 