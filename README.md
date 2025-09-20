# MindSync AI 🧠⚡

An intelligent task planning and scheduling application that optimizes your daily schedule based on your energy patterns and task complexity.

## 🚀 Quick Start (Beginner-Friendly)

### Automated Setup - Choose Your Platform:

#### 🐧 Linux / 🍎 macOS / 🐚 WSL
```bash
./start-enhanced.sh
```

#### 🪟 Windows (Command Prompt)
```cmd
start-windows.bat
```

### What These Scripts Do:
- ✅ **Automatically detect your operating system**
- ✅ **Check for and install missing dependencies** (Git, Python, Node.js, npm)
- ✅ **Install Python and Node.js packages**
- ✅ **Create configuration files**
- ✅ **Start both servers with one command**
- ✅ **Provide clear error messages and setup instructions**

### 🔧 Dependencies Installed Automatically:
- **Git** - Version control
- **Python 3.8+** - Backend runtime
- **pip** - Python package manager
- **Node.js 16+** - Frontend runtime
- **npm** - Node.js package manager

## 🛠️ Manual Setup (For Advanced Users)

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm
- Git

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY
python -m uvicorn app:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
MindSync-AI/
├── start.sh              # One-click startup script
├── backend/              # FastAPI Python backend
│   ├── app.py           # Main FastAPI application
│   ├── requirements.txt # Python dependencies
│   ├── .env.example    # Environment template
│   ├── agents/         # AI agents
│   │   ├── parser.py   # Task parsing
│   │   ├── classifier.py # Effort classification
│   │   ├── scheduler.py # Task scheduling
│   │   └── summarizer.py # Schedule summarization
│   ├── core/           # Core utilities
│   │   ├── models.py   # Data models
│   │   ├── energy.py   # Energy curve generation
│   │   └── quiz.py     # Energy profile assessment
│   └── graph/          # Planning algorithms
└── frontend/           # Next.js React frontend
    ├── app/           # Next.js app directory
    ├── components/    # React components
    ├── lib/          # Utilities and API client
    └── package.json  # Node.js dependencies
```

## 🔧 Configuration

### Backend Environment (.env in backend/)
```bash
GOOGLE_API_KEY=your_google_api_key_here
LC_MODEL=gemini-1.5-flash
CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend Environment (.env.local in frontend/)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🌟 Features

- **Energy Profile Assessment**: Determines your natural energy patterns
- **Intelligent Task Parsing**: Extracts task details from natural language
- **Effort Classification**: Categorizes tasks by cognitive effort required
- **Smart Scheduling**: Optimizes task placement based on energy levels
- **Real-time Planning**: Generates complete daily schedules
- **Interactive UI**: Modern React interface with real-time updates

## 🔗 API Endpoints

- `GET /health` - Health check
- `POST /profile/quiz` - Energy profile assessment
- `POST /parse` - Parse task descriptions
- `POST /classify` - Classify task effort levels
- `POST /plan` - Generate complete daily plans
- `GET /docs` - Interactive API documentation

## 🛠️ Development

### Backend Development
```bash
cd backend
python -m uvicorn app:app --reload --port 8000
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Building for Production
```bash
cd frontend
npm run build
```

## 📝 Usage

1. **Start the application** using `./start.sh`
2. **Open your browser** to `http://localhost:3000`
3. **Take the energy quiz** to establish your profile
4. **Add your tasks** using natural language (e.g., "Write report; ~2h; due Friday 5pm")
5. **Get your optimized schedule** with AI-powered recommendations

## 🚀 Deployment

### Backend Deployment
Deploy the `backend/` directory to any Python hosting service:
- Railway
- Heroku
- Google Cloud Run
- AWS Lambda

### Frontend Deployment
Deploy the `frontend/` directory to any Node.js hosting service:
- Vercel (recommended)
- Netlify
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Automated Script Issues

**Script won't run on Linux/macOS:**
```bash
chmod +x start-enhanced.sh
./start-enhanced.sh
```

**Permission denied errors:**
- The script will prompt for `sudo` when needed for package installation
- Don't run the entire script as root/admin

**Windows script won't run:**
- Right-click `start-windows.bat` and "Run as administrator" if needed
- Make sure you have PowerShell enabled

### Platform-Specific Issues

#### 🐧 Linux
- **Ubuntu/Debian:** Script uses `apt-get`
- **CentOS/RHEL:** Script uses `yum` or `dnf`
- **Arch:** Script uses `pacman`
- If your distro isn't supported, install dependencies manually

#### 🍎 macOS
- Script automatically installs Homebrew if missing
- You may need to run `xcode-select --install` for development tools

#### 🪟 Windows
- Use Git Bash, WSL, or Command Prompt
- PowerShell execution policy might need adjustment:
  ```cmd
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### Common Issues

**"Module not found" errors**
- Run the enhanced startup script again - it will reinstall dependencies
- Make sure you're in the correct directory

**Backend won't start**
- Verify your `GOOGLE_API_KEY` is set in `backend/.env`
- Get your API key from: https://aistudio.google.com/app/apikey | *USE PERSONAL EMAIL ACCOUNTS NOT ASU EMAIL*
- Check that Python 3.8+ is installed: `python --version`

**Frontend won't start**
- Verify Node.js 16+ is installed: `node --version`
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and run `npm install` again

**Port already in use**
- Backend (8000): `lsof -ti:8000 | xargs kill -9` (Linux/macOS) or `netstat -ano | findstr :8000` (Windows)
- Frontend (3000): `lsof -ti:3000 | xargs kill -9` (Linux/macOS) or `netstat -ano | findstr :3000` (Windows)

**API connection issues**
- Check that both servers are running
- Verify CORS settings in `backend/.env`
- Check browser console for detailed error messages

### Getting Help

1. **Check the logs** - Both servers provide detailed error messages
2. **Verify dependencies** - Run the startup script again to reinstall
3. **Check API key** - Make sure `GOOGLE_API_KEY` is valid in `.env`
4. **Review browser console** - Check for JavaScript errors
5. **Port conflicts** - Make sure ports 3000 and 8000 are available

If you're still having issues, please create an issue on GitHub with:
- Your operating system
- Error messages (copy/paste)
- Steps you've tried
- Ensure all npm packages are installed: `npm install` in frontend directory
- Check that the backend is running on port 8000

**API calls failing**
- Verify backend is running on `http://localhost:8000`
- Check CORS configuration in backend
- Ensure `NEXT_PUBLIC_API_URL` is set correctly in frontend

**Servers not starting with startup script**
- Check that all dependencies are installed
- Verify your `GOOGLE_API_KEY` is set in `backend/.env`
- Look at the console output for specific error messages
- Try running the servers manually (see Manual Setup section)

---

Made with ❤️ for better productivity and energy management