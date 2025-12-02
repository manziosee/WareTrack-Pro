-- Initialize WareTrack-Pro Database
-- This file is automatically executed when the PostgreSQL container starts

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE waretrack'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'waretrack')\gexec

-- Connect to the waretrack database
\c waretrack;

-- Enable UUID extension (if needed in future)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a simple health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Database is healthy at ' || NOW();
END;
$$ LANGUAGE plpgsql;