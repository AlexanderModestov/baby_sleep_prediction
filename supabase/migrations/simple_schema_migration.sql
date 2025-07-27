-- Simple, safe migration for sleep prediction caching
-- Run this version if the full schema gives errors

-- ============================================================================
-- STEP 1: Clean slate - drop existing prediction tables
-- ============================================================================

DROP TABLE IF EXISTS prediction_usage CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS sleep_contexts CASCADE;

-- ============================================================================
-- STEP 2: Create core tables one by one
-- ============================================================================

-- Create sleep_contexts table
CREATE TABLE sleep_contexts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL,
    context_hash TEXT NOT NULL,
    sessions_count INTEGER NOT NULL,
    session_ids TEXT NOT NULL, -- JSON array as text for simplicity
    last_sleep_session_id UUID,
    child_age_months INTEGER NOT NULL,
    total_sleep_hours DECIMAL(5,2),
    average_session_duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create predictions table
CREATE TABLE predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL,
    sleep_context_id UUID NOT NULL,
    next_bedtime TIMESTAMP WITH TIME ZONE NOT NULL,
    time_until_bedtime TEXT NOT NULL,
    expected_duration TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    summary TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    llm_provider TEXT NOT NULL,
    model_used TEXT,
    generation_time_ms INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    used_count INTEGER DEFAULT 0,
    last_served_at TIMESTAMP WITH TIME ZONE,
    user_feedback TEXT,
    feedback_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prediction_usage table
CREATE TABLE prediction_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prediction_id UUID NOT NULL,
    child_id UUID NOT NULL,
    served_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    was_from_cache BOOLEAN NOT NULL DEFAULT TRUE,
    user_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Add foreign key constraints after tables exist
-- ============================================================================

-- Add foreign keys for sleep_contexts
ALTER TABLE sleep_contexts 
ADD CONSTRAINT fk_sleep_contexts_child 
FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

ALTER TABLE sleep_contexts 
ADD CONSTRAINT fk_sleep_contexts_last_session 
FOREIGN KEY (last_sleep_session_id) REFERENCES sleep_sessions(id) ON DELETE SET NULL;

-- Add foreign keys for predictions
ALTER TABLE predictions 
ADD CONSTRAINT fk_predictions_child 
FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

ALTER TABLE predictions 
ADD CONSTRAINT fk_predictions_context 
FOREIGN KEY (sleep_context_id) REFERENCES sleep_contexts(id) ON DELETE CASCADE;

-- Add foreign keys for prediction_usage
ALTER TABLE prediction_usage 
ADD CONSTRAINT fk_prediction_usage_prediction 
FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE;

ALTER TABLE prediction_usage 
ADD CONSTRAINT fk_prediction_usage_child 
FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: Add constraints
-- ============================================================================

-- Add check constraints
ALTER TABLE predictions 
ADD CONSTRAINT check_confidence 
CHECK (confidence >= 0 AND confidence <= 1);

ALTER TABLE predictions 
ADD CONSTRAINT check_user_feedback 
CHECK (user_feedback IN ('helpful', 'not_helpful', 'inaccurate') OR user_feedback IS NULL);

-- Add unique constraint
ALTER TABLE sleep_contexts 
ADD CONSTRAINT unique_child_context 
UNIQUE(child_id, context_hash);

-- ============================================================================
-- STEP 5: Create basic indexes
-- ============================================================================

-- Sleep contexts indexes
CREATE INDEX idx_sleep_contexts_child_id ON sleep_contexts(child_id);
CREATE INDEX idx_sleep_contexts_hash ON sleep_contexts(context_hash);

-- Predictions indexes
CREATE INDEX idx_predictions_child_id ON predictions(child_id);
CREATE INDEX idx_predictions_context_id ON predictions(sleep_context_id);
CREATE INDEX idx_predictions_active ON predictions(is_active);
CREATE INDEX idx_predictions_created_at ON predictions(created_at);

-- Usage tracking indexes
CREATE INDEX idx_prediction_usage_prediction_id ON prediction_usage(prediction_id);
CREATE INDEX idx_prediction_usage_child_id ON prediction_usage(child_id);

-- ============================================================================
-- STEP 6: Success verification
-- ============================================================================

-- Show created tables
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('sleep_contexts', 'predictions', 'prediction_usage')
ORDER BY table_name;