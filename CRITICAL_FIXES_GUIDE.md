# CRITICAL FIXES - Implementation Guide

This file contains exact fixes for the 2 critical and 5 high-priority issues that must be resolved before deploying with Bunny.net.

---

## FIX #1: Video Upload Error Handling (CRITICAL)

**File:** `src/screens/admin/ManageWorkoutsScreen.tsx`

**Find and replace the `uploadVideoIfNeeded` function (around line 230-280):**

```tsx
// OLD CODE (PROBLEMATIC)
const uploadVideoIfNeeded = async (
  uri: string | null,
  exerciseName?: string,
) => {
  console.log(`Upload progress: ${progress}%`);
  // Missing error handling
};

// NEW CODE (FIXED)
const uploadVideoIfNeeded = async (
  uri: string | null,
  exerciseName?: string,
): Promise<string | null> => {
  if (!uri) {
    console.log("[uploadVideo] No video URI provided");
    return null;
  }

  try {
    console.log("[uploadVideo] Creating video object in Bunny...");
    const videoMeta = await bunnyStream.createVideo(
      exerciseName || "Workout Exercise Video",
    );

    if (!videoMeta) {
      console.error("[uploadVideo] Failed to create video metadata");
      Alert.alert(
        "Upload Error",
        "Failed to initialize video upload. Please try again.",
      );
      return null;
    }

    console.log("[uploadVideo] Video created with GUID:", videoMeta.guid);
    console.log("[uploadVideo] Starting file upload...");

    const uploadSuccess = await bunnyStream.uploadVideoFile(
      videoMeta.guid,
      uri,
      exerciseName || "video",
    );

    if (!uploadSuccess) {
      console.error("[uploadVideo] File upload failed");
      Alert.alert(
        "Upload Failed",
        "Could not upload video to Bunny. Please try again with a different video or check your internet connection.",
      );
      return null;
    }

    console.log("[uploadVideo] Upload successful!");

    // Return formatted embed URL
    const embedUrl = `https://iframe.mediadelivery.net/embed/${videoMeta.videoLibraryId}/${videoMeta.guid}`;
    console.log("[uploadVideo] Returning embed URL:", embedUrl);
    return embedUrl;
  } catch (error) {
    console.error("[uploadVideo] Unexpected error:", error);
    Alert.alert(
      "Upload Error",
      `An unexpected error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return null;
  }
};
```

**Also update the `saveExercise` function to check for video upload success:**

Find where exercise is saved (search for `await supabase.from("workout_exercises")`):

```tsx
// OLD CODE (saves even if video upload failed)
const saveExercise = async () => {
  let videoUrl = null;
  if (exerciseVideo) {
    videoUrl = await uploadVideoIfNeeded(exerciseVideo, exerciseForm.name);
    // PROBLEM: If videoUrl is null, still saves exercise without video
  }

  const { error } = await supabase.from("workout_exercises").insert([
    {
      day_id: selectedDay?.id,
      name: exerciseForm.name,
      video_url: videoUrl, // Could be null
      // ...
    },
  ]);
};

// NEW CODE (prevents saving without valid video if one was selected)
const saveExercise = async () => {
  try {
    // Validate exercise fields
    if (!exerciseForm.name?.trim()) {
      Alert.alert("Error", "Exercise name is required");
      return;
    }

    let videoUrl = null;

    // If user selected a video, upload it and require success
    if (exerciseVideo) {
      console.log("[saveExercise] Uploading video...");
      videoUrl = await uploadVideoIfNeeded(exerciseVideo, exerciseForm.name);

      // CRITICAL: If upload failed, don't save exercise
      if (!videoUrl) {
        console.error(
          "[saveExercise] Video upload failed, not saving exercise",
        );
        return;
      }

      console.log("[saveExercise] Video uploaded, saving exercise");
    }

    // Insert exercise
    const { data: inserted, error } = await supabase
      .from("workout_exercises")
      .insert([
        {
          day_id: selectedDay?.id,
          name: exerciseForm.name,
          sets: exerciseForm.sets ? parseInt(exerciseForm.sets) : null,
          reps: exerciseForm.reps ? parseInt(exerciseForm.reps) : null,
          directions: exerciseForm.directions || null,
          video_url: videoUrl,
        },
      ])
      .select();

    if (error) throw error;

    console.log("[saveExercise] Exercise saved successfully");

    // Reset form
    setExerciseForm({ name: "", sets: "", reps: "", directions: "" });
    setExerciseVideo(null);
    setShowExerciseModal(false);

    // Refresh plans
    await fetchPlans();

    Alert.alert("Success", "Exercise added successfully");
  } catch (error) {
    console.error("[saveExercise] Save failed:", error);
    Alert.alert(
      "Error",
      `Failed to save exercise: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
```

---

## FIX #2: Role Validation on Admin Screens (CRITICAL)

**Add this hook to ALL admin screens:**

Admin screens to update:

1. `src/screens/admin/ManageClientsScreen.tsx`
2. `src/screens/admin/ManageWorkoutsScreen.tsx`
3. `src/screens/admin/ManageDietsScreen.tsx`
4. `src/screens/admin/DashboardScreen.tsx`
5. `src/screens/admin/AnalyticsScreen.tsx`
6. `src/screens/admin/SubscriptionManagementScreen.tsx`
7. `src/screens/admin/UsersScreen.tsx`

**For each admin screen, add this code after the component definition:**

```tsx
// At the top of component, after useAuth() hook
const { user, logout } = useAuth();

// Add this useEffect right after other useEffect hooks
useEffect(() => {
  if (user && user.role !== "admin") {
    console.warn(
      `[${SCREEN_NAME}] Unauthorized access attempt. User role: ${user.role}`,
    );
    Alert.alert(
      "Unauthorized",
      "You don't have permission to access this page.",
      [
        {
          text: "Go Back",
          onPress: () => {
            navigation.goBack();
          },
        },
      ],
    );
  }
}, [user?.role, navigation]);
```

**Example for ManageClientsScreen:**

```tsx
const ManageClientsScreen = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  // ... rest of state

  // ADD THIS - Permission check
  useEffect(() => {
    if (user && user.role !== "admin") {
      console.warn(
        "[ManageClientsScreen] Unauthorized access attempt. User role:",
        user.role,
      );
      Alert.alert(
        "Unauthorized",
        "You don't have permission to access this page.",
        [
          {
            text: "Go Back",
            onPress: () => {
              navigation.goBack();
            },
          },
        ],
      );
    }
  }, [user?.role, navigation]);

  // Rest of component...
};
```

---

## FIX #3: Diet Plans RLS Policies (HIGH)

**File:** `supabase_migrations/fix_access_policies.sql`

**Add this section to the file (or run directly in Supabase SQL Editor):**

```sql
-- ==========================
-- DIET PLANS RLS POLICIES
-- ==========================

ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "diet_plans_select" ON diet_plans;
DROP POLICY IF EXISTS "diet_plans_insert" ON diet_plans;
DROP POLICY IF EXISTS "diet_plans_update" ON diet_plans;
DROP POLICY IF EXISTS "diet_plans_delete" ON diet_plans;

-- Policy: Users can see diet plans assigned to them (clients)
CREATE POLICY "diet_plans_select_as_client"
ON diet_plans
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Coaches can see plans they created
CREATE POLICY "diet_plans_select_as_coach"
ON diet_plans
FOR SELECT
USING (auth.uid() = created_by);

-- Policy: Only coaches can create diet plans
CREATE POLICY "diet_plans_insert"
ON diet_plans
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Policy: Only coaches can update plans they created
CREATE POLICY "diet_plans_update"
ON diet_plans
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Policy: Only coaches can delete plans they created
CREATE POLICY "diet_plans_delete"
ON diet_plans
FOR DELETE
USING (auth.uid() = created_by);

-- ==========================
-- DIET MEALS RLS POLICIES
-- ==========================

ALTER TABLE diet_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diet_meals_select" ON diet_meals;
DROP POLICY IF EXISTS "diet_meals_insert" ON diet_meals;
DROP POLICY IF EXISTS "diet_meals_update" ON diet_meals;

-- Coaches can create and modify their own meals
CREATE POLICY "diet_meals_insert"
ON diet_meals
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "diet_meals_update"
ON diet_meals
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Clients can see meals from their assigned plans (via diet_plans view)
CREATE POLICY "diet_meals_select"
ON diet_meals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id IN (
      SELECT diet_plan_id FROM diet_plan_meals dpm
      WHERE dpm.diet_meal_id = diet_meals.id
    )
    AND (dp.user_id = auth.uid() OR dp.created_by = auth.uid())
  )
);

