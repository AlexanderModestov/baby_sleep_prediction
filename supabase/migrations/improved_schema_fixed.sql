-- Fixed version of improved database schema for sleep prediction system
-- This addresses the user-child relationships and prediction-session linking

-- ============================================================================
-- STEP 1: Drop existing tables in correct order (handle dependencies)
-- ============================================================================

-- Drop existing predictions table if it exists
DROP TABLE IF EXISTS prediction_usage CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS sleep_contexts CASCADE;

-- ============================================================================
-- STEP 2: Create sleep_contexts table
-- ============================================================================

CREATE TABLE sleep_contexts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    
    -- Context identification
    context_hash TEXT NOT NULL,
    sessions_count INTEGER NOT NULL,
    
    -- Sleep sessions that were considered for this context
    session_ids UUID[] NOT NULL,
    last_sleep_session_id UUID REFERENCES sleep_sessions(id) ON DELETE SET NULL,
    
    -- Context metadata
    child_age_months INTEGER NOT NULL,
    total_sleep_hours DECIMAL(5,2),
    average_session_duration INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique contexts per child
    CONSTRAINT unique_child_context UNIQUE(child_id, context_hash)
);

-- ============================================================================
-- STEP 3: Create improved predictions table
-- ============================================================================

CREATE TABLE predictions (
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
    llm_provider TEXT NOT NULL,
    model_used TEXT,
    generation_time_ms INTEGER,
    
    -- Validity tracking
    is_active BOOLEAN DEFAULT TRUE,
    used_count INTEGER DEFAULT 0,
    last_served_at TIMESTAMP WITH TIME ZONE,
    
    -- Feedback tracking
    user_feedback TEXT CHECK (user_feedback IN ('helpful', 'not_helpful', 'inaccurate')),
    feedback_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: Create prediction_usage table
-- ============================================================================

CREATE TABLE prediction_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    
    -- Usage context
    served_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    was_from_cache BOOLEAN NOT NULL DEFAULT TRUE,
    user_action TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 5: Create indexes for performance
-- ============================================================================

-- Sleep contexts indexes
CREATE INDEX idx_sleep_contexts_child_id ON sleep_contexts(child_id);
CREATE INDEX idx_sleep_contexts_hash ON sleep_contexts(context_hash);
CREATE INDEX idx_sleep_contexts_last_session ON sleep_contexts(last_sleep_session_id);

-- Predictions indexes
CREATE INDEX idx_predictions_child_id ON predictions(child_id);
CREATE INDEX idx_predictions_context_id ON predictions(sleep_context_id);
CREATE INDEX idx_predictions_active ON predictions(is_active);
CREATE INDEX idx_predictions_created_at ON predictions(created_at);
CREATE INDEX idx_predictions_next_bedtime ON predictions(next_bedtime);

-- Usage tracking indexes
CREATE INDEX idx_prediction_usage_prediction_id ON prediction_usage(prediction_id);
CREATE INDEX idx_prediction_usage_child_id ON prediction_usage(child_id);
CREATE INDEX idx_prediction_usage_served_at ON prediction_usage(served_at);

-- Composite indexes for common queries
CREATE INDEX idx_predictions_child_active_created ON predictions(child_id, is_active, created_at DESC);
CREATE INDEX idx_sleep_contexts_child_created ON sleep_contexts(child_id, created_at DESC);

-- ============================================================================
-- STEP 6: Create updated_at trigger for predictions table
-- ============================================================================

-- Check if the function exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        ';
    END IF;
END
$$;

-- Create trigger for predictions updated_at
DROP TRIGGER IF EXISTS update_predictions_updated_at ON predictions;
CREATE TRIGGER update_predictions_updated_at
    BEFORE UPDATE ON predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: Create helper function to invalidate predictions
-- ============================================================================

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
        SELECT sc.id 
        FROM sleep_contexts sc
        WHERE sc.child_id = NEW.child_id 
        AND NEW.id = ANY(sc.session_ids)
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
-- STEP 8: Row Level Security (commented out for now - enable in production)
-- ============================================================================

-- Uncomment these lines when ready to enable RLS in production:

/*
-- Enable RLS
ALTER TABLE sleep_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_usage ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified version - adjust based on your auth setup)
CREATE POLICY sleep_contexts_policy ON sleep_contexts
    FOR ALL 
    USING (true);  -- Replace with proper user filtering logic

CREATE POLICY predictions_policy ON predictions
    FOR ALL 
    USING (true);  -- Replace with proper user filtering logic

CREATE POLICY prediction_usage_policy ON prediction_usage
    FOR ALL 
    USING (true);  -- Replace with proper user filtering logic
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
SELECT 
    table_name, 
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sleep_contexts', 'predictions', 'prediction_usage')
ORDER BY table_name;

-- Verify foreign key relationships
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('sleep_contexts', 'predictions', 'prediction_usage')
ORDER BY tc.table_name, kcu.ordinal_position;