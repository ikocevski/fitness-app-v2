# Loading Freeze Prevention Checklist

## Critical Paths to Monitor

### 1. **App Startup (AuthContext)**

**Status:** ✅ FIXED (v1.0.1)

- Added 10-second timeout to `getCurrentUser()` in auth.ts
- Error handling prevents infinite hangs
- App shows login screen if Supabase is unreachable

**What it does:**

```
App → AuthContext.initializeAuth()
  → authService.getCurrentUser() [10s timeout]
  → if timeout/error: return null, show LoginScreen
  → if success: restore user session
```

**Testing:**

- Turn off WiFi/Airplane mode → app should show login within 10s
- Supabase service down → app shows login screen
- Normal connection → app loads session normally

### 2. **Supabase Connection**

**Risk:** Network timeout or service down
**Mitigation:**

- All Supabase calls wrapped in try-catch
- 10-second timeout on critical paths
- Graceful fallback to unauthenticated state

**Verify:**

```bash
# Check Supabase status
curl https://status.supabase.com/api/v2/components.json | jq '.components[] | {name, status}'
```

### 3. **Navigation/Screen Rendering**

**Risk:** Blocking operations in screens
**Checklist:**

- [ ] LoginScreen: no blocking operations on mount
- [ ] SignUpScreen: no blocking operations on mount
- [ ] SubscriptionScreen: IAP fetch is non-blocking
- [ ] CompleteSignupScreen: profile save is non-blocking
- [ ] AdminNavigator/ClientTabNavigator: initial nav setup is fast

### 4. **UserContext**

**Status:** ✅ SAFE

- Simple state holder, no async operations
- Non-blocking provider

### 5. **RootNavigator**

**Status:** ✅ SAFE

- Shows loading spinner while `AuthContext.loading === true`
- Timeout ensures loading spinner doesn't hang forever

---

## Fallback Behaviors

### No Network / Supabase Down

```
1. AuthContext timeout fires (10s)
2. getCurrentUser() returns null
3. loading = false
4. User sees LoginScreen
5. User can attempt login (will fail with network error)
```

### Slow Network

```
1. Request takes 5-9s (within timeout)
2. Response returns (success or error)
3. User sees appropriate screen
```

### Auth State Listener Hangs

```
1. onAuthStateChange listener can timeout (non-blocking)
2. App still boots with timeout from getCurrentUser()
3. Auth state may sync later when network recovers
```

---

## Monitoring & Alerts

### What to Watch For (TestFlight Feedback)

- [ ] User reports "Loading forever" or "Stuck on splash screen"
- [ ] Network conditions when they report it
- [ ] Device type / iOS version
- [ ] Time of day (check if Supabase had issues)

### How to Debug

1. **Check app logs:**

   ```bash
   xcrun simctl spawn booted log stream --predicate 'process == "CubeFit"' --level debug
   ```

2. **Test timeout manually:**
   - Turn off WiFi before launching app
   - App should show LoginScreen within 10s
   - Turn WiFi back on and try login

3. **Check Supabase status:**
   - Go to https://status.supabase.com/
   - Look for incidents during report timeframe

4. **Monitor production:**
   - Add error logging (Sentry, LogRocket, etc.)
   - Track "Auth initialization timeout" events
   - Alert if > 0.1% of sessions hit timeout

---

## Known Issues & Solutions

### Issue: Still seeing loading screen after 10s

**Possible causes:**

1. User has no network (intentional fallback behavior)
2. Supabase service down (check status.supabase.com)
3. Invalid credentials in .env (SUPABASE_URL / SUPABASE_ANON_KEY)
4. iOS is caching old code (try hard-refresh/reinstall)

**Solution:**

- Add verbose logging to `AuthContext.initializeAuth()`
- Push logging changes via hotfix
- Monitor real-world logs

### Issue: Users can't log in after timeout

**Expected behavior:** After timeout, LoginScreen is shown

- User can type email/password
- Login will work once network returns

**Verify:**

- LoginScreen appears and is responsive
- No keyboard/input issues
- Login button is tappable

---

## Future Improvements

### 1. Add Retry UI

```tsx
if (error && !user) {
  return (
    <View>
      <Text>Connection failed</Text>
      <Button onPress={() => initializeAuth()} title="Retry" />
    </View>
  );
}
```

### 2. Add Network Status Indicator

- Show badge if user is offline
- Disable login button if no network
- Show "Retrying..." if reconnecting

### 3. Implement Sentry/Error Tracking

```tsx
Sentry.captureException(error, {
  tags: { stage: "auth_init", timeout: true },
});
```

### 4. Cache Last Known User

```tsx
const lastUser = await AsyncStorage.getItem("lastUser");
if (lastUser && timeout) {
  setUser(JSON.parse(lastUser)); // Optimistic restore
}
```

---

## Version History

| Version | Fix                          | Status                        |
| ------- | ---------------------------- | ----------------------------- |
| 1.0.0   | Initial release              | Approved (had loading freeze) |
| 1.0.1   | 10s timeout + error handling | Submitted (pending approval)  |
| 1.0.2+  | TBD (additional resilience)  | TODO                          |

---

## Checklist for Future Releases

- [ ] No new async operations in `RootNavigator` or `AuthContext` on mount
- [ ] All Supabase calls have error handling
- [ ] All network calls have reasonable timeouts (5-15s)
- [ ] Loading states are always set to false in finally block
- [ ] No promises left unresolved in cleanup
- [ ] Test with network off before submitting
- [ ] Monitor first 24h of release for loading errors
