-- Add predictions table for storing AI-generated sleep predictions
CREATE TABLE IF NOT EXISTS predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    
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
    session_count INTEGER NOT NULL, -- number of sessions used for prediction
    generation_time_ms INTEGER, -- time taken to generate
    
    -- Context data (for analysis)
    child_age_months INTEGER NOT NULL,
    input_sessions_hash TEXT, -- hash of input data for deduplication
    
    -- Feedback tracking
    user_feedback TEXT CHECK (user_feedback IN ('helpful', 'not_helpful', 'inaccurate')),
    feedback_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_predictions_child_id ON predictions(child_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_next_bedtime ON predictions(next_bedtime);
CREATE INDEX IF NOT EXISTS idx_predictions_input_hash ON predictions(input_sessions_hash);

-- Trigger for updated_at
CREATE TRIGGER update_predictions_updated_at
    BEFORE UPDATE ON predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();