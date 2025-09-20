#!/bin/bash

# MindSync AI - Enhanced Cross-Platform Startup Script
# This script automatically installs missing dependencies and starts both servers
# Supports: Linux, macOS, Windows (WSL/Git Bash)

set -e  # Exit on any error

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
    
    # Wait for backend to start
    sleep 3
    
    # Check if backend started successfully
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend server started successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to start backend server${NC}"
        echo -e "${YELLOW}💡 Backend might be starting slowly. Check port 8000...${NC}"
    fi
    
    # Start frontend server
    echo -e "${BLUE}🎨 Starting Next.js frontend server on port 3000...${NC}"
    cd frontend
    echo -e "${YELLOW}--- Next.js Frontend Output ---${NC}"
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for frontend to start
    sleep 5
    
    # Check if frontend started successfully
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend server started successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to start frontend server${NC}"
        echo -e "${YELLOW}💡 Frontend might be starting slowly. Check port 3000...${NC}"
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
    setup_env_file
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