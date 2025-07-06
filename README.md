# Baby Sleep Tracker & Predictor

A comprehensive web application for tracking baby sleep patterns and getting AI-powered predictions for optimal sleep times. Built with Next.js and powered by Google Gemini AI.

## ✨ Features

- 👶 **Multi-Child Management**: Add and manage multiple children's profiles with age tracking
- 😴 **Advanced Sleep Tracking**: 
  - Single unified form for all sleep data entry
  - Local timezone support with UTC server storage
  - Real-time duration tracking for active sessions
  - Custom start/end times with future date validation
- 🎯 **Quality Assessment**: Rate sleep quality with 5-point scale after each session
- 🔮 **AI-Powered Predictions**: 
  - Personalized sleep predictions using Google Gemini AI
  - Configurable AI models via environment variables
  - Automatic rate limiting and retry logic
  - Real-time prediction updates after data changes
- 📊 **Comprehensive Sleep History**: 
  - Visual history with session grouping by date
  - Sleep statistics and totals
  - Easy record deletion with confirmation modals
- 📱 **Mobile-Optimized**: Responsive design with custom UI components
- 🔒 **Data Validation**: Prevents future timestamps and invalid time ranges
- ⚡ **Smart Updates**: Automatic prediction refresh after data modifications

## 🛠 Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI**: Google Gemini API (configurable models)
- **Styling**: Tailwind CSS with custom baby-friendly theme
- **UI Components**: Custom modal system and form components
- **Deployment**: Vercel with optimized configuration

## 🚀 Setup Instructions

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

Configure your environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Gemini API Configuration
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_MODEL=gemini-1.5-flash  # Optional: defaults to gemini-1.5-flash
```

#### Available Gemini Models:
- `gemini-1.5-flash` - Fastest, most cost-effective (default)
- `gemini-1.5-pro` - More capable, higher quality predictions
- `gemini-1.0-pro` - Legacy model option

### 4. Database Setup

1. Create a new [Supabase](https://supabase.com) project
2. Run the SQL schema from `supabase/schema.sql` in your Supabase SQL editor
3. Row Level Security (RLS) policies are automatically configured

### 5. Google Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Ensure you have sufficient quota (the app includes rate limiting)
4. Add the API key to your `.env` file

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📊 Database Schema

### Tables:

- **children**: Child profiles with user isolation
  - `id`, `name`, `date_of_birth`, `gender`, `user_id`, `created_at`
  
- **sleep_sessions**: Sleep tracking data with comprehensive metadata
  - `id`, `child_id`, `start_time`, `end_time`, `duration_minutes`
  - `quality`, `session_type`, `is_active`, `created_at`

### Security:
- Row Level Security (RLS) ensures data isolation per user
- User identification via secure session management

## 🔧 Key Features & Improvements

### Sleep Tracking Form
- **Unified Interface**: Single form replacing multiple buttons
- **Timezone Handling**: Local time display with proper UTC conversion
- **Validation**: Prevents future dates and invalid time ranges
- **Real-time Updates**: Live duration tracking for active sessions

### AI Predictions
- **Smart Refresh**: Automatic updates after data changes
- **Rate Limiting**: Built-in retry logic with exponential backoff
- **Fallback System**: Graceful degradation when AI service unavailable
- **Model Flexibility**: Environment-configurable AI models

### User Experience
- **Custom Modals**: Beautiful confirmation and alert dialogs
- **Auto-dismiss**: Success messages disappear automatically
- **Debounced Requests**: Prevents excessive API calls
- **Mobile-first**: Optimized for touch interactions

### Data Management
- **Duration Calculation**: Fixed timezone conversion issues
- **History Management**: Easy deletion with immediate UI updates
- **State Synchronization**: Proper React state management

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Configure environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GOOGLE_API_KEY`
   - `GEMINI_MODEL` (optional)
4. Deploy

The `vercel.json` configuration is optimized for production deployment.

### Environment-Specific Configuration

```env
# Development
GEMINI_MODEL=gemini-1.5-flash

# Production (for higher quality)
GEMINI_MODEL=gemini-1.5-pro
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/predict-sleep/    # AI prediction endpoint
│   └── page.tsx              # Main application entry
├── components/
│   ├── ui/                   # Reusable UI components
│   │   ├── Button.tsx        # Custom button with variants
│   │   ├── Card.tsx          # Container component
│   │   ├── Input.tsx         # Form input component
│   │   ├── Modal.tsx         # Custom modal system
│   │   └── Select.tsx        # Dropdown component
│   ├── AddChildForm.tsx      # Child registration
│   ├── MainScreen.tsx        # Dashboard with child selection
│   ├── SleepTracker.tsx      # Sleep session management
│   ├── SleepPrediction.tsx   # AI prediction display
│   ├── SleepHistory.tsx      # Historical data view
│   └── WelcomeScreen.tsx     # User onboarding
├── hooks/
│   ├── useSupabase.ts        # Database operations
│   └── useTelegram.ts        # Modal and alert system
├── lib/
│   ├── supabase.ts           # Database client
│   ├── gemini.ts             # AI prediction service
│   └── utils.ts              # Utilities and helpers
└── ...
```

## 🔍 API Endpoints

- `POST /api/predict-sleep` - Generate AI-powered sleep predictions
  - Rate limiting with retry logic
  - Configurable AI models
  - Comprehensive error handling

## 🧪 Development

### Key Components

- **WelcomeScreen**: First-time user onboarding
- **AddChildForm**: Child profile creation with validation
- **MainScreen**: Central dashboard with state management
- **SleepTracker**: Unified sleep tracking interface
- **SleepPrediction**: AI predictions with auto-refresh
- **SleepHistory**: Data visualization with management actions

### Testing Rate Limits

The app includes comprehensive rate limiting protection:
- Exponential backoff retry logic
- User-friendly error messages
- Graceful fallback to default predictions

### State Management

- React hooks for local state
- Supabase real-time subscriptions
- Optimistic UI updates
- Proper error boundaries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper TypeScript types
4. Test thoroughly including edge cases
5. Ensure ESLint passes (`npm run lint`)
6. Submit a pull request

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing component patterns
- Add proper error handling
- Include user-friendly validation messages
- Test with various timezone scenarios

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for intelligent predictions
- Supabase for robust database infrastructure
- Next.js team for the excellent framework
- Tailwind CSS for utility-first styling