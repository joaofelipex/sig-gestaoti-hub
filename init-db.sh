#!/bin/bash

# Initialize PostgreSQL database for sig-heartbeat-hub

DB_NAME="sig_heartbeat_hub"
DB_USER="postgres"
DB_PASS="postgres"

echo "Initializing PostgreSQL for $DB_NAME..."

# Try to create database
psql -h localhost -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  psql -h localhost -U postgres -c "CREATE DATABASE $DB_NAME;" 

echo "Database initialization complete."
echo ""
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"  
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASS"