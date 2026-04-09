# 🔗 Coach-Client Relationships Database Schema

This schema enables coaches to manage their clients and assign meals/workouts to specific clients.

## Step-by-Step Instructions

1. Go to https://supabase.com and log in
2. Click on your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy **all the SQL code below** (from `coach-clients-schema.sql`)
6. Paste it into the SQL Editor
7. Click **Run**

## What Gets Created

### Tables

#### coach_clients
Establishes the relationship between coaches and their clients:
- `coach_id`: The coach/admin who manages this client
- `client_id`: The client user
- `assigned_at`: When the client was assigned to the coach
- Unique constraint: A coach can only be assigned to a client once

#### users_role
Stores the role of each user (client or admin):
- `user_id`: Reference to the auth user
- `role`: Either 'client' or 'admin'

### Modified Tables

#### diet_meals
Added column:
- `assigned_to_client_id`: Optional reference to a specific client (NULL = available to all coach's clients)

#### workouts
Added column:
- `assigned_to_client_id`: Optional reference to a specific client (NULL = available to all coach's clients)

## RLS Policies

### coach_clients
- ✅ Coaches can view their own clients
- ✅ Coaches can add clients
- ✅ Coaches can remove clients

### users_role
- ✅ Users can view their own role
- ✅ All users can view other users' roles (read-only)

## How Coach-Client Assignment Works

1. **Add Clients to Coach**: Through the admin app, coaches can add clients to their roster
2. **Create Meals/Workouts**: When creating meals or workouts, coaches can optionally assign them to specific clients
3. **Unassigned Items**: If `assigned_to_client_id` is NULL, all of the coach's clients can see it
4. **Assigned Items**: If `assigned_to_client_id` has a value, only that specific client can see it

## Example Workflow

1. Coach registers as admin
2. Coach adds clients (e.g., John, Jane) to their roster
3. Coach creates a "Protein Smoothie" meal (unassigned)
   - Both John and Jane can see it
4. Coach creates a "Keto Dinner" meal and assigns it to John
   - Only John can see this meal
5. Coach creates a "Cardio Day" workout and assigns it to Jane
   - Only Jane can see this workout

## Next Steps After Running SQL

1. Update ManageDietsScreen to show client dropdown when creating/editing meals
2. Update ManageWorkoutsScreen to show client dropdown when creating/editing workouts
3. Create a "Manage Clients" screen where coaches can add/remove clients
4. Update client screens to filter meals and workouts based on assignments

