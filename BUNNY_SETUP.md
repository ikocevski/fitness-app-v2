# Bunny.net Video Hosting Setup Guide

## Overview

This app now uses Bunny Stream for video hosting instead of Supabase Storage to reduce costs. Bunny Stream provides:

- **CDN-powered video delivery** (faster worldwide)
- **Automatic transcoding** (multiple quality levels)
- **Cost-effective pricing** ($10/month base + $0.005/GB storage + $0.01/GB bandwidth)

## Step 1: Create Bunny.net Account

1. Go to [bunny.net](https://bunny.net)
2. Click "Sign Up" and create your account
3. Verify your email address
4. Log in to the Bunny dashboard

## Step 2: Create a Video Library

1. In the Bunny dashboard, navigate to **Stream** > **Video Libraries**
2. Click **"Add Video Library"**
3. Configure your library:
   - **Name**: `fitness-app-videos` (or any name you prefer)
   - **Replication Regions**: Select regions closest to your users (e.g., North America, Europe)
   - **Player Options**:
     - Enable "Custom HTML Player" if you want full control
     - Enable "Direct Play" for mobile apps ✅ (REQUIRED for React Native)
   - **Security**:
     - For now, leave security token authentication disabled during development
     - You can enable it later for production to prevent unauthorized access
4. Click **"Add Video Library"**
5. **Important**: Copy your **Library ID** - you'll need this in Step 4

## Step 3: Get Your API Key

1. In the Bunny dashboard, click your **account name** (top right)
2. Go to **"Account Settings"** > **"API"**
3. Under **"Access Keys"**, find your **API Key**
4. Click **"Copy"** to copy your API key
5. **Important**: Keep this key secure - never commit it to git or share it publicly

## Step 4: Configure Environment Variables

1. In your project root, create a file named `.env.local` (if it doesn't exist):

```bash
# Bunny Stream Configuration
EXPO_PUBLIC_BUNNY_LIBRARY_ID=your-library-id-here
EXPO_PUBLIC_BUNNY_API_KEY=your-api-key-here
```

2. Replace the placeholder values:
   - `your-library-id-here` → The Library ID from Step 2
   - `your-api-key-here` → The API Key from Step 3

Example:

```bash
EXPO_PUBLIC_BUNNY_LIBRARY_ID=123456
EXPO_PUBLIC_BUNNY_API_KEY=abcd1234-efgh-5678-ijkl-9012mnop3456
```

3. **Important**: Make sure `.env.local` is in your `.gitignore` file:

```bash
# Add to .gitignore if not already there
.env.local
.env*.local
```

## Step 5: Install Dependencies (Already Done)

The required package `expo-av` has already been installed. If you need to reinstall:

```bash
npx expo install expo-av
```

## Step 6: Restart Development Server

After adding environment variables, restart your Expo development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npx expo start --clear
```

## Step 7: Test the Video Upload Flow

### For Coaches (Admin):

1. Log in as a coach account
2. Navigate to **Manage Workouts** screen
3. Create a new workout or edit an existing one
4. Add an exercise with a video:
   - Tap **"Pick Video"**
   - Select a video from your device
   - Wait for upload (you'll see "Uploading Video..." alert)
   - Success alert will confirm upload
5. Save the exercise
6. The video URL will be saved to the database

### For Clients:

1. Log in as a client account (who is assigned the workout)
2. Navigate to **Workouts** tab
3. Find the workout with the video exercise
4. You should see the video player embedded in the exercise card
5. Tap to play the video demonstration

## Cost Monitoring

### Track Your Usage:

1. In Bunny dashboard, go to **Stream** > **Video Libraries**
2. Click on your library name
3. View **Storage** and **Bandwidth** usage
4. Monitor costs in **Billing** > **Usage Statistics**

### Expected Costs (Example):

- **Base**: $10/month for the Video Library
- **Storage**: 100 videos × 50MB avg = 5GB × $0.005 = $0.025/month
- **Bandwidth**: 1,000 views × 50MB avg = 50GB × $0.01 = $0.50/month
- **Total**: ~$10.53/month for moderate usage

## Troubleshooting

### "Cannot read BUNNY_LIBRARY_ID" Error

**Solution**: Make sure `.env.local` exists and has correct variable names with `EXPO_PUBLIC_` prefix. Restart Expo server.

### Video Upload Fails

**Solution**:

1. Check your API key is correct in `.env.local`
2. Verify Library ID matches your Bunny dashboard
3. Ensure "Direct Play" is enabled in library settings
4. Check Bunny dashboard for API rate limits

### Video Player Shows Loading Forever

**Solution**:

1. Check the video URL in database is a valid Bunny CDN URL (`iframe.mediadelivery.net`)
2. Verify video encoding completed in Bunny dashboard (Stream > Videos)
3. Check library's security settings aren't blocking playback

### Video Quality is Poor

**Solution**:

1. Bunny automatically transcodes videos - wait a few minutes after upload
2. Check original video quality before upload
3. In Bunny dashboard, verify transcoding profiles include HD options

## Production Deployment

When deploying to production:

1. **Use EAS Secrets** for environment variables:

```bash
# Install EAS CLI if not already
npm install -g eas-cli

# Set production secrets
eas secret:create --scope project --name EXPO_PUBLIC_BUNNY_LIBRARY_ID --value your-library-id
eas secret:create --scope project --name EXPO_PUBLIC_BUNNY_API_KEY --value your-api-key
```

2. **Enable Security Token Authentication**:
   - In Bunny dashboard, go to your Video Library settings
   - Enable "Security Token Authentication"
   - Update `bunnyStream.ts` to include token generation

3. **Configure CORS** (if needed):
   - In Bunny dashboard, go to Video Library > Security
   - Add allowed domains for web version

## Additional Resources

- [Bunny Stream Documentation](https://docs.bunny.net/docs/stream)
- [Bunny Stream API Reference](https://docs.bunny.net/reference/video_libraryid)
- [Pricing Calculator](https://bunny.net/pricing/)
- [Support](https://support.bunny.net/)

## Summary

✅ **What's Implemented:**

- Admin video upload to Bunny Stream
- Client video playback with native controls
- Automatic video URL storage in database
- Progress tracking during upload

✅ **Benefits:**

- Reduced storage costs vs Supabase
- Better video delivery performance
- Automatic transcoding for multiple qualities
- Global CDN distribution

✅ **Next Steps:**

1. Create Bunny account
2. Create Video Library
3. Add credentials to `.env.local`
4. Restart Expo server
5. Test upload and playback
