#!/bin/bash

# MindSync AI - Startup Script
# This script starts both the backend and frontend servers

echo "🚀 Starting MindSync AI..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python is not installed. Please install Python 3.8+ first.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Checking dependencies...${NC}"

# Check if backend dependencies are installed
cd backend
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Backend .env file not found. Creating from template...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}📝 Please edit backend/.env and add your GOOGLE_API_KEY${NC}"
    else
        echo -e "${RED}❌ .env.example not found in backend directory${NC}"
        exit 1
    fi
fi

# Install Python dependencies
echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
pip install -r requirements.txt > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install Python dependencies${NC}"
    exit 1
fi

cd ..

# Check if frontend dependencies are installed
cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
    npm install > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Node.js dependencies${NC}"
        exit 1
    fi
fi

cd ..

echo -e "${GREEN}✅ All dependencies installed!${NC}"
echo ""

# Start the backend server
echo -e "${BLUE}🔧 Starting FastAPI backend server on port 8000...${NC}"
cd backend
echo -e "${YELLOW}--- FastAPI Backend Output ---${NC}"
python -m uvicorn app:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✅ Backend server started successfully!${NC}"
else
    echo -e "${RED}❌ Failed to start backend server${NC}"
    exit 1
fi

# Start the frontend server
echo -e "${BLUE}🎨 Starting Next.js frontend server on port 3000...${NC}"
cd frontend
echo -e "${YELLOW}--- Next.js Frontend Output ---${NC}"
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 5

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✅ Frontend server started successfully!${NC}"
else
    echo -e "${RED}❌ Failed to start frontend server${NC}"
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
echo -e "${YELLOW}📝 Note: Make sure to set your GOOGLE_API_KEY in backend/.env${NC}"
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