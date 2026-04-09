# 🏗️ Admin Features Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN APP ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────┘

                            AUTH CONTEXT
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
          Admin User Login              Client User Login
                 │                               │
                 ▼                               ▼
        ┌─────────────────┐          ┌──────────────────┐
        │  Admin Routes   │          │ Client Routes    │
        └────────┬────────┘          └────────┬─────────┘
                 │                           │
        ┌────────┴────────────┐              │
        ▼                     ▼              ▼
   ┌─────────────────────────────────┐  ┌──────────────┐
   │   ADMIN DASHBOARD TABS          │  │ CLIENT VIEWS │
   ├─────────────────────────────────┤  │              │
   │ 📊 Dashboard                    │  │ 🏠 Home      │
   │ 👥 Clients                      │  │ 🥗 Meals     │
   │ 🥗 Meals                        │  │ 💪 Workouts │
   │ 💪 Workouts                     │  │ 👤 Profile   │
   └────────────┬────────────────────┘  └──────────────┘
                │
     ┌──────────┼──────────┬──────────┐
     ▼          ▼          ▼          ▼
  MANAGE     MANAGE     MANAGE    MANAGE
  CLIENTS    MEALS      WORKOUTS   ETC...
```

---

## Client Management Flow

```
┌──────────────────────────────────────┐
│    Admin: "👥 Manage Clients"        │
└──────────────────┬───────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   [View Clients]        [Add Client]
        │                     │
        │             ┌───────┴────────┐
        │             ▼                ▼
        │         [Search]         [Results]
        │          Email               │
        │             │                │
        │             ▼                ▼
        │        Query Database    [Pick Client]
        │             │                │
        │             ├────────┬───────┘
        │             ▼        ▼
        │        users_role  ✓ Selected
        │        users table
        │             │
        │             ▼
        │        [Display Results]
        │             │
        │             ▼
        │        [Add Button] ──┐
        │             │         │
        │             └─────────┤
        │                       ▼
        │                Insert into
        │               coach_clients
        │                 Table
        │                       │
        │                       ▼
        │                 ✓ Added to
        │                    Roster
        │                       │
        └───────────────────────┘
                   │
                   ▼
              Display in List
              with [✕ Remove]
```

---

## Meal Creation Flow

```
┌─────────────────────────────────────┐
│   Admin: "🥗 Create New Meal"       │
└──────────────┬──────────────────────┘
               │
        ┌──────┴───────┐
        ▼              ▼
   [Form Fields]  [Image Picker]
        │              │
        ├──────────────┼─────────────┐
        ▼              ▼             ▼
     Name        📸 Pick        Client
     Desc        Image          Assignment
     Cal         Preview
     Pro         Upload to    [Select]
     Carb        Storage │
     Fat         │       └──► Modal
     Ing         ▼            │
     │      Compress       Find in
     │      (80%)          clients
     │      │              list
     │      ▼              │
     │      Encode         ▼
     │      Base64    [Checkmark]
     │      │         Selection
     │      ▼
     │      Upload to
     │      Supabase
     │      │
     │      ▼
     │      Get Public URL
     │
     └──────────────┬───────────────┐
                    ▼               ▼
              [Save Meal]    or  [Cancel]
                    │
                    ▼
            Insert into
           diet_meals with:
           - All form data
           - image_url (if uploaded)
           - coach_id (current admin)
           - assigned_to_client_id (if selected)
                    │
                    ▼
              ✓ Success
                    │
                    ▼
              Display in
              Meal List
```

---

## Client Visibility System

```
┌─────────────────────────────────────────────────────┐
│           MEAL VISIBILITY LOGIC                     │
└─────────────────────────────────────────────────────┘

Database Query:
SELECT * FROM diet_meals
WHERE coach_id = (admin.id)
  AND (
    assigned_to_client_id IS NULL         ← Available to all
    OR
    assigned_to_client_id = (client.id)   ← Assigned to this client
  )


