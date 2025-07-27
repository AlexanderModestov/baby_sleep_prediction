# Database Schema Migration Guide

## Overview
This migration improves the database schema to address two main issues:
1. **Better user-child relationship tracking** (already exists but optimized)
2. **Prediction caching and linking to sleep sessions** (new functionality)

## Key Improvements

### 1. Sleep Context Tracking
- **New table**: `sleep_contexts` - tracks which sleep sessions were used for each prediction
- **Purpose**: Links predictions to the specific sleep data that generated them
- **Benefits**: Enables prediction reuse when sleep context hasn't changed

### 2. Enhanced Prediction Management
- **Improved table**: `predictions` - now linked to sleep contexts
- **New tracking**: Usage count, cache status, validity tracking
- **Auto-invalidation**: Predictions automatically become invalid when new sleep data is added

### 3. Usage Analytics
- **New table**: `prediction_usage` - tracks when and how predictions are served
- **Purpose**: Analytics and performance monitoring

## Migration Steps

### Step 1: Backup Current Data
```sql
-- Backup existing predictions (if any)
CREATE TABLE predictions_backup AS SELECT * FROM predictions;
```

### Step 2: Run Migration
```sql
-- Execute the improved_schema.sql file
\i improved_schema.sql
```

### Step 3: Verify Schema
```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sleep_contexts', 'predictions', 'prediction_usage');

-- Check relationships
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
AND tc.table_name IN ('sleep_contexts', 'predictions', 'prediction_usage');
```

## Application Changes Required

### 1. Update Import Statements
```typescript
// Add new interfaces
import { SleepContext, Prediction, PredictionUsage } from '@/lib/supabase'
```

### 2. Prediction Service Updates
The prediction service needs to:
- Check for existing valid predictions before making LLM calls
- Create sleep contexts for new prediction requests
- Track prediction usage
- Invalidate old predictions when sleep data changes

### 3. Cache Logic Implementation
```typescript
// Pseudo-code for new prediction flow:
async function getPrediction(childId: string, sleepHistory: SleepSession[]) {
  // 1. Generate context hash from sleep history
  const contextHash = generateSleepContextHash(sleepHistory)
  
  // 2. Check for existing valid prediction
  const existingPrediction = await findActiveePrediction(childId, contextHash)
  if (existingPrediction) {
    await trackPredictionUsage(existingPrediction.id, { was_from_cache: true })
    return existingPrediction
  }
  
  // 3. Create new sleep context
  const sleepContext = await createSleepContext(childId, sleepHistory, contextHash)
  
  // 4. Generate new prediction via LLM
  const newPrediction = await generateLLMPrediction(sleepHistory)
  
  // 5. Save prediction linked to context
  const savedPrediction = await savePrediction(newPrediction, sleepContext.id)
  
  // 6. Track usage
  await trackPredictionUsage(savedPrediction.id, { was_from_cache: false })
  
  return savedPrediction
}
```

## Benefits of New Schema

### 1. Performance
- **Prediction caching**: Avoid unnecessary LLM calls
- **Context tracking**: Efficient invalidation of outdated predictions
- **Indexed queries**: Fast lookups for active predictions

### 2. Consistency
- **Stable predictions**: Users see same prediction until sleep context changes
- **Automatic invalidation**: Old predictions become inactive when new sleep data arrives
- **Version tracking**: Clear audit trail of predictions and their contexts

### 3. Analytics
- **Usage tracking**: Understand how often predictions are reused
- **Performance metrics**: Track LLM call frequency vs cache hits
- **User feedback**: Collect and analyze prediction accuracy

### 4. Data Integrity
- **Foreign key constraints**: Ensure predictions are always linked to valid contexts
- **Automatic cleanup**: Cascading deletes maintain referential integrity
- **Row-level security**: Multi-tenant security for production

## Rollback Plan

If migration needs to be rolled back:

```sql
-- 1. Disable new triggers
DROP TRIGGER IF EXISTS invalidate_predictions_on_new_sleep ON sleep_sessions;

-- 2. Drop new tables
DROP TABLE IF EXISTS prediction_usage CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS sleep_contexts CASCADE;

-- 3. Restore old predictions table (if backup exists)
CREATE TABLE predictions AS SELECT * FROM predictions_backup;
DROP TABLE predictions_backup;
```

## Testing Checklist

- [ ] User-child relationships work correctly
- [ ] Sleep sessions are properly linked to children
- [ ] Predictions are created and linked to sleep contexts
- [ ] Cache hits work (same prediction returned for same sleep context)
- [ ] Cache invalidation works (new sleep data invalidates old predictions)
- [ ] Usage tracking records prediction serves
- [ ] Foreign key constraints prevent orphaned records
- [ ] Indexes improve query performance