-- ==========================
-- DIET PLAN MEALS RLS POLICIES
-- ==========================

ALTER TABLE diet_plan_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diet_plan_meals_select" ON diet_plan_meals;
DROP POLICY IF EXISTS "diet_plan_meals_manage" ON diet_plan_meals;

CREATE POLICY "diet_plan_meals_select"
ON diet_plan_meals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_meals.diet_plan_id
    AND (dp.user_id = auth.uid() OR dp.created_by = auth.uid())
  )
);

CREATE POLICY "diet_plan_meals_manage"
ON diet_plan_meals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_meals.diet_plan_id
    AND dp.created_by = auth.uid()
  )
);
```

**Test the policies:**

```sql
-- Run as coach:
SELECT * FROM diet_plans;  -- Should see only plans they created

-- Run as client:
SELECT * FROM diet_plans;  -- Should see only plans assigned to them
```

---

## FIX #4: Standardize Video URL Format (HIGH)

**File:** `src/services/bunnyStream.ts`

**Update the return statements to always return embed URLs:**

```typescript
// OLD: Returns mixed formats
export const getVideo = async (videoId: string): Promise<BunnyVideo | null> => {
  // ... fetch code ...
  return {
    guid: data.guid,
    playUrl: data.playUrl, // Could be different format
  };
};

