# Multi-Device Login & Session Management

## Overview

Your BETNEXA platform now supports **unlimited concurrent logins** from different devices. Users can:
- Login on phone, tablet, and desktop simultaneously
- Manage all active devices
- Logout from specific devices
- Logout from all devices at once

## How It Works

### Architecture

```
User Login
    ↓
Phone Number + Password Validation
    ↓
Create Session Token
    ↓
Store in Supabase Sessions Table
    ↓
Save Session ID, Device Info & User Agent Locally
    ↓
User Logged In (Device-specific)
```

### Session Storage

**Supabase `sessions` Table:**
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token TEXT UNIQUE,
  expires_at TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP,
  last_activity_at TIMESTAMP
);
```

**Local Storage (Current Device Only):**
```json
{
  "sessionId": "uuid-token",
  "userId": "user-uuid",
  "deviceName": "iPhone",
  "userAgent": "Mozilla/5.0...",
  "expiresAt": "2025-02-21T10:30:00Z",
  "createdAt": "2024-12-20T10:30:00Z"
}
```

---

## Using Session Management

### 1. Create Session (Login)

```typescript
import { sessionService } from '@/services/sessionService';

// After user password verification
const session = await sessionService.createSession(userId, 'My iPhone');

if (session) {
  console.log('Session created:', session.sessionId);
  // User is now logged in on this device
}
```

### 2. Get Current Session

```typescript
const currentSession = sessionService.getCurrentSession();

if (!currentSession) {
  // User not logged in on this device
  // Redirect to login
}
```

### 3. Get All User Sessions

```typescript
const allSessions = await sessionService.getUserSessions(userId);

console.log(`User has ${allSessions.length} active sessions:`);
allSessions.forEach(session => {
  console.log(`- ${session.deviceName} (${session.createdAt})`);
});
```

### 4. Logout from One Device

```typescript
// Logout only from current device
await sessionService.revokeSession(currentSessionId);
```

### 5. Logout from All Devices

```typescript
// Logout from all devices including current one
await sessionService.revokeAllSessions(userId);
```

---

## Implementation in Components

### Login Component Example

```typescript
import { sessionService } from '@/services/sessionService';

async function handleLogin(phone: string, password: string) {
  // Verify credentials with Supabase
  const user = await loginWithSupabase(phone, password);
  
  if (user) {
    // Create session for this device
    const session = await sessionService.createSession(
      user.id,
      'Web Browser'
    );
    
    if (session) {
      // Store user in context
      login(user);
      // Redirect to dashboard
      navigate('/dashboard');
    }
  }
}
```

### Session Manager Component

```typescript
import { useEffect, useState } from 'react';
import { sessionService } from '@/services/sessionService';

export function SessionManager({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    loadSessions();
  }, [userId]);

  async function loadSessions() {
    const activeSessions = await sessionService.getUserSessions(userId);
    setSessions(activeSession);
  }

  async function logoutDevice(sessionId: string) {
    await sessionService.revokeSession(sessionId);
    await loadSessions(); // Refresh list
  }

  async function logoutEverywhere() {
    const confirmed = confirm(
      'This will logout from all devices. Continue?'
    );
    if (confirmed) {
      await sessionService.revokeAllSessions(userId);
      // Redirect to login
    }
  }

  return (
    <div>
      <h3>Active Sessions</h3>
      {sessions.map(session => (
        <div key={session.sessionId}>
          <p>{session.deviceName}</p>
          <p>Logged in: {session.createdAt.toLocaleString()}</p>
          <button onClick={() => logoutDevice(session.sessionId)}>
            Logout
          </button>
        </div>
      ))}
      <button onClick={logoutEverywhere}>
        Logout From All Devices
      </button>
    </div>
  );
}
```

---

## Session Lifecycle

### Creation
- User enters phone + password
- Password verified against Supabase
- New session created with 30-day expiration
- Session ID stored locally on device

### Activity
- Session timestamp updated on each action
- Can be tracked for idle timeout (optional)
- Activity visible in session manager

### Expiration
- Sessions expire after 30 days automatically
- Expired sessions removed from Supabase
- Cannot be used for authentication

### Revocation
- User can logout manually
- Admin can revoke sessions
- Logout from device or all devices
- Session immediately removed

---

## Security Features

✅ **Unique Session Tokens** - Each device gets unique UUID  
✅ **User Agent Tracking** - Detect device type  
✅ **Activity Timestamps** - Track last login  
✅ **Automatic Expiration** - 30-day sessions  
✅ **Selective Logout** - Remove specific device  
✅ **Database-Backed** - Persisted in Supabase  
✅ **Local Isolation** - Each device independent  

---

## Configuration

### Adjust Session Duration

Edit `src/services/sessionService.ts`:
```typescript
private readonly SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
```

Change to:
```typescript
private readonly SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
```

### Custom Device Names

```typescript
// Auto-detected by user agent
const session = await sessionService.createSession(userId);

// Or custom name
const session = await sessionService.createSession(
  userId,
  'John\'s iPhone 14'
);
```

---

## Database Queries

### Get All Active Sessions for User

```sql
SELECT * FROM sessions 
WHERE user_id = '${userId}' 
AND expires_at > NOW()
ORDER BY created_at DESC;
```

### Get User's Device List

```sql
SELECT 
  token,
  created_at as login_time,
  last_activity_at,
  user_agent,
  expires_at
FROM sessions
WHERE user_id = '${userId}'
ORDER BY created_at DESC;
```

### Cleanup Expired Sessions

```sql
DELETE FROM sessions
WHERE expires_at < NOW();
```

---

## Testing Multi-Device Login

1. **Login on Device 1:**
   - Open app in browser
   - Click Sign Up
   - Create account
   - Login

2. **Login on Device 2:**
   - Open app in different browser/device
   - Login with same phone number
   - Both should be logged in

3. **Verify Sessions:**
   - Go to Profile → Active Sessions
   - Should see 2 devices
   - Each device has separate session

4. **Logout from Device 1:**
   - Click logout on Device 1
   - Check Device 2 - still logged in

5. **Logout from All:**
   - On Device 2, select "Logout from all devices"
   - Both Device 1 & 2 now logged out

---

## Troubleshooting

### Sessions Not Saving?
- Check Supabase `sessions` table exists
- Verify VITE_SUPABASE keys in `.env.local`
- Check browser console for errors

### Can't See Other Sessions?
- Refresh page
- Check you're using same user account
- Verify sessions are not expired

### Session Expired Immediately?
- Check system clock is correct
- Verify SESSION_DURATION config
- Check Supabase timezone settings

---

## Next Steps

1. Deploy database schema (includes sessions table)
2. Import `sessionService` in Login component
3. Call `sessionService.createSession()` after login
4. Test login from 2 different devices
5. Verify both sessions appear in Profile

Your multi-device login is ready! 🚀
