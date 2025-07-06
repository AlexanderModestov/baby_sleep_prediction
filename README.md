# Baby Sleep Tracker & Predictor

A web application for tracking baby sleep patterns and getting AI-powered predictions for optimal nap times.

## Features

- 👶 **Child Management**: Add and manage multiple children's profiles
- 😴 **Sleep Tracking**: Start/end sleep sessions with precise timing
- 🎯 **Quality Assessment**: Rate sleep quality after each session
- 🔮 **AI Predictions**: Get personalized sleep predictions using Google Gemini AI
- 📊 **Sleep History**: Visual history of all sleep sessions
- 📱 **Mobile-First**: Responsive design optimized for mobile devices

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Styling**: Tailwind CSS with custom baby-friendly theme
- **Platform**: Web Application

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd baby_sleep_prediction
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Fill in your environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Gemini API
GOOGLE_API_KEY=your_google_api_key_here
```

### 4. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase/schema.sql` in your Supabase SQL editor
3. Enable Row Level Security (RLS) policies are included in the schema

### 5. Google Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add the API key to your `.env` file

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Database Schema

The app uses two main tables:

- **children**: Stores child profiles with user isolation
- **sleep_sessions**: Stores sleep tracking data with quality ratings

Row Level Security (RLS) ensures each user can only access their own data.

## API Endpoints

- `POST /api/predict-sleep` - Generate sleep predictions using AI

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repo to Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GOOGLE_API_KEY`
4. Deploy

The `vercel.json` file is already configured for optimal deployment.

## Development

### Project Structure

```
src/
├── app/                 # Next.js app router
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   └── ...             # Feature components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   ├── supabase.ts     # Database client
│   ├── telegram.ts     # Telegram WebApp integration
│   ├── gemini.ts       # AI prediction service
│   └── utils.ts        # General utilities
└── ...
```

### Key Components

- **WelcomeScreen**: First-time user onboarding
- **AddChildForm**: Child profile creation
- **MainScreen**: Main dashboard with child selection
- **SleepTracker**: Sleep session management
- **SleepPrediction**: AI-powered sleep predictions
- **SleepHistory**: Historical sleep data visualization

### Web Application Features

The app includes modern web application features:

- Local storage-based user identification
- Responsive design for mobile and desktop
- Progressive web app (PWA) capabilities
- Native browser alerts and confirmations
- Mobile-optimized touch interactions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.