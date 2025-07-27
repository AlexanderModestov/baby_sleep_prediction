# Future Time Validation Test Plan

## What was implemented:

### ✅ Database Level Validation
- **Constraint**: `check_start_time_not_future` - prevents `start_time > NOW()`
- **Constraint**: `check_end_time_not_future` - prevents `end_time > NOW()`
- **Location**: `supabase/schema.sql` lines 284-289

### ✅ Frontend Level Validation 
- **JavaScript validation**: Checks if start time is in the future before submission
- **HTML5 validation**: `max` attribute on datetime-local input prevents future date selection
- **User feedback**: Shows error message "Start time cannot be in the future"
- **Location**: `src/components/SleepTracker.tsx` lines 112-119, 381

## Test Cases:

### 1. Test Frontend Validation
1. Open the sleep tracker
2. Try to select a future date/time in the "Start Sleep Session" field
3. **Expected**: Date picker should not allow selecting future dates
4. If you manually type a future date, clicking "Save Sleep Session" should show error

### 2. Test Database Validation  
1. Try to insert a future start_time directly via SQL:
```sql
INSERT INTO sleep_sessions (child_id, start_time, session_type)
VALUES ('some-child-uuid', NOW() + INTERVAL '1 hour', 'nap');
```
2. **Expected**: Database should reject with constraint violation

### 3. Test End Time Validation
1. Start a sleep session normally
2. When ending, try to set end time in the future
3. **Expected**: Should show "End time cannot be in the future"

## How to test:

### Frontend Test:
1. `npm run dev`
2. Open application in browser
3. Go to sleep tracker
4. Try to select tomorrow's date
5. Verify error message appears

### Database Test:
1. Connect to your database
2. Run the SQL above with a valid child_id
3. Should get error like: `new row violates check constraint "check_start_time_not_future"`

## Error Messages:
- **Frontend**: "Start time cannot be in the future"  
- **Database**: `check constraint "check_start_time_not_future" violated`

## Files Modified:
- ✅ `supabase/schema.sql` - Added database constraints
- ✅ `supabase/migrations/add_future_time_validation.sql` - Migration file
- ✅ `src/components/SleepTracker.tsx` - Added frontend validation