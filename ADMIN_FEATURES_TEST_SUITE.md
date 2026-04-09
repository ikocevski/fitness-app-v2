# 🧪 Complete Admin Feature Testing Guide

## Overview

This guide covers testing all new admin features including:

- ✅ Client management (add/remove)
- ✅ Meal creation with image upload and client assignment
- ✅ Workout creation with client assignment
- ✅ Client visibility filtering

---

## Prerequisites

1. **Test Accounts Already Created** (from COMPLETE_TESTING_GUIDE.md)
   - Admin: `coach@test.com` / `TestPass123`
   - Client: `client@test.com` / `TestPass123`
   - Coach-client relationship established in database

2. **Database**: coach-clients schema deployed (if not done, see COMPLETE_TESTING_GUIDE.md)

---

## Test Suite 1: Client Management

### Test 1.1: Add an Existing Client

**Objective**: Verify admin can search for and add a client

**Steps**:

1. Login as `coach@test.com`
2. Tap **"👥 Clients"** tab
3. Tap **"➕ Add New Client"** button
4. Enter `client@test.com` in search field
5. Tap 🔍 **Search button**

**Expected Result**:

- ✅ Search results show "Jane Client" with email `client@test.com`
- ✅ Green "➕ Add" button appears
- ✅ Tapping "➕ Add" adds client to your roster

**Verify**:

- ✅ Client appears in main "👥 Clients" list
- ✅ Shows name: "Jane Client"
- ✅ Shows email: "client@test.com"
- ✅ Red "✕" button shows on client card

### Test 1.2: Remove a Client

**Objective**: Verify admin can remove a client

**Steps**:

1. In "👥 Clients" tab, find "Jane Client"
2. Tap red **"✕"** button
3. Confirm deletion alert

**Expected Result**:

- ✅ Alert shows: "Are you sure you want to remove Jane Client?"
- ✅ Tap "Remove" confirms
- ✅ Client disappears from list

### Test 1.3: Search Non-Existent Client

**Objective**: Verify error handling for unavailable clients

**Steps**:

1. Go to "➕ Add New Client"
2. Enter `nonexistent@test.com`
3. Tap 🔍 Search

**Expected Result**:

- ✅ Alert shows: "Not Found - No available clients found with that email"

---

## Test Suite 2: Meal Creation & Image Upload

### Test 2.1: Create Meal WITHOUT Image

**Objective**: Verify basic meal creation works

**Steps**:

1. Tap **"🥗 Meals"** tab
2. Tap **"➕ Create New Meal"**
3. Fill in:
   - Name: `Protein Pancakes`
   - Description: `High protein breakfast`
   - Calories: `400`
   - Protein: `25g`
   - Carbs: `35g`
   - Fats: `12g`
   - Ingredients: `Oats, eggs, whey protein, maple syrup`
