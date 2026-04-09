# 🗄️ Extended Database Schema for Admin Features

Run this SQL in your Supabase SQL Editor to add the new tables for meal and workout management.

## Step-by-Step Instructions

1. Go to https://supabase.com and log in
2. Click on your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy **all the SQL code below** (not including the triple backticks)
6. Paste it into the SQL Editor
7. Click **Run**

## SQL Schema

```sql
-- Create diet_meals table for storing meal recipes created by coaches
create table if not exists diet_meals (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  calories integer not null,
  protein numeric not null,
  carbs numeric not null,
  fats numeric not null,
  ingredients text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create workouts table for storing workout exercises created by coaches
create table if not exists workouts (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  sets integer not null,
  reps integer not null,
  directions text,
  video_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on diet_meals
alter table diet_meals enable row level security;

-- RLS Policy: Coaches can view their own meals
create policy "Coaches can view their own meals"
  on diet_meals for select
  using (auth.uid() = coach_id);

-- RLS Policy: Coaches can create meals
create policy "Coaches can create meals"
  on diet_meals for insert
  with check (auth.uid() = coach_id);

-- RLS Policy: Coaches can update their own meals
create policy "Coaches can update their own meals"
  on diet_meals for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- RLS Policy: Coaches can delete their own meals
create policy "Coaches can delete their own meals"
  on diet_meals for delete
  using (auth.uid() = coach_id);

-- Enable RLS on workouts
alter table workouts enable row level security;

-- RLS Policy: Coaches can view their own workouts
create policy "Coaches can view their own workouts"
  on workouts for select
  using (auth.uid() = coach_id);

-- RLS Policy: Coaches can create workouts
create policy "Coaches can create workouts"
  on workouts for insert
  with check (auth.uid() = coach_id);

-- RLS Policy: Coaches can update their own workouts
create policy "Coaches can update their own workouts"
  on workouts for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- RLS Policy: Coaches can delete their own workouts
create policy "Coaches can delete their own workouts"
  on workouts for delete
  using (auth.uid() = coach_id);

-- Create indexes for better query performance
create index if not exists diet_meals_coach_id_idx on diet_meals(coach_id);
create index if not exists diet_meals_created_at_idx on diet_meals(created_at);
create index if not exists workouts_coach_id_idx on workouts(coach_id);
create index if not exists workouts_created_at_idx on workouts(created_at);

-- Add helpful comments
comment on table diet_meals is 'Meal recipes created by coaches for their clients';
comment on column diet_meals.coach_id is 'The coach/admin who created this meal';
comment on column diet_meals.calories is 'Total calories in the meal';
comment on column diet_meals.image_url is 'URL to the meal image';

comment on table workouts is 'Workout exercises created by coaches for their clients';
comment on column workouts.coach_id is 'The coach/admin who created this workout';
comment on column workouts.sets is 'Number of sets to perform';
comment on column workouts.reps is 'Number of reps per set';
comment on column workouts.video_url is 'URL to the exercise demonstration video';
```

## Verification

After running the SQL, you should see:

- ✅ Two new tables in the left sidebar: `diet_meals` and `workouts`
- ✅ No error messages in the SQL Editor
- ✅ A success message

## What These Tables Do

### diet_meals Table

Stores meal recipes that coaches create:

- Name, description, and image of the meal
- Calorie and macronutrient information (protein, carbs, fats)
- List of ingredients
- Associated with the coach who created it

### workouts Table

Stores workout exercises that coaches create:

- Name, description, and directions for performing the exercise
- Sets and reps configuration
- Optional video URL demonstrating the exercise
- Associated with the coach who created it

## Security

Both tables have Row Level Security (RLS) enabled with policies that ensure:

- Only the coach who created an item can view/edit/delete it
- Coaches can only see their own meals and workouts
- Other users cannot access these items

## Next Steps

Now you can use the admin screens to:

1. **Manage Meals**: Create, view, edit, and delete meal recipes
2. **Manage Workouts**: Create, view, edit, and delete workout exercises

The app will now fully support admin functionality for meal and workout management!
