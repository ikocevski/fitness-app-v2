# 🧪 Complete Testing Guide - Admin to Client CRUD Operations

## Overview

This guide walks you through testing all CRUD operations between an Admin (Coach) and Client accounts, including the coach-client relationship and meal assignments.

---

## Part 1: Initial Setup

### Step 1.1: Run Database Migrations

Copy and run this SQL in Supabase SQL Editor:

```sql
-- coach_clients schema (if not already done)
create table if not exists coach_clients (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references auth.users(id) on delete cascade not null,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(coach_id, client_id)
);

create table if not exists users_role (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  role text check (role in ('client', 'admin')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table diet_meals add column if not exists assigned_to_client_id uuid references auth.users(id) on delete set null;
alter table workouts add column if not exists assigned_to_client_id uuid references auth.users(id) on delete set null;

alter table coach_clients enable row level security;
alter table users_role enable row level security;

-- RLS Policies for coach_clients
create policy "Coaches can view their clients"
  on coach_clients for select
  using (auth.uid() = coach_id);

create policy "Coaches can add clients"
  on coach_clients for insert
  with check (auth.uid() = coach_id);

create policy "Coaches can remove clients"
  on coach_clients for delete
  using (auth.uid() = coach_id);

-- RLS Policies for users_role
create policy "Users can view their own role"
  on users_role for select
  using (auth.uid() = user_id);

create policy "All can view user roles"
  on users_role for select
  using (true);
```

---

## Part 2: Create Test Accounts

### Step 2.1: Create Admin (Coach) Account

1. **Open the app** and go to Sign Up
2. **Fill in**:
   - Name: `John Coach`
   - Email: `coach@test.com`
   - Password: `TestPass123`
   - Confirm Password: `TestPass123`
   - Check ✅ "I agree to the terms"
3. **Click Sign Up**
4. **You'll be logged in as admin**

### Step 2.2: Create Client Account (Same Device)

1. **Click Logout** (bottom of Profile screen)
2. **Click Sign Up** again
3. **Fill in**:
   - Name: `Jane Client`
   - Email: `client@test.com`
   - Password: `TestPass123`
   - Confirm Password: `TestPass123`
   - Check ✅ "I agree to the terms"
4. **Click Sign Up**
5. **You'll be logged in as client**

### Step 2.3: Get User IDs

You need the UUIDs of both accounts. Run this in Supabase SQL Editor:

```sql
select id, email from auth.users where email in ('coach@test.com', 'client@test.com');
```

**You'll see output like**:

```
id                                   | email
0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d | coach@test.com
1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e | client@test.com
```

**Copy and save these IDs** - you'll need them for the next steps.

---

## Part 3: Connect Coach to Client

### Step 3.1: Create Coach-Client Relationship

In Supabase SQL Editor, run:

```sql
insert into coach_clients (coach_id, client_id) values (
  '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',  -- Replace with coach@test.com UUID
  '1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e'   -- Replace with client@test.com UUID
);
```

### Step 3.2: Set User Roles

```sql
insert into users_role (user_id, role) values
  ('0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d', 'admin'),
  ('1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e', 'client');
```

### Step 3.3: Verify Connection

```sql
select cc.id, cc.coach_id, cc.client_id, u.email as client_email
from coach_clients cc
join auth.users u on cc.client_id = u.id
where cc.coach_id = '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
```

Should return 1 row with Jane Client's info.

---

## Part 4: Testing Admin CRUD Operations

### Test 4.1: Admin Logs In

1. **Log in with**:
   - Email: `coach@test.com`
   - Password: `TestPass123`

2. **Expected**: See admin dashboard with tabs including "💪" (admin section)

### Test 4.2: Create Meal (CREATE)

1. **Navigate** to bottom tab or admin section
2. **Tap** "🥗 Manage Meals" or find the meals management screen
3. **Tap** "➕ Create New Meal"
4. **Fill in**:
   - Name: `Grilled Chicken with Brown Rice`
   - Description: `High protein, clean eating meal`
   - Calories: `500`
   - Protein: `35`
   - Carbs: `45`
   - Fats: `12`
   - Ingredients: `Chicken breast, brown rice, broccoli, olive oil`
   - **DO NOT** assign to client (leave unassigned)
5. **Optional**: Pick an image
6. **Tap** "Save Meal"
7. **Expected**:
   - ✅ Meal appears in your meals list
   - ✅ Shows all macro info
   - ✅ Shows ingredients
   - ✅ Shows "(Available to all)" or similar indicator

### Test 4.3: Create Another Meal (for testing assignment)

1. **Repeat steps 4.2** with:
   - Name: `Keto Pizza`
   - Description: `Cauliflower crust with cheese`
   - Calories: `450`
   - Protein: `28`
   - Carbs: `18`
   - Fats: `32`
   - Ingredients: `Cauliflower, mozzarella, sauce, basil`
   - **THIS TIME**: Tap "Assign to Client" → Select `Jane Client`
2. **Tap** "Save Meal"
3. **Expected**:
   - ✅ Meal appears in list
   - ✅ Shows "(Assigned to: Jane Client)" or similar

