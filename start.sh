#!/bin/bash

# MindSync AI - Simple Startup Script
# This script starts both the backend and frontend servers

# Global variables for API keys
GEMINI_API_KEY=""
CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""

# Show help information
show_help() {
    echo "🚀 MindSync AI - Simple Startup Script"
    echo "======================================"
    echo ""
    echo "DESCRIPTION:"
    echo "  This script sets up and starts the MindSync AI application."
    echo "  Requires Python, Node.js, and npm to be pre-installed."
    echo ""
    echo "USAGE:"
    echo "  ./start.sh [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  --help, -h         Show this help message"
    echo "  --interactive, -i  Run in interactive mode (prompts for API keys)"
    echo ""
    echo "PREREQUISITES:"
    echo "  ✅ Python 3.8+ must be installed"
    echo "  ✅ Node.js 18+ must be installed"
    echo "  ✅ npm must be installed"
    echo ""
    echo "REQUIRED API KEYS:"
    echo "  This script will automatically configure the following API keys for you:"
    echo ""
    echo "  📡 GEMINI API KEY"
    echo "     • Get from: https://aistudio.google.com/app/apikey"
    echo "     • ⚠️  IMPORTANT: Use a PERSONAL Gmail account, NOT your ASU email!"
    echo "     • Required for AI-powered task planning and scheduling"
    echo ""
    echo "  🔐 CLERK API KEYS (Authentication)"
    echo "     • Get from: https://clerk.com (create free account)"
    echo "     • ⚠️  IMPORTANT: Use a PERSONAL email account, NOT your ASU email!"
    echo "     • Required for user authentication and sign-in/sign-up"
    echo "     • You'll need both Publishable Key and Secret Key"
    echo ""
    echo "WHAT THIS SCRIPT DOES:"
    echo "  ✅ Checks for required dependencies (Python, Node.js, npm)"
    echo "  ✅ Prompts for and securely stores your API keys"
    echo "  ✅ Automatically configures backend/.env and frontend/.env.local files"
    echo "  ✅ Installs Python and Node.js dependencies"
    echo "  ✅ Starts both backend (FastAPI) and frontend (Next.js) servers"
    echo ""
    echo "AFTER SETUP:"
    echo "  🌐 Frontend will be available at: http://localhost:3000"
    echo "  🔧 Backend API will be available at: http://localhost:8000"
    echo "  📖 API Documentation: http://localhost:8000/docs"
    echo ""
    echo "EXAMPLES:"
    echo "  ./start.sh --help        # Show this help"
    echo "  ./start.sh --interactive # Run with API key prompts"
    echo "  ./start.sh               # Run with API key prompts (default)"
    echo ""
    exit 0
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                ;;
            --interactive|-i)
                # Interactive mode is now default, but keep for compatibility
                shift
                ;;
            *)
                echo "❌ Unknown option: $1"
                echo "Use --help to see available options"
                exit 1
                ;;
        esac
    done
}

echo "🚀 Starting MindSync AI..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        lsof -ti:$port &> /dev/null
    elif command -v netstat &> /dev/null; then
        netstat -tln 2>/dev/null | grep ":$port " &> /dev/null
    elif command -v ss &> /dev/null; then
        ss -tln 2>/dev/null | grep ":$port " &> /dev/null
    else
        # Fallback: try to connect to the port
        if command -v nc &> /dev/null; then
            nc -z localhost $port 2>/dev/null
        elif command -v telnet &> /dev/null; then
            timeout 1 telnet localhost $port 2>/dev/null | grep "Connected" &> /dev/null
        else
            return 1  # Can't check, assume it's free
        fi
    fi
}

