# 📱 BABY SLEEP PREDICTION APPLICATION - COMPLETE DOCUMENTATION

## Table of Contents
- [1. Core Function](#1-core-function)
- [2. Features List](#2-features-list)
- [3. API Endpoints](#3-api-endpoints)
- [4. API Calls & Data Flow](#4-api-calls--data-flow)
- [5. Database Schema](#5-database-schema)
- [6. Component Architecture](#6-component-architecture)
- [7. Quick Reference](#7-quick-reference)
- [8. Key Files](#8-key-files)

---

## 1. Core Function

### Purpose
An AI-powered web application that helps parents track their baby's sleep patterns and receive intelligent predictions for optimal sleep times.

### How It Works
1. **Authentication**: Parents register via Telegram bot (@BabySleepControllerBot)
2. **Profile Setup**: Add child profiles with name, birth date, and gender
3. **Sleep Tracking**: Log sleep sessions with start/end times and quality ratings
4. **AI Predictions**: LLM analyzes sleep history to predict:
   - Next optimal bedtime
   - Time until sleep
   - Expected duration
   - Confidence score with reasoning
5. **Data Persistence**: All data stored in Supabase with intelligent prediction caching

### Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, LLM integration
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **AI**: Google Gemini / OpenAI / Claude (configurable)
- **Deployment**: Vercel

---

## 2. Features List

### 👥 User & Child Management
- ✅ Telegram WebApp authentication
- ✅ Multi-child profile support
- ✅ Child data: name, DOB (auto age calculation), gender
- ✅ Profile editing and deletion
- ✅ User data isolation via Row Level Security

### 😴 Sleep Tracking
- ✅ **Unified sleep entry form** for all data
- ✅ **Session types**: Night sleep (6 PM-6 AM) vs Naps
- ✅ **Flexible time input**:
  - Datetime picker with local timezone
  - Manual entry option
  - No future timestamps validation
- ✅ **Active session tracking**:
  - Live duration display
  - Real-time countdown timer
  - Manual end controls
- ✅ **Quality ratings**: 5-point scale (Excellent → Very Poor)
- ✅ **Completed sessions**: Full history with quality badges

### 📊 Sleep History & Analytics
- ✅ **Visual history**:
  - Grouped by date
  - Night/nap indicators (🌙/☀️)
  - Duration and quality color-coding
- ✅ **Statistics**:
  - Total sessions count
  - Total sleep hours
  - Average session duration
- ✅ **Management**:
  - Delete with confirmation
  - Immediate UI updates
  - Error handling

### 🤖 AI-Powered Predictions
- ✅ **Personalized analysis**:
  - Individual child patterns
  - Age-based adjustments (in months)
  - Gender consideration
  - Minimum 1 session required
- ✅ **Prediction outputs**:
  - Next bedtime with countdown
  - Expected duration
  - Confidence score (0-1)
  - Parent-friendly summary
  - Detailed reasoning
- ✅ **Real-time updates**:
  - Minute-by-minute countdown
  - Dynamic "time until" display
  - Past-time handling
- ✅ **Configurable LLMs**:
  - Google Gemini 1.5 Flash (default, fastest)
  - Google Gemini 1.5 Pro
  - OpenAI GPT-3.5 / GPT-4
  - Claude 3.5 Sonnet
- ✅ **Smart caching**:
  - Database-level prediction storage
  - Context-based cache hits
  - Usage analytics tracking

### 🎨 UX & Visualization
- ✅ Dashboard with personalized greeting
- ✅ Swipeable child selector
- ✅ Emoji-based visual feedback
- ✅ Contextual prompts
- ✅ Mobile-optimized design
- ✅ Modal system (confirmations, alerts)
- ✅ Haptic feedback integration

### ✅ Data Validation
- ✅ No future timestamps
- ✅ End time after start time
- ✅ Required field enforcement
- ✅ Birth date validation
- ✅ Timezone handling (local display, UTC storage)
- ✅ Network error recovery

---

## 3. API Endpoints

### 🔮 POST /api/predict-sleep
**Purpose**: Generate AI-powered sleep predictions

**Request Body**:
```json
{
  "childId": "uuid (optional, for caching)",
  "childAge": 12,
  "childGender": "male|female|unknown",
  "childName": "Emma",
  "sleepHistory": [
    {
      "id": "uuid",
      "child_id": "uuid",
      "start_time": "2025-01-20T19:30:00Z",
      "end_time": "2025-01-21T07:00:00Z",
      "duration_minutes": 690,
      "quality": "excellent|good|average|poor|very_poor",
      "session_type": "night|nap",
      "is_active": false,
      "created_at": "ISO-8601",
      "updated_at": "ISO-8601"
    }
  ]
}
```

**Response (200)**:
```json
{
  "nextBedtime": "2025-01-21T19:30:00Z",
  "timeUntilBedtime": "2 hours 15 minutes",
  "expectedDuration": "11 hours 30 minutes",
  "confidence": 0.85,
  "summary": "Based on Emma's recent sleep patterns...",
  "reasoning": "Detailed explanation of prediction logic",
  "provider": "gemini|openai|claude",
  "model": "gemini-1.5-flash",
  "fromCache": true,
  "cacheData": {
    "usedCount": 3,
    "lastServed": "2025-01-21T15:00:00Z"
  },
  "generationTime": 1250,
  "sessionCount": 10,
  "childAge": 12
}
```

**Workflow**:
1. Check cache by childId + sleep context hash
2. Cache hit → Return immediately with `fromCache: true`
3. Cache miss → Call LLM provider
4. Save prediction to database
5. Return with metadata

**Caching Strategy**:
- Uses `sleep_contexts` table with stable hash
- Hash based on: session IDs, end times, child age
- Tracks usage stats (used_count, last_served_at)

---

### 👤 GET /api/telegram-user
**Purpose**: Fetch or create user data from Telegram ID

**Query Parameters**:
- `telegram_user_id` (required): Telegram numeric ID

**Response (200)**:
```json
{
  "id": "uuid",
  "telegram_id": 123456789,
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe",
  "custom_name": "John",
  "settings": {
    "notifications_enabled": true,
    "sleep_reminders": true,
    "wake_reminders": true
  }
}
```

**Fallback (user not found)**:
```json
{
  "telegram_id": 123456789,
  "settings": {
    "notifications_enabled": true,
    "sleep_reminders": true,
    "wake_reminders": true
  }
}
```

---

### 👤 POST /api/telegram-user
**Purpose**: Create or update user data

**Request Body**:
```json
{
  "telegram_user_id": 123456789,
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe",
  "custom_name": "John",
  "settings": {
    "notifications_enabled": true,
    "sleep_reminders": true,
    "wake_reminders": true
  }
}
```

**Response (200)**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "telegram_user_id": 123456789,
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe",
    "custom_name": "John",
    "settings": { ... },
    "created_at": "2025-01-20T10:00:00Z",
    "updated_at": "2025-01-20T10:00:00Z"
  }
}
```

**Error Responses**:
- `400`: Missing required fields
- `500`: Database error

---

## 4. API Calls & Data Flow

### 🔄 Frontend API Integration

#### Prediction Request Flow
**Location**: `src/components/SleepPrediction.tsx:251-370`

```typescript
// Trigger: User has sleep sessions, no active session
const response = await fetch('/api/predict-sleep', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    childAge: calculateAge(dateOfBirth),  // months
    childGender: selectedChild.gender,
    childName: selectedChild.name,
    sleepHistory: recentSessions.slice(0, 10),
    childId: selectedChild.id
  }),
  signal: abortController.signal
})

const result = await response.json()
setPrediction(result)
```

**Features**:
- ✅ 1-second debounce to prevent spam
- ✅ Abort controller for request cancellation
- ✅ Automatic cache handling
- ✅ Error recovery

---

### 🗄️ Supabase Direct Queries

**Location**: `src/hooks/useSupabase.ts`

#### 1. Fetch Children
```typescript
supabase
  .from('children')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

#### 2. Add Child
```typescript
supabase
  .from('children')
  .insert([{
    name,
    date_of_birth,
    gender,
    user_id
  }])
  .select()
  .single()
```

#### 3. Fetch Sleep Sessions
```typescript
supabase
  .from('sleep_sessions')
  .select('*')
  .eq('child_id', childId)
  .order('start_time', { ascending: false })
```

#### 4. Start Sleep Session
```typescript
supabase
  .from('sleep_sessions')
  .insert([{
    child_id,
    start_time,      // ISO UTC
    end_time,        // ISO UTC or null
    duration_minutes,
    quality,
    session_type: determineSessionType(start_time),  // night/nap
    is_active: !end_time
  }])
  .select()
  .single()
```

#### 5. End Sleep Session
```typescript
supabase
  .from('sleep_sessions')
  .update({
    end_time,
    duration_minutes,
    quality,
    is_active: false
  })
  .eq('id', sessionId)
  .select()
  .single()
```

#### 6. Delete Sleep Session
```typescript
supabase
  .from('sleep_sessions')
  .delete()
  .eq('id', sessionId)
```

#### 7. Save Prediction (Analytics)
```typescript
supabase
  .from('predictions')
  .insert([{
    child_id,
    next_bedtime,
    time_until_bedtime,
    expected_duration,
    confidence,
    summary,
    reasoning,
    llm_provider,
    model_used,
    session_count,
    generation_time_ms,
    child_age_months
  }])
```

---

### 🤖 LLM Provider Selection

**Location**: `src/lib/orchestrator.ts` + `src/lib/llm-providers/`

**Flow**:
1. API receives prediction request
2. orchestrator.ts → `predictNextSleep()`
3. Load LLM config from environment
4. Select provider: Gemini / OpenAI / Claude
5. Create provider instance
6. Generate prompt from template
7. Call `provider.generateSleepPrediction(prompt)`
8. Parse JSON response
9. Return structured prediction

**Configuration** (`src/lib/llm-providers/config.ts`):

```bash
# Environment variables:
LLM_PROVIDER=gemini  # default
GOOGLE_API_KEY=xxx
GEMINI_MODEL=gemini-1.5-flash

# Or:
LLM_PROVIDER=openai
OPENAI_API_KEY=xxx
OPENAI_MODEL=gpt-4

# Or:
LLM_PROVIDER=claude
CLAUDE_API_KEY=xxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

**Gemini Provider Example** (`src/lib/llm-providers/gemini-provider.ts`):
```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash'
})
const result = await model.generateContent(prompt)
const text = result.response.text()

// Parse JSON from markdown code block
const jsonMatch = text.match(/\{[\s\S]*\}/)
const prediction = JSON.parse(jsonMatch[0])

return {
  nextBedtime: prediction.nextBedtime,
  timeUntilBedtime: formatTime(minutesUntil),
  expectedDuration: prediction.expectedDuration,
  confidence: 0.8,
  summary: prediction.reasoning,
  reasoning: prediction.reasoning
}
```

**Rate Limiting**:
- Exponential backoff on 429 errors
- Retry intervals: 1s, 2s, 4s (max 3 attempts)

---

### 📊 Complete Data Flow Examples

#### Example 1: End Sleep Session → Prediction Update

```
User clicks "End Sleep" button
    ↓
SleepTracker.handleEndSleep()
    ↓
endSleepSession(sessionId, endTime, quality)
    ↓
Supabase: UPDATE sleep_sessions SET end_time, quality, is_active=false
    ↓
Local state updates: setSessions([...])
    ↓
MainScreen detects session count change
    ↓
setRefreshTrigger(prev => prev + 1)
    ↓
SleepPrediction detects refreshTrigger change
    ↓
Clears cached prediction state
    ↓
loadPrediction() called
    ↓
POST /api/predict-sleep with new sleepHistory
    ↓
orchestrator → LLM provider
    ↓
LLM generates prediction
    ↓
Save to predictions + sleep_contexts tables
    ↓
Return prediction with metadata
    ↓
UI updates: new bedtime, countdown, reasoning
```

---

#### Example 2: Add New Sleep Session

```
User fills form: start time, end time, quality
    ↓
SleepTracker.handleStartSleep()
    ↓
Validation: end > start, no future dates
    ↓
Calculate duration_minutes
    ↓
Determine session_type (night if 6PM-6AM, else nap)
    ↓
startSleepSession() hook
    ↓
Supabase: INSERT INTO sleep_sessions
    ↓
Local state: setSessions([newSession, ...prev])
    ↓
onSessionUpdate() callback → refetch()
    ↓
MainScreen useEffect detects length increase
    ↓
setRefreshTrigger(prev => prev + 1)
    ↓
SleepPrediction clears cache
    ↓
New prediction requested
    ↓
UI shows updated prediction
```

---

#### Example 3: Cold Start (First Time User)

```
User opens app via Telegram WebApp
    ↓
page.tsx: Telegram.WebApp.initData parsed
    ↓
useTelegram() fetches user from GET /api/telegram-user
    ↓
useChildren() queries Supabase: children table
    ↓
Result: children.length === 0
    ↓
WelcomeScreen displays
    ↓
User clicks "Add Child"
    ↓
AddChildForm: name, DOB, gender inputs
    ↓
Submit → addChild() hook
    ↓
Supabase: INSERT INTO children
    ↓
MainScreen renders with selectedChild
    ↓
SleepTracker shows empty state
    ↓
SleepPrompts: "Start tracking sleep to get predictions!"
    ↓
User logs first sleep session
    ↓
startSleepSession() → Supabase INSERT
    ↓
Prediction triggers (sleepHistory.length >= 1)
    ↓
POST /api/predict-sleep (no cache hit)
    ↓
LLM generates first prediction
    ↓
Prediction saved to database
    ↓
UI displays prediction with confidence
```

---

## 5. Database Schema

### `users` (Telegram authentication)
```sql
id: UUID PRIMARY KEY
telegram_user_id: BIGINT UNIQUE NOT NULL
first_name: TEXT
last_name: TEXT
username: TEXT
custom_name: TEXT DEFAULT first_name
settings: JSONB DEFAULT '{}'
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### `children` (Child profiles)
```sql
id: UUID PRIMARY KEY
user_id: UUID REFERENCES users(id)
name: TEXT NOT NULL
date_of_birth: DATE NOT NULL
gender: TEXT CHECK (gender IN ('male', 'female'))
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### `sleep_sessions` (Sleep records)
```sql
id: UUID PRIMARY KEY
child_id: UUID REFERENCES children(id)
start_time: TIMESTAMP NOT NULL
end_time: TIMESTAMP
duration_minutes: INTEGER
quality: TEXT CHECK (quality IN ('excellent','good','average','poor','very_poor'))
session_type: TEXT CHECK (session_type IN ('night', 'nap'))
is_active: BOOLEAN DEFAULT TRUE
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### `sleep_contexts` (Prediction cache context)
```sql
id: UUID PRIMARY KEY
child_id: UUID REFERENCES children(id)
context_hash: TEXT NOT NULL
sessions_count: INTEGER
session_ids: TEXT  -- JSON array of UUIDs
last_sleep_session_id: UUID REFERENCES sleep_sessions(id)
child_age_months: INTEGER
total_sleep_hours: DECIMAL
average_session_duration: INTEGER
created_at: TIMESTAMP
UNIQUE(child_id, context_hash)
```

### `predictions` (Cached predictions)
```sql
id: UUID PRIMARY KEY
child_id: UUID REFERENCES children(id)
sleep_context_id: UUID REFERENCES sleep_contexts(id)
next_bedtime: TIMESTAMP
time_until_bedtime: TEXT
expected_duration: TEXT
confidence: DECIMAL(3,2)  -- 0.00 to 1.00
summary: TEXT
reasoning: TEXT
llm_provider: TEXT
model_used: TEXT
generation_time_ms: INTEGER
is_active: BOOLEAN DEFAULT TRUE
used_count: INTEGER DEFAULT 1
last_served_at: TIMESTAMP
user_feedback: TEXT
feedback_notes: TEXT
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### `prediction_usage` (Analytics)
```sql
id: UUID PRIMARY KEY
prediction_id: UUID REFERENCES predictions(id)
child_id: UUID REFERENCES children(id)
served_at: TIMESTAMP
was_from_cache: BOOLEAN
user_action: TEXT  -- viewed/dismissed/followed
created_at: TIMESTAMP
```

---

## 6. Component Architecture

```
page.tsx (Entry Point)
  ├─ useTelegram() → Fetch Telegram user data
  ├─ useChildren() → Fetch children list
  └─ Routes:
      ├─ WelcomeScreen (no children)
      ├─ AddChildForm (add new child)
      ├─ EditChildForm (edit existing)
      └─ MainScreen (main dashboard)
           │
           ├─ SwipeableChildSelector
           │   └─ Child cards with edit buttons
           │
           ├─ SleepPrediction
           │   ├─ loadPrediction() → POST /api/predict-sleep
           │   ├─ Countdown timer (updates every minute)
           │   ├─ "Wake up" tracking modal
           │   └─ SleepPrompts (contextual hints)
           │
           ├─ SleepTracker
           │   ├─ Unified form (start/end, quality)
           │   ├─ startSleepSession()
           │   ├─ endSleepSession()
           │   └─ Validation modals
           │
           └─ SleepHistory
               ├─ Sessions grouped by date
               ├─ deleteSleepSession()
               ├─ Confirmation modals
               └─ Statistics display
```

---

## 7. Quick Reference

### Features Overview Table

| Feature | Files | Hooks | API |
|---------|-------|-------|-----|
| **User Auth** | page.tsx, useTelegram.ts | useTelegram | GET/POST /api/telegram-user |
| **Child Mgmt** | AddChildForm, EditChildForm | useChildren | Supabase direct |
| **Sleep Track** | SleepTracker, SleepPrediction | useSleepSessions | Supabase direct |
| **Predictions** | SleepPrediction | useSleepSessions | POST /api/predict-sleep |
| **History** | SleepHistory | useSleepSessions | Supabase direct |
| **Caching** | prediction-cache.ts, orchestrator.ts | - | LLM providers |
| **UI Components** | Modal, Button, SwipeableChildSelector | useTelegram | - |

---

## 8. Key Files

### Core Application Files
- **`src/app/page.tsx`**: Main entry point, routing logic
- **`src/components/MainScreen.tsx`**: Dashboard, refresh trigger management ⭐
- **`src/components/SleepPrediction.tsx`**: Prediction display, API calls
- **`src/components/SleepTracker.tsx`**: Sleep session forms
- **`src/components/SleepHistory.tsx`**: Historical data display

### Hooks & Utilities
- **`src/hooks/useSupabase.ts`**: All Supabase queries
- **`src/hooks/useTelegram.ts`**: Telegram WebApp integration
- **`src/lib/utils.ts`**: Utility functions (age calculation, formatting)

### API & LLM Integration
- **`src/app/api/predict-sleep/route.ts`**: Prediction API endpoint
- **`src/app/api/telegram-user/route.ts`**: User management API
- **`src/lib/orchestrator.ts`**: LLM provider orchestration
- **`src/lib/prediction-cache.ts`**: Cache management service
- **`src/lib/llm-providers/`**: Gemini, OpenAI, Claude implementations
  - `gemini-provider.ts`
  - `openai-provider.ts`
  - `claude-provider.ts`
  - `config.ts`

### Configuration
- **`.env.local`**: Environment variables (API keys, database URL)
- **`next.config.ts`**: Next.js configuration
- **`tailwind.config.ts`**: Tailwind CSS configuration

---

## Additional Resources

### Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env.local`
4. Run development server: `npm run dev`
5. Open Telegram bot and start tracking!

### Environment Variables Required
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# LLM Provider (choose one or configure all)
LLM_PROVIDER=gemini  # gemini|openai|claude

# Google Gemini
GOOGLE_API_KEY=your-google-api-key
GEMINI_MODEL=gemini-1.5-flash  # or gemini-1.5-pro

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# Claude
CLAUDE_API_KEY=your-claude-api-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### Deployment
- Platform: Vercel
- Automatic deployments on push to `main` branch
- Preview deployments for all branches
- Environment variables configured in Vercel dashboard

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Maintainer**: Baby Sleep Prediction Team