Example Data:
┌─────────────────────────────────────────┐
│ meal_id │ meal_name        │ assigned_to │
├─────────┼──────────────────┼─────────────┤
│ 1       │ Protein Shake    │ NULL        │  ← For ALL
│ 2       │ Chicken Salad    │ mike_id     │  ← For Mike
│ 3       │ Keto Pizza       │ sarah_id    │  ← For Sarah
│ 4       │ Salmon Bowl      │ NULL        │  ← For ALL
└─────────────────────────────────────────┘

What Mike Sees:
┌─────────────────────────────────────────┐
│ meal_id │ meal_name        │ assigned_to │
├─────────┼──────────────────┼─────────────┤
│ 1       │ Protein Shake    │ NULL        │ ✓
│ 2       │ Chicken Salad    │ mike_id     │ ✓
│ 4       │ Salmon Bowl      │ NULL        │ ✓
└─────────────────────────────────────────┘

What Sarah Sees:
┌─────────────────────────────────────────┐
│ meal_id │ meal_name        │ assigned_to │
├─────────┼──────────────────┼─────────────┤
│ 1       │ Protein Shake    │ NULL        │ ✓
│ 3       │ Keto Pizza       │ sarah_id    │ ✓
│ 4       │ Salmon Bowl      │ NULL        │ ✓
└─────────────────────────────────────────┘
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────┐
│                SUPABASE SCHEMA                      │
└─────────────────────────────────────────────────────┘

auth.users
├─ id (UUID)
├─ email
├─ created_at
└─ raw_user_meta_data
   └─ name

users_role (NEW)
├─ id (UUID PK)
├─ user_id (FK → auth.users)
├─ role ('client' | 'admin')
└─ created_at

coach_clients (NEW)
├─ id (UUID PK)
├─ coach_id (FK → auth.users)
├─ client_id (FK → auth.users)
├─ assigned_at
└─ UNIQUE(coach_id, client_id)

diet_meals
├─ id (UUID PK)
├─ coach_id (FK → auth.users)
├─ name
├─ description
├─ calories
├─ protein
├─ carbs
├─ fats
├─ ingredients
├─ image_url (NEW - nullable)
├─ assigned_to_client_id (NEW - nullable, FK → auth.users)
└─ created_at

workouts
├─ id (UUID PK)
├─ coach_id (FK → auth.users)
├─ name
├─ description
├─ sets
├─ reps
├─ directions
├─ video_url
├─ assigned_to_client_id (NEW - nullable, FK → auth.users)
└─ created_at

storage.meal-images (NEW)
└─ images stored as: meal_<timestamp>.jpg
```

---

## Component Hierarchy

```
RootNavigator
│
├─ Stack.Screen: Admin
│  │
│  └─ AdminTabNavigator
│     │
│     ├─ Tab.Screen: Dashboard
│     │  └─ DashboardScreen
│     │
│     ├─ Tab.Screen: Clients
│     │  └─ ManageClientsScreen ✨ ENHANCED
│     │     ├─ FlatList (clients)
│     │     └─ Modal: AddClient
│     │        ├─ TextInput: email search
│     │        └─ FlatList: search results
│     │
│     ├─ Tab.Screen: Meals
│     │  └─ ManageDietsScreen ✨ ENHANCED
│     │     ├─ ScrollView (meals)
│     │     ├─ Button: Create Meal
│     │     └─ Modal: CreateEdit Meal
│     │        ├─ TextInputs: form fields
│     │        ├─ ImagePicker: image
│     │        └─ Modal: Client Selector
│     │           └─ FlatList: clients
│     │
│     └─ Tab.Screen: Workouts
│        └─ ManageWorkoutsScreen ✨ ENHANCED
│           ├─ ScrollView (workouts)
│           ├─ Button: Create Workout
│           └─ Modal: CreateEdit Workout
│              ├─ TextInputs: form fields
│              ├─ VideoPicker: video
│              └─ Modal: Client Selector
│                 └─ FlatList: clients
│
└─ Stack.Screen: Client
   │
   └─ ClientTabNavigator
      │
      ├─ Tab.Screen: Home
      │  └─ HomeScreen
      │
      ├─ Tab.Screen: Workouts
      │  └─ WorkoutScreen
      │     └─ Filtered: assigned + unassigned
      │
      ├─ Tab.Screen: Diet
      │  └─ DietScreen
      │     └─ Filtered: assigned + unassigned
      │
      └─ Tab.Screen: Profile
         └─ ProfileScreen
