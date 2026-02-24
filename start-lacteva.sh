#!/bin/bash

echo "Starting LACTEVA Milk Quality Intelligence Dashboard"
echo "================================================"

echo ""
echo "1. Checking dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies"
    exit 1
fi

echo ""
echo "2. Starting ML Service..."
cd ml-service
python main.py &
ML_PID=$!
cd ..

echo ""
echo "3. Waiting for ML service to start..."
sleep 5

echo ""
echo "4. Starting Dashboard..."
npm run dev &
DASHBOARD_PID=$!

echo ""
echo "================================================"
echo "LACTEVA Dashboard is running!"
echo ""
echo "Dashboard: http://localhost:3000"
echo "ML Service: http://localhost:8002"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $ML_PID 2>/dev/null
    kill $DASHBOARD_PID 2>/dev/null
    echo "Services stopped."
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait