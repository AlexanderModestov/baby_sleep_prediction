-- ============================================================================
-- DEPLOYMENT VERIFICATION SCRIPT
-- ============================================================================
-- Run this after deploying schema.sql to verify everything is working correctly

-- ============================================================================
-- 1. VERIFY ALL TABLES EXIST
-- ============================================================================

SELECT 
    'TABLES' as check_type,
    CASE 
        WHEN COUNT(*) = 6 THEN '✅ PASS' 
        ELSE '❌ FAIL - Expected 6 tables, found ' || COUNT(*)
    END as status,
    STRING_AGG(tablename, ', ' ORDER BY tablename) as details
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'children', 'sleep_sessions', 
    'sleep_contexts', 'predictions', 'prediction_usage'
);

-- ============================================================================
-- 2. VERIFY ALL FOREIGN KEYS EXIST
-- ============================================================================

SELECT 
    'FOREIGN_KEYS' as check_type,
    CASE 
        WHEN COUNT(*) >= 6 THEN '✅ PASS' 
        ELSE '❌ FAIL - Expected at least 6 foreign keys, found ' || COUNT(*)
    END as status,
    COUNT(*) || ' foreign key constraints found' as details
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
AND table_schema = 'public';

-- ============================================================================
-- 3. VERIFY ALL INDEXES EXIST
-- ============================================================================

SELECT 
    'INDEXES' as check_type,
    CASE 
        WHEN COUNT(*) >= 15 THEN '✅ PASS' 
        ELSE '❌ FAIL - Expected at least 15 indexes, found ' || COUNT(*)
    END as status,
    COUNT(*) || ' indexes found' as details
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'children', 'sleep_sessions', 
    'sleep_contexts', 'predictions', 'prediction_usage'
);

-- ============================================================================
-- 4. VERIFY ALL TRIGGERS EXIST
-- ============================================================================

SELECT 
    'TRIGGERS' as check_type,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ PASS' 
        ELSE '❌ FAIL - Expected at least 5 triggers, found ' || COUNT(*)
    END as status,
    STRING_AGG(trigger_name, ', ' ORDER BY trigger_name) as details
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND event_object_table IN (
    'users', 'children', 'sleep_sessions', 
    'predictions'
);

-- ============================================================================
-- 5. VERIFY ALL FUNCTIONS EXIST
-- ============================================================================

SELECT 
    'FUNCTIONS' as check_type,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ PASS' 
        ELSE '❌ FAIL - Expected at least 2 functions, found ' || COUNT(*)
    END as status,
    STRING_AGG(proname, ', ' ORDER BY proname) as details
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('update_updated_at_column', 'invalidate_old_predictions');

-- ============================================================================
-- 6. VERIFY VIEWS EXIST
-- ============================================================================

SELECT 
    'VIEWS' as check_type,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ PASS' 
        ELSE '❌ FAIL - Expected 2 views, found ' || COUNT(*)
    END as status,
    STRING_AGG(viewname, ', ' ORDER BY viewname) as details
FROM pg_views 
WHERE schemaname = 'public'
AND viewname IN ('user_children_summary', 'prediction_cache_stats');

-- ============================================================================
-- 7. TEST BASIC DATA OPERATIONS
-- ============================================================================

-- Test inserting a user (will be rolled back)
BEGIN;

-- Insert test user
INSERT INTO users (telegram_user_id, first_name) 
VALUES (999999999, 'Test User') 
RETURNING 'TEST_USER_INSERT' as check_type, '✅ PASS' as status, 'User insert successful' as details;

-- Insert test child
INSERT INTO children (user_id, name, date_of_birth, gender) 
SELECT id, 'Test Child', '2023-01-01', 'male' FROM users WHERE telegram_user_id = 999999999
RETURNING 'TEST_CHILD_INSERT' as check_type, '✅ PASS' as status, 'Child insert successful' as details;

-- Insert test sleep session
INSERT INTO sleep_sessions (child_id, start_time, session_type) 
SELECT id, NOW() - INTERVAL '2 hours', 'nap' FROM children WHERE name = 'Test Child'
RETURNING 'TEST_SESSION_INSERT' as check_type, '✅ PASS' as status, 'Sleep session insert successful' as details;

-- Test sleep context creation
INSERT INTO sleep_contexts (child_id, context_hash, sessions_count, session_ids, child_age_months)
SELECT id, 'test_hash', 1, '["test-uuid"]', 12 FROM children WHERE name = 'Test Child'
RETURNING 'TEST_CONTEXT_INSERT' as check_type, '✅ PASS' as status, 'Sleep context insert successful' as details;

-- Test prediction creation
INSERT INTO predictions (child_id, sleep_context_id, next_bedtime, time_until_bedtime, expected_duration, confidence, summary, reasoning, llm_provider)
SELECT c.id, sc.id, NOW() + INTERVAL '2 hours', '2 hours', '90 minutes', 0.8, 'Test summary', 'Test reasoning', 'test'
FROM children c, sleep_contexts sc 
WHERE c.name = 'Test Child' AND sc.context_hash = 'test_hash'
RETURNING 'TEST_PREDICTION_INSERT' as check_type, '✅ PASS' as status, 'Prediction insert successful' as details;

-- Test prediction usage tracking
INSERT INTO prediction_usage (prediction_id, child_id, was_from_cache)
SELECT p.id, p.child_id, true
FROM predictions p 
JOIN children c ON p.child_id = c.id 
WHERE c.name = 'Test Child'
RETURNING 'TEST_USAGE_INSERT' as check_type, '✅ PASS' as status, 'Usage tracking insert successful' as details;

-- Roll back test data
ROLLBACK;

-- ============================================================================
-- 8. FINAL SUMMARY
-- ============================================================================

SELECT 
    '🎉 DEPLOYMENT VERIFICATION COMPLETE' as summary,
    'If all checks above show ✅ PASS, your database is ready!' as status,
    'You can now start using the Baby Sleep Prediction application.' as next_steps;

-- ============================================================================
-- 9. OPTIONAL: PERFORMANCE CHECK
-- ============================================================================

-- Check if all indexes are being used efficiently
SELECT 
    'PERFORMANCE' as check_type,
    '📊 INFO' as status,
    'Run EXPLAIN ANALYZE on your queries to verify index usage' as details;

-- Show table sizes (useful for monitoring)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'children', 'sleep_sessions', 
    'sleep_contexts', 'predictions', 'prediction_usage'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;