// NEW: Always return embed URL format
export const getVideo = async (
  videoId: string,
): Promise<{ guid: string; embedUrl: string } | null> => {
  try {
    const response = await fetch(
      `${BUNNY_STREAM_API}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: "GET",
        headers: {
          AccessKey: BUNNY_API_KEY,
        },
      },
    );

    if (!response.ok) {
      console.error("[Bunny] Get video failed:", response.status);
      return null;
    }

    const data = await response.json();

    // Always return standardized embed URL
    return {
      guid: data.guid,
      embedUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${data.guid}`,
    };
  } catch (error) {
    console.error("Error fetching video from Bunny:", error);
    return null;
  }
};

// Add helper to format video URL consistently
export const formatBunnyVideoUrl = (
  libraryId: string,
  videoId: string,
): string => {
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
};
```

**File:** `src/components/common/VideoPlayer.tsx`

**Simplify the video URL handling:**

```tsx
// OLD: Complex regex parsing
const bunnyMatch = React.useMemo(() => {
  const iframeMatch = videoUrl.match(
    /iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-zA-Z0-9-]+)/,
  );
  // ... more parsing ...
}, [videoUrl, normalizedVideoUrl]);

// NEW: Trust the URL format
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  thumbnailUrl,
}) => {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Check if this is a Bunny embed URL (standard format)
  const isBunnyEmbedUrl = React.useMemo(() => {
    return videoUrl?.includes("iframe.mediadelivery.net/embed");
  }, [videoUrl]);

  return (
    <View style={styles.container}>
      {isBunnyEmbedUrl ? (
        // Use WebView for Bunny iframe embed
        <WebView
          source={{ uri: videoUrl }}
          style={styles.video}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onLoadEnd={() => setIsLoading(false)}
          onError={(syntheticEvent) => {
            setIsLoading(false);
            setHasError(true);
            console.error("WebView error:", syntheticEvent.nativeEvent);
          }}
        />
      ) : (
        // Fallback to native Video player (for HLS or other formats)
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          onPlaybackStatusUpdate={(nextStatus) => setStatus(nextStatus)}
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)}
        />
      )}

      {isLoading && (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={palette.primary}
        />
      )}

      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Unable to load video. Please try again later.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setHasError(false);
              setIsLoading(true);
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
```

---

## FIX #5: Add Upload Progress Tracking (HIGH)

**File:** `src/services/bunnyStream.ts`

**Update uploadVideoFile to support progress callback:**

```typescript
// OLD: No progress reporting
export const uploadVideoFile = async (
  videoId: string,
  fileUri: string,
  fileName: string,
): Promise<boolean> => {
  // ... upload ...
};

