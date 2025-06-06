#!/bin/bash

# Event Management System - Development Setup
echo "Setting up Event Management System with test data..."

# Email configuration
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USERNAME=314eventbooker@gmail.com
export SMTP_PASSWORD=jjdtmvcqzwlagzqt
export SMTP_FROM=314eventbooker@gmail.com

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "ERROR: Go is not installed. Please install Go first."
    exit 1
fi

echo "Email configuration loaded..."

# Navigate to the project root
cd "$(dirname "$0")"

# Clean and reset database
echo "Cleaning existing database..."
rm -f event_management.db
rm -f cmd/server/event_management.db

# Generate test data
echo "Generating test data..."
go run generate-data.go

if [ $? -eq 0 ]; then
    echo "SUCCESS: test data generated successfully!"
    echo ""
else
    echo "ERROR: Failed to generate test data"
    exit 1
fi

# Navigate to server directory
cd cmd/server

# Start the server
echo "Starting server with email notifications..."
echo "Server will be available at: http://localhost:8080"
echo "Email notifications enabled"
echo "test data loaded"
echo ""
echo "Test Accounts:"
echo "   Organizers: organizer1@events.com.au to organizer10@events.com.au"
echo "   Users: user1@gmail.com to user50@gmail.com"
echo "   Password: password123"
echo "NOTE it is preferrable to create your own account with your own email so we can send emails to you for notifications!"
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
go run main.go