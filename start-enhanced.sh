#!/bin/bash

# MindSync AI - Enhanced Cross-Platform Startup Script
# This script automatically installs missing dependencies and starts both servers
# Supports: Linux, macOS, Windows (WSL/Git Bash)

set -e  # Exit on any error

# Global variables for API keys
GEMINI_API_KEY=""
CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""

# Show help information
show_help() {
    echo "🚀 MindSync AI - Enhanced Startup Script"
    echo "========================================"
    echo ""
    echo "DESCRIPTION:"
    echo "  This script sets up and starts the MindSync AI application with automatic"
    echo "  dependency installation and environment configuration."
    echo ""
    echo "USAGE:"
    echo "  ./start-enhanced.sh [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  --help, -h         Show this help message"
    echo "  --interactive, -i  Run in interactive mode (prompts for API keys)"
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
    echo "  ✅ Detects your operating system (Linux/macOS/Windows)"
    echo "  ✅ Installs missing dependencies (Git, Python, Node.js, npm, pip)"
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
    echo "  ./start-enhanced.sh --help        # Show this help"
    echo "  ./start-enhanced.sh --interactive # Run with API key prompts"
    echo "  ./start-enhanced.sh               # Run with API key prompts (default)"
    echo ""
    echo "TROUBLESHOOTING:"
    echo "  • If you get permission errors, ensure the script is executable:"
    echo "    chmod +x start-enhanced.sh"
    echo "  • For Windows users, use Git Bash or WSL"
    echo "  • Make sure you have internet connection for dependency downloads"
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

echo "🚀 Starting MindSync AI - Enhanced Setup..."
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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
            if [[ "$OS" == "linux" ]]; then
                pid=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1)
            fi
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
            
            # Platform-specific port killing
            if [[ "$OS" == "linux" ]] || [[ "$OS" == "macos" ]]; then
                # Try fuser if available
                if command -v fuser &> /dev/null; then
                    echo -e "${BLUE}🔧 Using fuser to kill processes on port $port...${NC}"
                    fuser -k ${port}/tcp 2>/dev/null || true
                    sleep 1
                fi
            elif [[ "$OS" == "windows" ]]; then
                # Windows-specific approach
                if command -v taskkill &> /dev/null; then
                    echo -e "${BLUE}🔧 Using taskkill to stop processes on port $port...${NC}"
                    netstat -ano | findstr ":$port" | awk '{print $5}' | xargs -r taskkill /PID /F 2>/dev/null || true
                fi
            fi
            
            # Final check
            sleep 1
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

# Function to wait for server to start and verify it's responding
wait_for_server() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}⏳ Waiting for $service_name to start on port $port...${NC}"
    
    while [[ $attempt -le $max_attempts ]]; do
        if check_port $port; then
            # Additional check: try to get a response
            if command -v curl &> /dev/null; then
                if curl -s --connect-timeout 2 http://localhost:$port >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ $service_name is responding on port $port${NC}"
                    return 0
                fi
            elif command -v wget &> /dev/null; then
                if wget -q --timeout=2 --tries=1 http://localhost:$port -O /dev/null >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ $service_name is responding on port $port${NC}"
                    return 0
                fi
            else
                # Just check if port is in use
                echo -e "${GREEN}✅ $service_name is listening on port $port${NC}"
                return 0
            fi
        fi
        
        echo -n "."
        sleep 1
        ((attempt++))
    done
    
    echo ""
    echo -e "${RED}❌ $service_name failed to start properly on port $port after ${max_attempts}s${NC}"
    return 1
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

# Auto-configured by start-enhanced.sh script
# If you need to update these keys, either:
# 1. Run the start-enhanced.sh script again, or
# 2. Manually update the keys above
EOF
    
    echo -e "${GREEN}✅ Frontend environment configured: $frontend_env${NC}"
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
    echo -e "${CYAN}🖥️  Detected OS: $OS${NC}"
}

