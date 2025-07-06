-- Create children table
CREATE TABLE IF NOT EXISTS children (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_child_id ON sleep_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_start_time ON sleep_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_is_active ON sleep_sessions(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_children_updated_at
    BEFORE UPDATE ON children
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sleep_sessions_updated_at
    BEFORE UPDATE ON sleep_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Note: Row Level Security (RLS) can be enabled later for production
-- For development/testing, queries filter by user_id in application code