// NEW: With progress callback
export const uploadVideoFile = async (
  videoId: string,
  fileUri: string,
  fileName: string,
  onProgress?: (progress: number) => void,
): Promise<boolean> => {
  console.log("[Bunny] Starting file upload for video ID:", videoId);
  console.log("[Bunny] File URI:", fileUri);

  try {
    // Read file as blob
    console.log("[Bunny] Reading file as blob...");
    const response = await fetch(fileUri);

    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
    console.log("[Bunny] File size:", fileSizeMB, "MB");

    // Report start
    onProgress?.(0);

    // Upload to Bunny with XMLHttpRequest for progress tracking
    const uploadSuccess = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();

      // Progress event
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          console.log("[Bunny] Upload progress:", percentComplete + "%");
          onProgress?.(percentComplete);
        }
      });

      // Complete
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          console.log("[Bunny] Upload successful!");
          onProgress?.(100);
          resolve(true);
        } else {
          console.error("[Bunny] Upload failed:", xhr.statusText);
          resolve(false);
        }
      });

      // Error
      xhr.addEventListener("error", () => {
        console.error("[Bunny] Upload error");
        resolve(false);
      });

      // Setup request
      xhr.open(
        "PUT",
        `${BUNNY_STREAM_API}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      );
      xhr.setRequestHeader("AccessKey", BUNNY_API_KEY.trim());
      xhr.setRequestHeader("Content-Type", "application/octet-stream");

      // Send blob
      xhr.send(blob);
    });

    return uploadSuccess;
  } catch (error) {
    console.error("Error uploading video to Bunny:", error);
    onProgress?.(0);
    return false;
  }
};
```

**File:** `src/screens/admin/ManageWorkoutsScreen.tsx`

**Add upload progress UI:**

```tsx
// Add to state
const [uploadProgress, setUploadProgress] = useState(0);
const [isUploading, setIsUploading] = useState(false);

// Update uploadVideoIfNeeded to use progress callback
const uploadVideoIfNeeded = async (
  uri: string | null,
  exerciseName?: string,
): Promise<string | null> => {
  if (!uri) return null;

  try {
    setIsUploading(true);
    setUploadProgress(0);

    const videoMeta = await bunnyStream.createVideo(
      exerciseName || "Workout Exercise Video",
    );

    if (!videoMeta) {
      Alert.alert("Error", "Failed to initialize video upload");
      return null;
    }

    // Pass progress callback
    const uploadSuccess = await bunnyStream.uploadVideoFile(
      videoMeta.guid,
      uri,
      exerciseName || "video",
      (progress) => {
        setUploadProgress(progress);
      },
    );

    if (!uploadSuccess) {
      Alert.alert("Upload Failed", "Could not upload video to Bunny");
      return null;
    }

    const embedUrl = `https://iframe.mediadelivery.net/embed/${videoMeta.videoLibraryId}/${videoMeta.guid}`;
    return embedUrl;
  } catch (error) {
    Alert.alert("Error", String(error));
    return null;
  } finally {
    setIsUploading(false);
    setUploadProgress(0);
  }
};

// Add progress bar to render (in the exercise modal section)
{
  isUploading && uploadProgress > 0 && uploadProgress < 100 && (
    <View style={styles.uploadProgressContainer}>
      <Text style={styles.uploadProgressText}>
        Uploading video: {uploadProgress}%
      </Text>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
      </View>
    </View>
  );
}
```

**Add styles:**

```tsx
const styles = StyleSheet.create({
  // ... existing styles ...
  uploadProgressContainer: {
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.secondary + "20",
    borderRadius: radii.md,
    padding: spacing.md,
  },
  uploadProgressText: {
    fontSize: 14,
    color: palette.textPrimary,
    marginBottom: spacing.sm,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: palette.secondary + "40",
    borderRadius: radii.sm,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: palette.secondary,
  },
});
```

---

## FIX #6: Client Limit Enforcement (HIGH)

**File:** `src/screens/admin/ManageClientsScreen.tsx`

**Update the function that adds clients:**

```tsx
// Find the addClientClick or similar function

