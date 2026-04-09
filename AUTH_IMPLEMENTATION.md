# Fitness App - Authentication Implementation

## Overview

This fitness app includes a complete authentication system powered by Supabase with login and sign-up pages. The implementation is production-ready and includes proper error handling, validation, and security features.

## Architecture

### Components

#### 1. **LoginScreen** (`src/screens/auth/LoginScreen.tsx`)

- Email and password input fields
- Password visibility toggle
- Form validation with helpful error messages
- Loading state during authentication
- Link to sign up page
- Forgot password placeholder
- Demo credentials display

#### 2. **SignUpScreen** (`src/screens/auth/SignUpScreen.tsx`)

- Full name, email, password inputs
- Password confirmation field
- Password requirements display
- Terms of service checkbox
- Form validation
- Loading state during registration
- Link to login page
- Back navigation

#### 3. **AuthContext** (`src/context/AuthContext.tsx`)

- Manages global authentication state
- Provides login, logout, and sign up functions
- Handles session persistence
- Listens for auth state changes
- Provides loading indicator support
- Exports `useAuth()` hook for easy access

#### 4. **Auth Service** (`src/services/auth.ts`)

- `login()` - Authenticate with email and password
- `signUp()` - Register new user
- `logout()` - Sign out user
- `getCurrentUser()` - Fetch current user profile
- `resetPassword()` - Send password reset email

#### 5. **Supabase Config** (`src/config/supabase.ts`)

- Initializes Supabase client
- Configures AsyncStorage for session persistence
- Sets up auto-refresh for tokens

### Navigation Flow

```
App
├── AuthProvider (AuthContext)
│   └── RootNavigator
│       ├── Authentication (if not logged in)
│       │   ├── LoginScreen
│       │   └── SignUpScreen
│       └── Authenticated (if logged in)
│           ├── AdminNavigator (if admin)
│           └── ClientNavigator (if client)
```

## Database Schema

### Users Table

```sql
users (
  id: uuid (primary key, references auth.users),
  email: text (unique),
  name: text,
  role: text (enum: 'client' | 'admin'),
  created_at: timestamp,
  updated_at: timestamp
)
```

**Row Level Security Policies:**

- Users can only read their own data
- Users can only update their own data
- New users can only insert their own data

## Usage

### Using the `useAuth()` Hook

```typescript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { user, loading, login, signUp, logout } = useAuth();

  // Handle login
  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password123');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Check if user is authenticated
  if (user) {
    return <Text>Welcome, {user.name}!</Text>;
  }

  return <Text>Please login</Text>;
};
```

### Accessing User Data

```typescript
const { user } = useAuth();

console.log(user?.id); // User ID
console.log(user?.email); // User email
console.log(user?.name); // User name
console.log(user?.role); // 'client' or 'admin'
```

## Features

### ✅ Security Features

- **Password Hashing:** Supabase handles bcrypt password hashing
- **JWT Tokens:** Secure token-based authentication
- **Row Level Security:** Database-level access control
- **Session Persistence:** Sessions stored securely in AsyncStorage
- **Auto Token Refresh:** Automatic token refresh on expiry
- **HTTPS Only:** All communication is encrypted

### ✅ User Experience Features

- **Loading States:** Visual feedback during authentication
- **Error Handling:** Clear error messages for failures
- **Form Validation:** Client-side validation with helpful messages
- **Password Confirmation:** Ensures users set correct passwords
- **Auto-navigation:** Automatic redirect based on auth state
- **Smooth Transitions:** Animated screen transitions

### ✅ Validation Rules

**Login:**

- Email must be valid format
- Password required

**Sign Up:**

- Name minimum 2 characters
- Email must be valid format
- Password minimum 8 characters
- Passwords must match
- Must agree to terms

## Environment Setup

### 1. Copy Environment Template

```bash
cp .env.local.example .env.local
```

### 2. Add Supabase Credentials

