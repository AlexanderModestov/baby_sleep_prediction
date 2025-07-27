# How Prediction Caching Works

## 🔄 **Current Flow (After Integration)**

### **1. User Requests Prediction**
```
User clicks "Get Prediction" → Frontend calls /api/predict-sleep
```

### **2. API Checks Cache First**
```typescript
// If child has 3+ sleep sessions:
const cacheResult = await predictionCacheService.getPredictionFromCache(childId, sleepHistory, childAge)

if (cacheResult.prediction) {
  // ✅ CACHE HIT - Return existing prediction
  return cachedPrediction 
} else {
  // ❌ CACHE MISS - Generate new prediction
  const newPrediction = await predictNextSleep(...)
}
```

### **3. Cache Miss → Generate & Save**
```typescript
// Generate new prediction via LLM
const prediction = await predictNextSleep(childAge, sleepHistory, ...)

// Save to database for future use
await predictionCacheService.savePrediction(childId, sleepContext.id, prediction, metadata)

// Track usage
await predictionCacheService.trackPredictionUsage(predictionId, childId, { was_from_cache: false })
```

### **4. Cache Hit → Track & Return**
```typescript
// Increment usage count
await predictionCacheService.trackPredictionUsage(predictionId, childId, { was_from_cache: true })

// Return cached prediction (no LLM call needed!)
return existingPrediction
```

## 📊 **What You'll See in Supabase**

### **`sleep_contexts` Table**
- **Tracks sleep data contexts** that generated predictions
- **Example row:**
```json
{
  "id": "abc123",
  "child_id": "child-uuid", 
  "context_hash": "a1b2c3",
  "sessions_count": 5,
  "session_ids": "[\"session1\", \"session2\", ...]",
  "child_age_months": 6,
  "total_sleep_hours": 12.5
}
```

### **`predictions` Table**  
- **Stores actual predictions** linked to contexts
- **Example row:**
```json
{
  "id": "pred123",
  "child_id": "child-uuid",
  "sleep_context_id": "abc123",
  "next_bedtime": "2025-01-27T15:30:00Z",
  "summary": "Based on recent patterns...",
  "llm_provider": "openai",
  "is_active": true,
  "used_count": 3,
  "last_served_at": "2025-01-27T13:45:00Z"
}
```

### **`prediction_usage` Table**
- **Tracks every time a prediction is served**
- **Example rows:**
```json
[
  {
    "prediction_id": "pred123",
    "child_id": "child-uuid", 
    "was_from_cache": false,  // First generation
    "served_at": "2025-01-27T10:00:00Z"
  },
  {
    "prediction_id": "pred123",
    "child_id": "child-uuid",
    "was_from_cache": true,   // Cache hit
    "served_at": "2025-01-27T10:15:00Z"
  }
]
```

## 🎯 **When Caching Happens**

### **✅ Cache Used When:**
- Child has **3+ sleep sessions** (LLM predictions)
- `childId` is provided in the request
- Sleep context hasn't changed significantly

### **❌ Cache NOT Used When:**
- Child has **< 3 sleep sessions** (uses general recommendations)
- No `childId` provided (falls back to in-memory cache)
- New sleep session added (automatically invalidates old predictions)

## 🧪 **How to Test It**

### **1. First Prediction (Cache Miss)**
1. Add 3+ sleep sessions for a child
2. Request prediction
3. Check logs: Should see "=== SAVING TO DATABASE CACHE ==="
4. Check Supabase: New entries in `sleep_contexts`, `predictions`, `prediction_usage`

### **2. Second Prediction (Cache Hit)**
1. Request prediction again with same sleep data
2. Check logs: Should see "=== RETURNING CACHED DATABASE PREDICTION ==="
3. Check Supabase: `used_count` incremented, new `prediction_usage` entry

### **3. Cache Invalidation**
1. Add a new sleep session
2. Request prediction
3. Check Supabase: Old prediction `is_active` becomes `false`, new prediction created

## 📈 **Benefits You Get**

### **Performance**
- **Faster responses** - No LLM call needed for repeated requests
- **Cost savings** - Fewer API calls to OpenAI/Gemini/Claude
- **Consistent predictions** - Same result until sleep context changes

### **Analytics** 
- **Usage tracking** - See how often predictions are reused
- **Cache hit rates** - Monitor performance effectiveness
- **Provider analytics** - Track which LLM models perform best

### **Reliability**
- **Automatic invalidation** - Old predictions become inactive when new sleep data added
- **Graceful fallback** - Falls back to in-memory cache if database issues
- **Database persistence** - Survives server restarts

## 🔍 **Monitoring Queries**

### **Check Cache Performance:**
```sql
SELECT 
  c.name as child_name,
  COUNT(p.id) as total_predictions,
  COUNT(CASE WHEN p.is_active THEN 1 END) as active_predictions,
  AVG(p.used_count) as avg_reuse_count,
  COUNT(pu.id) as total_usage_events,
  ROUND(100.0 * COUNT(CASE WHEN pu.was_from_cache THEN 1 END) / COUNT(pu.id), 2) as cache_hit_rate
FROM children c
LEFT JOIN predictions p ON c.id = p.child_id  
LEFT JOIN prediction_usage pu ON p.id = pu.prediction_id
GROUP BY c.id, c.name;
```

### **Recent Predictions:**
```sql
SELECT 
  c.name,
  p.llm_provider,
  p.used_count,
  p.created_at,
  p.is_active
FROM predictions p
JOIN children c ON p.child_id = c.id  
ORDER BY p.created_at DESC
LIMIT 10;
```

The caching system is now fully integrated and will start saving predictions to your database once you make prediction requests with 3+ sleep sessions!