```

---

## State Flow

```
┌──────────────────────────────────────┐
│         CONTEXT STATE                │
├──────────────────────────────────────┤
│ AuthContext:                         │
│ ├─ user (admin or client)            │
│ ├─ user.id                           │
│ ├─ user.role ('admin' | 'client')    │
│ └─ loading                           │
└──────────────────────────────────────┘
         │
         │ useAuth()
         ▼
┌──────────────────────────────────────┐
│    COMPONENT LOCAL STATE             │
├──────────────────────────────────────┤
│ ManageDietsScreen:                   │
│ ├─ meals[]                           │
│ ├─ clients[]                         │
│ ├─ selectedClient                    │
│ ├─ formData {}                       │
│ ├─ selectedImage                     │
│ ├─ showModal                         │
│ └─ loading                           │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│     SIDE EFFECTS                     │
├──────────────────────────────────────┤
│ useEffect(() => {                    │
│   fetchMeals()                       │
│   fetchClients()                     │
│ }, [])                               │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│    SUPABASE QUERIES                  │
├──────────────────────────────────────┤
│ from('diet_meals')                   │
│   .select()                          │
│   .eq('coach_id', user.id)           │
│                                      │
│ from('coach_clients')                │
│   .select()                          │
│   .eq('coach_id', user.id)           │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│    STATE UPDATE                      │
├──────────────────────────────────────┤
│ setMeals(data)                       │
│ setClients(data)                     │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│    UI RENDER                         │
├──────────────────────────────────────┤
│ FlatList with meals                  │
│ Modal with form                      │
│ Client selector                      │
└──────────────────────────────────────┘
```

---

## Data Flow: Create & Assign Meal

```
USER INPUT
    │
    ▼
┌──────────────────┐
│ Admin fills form │
│ + Selects image  │
│ + Selects client │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Validates Form  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Compress Image  │
│  (if provided)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Upload to Cloud │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Get Public URL   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ Build Meal Object:       │
│ {                        │
│   name,                  │
│   description,           │
│   calories,              │
│   protein,               │
│   carbs,                 │
│   fats,                  │
│   ingredients,           │
│   image_url,    ← NEW    │
│   coach_id,              │
│   assigned_to_client_id  │ ← NEW
│ }                        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────┐
│ Save to Database │
│ (diet_meals)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Show Success     │
│ Close Modal      │
│ Refresh List     │
└────────┬─────────┘
         │
         ▼
    DISPLAY MEAL
    WITH IMAGE &
    ASSIGNMENT
```

---

## Key Interactions

```
ADMIN WORKFLOW                   CLIENT WORKFLOW
─────────────────                ───────────────

1. Add Client
   ├─ Search email
   ├─ Select result
   └─ Client added to roster
                                  1. View Meals
                                  ├─ Query filters:
                                  │  ├─ unassigned (NULL)
                                  │  └─ assigned to them
                                  └─ Display filtered

2. Create Meal
   ├─ Fill form
   ├─ Pick image
   ├─ Select client
   └─ Save
                                  2. Can see:
                                  ├─ Their meals
                                  ├─ Shared meals
                                  └─ Not others' meals

3. Edit Meal
   ├─ Change client
   ├─ Update macros
   └─ Save
                                  3. See updates:
                                  ├─ Real-time
                                  ├─ On refresh
                                  └─ On app restart

4. Delete Meal
   ├─ Confirm
   └─ Removed
                                  4. Meal gone:
                                  ├─ If was theirs
                                  └─ Or was shared
```

---

**Architecture is modular, scalable, and secure!** 🏗️