```
EXPO_PUBLIC_SUPABASE_URL=your_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

### 3. Create Database Tables

Run the SQL schema from `SUPABASE_SETUP.md` in your Supabase dashboard.

### 4. Install Dependencies

```bash
npm install
# or
yarn install
```

### 5. Run the App

```bash
npm start
# or
yarn start
```

## File Structure

```
src/
├── config/
│   └── supabase.ts              # Supabase client configuration
├── context/
│   └── AuthContext.tsx          # Auth state management
├── screens/
│   └── auth/
│       ├── LoginScreen.tsx      # Login page
│       └── SignUpScreen.tsx     # Sign up page
├── services/
│   └── auth.ts                  # Auth API calls
├── types/
│   └── index.ts                 # TypeScript types
└── navigation/
    └── RootNavigator.tsx        # Auth-aware navigation
```

## API Reference

### `useAuth()` Hook

Returns an object with:

```typescript
interface AuthContextType {
  user: User | null; // Current user or null
  loading: boolean; // Loading state
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
}
```

### `login(email, password)`

Authenticates a user with email and password.

```typescript
await login("user@example.com", "password123");
```

### `signUp(email, password, name)`

Registers a new user account.

```typescript
await signUp("newuser@example.com", "password123", "John Doe");
```

### `logout()`

Signs out the current user and clears session.

```typescript
await logout();
```

### `resetPassword(email)`

Sends a password reset email to the user.

```typescript
const success = await resetPassword("user@example.com");
```

## Error Handling

The authentication system handles various error scenarios:

### Common Errors

| Error                 | Cause                              | Solution                  |
| --------------------- | ---------------------------------- | ------------------------- |
| "Invalid credentials" | Wrong email or password            | Check credentials         |
| "User already exists" | Email already registered           | Use different email       |
| "Invalid email"       | Email format invalid               | Check email format        |
| "Password too weak"   | Password doesn't meet requirements | Use stronger password     |
| "Network error"       | Connection issue                   | Check internet connection |

## Testing

### Test Accounts

Create test accounts using the Sign Up screen.

### Demo Credentials

The login screen displays demo credentials:

- Email: `demo@example.com`
- Password: `demo123456`

### Manual Testing

1. **Login Flow:**
   - Navigate to Login screen
   - Enter valid credentials
   - Should navigate to home screen

2. **Sign Up Flow:**
   - Navigate to Sign Up screen
   - Fill all fields
   - Should navigate to home screen

3. **Session Persistence:**
   - Login to app
   - Close and restart app
   - Should still be logged in

4. **Logout:**
   - Login to app
   - Navigate to profile settings
   - Click logout
   - Should redirect to login screen

## Customization

### Styling

Modify the StyleSheet in the screen components to match your brand:

```typescript
const styles = StyleSheet.create({
  loginButton: {
    backgroundColor: "#007AFF", // Change button color
    // ... other styles
  },
});
```

### User Roles

The app supports different user roles:

```typescript
type UserRole = "client" | "admin";
```

To add more roles, update:

1. Database schema
2. User type definition
3. Navigation logic in RootNavigator

### Additional Fields

To add more user profile fields:

1. Update the `users` table in Supabase
2. Update the `User` interface in `src/types/index.ts`
3. Update signup form in `SignUpScreen.tsx`

## Troubleshooting

### Session Not Persisting

```typescript
// Check if AsyncStorage is properly configured
import AsyncStorage from "@react-native-async-storage/async-storage";

// Verify it's passed to Supabase client
const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage, // Must be present
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

### Login Always Fails

1. Verify Supabase credentials in `.env.local`
2. Check user exists in Supabase Auth dashboard
3. Ensure password is correct
4. Check network connectivity

### User Profile Not Created

1. Verify `users` table exists
2. Check RLS policies are correct
3. Verify trigger function is created
4. Check Supabase logs for errors

## Performance Considerations

- **Session Caching:** User sessions are cached in AsyncStorage for faster app startup
- **Lazy Loading:** Auth state is initialized asynchronously
- **Minimal Re-renders:** Context only updates when auth state changes

## Future Enhancements

- [ ] Email verification on signup
- [ ] Multi-factor authentication
- [ ] Social authentication (Google, Apple, Facebook)
- [ ] Biometric login (fingerprint, face recognition)
- [ ] Password strength meter
- [ ] Account recovery options
- [ ] Session management (logout other devices)
- [ ] Rate limiting on login attempts

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review Supabase documentation: https://supabase.com/docs
3. Check the app logs in the terminal
4. Verify environment variables are set correctly

## License

MIT