# Check if running as administrator/sudo (for package installations)
check_admin() {
    if [[ "$OS" == "linux" ]] && [[ $EUID -eq 0 ]]; then
        echo -e "${YELLOW}⚠️  Running as root. This is not recommended for development.${NC}"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Install package manager if missing
install_package_manager() {
    if [[ "$OS" == "linux" ]]; then
        # Check for package managers
        if command -v apt-get &> /dev/null; then
            PKG_MANAGER="apt-get"
            INSTALL_CMD="sudo apt-get update && sudo apt-get install -y"
        elif command -v yum &> /dev/null; then
            PKG_MANAGER="yum"
            INSTALL_CMD="sudo yum install -y"
        elif command -v pacman &> /dev/null; then
            PKG_MANAGER="pacman"
            INSTALL_CMD="sudo pacman -S --noconfirm"
        elif command -v dnf &> /dev/null; then
            PKG_MANAGER="dnf"
            INSTALL_CMD="sudo dnf install -y"
        else
            echo -e "${RED}❌ No supported package manager found. Please install dependencies manually.${NC}"
            exit 1
        fi
    elif [[ "$OS" == "macos" ]]; then
        # Install Homebrew if not present
        if ! command -v brew &> /dev/null; then
            echo -e "${YELLOW}📦 Installing Homebrew...${NC}"
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        PKG_MANAGER="brew"
        INSTALL_CMD="brew install"
    fi
}

# Install Git if missing
install_git() {
    if ! command -v git &> /dev/null; then
        echo -e "${YELLOW}📦 Git not found. Installing Git...${NC}"
        if [[ "$OS" == "linux" ]]; then
            eval "$INSTALL_CMD git"
        elif [[ "$OS" == "macos" ]]; then
            $INSTALL_CMD git
        elif [[ "$OS" == "windows" ]]; then
            echo -e "${RED}❌ Please install Git for Windows from: https://git-scm.com/download/win${NC}"
            echo -e "${BLUE}💡 After installation, restart this script.${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ Git installed successfully!${NC}"
    else
        echo -e "${GREEN}✅ Git is already installed${NC}"
    fi
}

# Install Python if missing
install_python() {
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        echo -e "${YELLOW}📦 Python not found. Installing Python...${NC}"
        if [[ "$OS" == "linux" ]]; then
            eval "$INSTALL_CMD python3 python3-pip"
        elif [[ "$OS" == "macos" ]]; then
            $INSTALL_CMD python@3.11
        elif [[ "$OS" == "windows" ]]; then
            echo -e "${RED}❌ Please install Python from: https://www.python.org/downloads/windows/${NC}"
            echo -e "${BLUE}💡 Make sure to check 'Add Python to PATH' during installation.${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ Python installed successfully!${NC}"
    else
        echo -e "${GREEN}✅ Python is already installed${NC}"
    fi
    
    # Create python alias if only python3 exists
    if command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        alias python=python3
    fi
}

# Install pip if missing
install_pip() {
    if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
        echo -e "${YELLOW}📦 pip not found. Installing pip...${NC}"
        if command -v python3 &> /dev/null; then
            python3 -m ensurepip --upgrade
        elif command -v python &> /dev/null; then
            python -m ensurepip --upgrade
        else
            echo -e "${RED}❌ Python not found. Cannot install pip.${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ pip installed successfully!${NC}"
    else
        echo -e "${GREEN}✅ pip is already installed${NC}"
    fi
}

# Install Node.js and npm if missing
install_nodejs() {
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}📦 Node.js not found. Installing Node.js...${NC}"
        if [[ "$OS" == "linux" ]]; then
            # Install NodeSource repository for latest Node.js
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            eval "$INSTALL_CMD nodejs"
        elif [[ "$OS" == "macos" ]]; then
            $INSTALL_CMD node
        elif [[ "$OS" == "windows" ]]; then
            echo -e "${RED}❌ Please install Node.js from: https://nodejs.org/en/download/${NC}"
            echo -e "${BLUE}💡 Download the Windows Installer (.msi) and run it.${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ Node.js installed successfully!${NC}"
    else
        echo -e "${GREEN}✅ Node.js is already installed${NC}"
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${YELLOW}📦 npm not found. Installing npm...${NC}"
        if [[ "$OS" == "linux" ]] || [[ "$OS" == "macos" ]]; then
            eval "$INSTALL_CMD npm"
        elif [[ "$OS" == "windows" ]]; then
            echo -e "${RED}❌ npm should come with Node.js. Please reinstall Node.js.${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ npm installed successfully!${NC}"
    else
        echo -e "${GREEN}✅ npm is already installed${NC}"
    fi
}

# Create .env file if missing
setup_env_file() {
    if [ ! -f "backend/.env" ]; then
        echo -e "${YELLOW}⚠️  Backend .env file not found. Creating from template...${NC}"
        if [ -f "backend/.env.example" ]; then
            cp backend/.env.example backend/.env
            echo -e "${PURPLE}📝 Created backend/.env from template${NC}"
        else
            echo -e "${YELLOW}📝 Creating basic .env file...${NC}"
            cat > backend/.env << EOF
# Gemini API key (get from https://aistudio.google.com/app/apikey)
GOOGLE_API_KEY=your_google_api_key_here
LC_MODEL=gemini-2.0-flash-lite
TZ=America/Phoenix

# CORS settings
CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF
        fi
        echo -e "${CYAN}🔑 Please edit backend/.env and add your GOOGLE_API_KEY${NC}"
        echo -e "${BLUE}💡 Get your API key from: https://aistudio.google.com/app/apikey${NC} | *USE PERSONAL EMAIL ACCOUNTS NOT ASU EMAIL*"
    else
        echo -e "${GREEN}✅ .env file already exists${NC}"
    fi
}