### Test 4.4: Edit Meal (UPDATE)

1. **Find** the "Grilled Chicken" meal
2. **Tap** "✏️ Edit" button
3. **Change**:
   - Description: `Premium high protein, clean eating meal with vegetables`
   - Calories: `520`
4. **Keep** the client assignment as is
5. **Tap** "Save Meal"
6. **Expected**:
   - ✅ Meal updates in the list
   - ✅ New values are visible

### Test 4.5: Delete Meal (DELETE)

1. **Find** any meal
2. **Tap** "🗑️ Delete" button
3. **Confirm** the deletion
4. **Expected**:
   - ✅ Meal disappears from list
   - ✅ No errors shown

### Test 4.6: Verify Meal List

At this point you should have:

- ✅ "Grilled Chicken" (unassigned)
- ✅ "Keto Pizza" (assigned to Jane Client)

---

## Part 5: Testing Client Access

### Test 5.1: Client Logs In

1. **Log out** from coach account
2. **Log in with**:
   - Email: `client@test.com`
   - Password: `TestPass123`

3. **Expected**: See client dashboard (different UI, no admin tabs)

### Test 5.2: Client Views Meals

1. **Navigate** to Diet/Meals section (if available to clients)
2. **Expected**:
   - ✅ See "Grilled Chicken" (unassigned, available to all)
   - ✅ See "Keto Pizza" (assigned specifically to this client)
   - ❌ Do NOT see other coaches' meals (if testing with multiple coaches)

### Test 5.3: Client Tracks Weight

1. **On Home screen**, you should see weight modal if not logged today
2. **Enter weight**: `75` kg
3. **Tap** "Save Weight"
4. **Expected**:
   - ✅ Modal closes
   - ✅ Weight saved
   - ✅ Won't show again today

### Test 5.4: Client Views Profile

1. **Navigate** to Profile tab
2. **Expected**:
   - ✅ See name: "Jane Client"
   - ✅ See role: "🏋️ Client"
   - ✅ See weight history with today's entry
   - ✅ See weight stats (current, weekly avg, change)

---

## Part 6: Admin Workout CRUD (Optional but similar to Meals)

### Test 6.1: Admin Creates Workout

1. **Switch back** to coach account
2. **Tap** "💪 Manage Workouts"
3. **Tap** "➕ Create New Workout"
4. **Fill in**:
   - Name: `Chest & Triceps`
   - Description: `Push day, focus on strength`
   - Sets: `4`
   - Reps: `8`
   - Directions: `Bench press: 4x8, Dips: 3x10, Tricep ext: 3x12`
   - **Assign to**: Jane Client
5. **Optional**: Pick a video
6. **Tap** "Save Workout"
7. **Expected**:
   - ✅ Workout appears in list
   - ✅ Shows sets, reps, directions
   - ✅ Shows "(Assigned to: Jane Client)"

---

## Part 7: Troubleshooting

### Issue: "No clients added yet" when trying to assign meals

**Solution**:

- Make sure you ran the `insert into coach_clients` SQL
- Make sure coach_id and client_id are correct
- Verify with: `select * from coach_clients;`

### Issue: Client can't see assigned meals

**Solution**:

- Check RLS policies are created correctly
- Verify `assigned_to_client_id` matches client's UUID
- Test query: `select * from diet_meals where assigned_to_client_id = 'CLIENT_UUID';`

### Issue: Weight modal not showing

**Solution**:

- Clear AsyncStorage: App settings → Clear cache
- Make sure you haven't logged weight yet today
- Check database has `weight_logs` table

### Issue: Can't edit/delete meals

**Solution**:

- Make sure you're logged in as the admin who created them
- Check RLS policy: `on diet_meals` should allow UPDATE/DELETE for coach_id = auth.uid()

---

## Part 8: Expected Results Summary

✅ **All CRUD Tests Passing**:

- Admin can CREATE meals ✓
- Admin can READ (view) meals ✓
- Admin can UPDATE meals ✓
- Admin can DELETE meals ✓
- Admin can ASSIGN meals to clients ✓
- Client can see UNASSIGNED meals ✓
- Client can see ASSIGNED meals ✓
- Client can see THEIR OWN profile data ✓
- Client CANNOT see admin sections ✓
- Weight tracking works per day ✓

---

## Part 9: Performance Checklist

After all tests pass, verify:

- ⚡ No lag when loading meal list
- ⚡ Modal opens/closes smoothly
- ⚡ Images load properly (if added)
- ⚡ No console errors
- ⚡ Responsive on all screen sizes

---

## Quick Commands

**Check all meals**:

```sql
select id, name, coach_id, assigned_to_client_id, created_at from diet_meals;
```

**Check coach-client relationships**:

```sql
select * from coach_clients;
```

**Check user roles**:

```sql
select * from users_role;
```

**Check weight logs**:

```sql
select * from weight_logs;
```

**Delete test data** (to reset for fresh testing):

```sql
delete from diet_meals where name like '%test%';
delete from coach_clients;
delete from users_role where user_id in (select id from auth.users where email like '%@test.com');
```

---

Good luck with testing! 🚀
