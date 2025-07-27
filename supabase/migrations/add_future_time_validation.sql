-- Add validation to prevent future start times for sleep sessions
-- This ensures data integrity at the database level

-- Add constraint to prevent future start times
ALTER TABLE sleep_sessions 
ADD CONSTRAINT check_start_time_not_future 
CHECK (start_time <= NOW());

-- Add constraint to prevent future end times (if they don't already exist)
ALTER TABLE sleep_sessions 
ADD CONSTRAINT check_end_time_not_future 
CHECK (end_time IS NULL OR end_time <= NOW());