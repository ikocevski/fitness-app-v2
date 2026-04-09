# 🎯 Final Step - Database Setup in Supabase

## ✅ What's Done

- ✅ npm install completed
- ✅ .env.local configured with your Supabase credentials
- ✅ supabase.ts cleaned up and reading from .env.local

## 🚀 One Final Step - Create Database Tables

You need to create the `users` table in Supabase. Here's how:

### Step 1: Open SQL Editor in Supabase

1. Go to https://supabase.com and log in
2. Click on your project: **pyppumhjfcgxxuurytzb**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query** button

### Step 2: Copy This SQL Code

Copy all the code below:

```
-- Create users table
create table if not exists users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text,
  role text check (role in ('client', 'admin')) default 'client',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
) tablespace pg_default;

-- Add helpful comments
comment on table users is 'User profiles table';
comment on column users.id is 'User ID from auth.users';
comment on column users.email is 'User email address';
comment on column users.name is 'User full name';
comment on column users.role is 'User role: client or admin';

-- Create indexes
create index if not exists users_email_idx on users (email);
create index if not exists users_role_idx on users (role);

-- Set up Row Level Security (RLS)
alter table users enable row level security;

-- Create RLS policy: Users can read their own data
create policy "Users can read their own data"
  on users for select
  using (auth.uid() = id);

-- Create RLS policy: Users can update their own data
create policy "Users can update their own data"
  on users for update
  using (auth.uid() = id);

-- Create RLS policy: New users can insert their own data
create policy "Users can insert their own data"
  on users for insert
  with check (auth.uid() = id);

-- Create function to automatically create user profile on sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', coalesce(new.raw_user_meta_data->>'role', 'client'));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Create trigger to call the function
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Step 3: Paste into Supabase SQL Editor

1. Click in the text area of the SQL Editor
2. Paste the SQL code
3. Click the **Run** button (or press Cmd+Enter)

### Step 4: Verify Success

You should see:

- ✅ No error messages
- ✅ Results showing the queries executed
- ✅ In the left sidebar under "Tables", you should see the new `users` table

---

## ✨ After That - Test Your App!

Once the SQL runs successfully, you're ready to test:

```bash
npm start
```

Then:

- Press `i` for iOS
- Press `a` for Android
- Press `w` for web

You'll see:

1. **Login Screen** - Try creating a new account with "Sign Up"
2. **Home Screen** - After successful signup/login
3. **Profile Screen** - See your user info and logout button

---

## 🧪 Test Account Steps

1. Click **"Sign Up"** button on login screen
2. Fill in:
   - Full Name: `Test User`
   - Email: `test@example.com`
   - Password: `test123456`
   - Confirm Password: `test123456`
   - Check "I agree to the Terms of Service"
3. Click **"Create Account"**
4. ✅ Should automatically log in and show home screen!

---

## 📝 Your Supabase Project Details

- **Project ID:** pyppumhjfcgxxuurytzb
- **Project URL:** https://pyppumhjfcgxxuurytzb.supabase.co
- **API Key:** (secure - stored in .env.local)

---

## ❓ If Something Goes Wrong

### "Syntax error at or near ````"

→ You copied the markdown formatting. Copy only the SQL code, not the backticks.

### "relation already exists"

→ That's OK! The table already exists. You can run it again safely.

### "Login still doesn't work after signup"

→ Make sure the SQL ran successfully and the `users` table exists

### "Need to see the SQL file location?"

→ Check `SQL_SETUP.md` in your project root

---

## ✅ Checklist

```
☐ Go to Supabase dashboard
☐ Click SQL Editor → New Query
☐ Copy the SQL code above
☐ Paste into SQL Editor
☐ Click Run
☐ Verify no errors
☐ See `users` table in left sidebar
☐ Run: npm start
☐ Test signup/login flow
☐ 🎉 Done!
```

---

**That's it! You're almost done. Just run that SQL in Supabase and you'll be ready to go! 🚀**
