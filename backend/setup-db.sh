#!/bin/bash
echo "Setting up Fly.io PostgreSQL database..."

# Create PostgreSQL database
flyctl postgres create --name waretrack-db --region iad --vm-size shared-cpu-1x --volume-size 1

# Attach to your app
flyctl postgres attach waretrack-db -a waretrack-pro-api

echo "Database setup complete!"
echo "The DATABASE_URL secret has been automatically set."
