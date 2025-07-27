-- Improved database schema for sleep prediction system
-- This addresses the user-child relationships and prediction-session linking

-- ============================================================================
-- CORE TABLES (already exist but may need modifications)
-- ============================================================================

-- Users table (already good)
-- children table (already good - has proper user_id FK)
-- sleep_sessions table (already good - has proper child_id FK)

-- ============================================================================
-- NEW/IMPROVED PREDICTION SYSTEM
-- ============================================================================

-- Drop existing predictions table to recreate with better structure
DROP TABLE IF EXISTS predictions CASCADE;

-- Create sleep_contexts table - tracks which sleep sessions were used for each prediction
CREATE TABLE IF NOT EXISTS sleep_contexts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    
    -- Context identification
    context_hash TEXT NOT NULL, -- hash of sleep sessions used
    sessions_count INTEGER NOT NULL,
    
    -- Sleep sessions that were considered for this context
    session_ids UUID[] NOT NULL, -- array of sleep_session IDs used
    last_sleep_session_id UUID REFERENCES sleep_sessions(id), -- the most recent sleep session
    
    -- Context metadata
    child_age_months INTEGER NOT NULL,
    total_sleep_hours DECIMAL(5,2), -- total sleep in this context
    average_session_duration INTEGER, -- in minutes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique contexts per child
    UNIQUE(child_id, context_hash)
);

-- Create improved predictions table - linked to sleep contexts
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
    
    -- Validity tracking
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

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for predictions updated_at
CREATE TRIGGER update_predictions_updated_at
    BEFORE UPDATE ON predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to invalidate predictions when new sleep data is added
CREATE OR REPLACE FUNCTION invalidate_old_predictions()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new sleep session is added or updated, invalidate existing active predictions
    -- for this child that don't include this session
    UPDATE predictions 
    SET is_active = FALSE, updated_at = NOW()
    WHERE child_id = NEW.child_id 
    AND is_active = TRUE
    AND sleep_context_id NOT IN (
        SELECT id FROM sleep_contexts 
        WHERE child_id = NEW.child_id 
        AND NEW.id = ANY(session_ids)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to invalidate predictions on new sleep sessions
CREATE TRIGGER invalidate_predictions_on_new_sleep
    AFTER INSERT OR UPDATE ON sleep_sessions
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_old_predictions();

-- ============================================================================
-- ROW LEVEL SECURITY (for production)
-- ============================================================================

-- Enable RLS
ALTER TABLE sleep_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_usage ENABLE ROW LEVEL SECURITY;

-- Policies (users can only access their own children's data)
CREATE POLICY sleep_contexts_policy ON sleep_contexts
    USING (child_id IN (
        SELECT c.id FROM children c 
        JOIN users u ON c.user_id = u.id 
        WHERE u.telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    ));

CREATE POLICY predictions_policy ON predictions
    USING (child_id IN (
        SELECT c.id FROM children c 
        JOIN users u ON c.user_id = u.id 
        WHERE u.telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    ));

CREATE POLICY prediction_usage_policy ON prediction_usage
    USING (child_id IN (
        SELECT c.id FROM children c 
        JOIN users u ON c.user_id = u.id 
        WHERE u.telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    ));