#!/bin/bash

# Creates Docker images, networks, volumes, and containers

# Source the shared utilities and variables from common.sh.
# Note: Here we're sourcing 'common.sh' relative to the current script's location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Get the script's directory, parent directory, and app name
ROOT_DIR="$(get_parent_dir "$SCRIPT_DIR")"
APP_NAME="payload-3-bun-template"

echo "Starting $APP_NAME"

# Define Doppler template file path
COMPOSE_FILE="$ROOT_DIR/compose.yml"

# Run Docker Compose
docker compose -f "$COMPOSE_FILE" up -d