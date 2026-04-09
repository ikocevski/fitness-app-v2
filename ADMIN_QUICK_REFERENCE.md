# 🏃 Quick Reference - Admin Features

## Images & Videos Upload

### 📸 Image Upload (Meals)

- Automatically uploads to Supabase storage
- Compresses to 80% quality
- Converts to JPEG
- Gets public URL automatically
- Falls back to local URI if storage unavailable

### 📹 Video Upload (Workouts)

- Stores video file URI locally
- Supports MP4, MOV, etc.
- Preview shown as "🎥 Video selected"

---

## 👥 Client Management

### Adding Clients

```
1. Tap "👥 Clients" tab
2. Tap "➕ Add New Client"
3. Enter email → Tap 🔍
4. Tap "➕ Add" on result
```

### Removing Clients

```
1. Go to "👥 Clients"
2. Tap red "✕" button
3. Confirm
```

---

## 🥗 Meal Assignment

### Assign During Creation

```
1. Tap "➕ Create New Meal"
2. Fill all required fields
3. Tap "Select a client or leave unassigned"
4. Pick client (or leave empty)
5. Tap "Save Meal"
```

### Change Assignment

```
1. Find meal → Tap "✏️ Edit"
2. Tap client selector
3. Pick new client or "Clear selection"
4. Tap "Save Meal"
```

---

## 💪 Workout Assignment

### Same as Meals

```
1. Tap "➕ Create New Workout"
2. Fill all required fields
3. Tap "Select a client or leave unassigned"
4. Pick client (or leave empty)
5. Tap "Save Workout"
```

---

## 📊 Visibility Rules

| Content              | Unassigned | Assigned to Mike |
| -------------------- | ---------- | ---------------- |
| **Mike sees**        | ✅ YES     | ✅ YES           |
| **Sarah sees**       | ✅ YES     | ❌ NO            |
| **Other Coach sees** | ❌ NO      | ❌ NO            |

---

## Database Structure

```
coach_clients
├─ coach_id (your UUID)
├─ client_id (client's UUID)
└─ assigned_at (timestamp)

diet_meals
├─ assigned_to_client_id (optional)
├─ image_url (uploaded to storage)
└─ coach_id (your UUID)

workouts
├─ assigned_to_client_id (optional)
├─ video_url (local URI)
└─ coach_id (your UUID)
```

---

## Files Modified

✅ `ManageDietsScreen.tsx` - Image upload + client assignment
✅ `ManageWorkoutsScreen.tsx` - Client assignment
✅ `ManageClientsScreen.tsx` - Add/remove clients
✅ `package.json` - Added expo-file-system (if needed)

---

## Commands for Testing

```bash
# Run the app
npm start

# Test flow:
1. Login as admin
2. Go to "👥 Clients" → Add a client
3. Go to "🥗 Meals" → Create meal, assign to client
4. Go to "💪 Workouts" → Create workout, assign to client
5. Logout → Login as client
6. Verify client sees only their assigned content + unassigned content
```

---

## Storage Setup (Optional)

If image uploads fail, enable Supabase storage:

1. Go to Supabase dashboard
2. Create bucket named `meal-images`
3. Set to public
4. Add RLS policy:
   ```sql
   allow public insert on storage.objects with check (bucket_id = 'meal-images');
   allow public select on storage.objects with check (bucket_id = 'meal-images');
   ```

---

## Error Handling

| Error                 | Solution                               |
| --------------------- | -------------------------------------- |
| No storage configured | Falls back to local URI                |
| No clients added      | Add via "👥 Clients" first             |
| Image upload fails    | Check permissions, internet, file size |
| Client not found      | Verify they signed up first            |

---

All set! 🚀
