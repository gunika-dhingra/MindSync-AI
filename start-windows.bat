@echo off
setlocal EnableDelayedExpansion

REM MindSync AI - Windows Startup Script
REM This script automatically installs missing dependencies and starts both servers
REM Supports: Windows 10/11 with PowerShell

echo 🚀 Starting MindSync AI - Windows Setup...
echo ============================================

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ⚠️  Running as administrator. This is not recommended for development.
    set /p "continue=Continue anyway? (y/N): "
    if /i "!continue!" neq "y" exit /b 1
)

REM Check for Git
where git >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Git not found. Please install Git for Windows from:
    echo 🔗 https://git-scm.com/download/win
    echo 💡 After installation, restart this script.
    pause
    exit /b 1
) else (
    echo ✅ Git is already installed
)

REM Check for Python
where python >nul 2>&1
if %errorLevel% neq 0 (
    where py >nul 2>&1
    if %errorLevel% neq 0 (
        echo ❌ Python not found. Please install Python from:
        echo 🔗 https://www.python.org/downloads/windows/
        echo 💡 Make sure to check 'Add Python to PATH' during installation.
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=py
    )
) else (
    set PYTHON_CMD=python
)
echo ✅ Python is already installed

REM Check for pip
%PYTHON_CMD% -m pip --version >nul 2>&1
if %errorLevel% neq 0 (
    echo 📦 Installing pip...
    %PYTHON_CMD% -m ensurepip --upgrade
    if %errorLevel% neq 0 (
        echo ❌ Failed to install pip. Please check your Python installation.
        pause
        exit /b 1
    )
    echo ✅ pip installed successfully!
) else (
    echo ✅ pip is already installed
)

REM Check for Node.js
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js from:
    echo 🔗 https://nodejs.org/en/download/
    echo 💡 Download the Windows Installer (.msi) and run it.
    pause
    exit /b 1
) else (
    echo ✅ Node.js is already installed
)

REM Check for npm
where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ npm not found. npm should come with Node.js. Please reinstall Node.js.
    pause
    exit /b 1
) else (
    echo ✅ npm is already installed
)

REM Create .env file if missing
if not exist "backend\.env" (
    echo ⚠️  Backend .env file not found. Creating from template...
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo 📝 Created backend\.env from template
    ) else (
        echo 📝 Creating basic .env file...
        (
            echo # Gemini API key ^(get from https://aistudio.google.com/app/apikey^)
            echo GOOGLE_API_KEY=your_google_api_key_here
            echo LC_MODEL=gemini-2.0-flash-lite
            echo TZ=America/Phoenix
            echo.
            echo # CORS settings
            echo CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
        ) > "backend\.env"
    )
    echo 🔑 Please edit backend\.env and add your GOOGLE_API_KEY
    echo 💡 Get your API key from: https://aistudio.google.com/app/apikey | *USE PERSONAL EMAIL ACCOUNTS NOT ASU EMAIL*
) else (
    echo ✅ .env file already exists
)

REM Install Python dependencies
echo 📦 Installing Python dependencies...
cd backend
%PYTHON_CMD% -m pip install --upgrade pip >nul 2>&1
%PYTHON_CMD% -m pip install -r requirements.txt >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Failed to install Python dependencies
    echo 💡 Trying with --user flag...
    %PYTHON_CMD% -m pip install --user -r requirements.txt
    if %errorLevel% neq 0 (
        echo ❌ Still failed. Please check your Python installation.
        pause
        exit /b 1
    )
)
cd ..
echo ✅ Python dependencies installed successfully!

REM Install Node.js dependencies
echo 📦 Installing Node.js dependencies...
cd frontend
if not exist "node_modules" (
    npm install >nul 2>&1
    if %errorLevel% neq 0 (
        echo ❌ Failed to install Node.js dependencies
        echo 💡 Trying with --force flag...
        npm install --force >nul 2>&1
        if %errorLevel% neq 0 (
            echo ❌ Still failed. Please check your Node.js installation.
            pause
            exit /b 1
        )
    )
)
cd ..
echo ✅ Node.js dependencies installed successfully!

echo.
echo ✅ All dependencies installed and configured!
echo.
echo 🚀 Starting MindSync AI servers...
echo ================================

REM Start backend server
echo 🔧 Starting FastAPI backend server on port 8000...
cd backend
echo --- FastAPI Backend Output ---
start "MindSync Backend" %PYTHON_CMD% -m uvicorn app:app --reload --port 8000
cd ..

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server
echo 🎨 Starting Next.js frontend server on port 3000...
cd frontend
echo --- Next.js Frontend Output ---
start "MindSync Frontend" npm run dev
cd ..

REM Wait for frontend to start
timeout /t 5 /nobreak >nul

echo.
echo 🎉 MindSync AI is now running!
echo ================================
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:8000
echo 📖 API Docs: http://localhost:8000/docs
echo.
echo 📝 Note: Make sure to set your GOOGLE_API_KEY in backend\.env
echo 🔑 Get your API key from: https://aistudio.google.com/app/apikey  | *USE PERSONAL EMAIL ACCOUNTS NOT ASU EMAIL*
echo.
echo 💡 Both servers are running in separate windows.
echo 💡 Close the command windows to stop the servers.
echo.
pause