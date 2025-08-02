# Firebase Integration Guide

## 🔥 Tích hợp Firebase hoàn chỉnh với Backend Next.js

Dự án đã được tích hợp toàn diện với Firebase, bao gồm cả frontend và backend:

### ✅ Các tính năng đã implement:

#### Frontend:
1. **Firebase Authentication**
   - Google Sign-in
   - Auto-refresh tokens
   - Secure API calls với Firebase ID tokens

2. **Firestore Database với Offline Support**
   - Multi-tab persistence (experimental)
   - Single-tab fallback
   - Real-time synchronization
   - Automatic retry mechanisms

3. **Network State Management**
   - Online/offline detection
   - Connection type detection
   - Slow connection handling

4. **Smart Data Sync Service**
   - Bidirectional sync (local ↔ cloud)
   - Conflict resolution
   - Pending changes tracking
   - Auto-sync when coming online

5. **IndexedDB Integration**
   - Local storage for offline use
   - User-specific data isolation
   - Efficient caching

#### Backend:
6. **Firebase Admin SDK**
   - Server-side Firebase integration
   - ID token verification
   - Secure database operations

7. **RESTful API Endpoints**
   - Authentication middleware
   - Request validation with Joi
   - Error handling và logging

8. **Data Sync APIs**
   - Sync user data to/from Firestore
   - Conflict resolution
   - Batch operations

9. **Generation Job System**
   - Async content generation
   - Job status tracking
   - Background processing

10. **Security & Performance**
    - CORS configuration
    - Rate limiting
    - Request logging
    - Security headers

### 📁 Files được thêm/cập nhật:

#### Frontend:
- `src/lib/firestore.ts` - Firestore service layer
- `src/lib/sync-service.ts` - Đồng bộ dữ liệu
- `src/hooks/use-network-state.ts` - Network state management
- `src/hooks/use-firebase-sync.ts` - Firebase sync hook
- `src/components/SyncStatus.tsx` - UI component hiển thị trạng thái sync
- `src/lib/firebase.ts` - Cập nhật với multi-tab persistence

#### Backend:
- `src/lib/firebase-admin.ts` - Firebase Admin SDK setup
- `src/lib/api-middleware.ts` - Authentication & utility middleware
- `src/lib/validation.ts` - Request validation schemas
- `src/lib/middleware.ts` - CORS, rate limiting, security
- `src/app/api/start-generation-job/route.ts` - Content generation API
- `src/app/api/sync/route.ts` - Data synchronization API
- `src/app/api/search-public-topics/route.ts` - Public topics search
- `src/app/api/clone-public-topic/route.ts` - Topic cloning API
- `src/app/api/job-status/route.ts` - Job status checking
- `src/services/api.ts` - Enhanced API client

### 🚀 Cách sử dụng:

#### 1. Setup Environment Variables:

```bash
# Copy và điền đầy đủ thông tin trong .env
cp .env.example .env

# Cần có:
# - Firebase Client config (đã có)
# - Firebase Admin SDK credentials
# - API URLs và security keys
```

#### 2. Install Dependencies:

```bash
npm install firebase-admin joi
```

#### 3. Sử dụng trong Components:

```tsx
import { useFirebaseSync } from '@/hooks/use-firebase-sync';
import * as api from '@/services/api';

function MyComponent() {
  const { saveData, getData, syncState, canSync } = useFirebaseSync();

  // Lưu dữ liệu (auto sync khi online)
  const handleSave = async () => {
    await saveData('topic', 'React Hooks');
  };

  // Đọc dữ liệu (local first, fallback to cloud)
  const handleLoad = async () => {
    const data = await getData('topic');
    console.log(data);
  };

  // Sử dụng API backend
  const handleGenerate = async () => {
    const job = await api.startGenerationJob({
      topic: 'React Hooks',
      language: 'Vietnamese',
      model: 'gemini-2.5-pro'
    });
    
    // Poll job status
    const status = await api.getJobStatus(job.data.jobId);
    console.log(status);
  };

  return (
    <div>
      <button onClick={handleSave}>Save Local</button>
      <button onClick={handleLoad}>Load Data</button>
      <button onClick={handleGenerate}>Generate Content</button>
      {syncState.isSyncing && <p>Đang đồng bộ...</p>}
    </div>
  );
}
```