# Function to kill process using a specific port
kill_port() {
    local port=$1
    local service_name=$2
    
    echo -e "${YELLOW}🔍 Checking if port $port is in use...${NC}"
    
    if check_port $port; then
        echo -e "${YELLOW}⚠️  Port $port is already in use by another process.${NC}"
        echo -e "${BLUE}🔧 Automatically stopping the process using port $port...${NC}"
        
        # Get PID using the port
        local pid=""
        if command -v lsof &> /dev/null; then
            pid=$(lsof -ti:$port)
        elif command -v netstat &> /dev/null; then
            # Linux/Unix approach
            pid=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | head -1)
        elif command -v ss &> /dev/null; then
            pid=$(ss -tlnp 2>/dev/null | grep ":$port " | sed 's/.*pid=\([0-9]*\).*/\1/' | head -1)
        fi
        
        if [[ -n "$pid" ]] && [[ "$pid" =~ ^[0-9]+$ ]]; then
            echo -e "${BLUE}🎯 Found process PID: $pid${NC}"
            
            # Try graceful shutdown first
            echo -e "${BLUE}📋 Attempting graceful shutdown...${NC}"
            kill -TERM $pid 2>/dev/null || true
            sleep 2
            
            # Check if still running
            if kill -0 $pid 2>/dev/null; then
                echo -e "${YELLOW}💪 Process still running, forcing shutdown...${NC}"
                kill -KILL $pid 2>/dev/null || true
                sleep 1
            fi
            
            # Verify the port is now free
            if check_port $port; then
                echo -e "${RED}❌ Failed to free port $port. You may need to manually stop the process.${NC}"
                return 1
            else
                echo -e "${GREEN}✅ Port $port is now free for $service_name${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Could not determine PID for port $port. Trying alternative methods...${NC}"
            
            # Try fuser if available (Linux/macOS)
            if command -v fuser &> /dev/null; then
                echo -e "${BLUE}🔧 Using fuser to kill processes on port $port...${NC}"
                fuser -k ${port}/tcp 2>/dev/null || true
                sleep 1
            fi
            
            # Final check
            if check_port $port; then
                echo -e "${RED}❌ Warning: Port $port may still be in use. Proceeding anyway...${NC}"
            else
                echo -e "${GREEN}✅ Port $port is now free for $service_name${NC}"
            fi
        fi
    else
        echo -e "${GREEN}✅ Port $port is available for $service_name${NC}"
    fi
}

# Function to wait for a server to be ready
wait_for_server() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}⏳ Waiting for $service_name on port $port to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port" > /dev/null 2>&1; then
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Function to ensure ports are available
ensure_ports_available() {
    echo -e "${BLUE}🔍 Ensuring required ports are available...${NC}"
    
    # Check and free backend port (8000)
    kill_port 8000 "FastAPI backend"
    
    # Check and free frontend port (3000)
    kill_port 3000 "Next.js frontend"
    
    echo -e "${GREEN}✅ All required ports are ready!${NC}"
    echo ""
}

