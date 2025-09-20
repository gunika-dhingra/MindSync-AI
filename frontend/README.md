# MindSync AI - Frontend

An intelligent task scheduling application that adapts to your energy patterns using AI.

## Features

- **Energy Profile Assessment**: Take a quiz to determine your optimal work patterns
- **AI-Powered Task Parsing**: Natural language task input with automatic parsing
- **Smart Scheduling**: Tasks are scheduled based on your energy levels and complexity
- **Visual Schedule Display**: See your optimized daily schedule with timing and recommendations

## Technology Stack

- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Google Generative AI (Gemini)
- **Date Handling**: date-fns

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   - Copy `.env.example` to `.env.local`
   - Add your Google AI API key:
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open Application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Energy Profile**: Complete the quiz to determine if you're a morning lark, night owl, or balanced
2. **Add Tasks**: Enter your tasks using natural language (e.g., "Finish report - 2 hours - due Friday 5pm")
3. **Get Schedule**: View your optimized schedule with energy-aware task placement

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/profile/quiz` - Process energy profile quiz
- `POST /api/parse` - Parse individual task from text
- `POST /api/classify` - Classify task effort level
- `POST /api/plan` - Generate complete daily schedule

## Project Structure

```
app/
├── api/           # API routes
├── components/    # React components moved to root level
├── globals.css    # Global styles
├── layout.tsx     # Root layout
└── page.tsx       # Main application page

components/
├── EnergyQuiz.tsx     # Energy profile assessment
├── TaskChat.tsx       # Task input interface
└── ScheduleDisplay.tsx # Schedule visualization

lib/
├── agents/        # AI agent implementations
├── config.ts      # Configuration
├── energy.ts      # Energy curve calculations
├── quiz.ts        # Quiz logic
└── types.ts       # TypeScript type definitions
```

## Development

- **Lint**: `npm run lint`
- **Build**: `npm run build`
- **Start**: `npm start` (production)

## Environment Variables

- `GOOGLE_API_KEY`: Required for AI features
- `LC_MODEL`: AI model to use (default: gemini-1.5-flash)
- `TZ`: Timezone (default: UTC)
- `CORS_ALLOW_ORIGINS`: Allowed origins for CORS

## License

This project is part of the MindSync AI system.