# Install Python dependencies
install_python_deps() {
    echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
    cd backend
    
    # Use the correct Python command
    PYTHON_CMD="python3"
    if ! command -v python3 &> /dev/null; then
        PYTHON_CMD="python"
    fi
    
    # Install dependencies
    $PYTHON_CMD -m pip install --upgrade pip > /dev/null 2>&1 || true
    $PYTHON_CMD -m pip install -r requirements.txt > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Python dependencies${NC}"
        echo -e "${YELLOW}💡 Trying with --user flag...${NC}"
        $PYTHON_CMD -m pip install --user -r requirements.txt
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Still failed. Please check your Python installation.${NC}"
            exit 1
        fi
    fi
    
    cd ..
    echo -e "${GREEN}✅ Python dependencies installed successfully!${NC}"
}

# Install Node.js dependencies
install_node_deps() {
    echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
    cd frontend
    
    if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
        npm install > /dev/null 2>&1
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to install Node.js dependencies${NC}"
            echo -e "${YELLOW}💡 Trying with --force flag...${NC}"
            npm install --force > /dev/null 2>&1
            if [ $? -ne 0 ]; then
                echo -e "${RED}❌ Still failed. Please check your Node.js installation.${NC}"
                exit 1
            fi
        fi
    fi
    
    cd ..
    echo -e "${GREEN}✅ Node.js dependencies installed successfully!${NC}"
}

# Start the servers
start_servers() {
    echo ""
    echo -e "${PURPLE}🚀 Starting MindSync AI servers...${NC}"
    echo "================================"
    
    # Ensure ports are available before starting
    ensure_ports_available
    
    # Determine Python command
    PYTHON_CMD="python3"
    if ! command -v python3 &> /dev/null; then
        PYTHON_CMD="python"
    fi
    
    # Start backend server
    echo -e "${BLUE}🔧 Starting FastAPI backend server on port 8000...${NC}"
    cd backend
    echo -e "${YELLOW}--- FastAPI Backend Output ---${NC}"
    $PYTHON_CMD -m uvicorn app:app --reload --port 8000 &
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
        echo -e "${BLUE}� Try checking: http://localhost:8000 manually${NC}"
    fi
    
    # Start frontend server
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
    fi
    
    echo ""
    echo -e "${GREEN}🎉 MindSync AI is now running!${NC}"
    echo "================================"
    echo -e "${CYAN}🌐 Frontend:${NC} http://localhost:3000"
    echo -e "${CYAN}🔧 Backend API:${NC} http://localhost:8000"
    echo -e "${CYAN}📖 API Docs:${NC} http://localhost:8000/docs"
    echo ""
    echo -e "${YELLOW}📝 Note: Make sure to set your GOOGLE_API_KEY in backend/.env${NC}"
    echo -e "${BLUE}🔑 Get your API key from: https://aistudio.google.com/app/apikey${NC} | *USE PERSONAL EMAIL ACCOUNTS NOT ASU EMAIL*"
    echo ""
    echo -e "${PURPLE}Press Ctrl+C to stop both servers${NC}"
    echo ""
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping servers...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    # Kill any remaining processes on the ports
    pkill -f "uvicorn.*app:app" 2>/dev/null || true
    pkill -f "next.*dev" 2>/dev/null || true
    echo -e "${GREEN}✅ Servers stopped. Goodbye!${NC}"
    exit 0
}

# Main execution
main() {
    # Parse command line arguments first
    parse_arguments "$@"
    
    # Setup trap for cleanup
    trap cleanup INT TERM
    
    # Run setup steps
    detect_os
    check_admin
    install_package_manager
    
    echo -e "${BLUE}📋 Checking and installing dependencies...${NC}"
    install_git
    install_python
    install_pip
    install_nodejs
    
    echo -e "${BLUE}⚙️  Setting up project...${NC}"
    
    # Collect API keys interactively
    collect_api_keys
    
    # Update environment files with collected keys
    update_backend_env
    update_frontend_env
    
    # Install dependencies
    install_python_deps
    install_node_deps
    
    echo -e "${GREEN}✅ All dependencies installed and configured!${NC}"
    
    # Start servers
    start_servers
    
    # Keep script running
    wait
}

# Run main function
main "$@"