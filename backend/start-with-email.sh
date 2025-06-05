#!/bin/bash

# Email configuration
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USERNAME=314eventbooker@gmail.com
export SMTP_PASSWORD=jjdtmvcqzwlagzqt
export SMTP_FROM=314eventbooker@gmail.com

# Navigate to the cmd/server directory
cd cmd/server

# Start the server
echo "Starting server with email configuration..."
go run main.go