const addClient = async (clientToAdd: Client) => {
  try {
    // STEP 1: Check subscription and client limit
    console.log("[addClient] Checking client limit...");

    const { data: currentClients, error: countError } = await supabase
      .from("coach_clients")
      .select("id", { count: "exact" })
      .eq("coach_id", user?.id);

    if (countError) throw countError;

    const currentCount = currentClients?.length || 0;
    const userLimit = user?.client_limit || 0;

    console.log(
      `[addClient] Current count: ${currentCount}, Limit: ${userLimit}`,
    );

    if (currentCount >= userLimit) {
      Alert.alert(
        "Client Limit Reached",
        `You have reached the maximum of ${userLimit} clients on your ${user?.subscription_tier || "starter"} plan. Upgrade your subscription to add more clients.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "View Plans",
            onPress: () => {
              // Navigate to subscription management
              navigation.navigate("SubscriptionManagement");
            },
          },
        ],
      );
      return;
    }

    // STEP 2: Check if client already linked
    const { data: existing, error: checkError } = await supabase
      .from("coach_clients")
      .select("id")
      .eq("coach_id", user?.id)
      .eq("client_id", clientToAdd.id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      Alert.alert(
        "Already Linked",
        "This client is already in your client list",
      );
      return;
    }

    // STEP 3: Add the client
    console.log("[addClient] Adding client:", clientToAdd.id);

    const { error: addError } = await supabase.from("coach_clients").insert([
      {
        coach_id: user?.id,
        client_id: clientToAdd.id,
      },
    ]);

    if (addError) throw addError;

    console.log("[addClient] Client added successfully");

    Alert.alert(
      "Success",
      `${clientToAdd.name} has been added to your clients`,
    );

    // Refresh client list
    await fetchClients();

    // Close modals
    setShowAddModal(false);
    setSearchEmail("");
  } catch (error) {
    console.error("[addClient] Error:", error);
    Alert.alert(
      "Error",
      `Failed to add client: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
```

**Add server-side trigger in Supabase (run in SQL Editor):**

```sql
-- Create function to enforce client limits
CREATE OR REPLACE FUNCTION enforce_client_limit_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  client_limit INTEGER;
  subscription_tier TEXT;
BEGIN
  -- Get coach's current client count
  SELECT COUNT(*) INTO current_count
  FROM coach_clients
  WHERE coach_id = NEW.coach_id;

  -- Get coach's client limit
  SELECT client_limit, subscription_tier
  INTO client_limit, subscription_tier
  FROM users
  WHERE id = NEW.coach_id;

  -- Check if adding this client would exceed the limit
  IF current_count >= COALESCE(client_limit, 0) THEN
    RAISE EXCEPTION 'Client limit exceeded. Subscription tier: %, Limit: %',
      subscription_tier, client_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS check_client_limit_insert ON coach_clients;
CREATE TRIGGER check_client_limit_insert
  BEFORE INSERT ON coach_clients
  FOR EACH ROW
  EXECUTE FUNCTION enforce_client_limit_on_insert();
```

---

## FIX #7: Query Timeout Protection (HIGH)

**Create a new file:** `src/utils/withTimeout.ts`

```typescript
/**
 * Wraps a promise with a timeout to prevent hanging requests
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  operationName: string = "Operation",
): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(
          `${operationName} timed out after ${timeoutMs}ms. Please check your connection.`,
        ),
      );
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return result;
  } catch (error) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    throw error;
  }
};

/**
 * Example usage in a screen component
 */
export const executeQueryWithTimeout = async <T>(
  query: () => Promise<T>,
  timeoutMs: number = 15000,
  operationName: string = "Query",
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const data = await withTimeout(query(), timeoutMs, operationName);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};
```

**Usage in screens:**

```tsx
import { withTimeout } from "../../utils/withTimeout";

const fetchPlans = async () => {
  try {
    setLoading(true);

    const plansPromise = supabase
      .from("workout_plans")
      .select("*")
      .eq("coach_id", user?.id)
      .order("created_at", { ascending: false });

    const { data, error } = await withTimeout(
      plansPromise,
      20000, // 20 second timeout
      "Fetch workout plans",
    );

    if (error) throw error;
    // ... process data ...
  } catch (error) {
    console.error("Fetch error:", error);
    Alert.alert(
      "Error",
      error instanceof Error
        ? error.message
        : "Failed to load plans. Please try again.",
    );
  } finally {
    setLoading(false);
  }
};
```

---

## Testing Checklist After Fixes

- [ ] Attempt to upload a 100 MB video → Should show progress bar
- [ ] Disconnect internet during upload → Should show error and not save exercise
- [ ] Login as client → Try accessing ManageWorkouts URL → Should be blocked
- [ ] Login as coach, add 5 clients (starter plan) → Try adding 6th → Should show limit error
- [ ] Run complex queries on slow network → Should timeout with error message, not hang
- [ ] Upload video, refresh page → Video URL should still work
- [ ] Check all admin screens load correctly for authorized users

---

**All fixes implement production-ready error handling and user feedback.**