# Function to securely collect API keys
collect_api_keys() {
    echo ""
    echo -e "${PURPLE}🔑 API Key Configuration${NC}"
    echo -e "${PURPLE}========================${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Use PERSONAL email accounts, NOT ASU email accounts!${NC}"
    echo ""
    
    # Collect Gemini API Key
    echo -e "${BLUE}📡 Gemini API Key Setup${NC}"
    echo -e "${CYAN}   This is required for AI-powered task planning and scheduling.${NC}"
    echo -e "${CYAN}   Get your API key from: https://aistudio.google.com/app/apikey${NC}"
    echo -e "${YELLOW}   ⚠️  Must use a PERSONAL Gmail account (not ASU email)${NC}"
    echo ""
    while [[ -z "$GEMINI_API_KEY" ]]; do
        read -p "Enter your Gemini API Key: " GEMINI_API_KEY
        if [[ -z "$GEMINI_API_KEY" ]]; then
            echo -e "${RED}❌ Gemini API Key cannot be empty. Please try again.${NC}"
        elif [[ ${#GEMINI_API_KEY} -lt 30 ]]; then
            echo -e "${RED}❌ API Key seems too short. Please check and try again.${NC}"
            GEMINI_API_KEY=""
        else
            echo -e "${GREEN}✅ Gemini API Key received${NC}"
        fi
    done
    
    echo ""
    echo -e "${BLUE}🔐 Clerk Authentication Setup${NC}"
    echo -e "${CYAN}   This is required for user authentication (sign-in/sign-up).${NC}"
    echo -e "${CYAN}   Get your keys from: https://clerk.com (create free account)${NC}"
    echo -e "${YELLOW}   ⚠️  Must use a PERSONAL email account (not ASU email)${NC}"
    echo ""
    
    # Collect Clerk Publishable Key
    while [[ -z "$CLERK_PUBLISHABLE_KEY" ]]; do
        read -p "Enter your Clerk Publishable Key (starts with pk_): " CLERK_PUBLISHABLE_KEY
        if [[ -z "$CLERK_PUBLISHABLE_KEY" ]]; then
            echo -e "${RED}❌ Clerk Publishable Key cannot be empty. Please try again.${NC}"
        elif [[ ! "$CLERK_PUBLISHABLE_KEY" =~ ^pk_ ]]; then
            echo -e "${RED}❌ Publishable Key should start with 'pk_'. Please check and try again.${NC}"
            CLERK_PUBLISHABLE_KEY=""
        else
            echo -e "${GREEN}✅ Clerk Publishable Key received${NC}"
        fi
    done
    
    # Collect Clerk Secret Key
    while [[ -z "$CLERK_SECRET_KEY" ]]; do
        read -p "Enter your Clerk Secret Key (starts with sk_): " CLERK_SECRET_KEY
        if [[ -z "$CLERK_SECRET_KEY" ]]; then
            echo -e "${RED}❌ Clerk Secret Key cannot be empty. Please try again.${NC}"
        elif [[ ! "$CLERK_SECRET_KEY" =~ ^sk_ ]]; then
            echo -e "${RED}❌ Secret Key should start with 'sk_'. Please check and try again.${NC}"
            CLERK_SECRET_KEY=""
        else
            echo -e "${GREEN}✅ Clerk Secret Key received${NC}"
        fi
    done
    
    echo ""
    echo -e "${GREEN}🎉 All API keys collected successfully!${NC}"
    echo ""
}

# Function to update backend .env file
update_backend_env() {
    echo -e "${BLUE}📝 Configuring backend environment...${NC}"
    
    local backend_env="backend/.env"
    
    # Create backend directory if it doesn't exist
    mkdir -p backend
    
    # Create or update the .env file
    cat > "$backend_env" << EOF
# Gemini API key (get from https://aistudio.google.com/app/apikey)
# ⚠️ IMPORTANT: Use PERSONAL Gmail account, NOT ASU email!
GOOGLE_API_KEY=$GEMINI_API_KEY

# Language model configuration
LC_MODEL=gemini-2.0-flash-lite

# Timezone
TZ=America/Phoenix
EOF
    
    echo -e "${GREEN}✅ Backend environment configured: $backend_env${NC}"
}

# Function to update frontend .env.local file
update_frontend_env() {
    echo -e "${BLUE}📝 Configuring frontend environment...${NC}"
    
    local frontend_env="frontend/.env.local"
    
    # Create frontend directory if it doesn't exist
    mkdir -p frontend
    
    # Create or update the .env.local file
    cat > "$frontend_env" << EOF
# Clerk Configuration
# ⚠️ IMPORTANT: Use PERSONAL email account for Clerk, NOT ASU email!
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=$CLERK_SECRET_KEY

# Clerk will use default hosted pages for authentication
# After sign-in/sign-up, users will be redirected to the home page
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Auto-configured by start.sh script
# If you need to update these keys, either:
# 1. Run the start.sh script again, or
# 2. Manually update the keys above
EOF
    
    echo -e "${GREEN}✅ Frontend environment configured: $frontend_env${NC}"
}

# Main function
main() {
    # Parse command line arguments first
    parse_arguments "$@"
    
    # Check if Python is installed
    if ! command -v python &> /dev/null; then
        echo -e "${RED}❌ Python is not installed. Please install Python 3.8+ first.${NC}"
        echo -e "${BLUE}💡 For automatic dependency installation, use ./start-enhanced.sh instead${NC}"
        exit 1
    fi

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
        echo -e "${BLUE}💡 For automatic dependency installation, use ./start-enhanced.sh instead${NC}"
        exit 1
    fi

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
        echo -e "${BLUE}💡 For automatic dependency installation, use ./start-enhanced.sh instead${NC}"
        exit 1
    fi

    echo -e "${BLUE}📋 Checking dependencies...${NC}"

    # Collect API keys interactively
    collect_api_keys
    
    # Update environment files with collected keys
    update_backend_env
    update_frontend_env

    # Check if backend dependencies are installed
    cd backend
    echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Python dependencies${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Python dependencies installed!${NC}"

    # Check if frontend dependencies are installed
    cd ../frontend
    echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Node.js dependencies${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js dependencies installed!${NC}"
    cd ..

    echo -e "${GREEN}✅ All dependencies installed and configured!${NC}"
    echo ""
    echo -e "${BLUE}🚀 Starting MindSync AI servers...${NC}"
    echo "================================"

    # Ensure ports are available before starting
    ensure_ports_available

    # Start the backend server
    echo -e "${BLUE}🔧 Starting FastAPI backend server on port 8000...${NC}"
    cd backend
    echo -e "${YELLOW}--- FastAPI Backend Output ---${NC}"
    python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000 &
    BACKEND_PID=$!
    cd ..

    # Wait for backend to start and verify
    if wait_for_server 8000 "FastAPI backend"; then
        echo -e "${GREEN}✅ Backend server started successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to start backend server${NC}"
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}💡 Backend process is running but not responding. Check for startup errors.${NC}"
        else
            echo -e "${RED}💡 Backend process exited. Check for configuration errors.${NC}"
        fi
        echo -e "${BLUE}🔧 Try checking: http://localhost:8000 manually${NC}"
        exit 1
    fi

    # Start the frontend server
    echo -e "${BLUE}🎨 Starting Next.js frontend server on port 3000...${NC}"
    cd frontend
    echo -e "${YELLOW}--- Next.js Frontend Output ---${NC}"
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    # Wait for frontend to start and verify
    if wait_for_server 3000 "Next.js frontend"; then
        echo -e "${GREEN}✅ Frontend server started successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to start frontend server${NC}"
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}💡 Frontend process is running but not responding. It might still be starting up.${NC}"
        else
            echo -e "${RED}💡 Frontend process exited. Check for configuration errors.${NC}"
        fi
        echo -e "${BLUE}🔧 Try checking: http://localhost:3000 manually${NC}"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi

    echo ""
    echo -e "${GREEN}🎉 MindSync AI is now running!${NC}"
    echo "================================"
    echo -e "${BLUE}🌐 Frontend:${NC} http://localhost:3000"
    echo -e "${BLUE}🔧 Backend API:${NC} http://localhost:8000"
    echo -e "${BLUE}📖 API Docs:${NC} http://localhost:8000/docs"
    echo ""
    echo -e "${BLUE}Press Ctrl+C to stop both servers${NC}"
    echo ""

    # Keep script running and handle Ctrl+C
    trap cleanup INT

    cleanup() {
        echo ""
        echo -e "${YELLOW}🛑 Stopping servers...${NC}"
        kill $BACKEND_PID 2>/dev/null
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}✅ Servers stopped. Goodbye!${NC}"
        exit 0
    }

    # Wait for user to stop
    wait
}

# Run main function
main "$@"