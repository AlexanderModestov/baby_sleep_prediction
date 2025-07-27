-- ============================================================================
-- BABY SLEEP PREDICTION - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This file contains the complete database schema for fresh deployments
-- Includes: Core tables, Prediction caching system, Indexes, Triggers, Constraints
-- Version: 2.0 (with improved prediction caching)
-- ============================================================================

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Create users table for Telegram authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_user_id BIGINT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    username TEXT,
    custom_name TEXT,
    settings JSONB DEFAULT '{
        "notifications_enabled": true,
        "sleep_reminders": true,
        "wake_reminders": true
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create children table
CREATE TABLE IF NOT EXISTS children (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sleep_sessions table
CREATE TABLE IF NOT EXISTS sleep_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    quality TEXT CHECK (quality IN ('excellent', 'good', 'average', 'poor', 'very_poor')),
    session_type TEXT NOT NULL CHECK (session_type IN ('night', 'nap')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PREDICTION CACHING SYSTEM
-- ============================================================================

-- Create sleep_contexts table - tracks which sleep sessions were used for each prediction
CREATE TABLE IF NOT EXISTS sleep_contexts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    
    -- Context identification
    context_hash TEXT NOT NULL,
    sessions_count INTEGER NOT NULL,
    
    -- Sleep sessions that were considered for this context (stored as JSON string)
    session_ids TEXT NOT NULL, -- JSON array of UUIDs
    last_sleep_session_id UUID REFERENCES sleep_sessions(id) ON DELETE SET NULL,
    
    -- Context metadata
    child_age_months INTEGER NOT NULL,
    total_sleep_hours DECIMAL(5,2),
    average_session_duration INTEGER, -- in minutes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique contexts per child
    CONSTRAINT unique_child_context UNIQUE(child_id, context_hash)
);

-- Create enhanced predictions table - linked to sleep contexts
CREATE TABLE IF NOT EXISTS predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    sleep_context_id UUID NOT NULL REFERENCES sleep_contexts(id) ON DELETE CASCADE,
    
    -- Prediction data
    next_bedtime TIMESTAMP WITH TIME ZONE NOT NULL,
    time_until_bedtime TEXT NOT NULL,
    expected_duration TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    summary TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    
    -- Generation metadata
    llm_provider TEXT NOT NULL, -- 'openai', 'gemini', 'claude', 'general'
    model_used TEXT, -- specific model version
    generation_time_ms INTEGER, -- time taken to generate
    
    -- Validity and usage tracking
    is_active BOOLEAN DEFAULT TRUE, -- false when new sleep data invalidates this prediction
    used_count INTEGER DEFAULT 0, -- how many times this prediction was served to user
    last_served_at TIMESTAMP WITH TIME ZONE, -- when this prediction was last shown
    
    -- Feedback tracking
    user_feedback TEXT CHECK (user_feedback IN ('helpful', 'not_helpful', 'inaccurate')),
    feedback_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prediction_usage table - tracks when predictions were shown to users
CREATE TABLE IF NOT EXISTS prediction_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    
    -- Usage context
    served_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    was_from_cache BOOLEAN NOT NULL DEFAULT TRUE,
    user_action TEXT, -- 'viewed', 'dismissed', 'followed', etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_child_id ON sleep_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_start_time ON sleep_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_is_active ON sleep_sessions(is_active);

-- Sleep contexts indexes
CREATE INDEX IF NOT EXISTS idx_sleep_contexts_child_id ON sleep_contexts(child_id);
CREATE INDEX IF NOT EXISTS idx_sleep_contexts_hash ON sleep_contexts(context_hash);
CREATE INDEX IF NOT EXISTS idx_sleep_contexts_last_session ON sleep_contexts(last_sleep_session_id);

-- Predictions indexes
CREATE INDEX IF NOT EXISTS idx_predictions_child_id ON predictions(child_id);
CREATE INDEX IF NOT EXISTS idx_predictions_context_id ON predictions(sleep_context_id);
CREATE INDEX IF NOT EXISTS idx_predictions_active ON predictions(is_active);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_next_bedtime ON predictions(next_bedtime);

-- Usage tracking indexes
CREATE INDEX IF NOT EXISTS idx_prediction_usage_prediction_id ON prediction_usage(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_usage_child_id ON prediction_usage(child_id);
CREATE INDEX IF NOT EXISTS idx_prediction_usage_served_at ON prediction_usage(served_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_predictions_child_active_created ON predictions(child_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_contexts_child_created ON sleep_contexts(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_child_start ON sleep_sessions(child_id, start_time DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Create or update the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_children_updated_at ON children;
CREATE TRIGGER update_children_updated_at
    BEFORE UPDATE ON children
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sleep_sessions_updated_at ON sleep_sessions;
CREATE TRIGGER update_sleep_sessions_updated_at
    BEFORE UPDATE ON sleep_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_predictions_updated_at ON predictions;
CREATE TRIGGER update_predictions_updated_at
    BEFORE UPDATE ON predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to invalidate predictions when new sleep data is added
CREATE OR REPLACE FUNCTION invalidate_old_predictions()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new sleep session is added or updated, invalidate existing active predictions
    -- for this child that don't include this session in their context
    UPDATE predictions 
    SET is_active = FALSE, updated_at = NOW()
    WHERE child_id = NEW.child_id 
    AND is_active = TRUE
    AND sleep_context_id NOT IN (
        SELECT sc.id 
        FROM sleep_contexts sc
        WHERE sc.child_id = NEW.child_id 
        AND sc.session_ids LIKE '%' || NEW.id::text || '%' -- Simple text search in JSON
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to invalidate predictions on new sleep sessions
DROP TRIGGER IF EXISTS invalidate_predictions_on_new_sleep ON sleep_sessions;
CREATE TRIGGER invalidate_predictions_on_new_sleep
    AFTER INSERT OR UPDATE ON sleep_sessions
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_old_predictions();

-- ============================================================================
-- ROW LEVEL SECURITY (Ready for Production)
-- ============================================================================

-- Note: RLS policies are commented out for development
-- Uncomment and configure these for production deployment

/*
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_usage ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust based on your authentication setup)
-- Users can only see their own data
CREATE POLICY users_own_data ON users
    FOR ALL 
    USING (telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint);

-- Children belong to users
CREATE POLICY children_belong_to_users ON children
    FOR ALL 
    USING (user_id IN (
        SELECT id FROM users 
        WHERE telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    ));

-- Sleep sessions belong to user's children
CREATE POLICY sleep_sessions_belong_to_users ON sleep_sessions
    FOR ALL 
    USING (child_id IN (
        SELECT c.id FROM children c 
        JOIN users u ON c.user_id = u.id 
        WHERE u.telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    ));

-- Similar policies for sleep_contexts, predictions, prediction_usage
*/

-- ============================================================================
-- DATA VALIDATION AND CONSTRAINTS
-- ============================================================================

-- Additional constraints for data integrity
ALTER TABLE sleep_sessions 
ADD CONSTRAINT check_session_duration 
CHECK (duration_minutes IS NULL OR duration_minutes > 0);

ALTER TABLE sleep_sessions 
ADD CONSTRAINT check_end_after_start 
CHECK (end_time IS NULL OR end_time > start_time);

ALTER TABLE sleep_sessions 
ADD CONSTRAINT check_start_time_not_future 
CHECK (start_time <= NOW());

ALTER TABLE sleep_sessions 
ADD CONSTRAINT check_end_time_not_future 
CHECK (end_time IS NULL OR end_time <= NOW());

ALTER TABLE predictions 
ADD CONSTRAINT check_confidence_range 
CHECK (confidence >= 0 AND confidence <= 1);

ALTER TABLE predictions 
ADD CONSTRAINT check_used_count_positive 
CHECK (used_count >= 0);

ALTER TABLE sleep_contexts 
ADD CONSTRAINT check_sessions_count_positive 
CHECK (sessions_count > 0);

ALTER TABLE sleep_contexts 
ADD CONSTRAINT check_age_reasonable 
CHECK (child_age_months >= 0 AND child_age_months <= 300); -- 25 years max

-- ============================================================================
-- UTILITY VIEWS (Optional - for easier querying)
-- ============================================================================

-- View for user's children with sleep session counts
CREATE OR REPLACE VIEW user_children_summary AS
SELECT 
    u.id as user_id,
    u.telegram_user_id,
    u.first_name,
    c.id as child_id,
    c.name as child_name,
    c.date_of_birth,
    c.gender,
    EXTRACT(YEAR FROM AGE(c.date_of_birth)) * 12 + EXTRACT(MONTH FROM AGE(c.date_of_birth)) as age_months,
    COUNT(ss.id) as total_sleep_sessions,
    COUNT(CASE WHEN ss.is_active THEN 1 END) as active_sleep_sessions,
    MAX(ss.start_time) as last_sleep_time
FROM users u
JOIN children c ON u.id = c.user_id
LEFT JOIN sleep_sessions ss ON c.id = ss.child_id
GROUP BY u.id, u.telegram_user_id, u.first_name, c.id, c.name, c.date_of_birth, c.gender;

-- View for prediction cache performance
CREATE OR REPLACE VIEW prediction_cache_stats AS
SELECT 
    c.id as child_id,
    c.name as child_name,
    COUNT(p.id) as total_predictions,
    COUNT(CASE WHEN p.is_active THEN 1 END) as active_predictions,
    AVG(p.used_count) as avg_usage_per_prediction,
    COUNT(pu.id) as total_usage_events,
    COUNT(CASE WHEN pu.was_from_cache THEN 1 END) as cache_hits,
    ROUND(
        100.0 * COUNT(CASE WHEN pu.was_from_cache THEN 1 END) / NULLIF(COUNT(pu.id), 0), 
        2
    ) as cache_hit_percentage
FROM children c
LEFT JOIN predictions p ON c.id = p.child_id
LEFT JOIN prediction_usage pu ON p.id = pu.prediction_id
GROUP BY c.id, c.name;

-- ============================================================================
-- SCHEMA VERIFICATION
-- ============================================================================

-- Query to verify all tables were created successfully
SELECT 
    schemaname,
    tablename,
    tableowner,
    tablespace,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'children', 'sleep_sessions', 
    'sleep_contexts', 'predictions', 'prediction_usage'
)
ORDER BY tablename;

-- Query to verify all foreign key relationships
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.ordinal_position;

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

/*
DEPLOYMENT CHECKLIST:

1. ✅ Run this schema.sql file on a fresh database
2. ⚠️  Configure RLS policies for production (uncomment and adjust)
3. ⚠️  Set up database backups
4. ⚠️  Configure connection pooling
5. ⚠️  Set up monitoring for performance
6. ⚠️  Test the prediction caching system
7. ⚠️  Set appropriate database resource limits

FEATURES INCLUDED:
- ✅ User authentication via Telegram
- ✅ Multi-child support per user
- ✅ Sleep session tracking with quality ratings
- ✅ Intelligent prediction caching system
- ✅ Sleep context tracking
- ✅ Prediction usage analytics
- ✅ Automatic cache invalidation
- ✅ Performance indexes
- ✅ Data integrity constraints
- ✅ Utility views for reporting
- ✅ Prepared for Row Level Security

PERFORMANCE FEATURES:
- Composite indexes for common query patterns
- Automatic prediction invalidation triggers
- Context-based caching to minimize LLM calls
- Usage tracking for analytics and optimization
*/