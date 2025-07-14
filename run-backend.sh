#!/bin/bash

# Usage:
#   ./run-backend.sh log [--lines=N]
#   ./run-backend.sh status
#   ./run-backend.sh up [--env=dev|prod] [--build]
#   ./run-backend.sh down

ACTION="$1"
ENV_ARG="dev"
LINES_ARG="20"
BUILD_ARG="false"

# Parse flags
for arg in "$@"; do
    case $arg in
        --env=*)
            ENV_ARG="${arg#*=}"
            ;;
        --lines=*)
            LINES_ARG="${arg#*=}"
            ;;
        --build)
            BUILD_ARG="true"
            ;;
    esac
done

# Normalize to lowercase
ENV_ARG=$(echo "$ENV_ARG" | tr '[:upper:]' '[:lower:]')

print_usage() {
    echo "Usage:"
    echo "  $0 log [--lines=N]"
    echo "  $0 status"
    echo "  $0 up [--env=dev|prod] [--build]"
    echo "  $0 down"
    exit 1
}

if [[ "$ACTION" == "log" ]]; then
    echo "--- Backend logs (last $LINES_ARG lines) ---"
    docker compose logs --tail=$LINES_ARG backend
    echo ""
    echo "--- Nginx logs (last $LINES_ARG lines) ---"
    docker compose logs --tail=$LINES_ARG nginx
    echo ""
    echo "--- Certbot logs (last $LINES_ARG lines) ---"
    docker compose logs --tail=$LINES_ARG certbot
    echo ""
    exit 0
elif [[ "$ACTION" == "status" ]]; then
    echo "Service status:"
    docker compose ps
    exit 0
elif [[ "$ACTION" == "up" ]]; then
    if [[ "$ENV_ARG" == "prod" ]]; then
        export ENVIRONMENT=PROD
        export CORS_ORIGIN=https://poke.heymonk.app
        export API_DOMAIN=pokeapi.heymonk.app
        MODE="production"
    else
        export ENVIRONMENT=DEV
        export CORS_ORIGIN=http://localhost:8080
        export API_DOMAIN=localhost
        MODE="development"
    fi
    echo "Backend environment: $MODE"
    echo "ENVIRONMENT: $ENVIRONMENT"
    echo "CORS_ORIGIN: $CORS_ORIGIN"
    echo "API_DOMAIN: $API_DOMAIN"
    echo ""
    
    if [[ "$BUILD_ARG" == "true" ]]; then
        echo "Starting services with rebuild..."
        docker compose down
        ENVIRONMENT=$ENVIRONMENT CORS_ORIGIN=$CORS_ORIGIN API_DOMAIN=$API_DOMAIN docker compose up -d --build
    else
        echo "Starting services..."
        docker compose down
        ENVIRONMENT=$ENVIRONMENT CORS_ORIGIN=$CORS_ORIGIN API_DOMAIN=$API_DOMAIN docker compose up -d
    fi
    echo "Services started."
    exit 0
elif [[ "$ACTION" == "down" ]]; then
    echo "Stopping services..."
    docker compose down
    echo "Services stopped."
    exit 0
else
    print_usage
fi