4. Leave image empty (don't tap image button)
5. Leave client unassigned (don't select)
6. Tap **"Save Meal"**

**Expected Result**:

- ✅ Success alert: "Meal created successfully!"
- ✅ Modal closes
- ✅ Meal appears in "Your Meals" list
- ✅ Shows all macro information
- ✅ No image placeholder

### Test 2.2: Create Meal WITH Image Upload

**Objective**: Verify image upload functionality

**Prerequisites**:

- Have a photo on device or emulator

**Steps**:

1. Tap "🥗 Meals" → "➕ Create New Meal"
2. Fill in:
   - Name: `Salmon Bowl`
   - Description: `Omega-3 rich lunch`
   - Calories: `550`
   - Protein: `40g`
   - Carbs: `45g`
   - Fats: `18g`
   - Ingredients: `Salmon fillet, quinoa, broccoli, lemon`
3. Tap dashed box with **"📸 Pick or take a photo"**
4. Select or take a photo
5. Image preview appears
6. Leave unassigned
7. Tap **"Save Meal"**

**Expected Result**:

- ✅ Image picker opens
- ✅ Photo selected shows preview in button
- ✅ Success alert shows
- ✅ Meal appears with image thumbnail
- ✅ Image is clickable/viewable

**Image Upload Behavior**:

- If Supabase storage configured: Uploads to cloud
- If not: Uses local URI (still works)

### Test 2.3: Edit Meal & Change Assignment

**Objective**: Verify edit functionality

**Steps**:

1. In "🥗 Meals", find "Protein Pancakes"
2. Tap **"✏️ Edit"**
3. Change description to: `High protein power breakfast`
4. Tap "Select a client or leave unassigned"
5. Tap **"✕ Add New Client"** first to add a client if needed
6. Select the client (Jane Client)
7. Tap **"Save Meal"**

**Expected Result**:

- ✅ Modal opens with existing data
- ✅ Can modify any field
- ✅ Client selector shows Jane Client selected (green checkmark)
- ✅ Success alert: "Meal updated successfully!"
- ✅ Card now shows "(Assigned to: Jane Client)"

### Test 2.4: Delete Meal

**Objective**: Verify deletion

**Steps**:

1. In "🥗 Meals", find any meal
2. Tap **"🗑️ Delete"**
3. Confirm alert

**Expected Result**:

- ✅ Alert: "Are you sure you want to delete this meal?"
- ✅ Tap "Delete" removes it
- ✅ Meal disappears from list

---

## Test Suite 3: Workout Creation & Assignment

### Test 3.1: Create Unassigned Workout

**Objective**: Verify basic workout creation

**Steps**:

1. Tap **"💪 Workouts"** tab
2. Tap **"➕ Create New Workout"**
3. Fill in:
   - Name: `Bicep Curls`
   - Description: `Arm strength training`
   - Sets: `4`
   - Reps: `10`
   - Directions: `1. Hold dumbbells at sides. 2. Curl up. 3. Lower slowly. 4. Repeat.`
4. Leave video empty
5. Leave unassigned
6. Tap **"Save Workout"**

**Expected Result**:

- ✅ Success alert: "Workout created successfully!"
- ✅ Workout appears in list
- ✅ Shows Sets: 4, Reps: 10

### Test 3.2: Create Assigned Workout

**Objective**: Verify workout assignment during creation

**Steps**:

1. Go to "💪 Workouts"
2. Tap "➕ Create New Workout"
3. Fill in:
   - Name: `Leg Press`
   - Description: `Lower body strength`
   - Sets: `3`
   - Reps: `12`
   - Directions: `1. Sit on machine. 2. Place feet on platform. 3. Push forward. 4. Return.`
4. Tap "Select a client or leave unassigned"
5. Select "Jane Client" (if not added, add first)
6. Checkmark appears next to her name
7. Tap **"Save Workout"**

**Expected Result**:

- ✅ Client selector modal shows
- ✅ Jane Client name selectable
- ✅ Green checkmark shows when selected
- ✅ Success alert
- ✅ Workout card shows "(Assigned to: Jane Client)"

### Test 3.3: Edit and Change Workout Assignment

**Objective**: Verify assignment changes

**Steps**:

1. Find "Bicep Curls" workout
2. Tap **"✏️ Edit"**
3. Tap "Select a client or leave unassigned"
4. Select "Jane Client"
5. Tap **"Save Workout"**

**Expected Result**:

- ✅ Modal shows all fields
- ✅ Client selector works
- ✅ Workout now assigned to Jane Client
- ✅ Card updates to show assignment

---

## Test Suite 4: Client Visibility Filtering

### Test 4.1: Client Logs In & Sees Assigned Content

**Objective**: Verify clients see only their assigned content

**Prerequisite**:

- Create at least one meal assigned to Jane Client
- Create at least one unassigned meal
- Create at least one workout assigned to Jane Client
- Create at least one unassigned workout

**Steps**:

1. **Logout** from admin account
2. **Login** as `client@test.com` / `TestPass123`
3. **Go to Home screen**
4. Navigate to **Diet/Meals section** (if available)
5. Navigate to **Workouts section** (if available)

**Expected Result - Meals**:

- ✅ See meals assigned to Jane Client
- ✅ See unassigned meals (available to all)
- ✅ Do NOT see any meals not assigned to Jane Client

**Expected Result - Workouts**:

- ✅ See workouts assigned to Jane Client
- ✅ See unassigned workouts (available to all)
- ✅ Do NOT see any workouts not assigned to Jane Client

### Test 4.2: Verify RLS Policies

**Objective**: Database-level verification

**In Supabase SQL Editor**:

```sql
-- Run as Jane Client (get her UUID first)
select * from diet_meals where coach_id = '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
```

**Expected Result**:

- ✅ Only shows meals where:
  - `assigned_to_client_id IS NULL` (unassigned), OR
  - `assigned_to_client_id = '1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e'` (Jane's ID)

---

## Test Suite 5: Data Persistence

### Test 5.1: Close and Reopen App

**Objective**: Verify data survives app restart

**Steps**:

1. In admin view, create a meal with specific name: `Persistence Test Meal`
2. Assign it to Jane Client
3. Assign an image
4. Fully close the app
5. Reopen the app
6. Login as admin
7. Go to "🥗 Meals"

**Expected Result**:

- ✅ Meal still exists
- ✅ All details intact (name, macros, ingredients)
- ✅ Image still loads
- ✅ Client assignment still shows

### Test 5.2: Client Sees Persisted Assignment

**Steps**:

1. Login as client
2. Navigate to meals/workouts
3. Find "Persistence Test Meal"

**Expected Result**:

- ✅ Client still sees the assigned meal
- ✅ All details intact

---

## Test Suite 6: Error Scenarios

### Test 6.1: Create Meal Without Required Fields

**Steps**:

1. Go to "🥗 Meals" → "➕ Create"
2. Leave Name empty
3. Fill all other fields
4. Tap "Save Meal"

**Expected Result**:

- ✅ Alert: "Please fill in all required fields"
- ✅ Modal stays open
- ✅ Data not lost

### Test 6.2: No Clients Available

**Steps**:

1. (If no clients exist)
2. Go to "🥗 Meals" → "➕ Create"
3. Tap "Select a client"

**Expected Result**:

- ✅ Modal opens
- ✅ Shows message: "No clients added yet. Add clients first!"

### Test 6.3: Add Non-Existent Client

**Steps**:

1. Go to "👥 Clients"
2. Tap "➕ Add New Client"
3. Enter `fakeemail@notreal.com`
4. Tap Search

**Expected Result**:

- ✅ Alert: "No available clients found"
- ✅ No crash

---

## Test Suite 7: Performance & UX

### Test 7.1: List Rendering

**Objective**: Verify lists render smoothly with multiple items

**Steps**:

1. Create 10+ meals in admin view
2. Scroll through meal list
3. Scroll through client list
4. Scroll through workout list

**Expected Result**:

- ✅ No lag or jank
- ✅ Images load smoothly
- ✅ Scrolling is fluid

### Test 7.2: Modal Animations

**Steps**:

1. Open meal create modal
2. Close it
3. Reopen it

**Expected Result**:

- ✅ Smooth slide-up animation
- ✅ Smooth fade-out
- ✅ Content resets on reopen

### Test 7.3: Image Preview

**Steps**:

1. Create meal with image
2. View in list
3. Tap image

**Expected Result**:

- ✅ Thumbnail visible
- ✅ Proper aspect ratio (4:3)
- ✅ Clean rounded corners

---

## Comprehensive Workflow Test

**Full end-to-end test** (combines all features):

### Setup Phase

1. Login as admin `coach@test.com`
2. Go to "👥 Clients"
3. Add `client@test.com` (Jane Client)
4. Verify client shows in list

### Content Creation Phase

5. Go to "🥗 Meals"
6. Create "Breakfast Special" → Assign to Jane
7. Create "Generic Snack" → Leave unassigned
8. Add images to both meals

9. Go to "💪 Workouts"
10. Create "Morning Cardio" → Assign to Jane
11. Create "Anytime Stretch" → Leave unassigned
12. Add video to both workouts

### Verification Phase

13. Logout
14. Login as Jane Client `client@test.com`
15. Check meals:
    - ✅ See "Breakfast Special" (hers)
    - ✅ See "Generic Snack" (for all)
16. Check workouts:
    - ✅ See "Morning Cardio" (hers)
    - ✅ See "Anytime Stretch" (for all)

### Modification Phase

17. Logout → Login as admin
18. Go to "🥗 Meals"
19. Find "Breakfast Special"
20. Edit → Change assignment from Jane → Leave unassigned
21. Save
22. Logout → Login as Jane
23. Verify "Breakfast Special" still visible (now available to all)

**All tests passing = ✅ Admin feature suite complete!**

---

## Troubleshooting During Testing

| Issue                      | Solution                                          |
| -------------------------- | ------------------------------------------------- |
| Client not found in search | Verify client account exists and signed up        |
| Image not showing          | Check permissions, file size, internet connection |
| Assignment not working     | Ensure client added first via "👥 Clients"        |
| Data not persisting        | Check Supabase connection                         |
| Slow performance           | Clear cache: `npm start -- --reset-cache`         |
| App crashes on modal       | Check console for TypeScript errors               |

---

## Success Criteria

✅ All 7 test suites pass  
✅ No console errors  
✅ No crashes  
✅ Data persists on restart  
✅ Client filtering works correctly  
✅ Images upload successfully  
✅ UI is responsive and smooth  
✅ Admin can manage all clients

---

**You're all set! Ready to test! 🚀**