#### 4. API Endpoints Available:

```typescript
// Content Generation
POST /api/start-generation-job
GET  /api/job-status?jobId=xxx

// Data Sync
GET  /api/sync          // Get user data
POST /api/sync          // Sync user data
PUT  /api/sync          // Batch sync

// Public Topics
POST /api/search-public-topics
POST /api/clone-public-topic

// User Management
GET  /api/user/profile
POST /api/user/profile
```

### 🔧 Configuration:

#### Firebase Admin SDK:
Có 2 cách cấu hình:

**Option 1: Service Account JSON (Production)**
```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

**Option 2: Individual Variables (Development)**
```env
FIREBASE_PRIVATE_KEY_ID="xxx"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="xxx@xxx.iam.gserviceaccount.com"
FIREBASE_CLIENT_ID="xxx"
```

### 📱 Backend Features:

#### 1. Authentication Middleware:
```typescript
// Require authentication
export const POST = withAuth(handler);

// Optional authentication
export const GET = withOptionalAuth(handler);
```

#### 2. Request Validation:
```typescript
const { error, value } = validateRequest(schema, requestBody);
if (error) return createErrorResponse(error, 400);
```

#### 3. Error Handling:
```typescript
// Consistent error responses
return createErrorResponse('Message', 400);
return createSuccessResponse(data);
```

#### 4. Rate Limiting:
```typescript
export const POST = withMiddleware(handler, {
  enableRateLimit: true,
  rateLimitOptions: { windowMs: 60000, maxRequests: 100 }
});
```

### � Security Features:

1. **JWT Token Verification** - Verify Firebase ID tokens
2. **CORS Configuration** - Secure cross-origin requests  
3. **Rate Limiting** - Prevent abuse
4. **Security Headers** - XSS protection, frame options
5. **Request Validation** - Validate all inputs
6. **Error Sanitization** - Don't leak sensitive info

### � Monitoring & Logging:

1. **Request Logging** - All API calls logged
2. **Error Tracking** - Detailed error logs
3. **Performance Metrics** - Response times tracked
4. **Job Status** - Background job monitoring

### 🐛 Troubleshooting:

- **Authentication failed:** Check Firebase Admin SDK setup
- **Rate limited:** Adjust rate limit settings or implement Redis
- **CORS errors:** Update ALLOWED_ORIGINS in .env
- **Job not found:** Verify user owns the job
- **Sync conflicts:** Implement conflict resolution UI

### 🔮 Backend Architecture:

```
Client Request → Middleware → Auth → Validation → Handler → Response
                    ↓
             [CORS, Rate Limit, Security Headers]
                    ↓
             [Firebase Token Verification]
                    ↓
             [Joi Schema Validation]
                    ↓
             [Business Logic + Firebase Admin]
                    ↓
             [Success/Error Response]
```

### 🚀 Next Steps:

1. **Setup Firebase Admin SDK** với service account
2. **Configure environment variables** đầy đủ
3. **Test API endpoints** với Postman/Thunder Client
4. **Implement frontend integration** với new APIs
5. **Add monitoring** với logging service
6. **Deploy** và test production setup

### 🐛 Troubleshooting:

- **Multi-tab persistence failed:** Browser không hỗ trợ, fallback về single-tab
- **Sync failed:** Check network connection và Firebase rules
- **Data not syncing:** Verify user authentication và permissions

### 🔮 Future Enhancements:

- [ ] Add offline indicators in UI
- [ ] Implement data conflict resolution UI
- [ ] Add selective sync (user choose what to sync)
- [ ] Add sync progress indicators
- [ ] Implement data export/import
- [ ] Add Firebase Analytics for usage tracking
