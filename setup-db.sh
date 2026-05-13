#!/bin/bash

# Setup PostgreSQL database for the project

echo "Setting up PostgreSQL database..."

# Create database if it doesn't exist
sudo -u postgres createdb sig_heartbeat_hub 2>/dev/null || echo "Database already exists"

# Set password for postgres user (if needed)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || echo "Password already set"

echo "Database setup complete."