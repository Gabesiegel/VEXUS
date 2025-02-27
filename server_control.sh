#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Default port
PORT=3003

# Function to check if server is running
check_server() {
    if pgrep -f "node server.js" > /dev/null; then
        SERVER_PID=$(pgrep -f "node server.js")
        echo -e "${GREEN}VExUS ATLAS server is running on PID: $SERVER_PID${NC}"
        
        # Check port usage
        PORT_CHECK=$(lsof -i:$PORT | grep LISTEN)
        if [ -n "$PORT_CHECK" ]; then
            echo -e "${GREEN}Server is listening on port $PORT${NC}"
        else
            echo -e "${YELLOW}Warning: Server process is running but not listening on port $PORT${NC}"
        fi
        return 0
    else
        echo -e "${RED}VExUS ATLAS server is not running${NC}"
        return 1
    fi
}

# Function to start server
start_server() {
    echo -e "${YELLOW}Checking for existing server process...${NC}"
    
    # Check if server is already running
    if check_server > /dev/null; then
        echo -e "${YELLOW}VExUS ATLAS server is already running${NC}"
        check_server
        return 0
    fi
    
    # Check if port is in use
    PORT_CHECK=$(lsof -i:$PORT | grep LISTEN)
    if [ -n "$PORT_CHECK" ]; then
        echo -e "${RED}Error: Port $PORT is already in use by another process:${NC}"
        echo "$PORT_CHECK"
        echo -e "${YELLOW}You can try:${NC}"
        echo "1. Change port in server.js (PORT variable)"
        echo "2. Kill the process using: kill -9 $(lsof -t -i:$PORT)"
        return 1
    fi
    
    # Check for npm dependencies
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi
    
    # Start server
    echo -e "${YELLOW}Starting VExUS ATLAS server...${NC}"
    nohup node server.js > server_output.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 2
    
    # Check if server started successfully
    if ps -p $SERVER_PID > /dev/null; then
        echo -e "${GREEN}VExUS ATLAS server started with PID: $SERVER_PID${NC}"
        echo -e "${GREEN}Server output logged to server_output.log${NC}"
        return 0
    else
        echo -e "${RED}Failed to start VExUS ATLAS server. Check server_output.log for details.${NC}"
        return 1
    fi
}

# Function to stop server
stop_server() {
    echo -e "${YELLOW}Stopping VExUS ATLAS server...${NC}"
    
    # Find PID of node server.js
    SERVER_PID=$(pgrep -f "node server.js")
    
    if [ -n "$SERVER_PID" ]; then
        kill $SERVER_PID
        echo -e "${GREEN}Server stopped (PID: $SERVER_PID)${NC}"
    else
        echo -e "${RED}No running VExUS ATLAS server found${NC}"
        
        # Check if port is in use by another process
        PORT_CHECK=$(lsof -i:$PORT | grep LISTEN)
        if [ -n "$PORT_CHECK" ]; then
            echo -e "${YELLOW}Note: Port $PORT is still in use by another process:${NC}"
            echo "$PORT_CHECK"
        fi
    fi
}

# Function to restart server
restart_server() {
    stop_server
    sleep 2
    start_server
}

# Function to check logs
check_logs() {
    if [ -f "server.log" ]; then
        echo -e "${YELLOW}Last 20 lines of server.log:${NC}"
        tail -n 20 server.log
    else
        echo -e "${RED}No server.log file found${NC}"
    fi
    
    if [ -f "server_output.log" ]; then
        echo -e "${YELLOW}Last 20 lines of server_output.log:${NC}"
        tail -n 20 server_output.log
    else
        echo -e "${RED}No server_output.log file found${NC}"
    fi
}

# Display usage
usage() {
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo "  start   - Start the VExUS ATLAS server"
    echo "  stop    - Stop the VExUS ATLAS server"
    echo "  restart - Restart the VExUS ATLAS server"
    echo "  status  - Check if the server is running"
    echo "  logs    - Display recent server logs"
}

# Main function
case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        check_server
        ;;
    logs)
        check_logs
        ;;
    *)
        usage
        exit 1
        ;;
esac

exit 0 