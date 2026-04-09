# 👨‍💼 Admin Management Guide - Complete Setup

This guide explains all admin features for managing clients, meals, and workouts in the fitness app.

---

## 📋 Table of Contents

1. [Manage Clients](#manage-clients)
2. [Manage Meals](#manage-meals)
3. [Manage Workouts](#manage-workouts)
4. [Assigning to Specific Clients](#assigning-to-specific-clients)

---

## 👥 Manage Clients

### Overview

The **Manage Clients** tab allows you to add and remove clients from your coaching roster. You can search for existing users and connect them as your clients.

### Add a New Client

1. **Open Admin Dashboard** → Tap **"👥 Clients"** tab
2. **Tap "➕ Add New Client"** button
3. **Enter client email** in the search field
   - Example: `client@example.com`
4. **Tap "🔍" search button**
5. **Results appear** showing available clients with that email
6. **Tap "➕ Add"** on the client you want to add
7. **Success!** The client now appears in your client list

### Remove a Client

1. **Go to "👥 Clients"** tab
2. **Find the client** you want to remove
3. **Tap the red "✕" button** on the right
4. **Confirm deletion** when prompted
5. **Client removed** from your roster

### View Your Clients

- All your connected clients are displayed in a list
- Shows client name, email, and remove button
- Client count displayed in header
- Pull down to refresh list

---

## 🥗 Manage Meals

### Overview

Create meal recipes and assign them to specific clients or make them available to all clients. Images are automatically uploaded to cloud storage.

### Create a New Meal

1. **Open Admin Dashboard** → Tap **"🥗 Meals"** or similar
2. **Tap "➕ Create New Meal"**
3. **Fill in meal details**:
   - **Meal Name** (required) - e.g., "Grilled Chicken with Brown Rice"
   - **Description** - e.g., "High protein, clean eating"
   - **Calories** (required) - e.g., 500
   - **Protein (g)** (required) - e.g., 35
   - **Carbs (g)** (required) - e.g., 45
   - **Fats (g)** (required) - e.g., 12
   - **Ingredients** - List all ingredients

4. **Add meal image** (optional)
   - Tap the dashed box with 📸 icon
   - Select or take a photo
   - Image is automatically compressed and uploaded

5. **Assign to Client** (optional)
   - Tap "Select a client or leave unassigned"
   - Choose from your client list
   - Leave unassigned to make available to all clients

6. **Tap "Save Meal"**
7. **Success!** Meal appears in your meal list

### Edit a Meal

1. **Go to 🥗 Meals tab**
2. **Find the meal** you want to edit
3. **Tap "✏️ Edit" button**
4. **Modify any details** (name, macros, image, client assignment, etc.)
5. **Tap "Save Meal"**
6. **Changes saved!**

### Delete a Meal

1. **Go to 🥗 Meals tab**
2. **Find the meal** you want to delete
3. **Tap "🗑️ Delete" button**
4. **Confirm deletion**
5. **Meal removed** from system

### Meal Image Upload

**How it works:**

- When you pick an image, it's automatically:
  - Compressed to 80% quality
  - Converted to JPEG format
  - Uploaded to Supabase storage (`meal-images` bucket)
  - A public URL is generated and stored with the meal

**If storage isn't configured:**

- The app falls back to using local image URIs
- Meals still work but images may not persist across sessions

---

## 💪 Manage Workouts

### Overview

Create exercise routines and assign them to specific clients or make them available to all. Add videos for demo instructions.

### Create a New Workout

1. **Open Admin Dashboard** → Tap **"💪 Workouts"** tab
2. **Tap "➕ Create New Workout"**
3. **Fill in workout details**:
   - **Exercise Name** (required) - e.g., "Bench Press"
   - **Description** - e.g., "Chest and triceps exercise"
   - **Sets** (required) - e.g., 4
   - **Reps** (required) - e.g., 8
   - **Directions & Instructions** - Step-by-step guide for performing the exercise

4. **Add exercise video** (optional)
   - Tap the dashed box with 📹 icon
   - Select a video from your library
   - Video file is stored as URI

5. **Assign to Client** (optional)
   - Tap "Select a client or leave unassigned"
   - Choose from your client list
   - Leave unassigned to make available to all clients

6. **Tap "Save Workout"**
7. **Success!** Workout appears in your workout list

### Edit a Workout

1. **Go to 💪 Workouts tab**
2. **Find the workout** you want to edit
3. **Tap "✏️ Edit" button**
4. **Modify any details**
5. **Tap "Save Workout"**
6. **Changes saved!**

### Delete a Workout

1. **Go to 💪 Workouts tab**
2. **Find the workout** you want to delete
3. **Tap "🗑️ Delete" button**
4. **Confirm deletion**
5. **Workout removed**

---

## 🎯 Assigning to Specific Clients

### What is Assignment?

You can assign meals and workouts in two ways:

1. **Unassigned** - Available to ALL clients you coach
2. **Assigned to Client** - Only visible to that specific client

### How to Assign

#### During Creation:

1. When creating a meal or workout
2. Tap "Select a client or leave unassigned"
3. Pick a client from the modal
4. Green checkmark appears next to selected client
5. Save the meal/workout
6. Only that client will see it

#### During Editing:

1. Open a meal or workout for editing
2. Tap "Select a client or leave unassigned"
3. Choose a different client OR clear selection
4. Save changes

### Unassigning

To make an assigned meal/workout available to ALL clients:

1. Edit the meal/workout
2. Tap "Clear selection (available to all)"
3. Save
4. Now all clients can see it

---

## 📊 How Clients See Assignments

### From Client's Perspective

When a client logs in:

1. **Diet/Meals section** shows:
   - ✅ All meals NOT assigned (available to everyone)
   - ✅ All meals assigned to THEM specifically
   - ❌ Meals assigned to other clients are hidden

2. **Workouts section** shows:
   - ✅ All workouts NOT assigned (available to everyone)
   - ✅ All workouts assigned to THEM specifically
   - ❌ Workouts assigned to other clients are hidden

### Database-Level Security

- All filtering is handled automatically
- Uses Row-Level Security (RLS) policies in Supabase
- Clients can never see other coaches' meals/workouts
- Clients can never see meals/workouts assigned to other clients

---

## 🔄 Complete Workflow Example

### Scenario: Coach Jane has 2 clients (Mike and Sarah)

**Step 1: Add Clients**

- Go to "👥 Clients"
- Tap "➕ Add New Client"
- Search for "mike@example.com" → Add him
- Search for "sarah@example.com" → Add her

**Step 2: Create Meals**

- Go to "🥗 Meals"
- Create "Chicken Salad" and **assign to Mike**
- Create "Keto Pizza" and **assign to Sarah**
- Create "Protein Shake" and **leave unassigned** (for both)

**Step 3: Create Workouts**

- Go to "💪 Workouts"
- Create "Chest Day" and **assign to Mike**
- Create "Leg Day" and **assign to Sarah**
- Create "Cardio" and **leave unassigned** (for both)

**Step 4: Clients See Correct Content**

- **Mike logs in** → sees:
  - Chicken Salad (assigned)
  - Protein Shake (unassigned)
  - Chest Day (assigned)
  - Cardio (unassigned)
- **Sarah logs in** → sees:
  - Keto Pizza (assigned)
  - Protein Shake (unassigned)
  - Leg Day (assigned)
  - Cardio (unassigned)

---

## 🎮 Admin Tabs Summary

| Tab       | Icon | Function                        |
| --------- | ---- | ------------------------------- |
| Dashboard | 📊   | Overview of all data            |
| Clients   | 👥   | Add/remove/manage clients       |
| Meals     | 🥗   | Create/edit/delete meal recipes |
| Workouts  | 💪   | Create/edit/delete exercises    |

---

## ⚠️ Troubleshooting

### Q: "No clients added yet" when trying to assign

**A:** Go to "👥 Clients" tab and add clients first before you can assign meals/workouts

### Q: Image not uploading

**A:**

- Ensure app has photo library permissions
- Check file size (should auto-compress)
- Check internet connection
- If storage not configured, uses local URI (still works)

### Q: Client not found in search

**A:**

- Make sure client account is created first (they must sign up)
- Double-check email spelling
- Client must have role set to "client" in database

### Q: Meal/Workout shows as available to all but I assigned it

**A:**

- Try editing and re-assigning
- Refresh the screen
- Check database directly in Supabase

---

## 🚀 Best Practices

1. **Create base meals/workouts** unassigned first, then duplicate/modify for specific clients
2. **Keep descriptions clear** for easy client understanding
3. **Add images/videos** for better engagement
4. **Review client assignments** periodically to keep data clean
5. **Remove clients** if they stop coaching with you
6. **Test as a client** to verify they see correct content

---

Good luck coaching! 🏋️
