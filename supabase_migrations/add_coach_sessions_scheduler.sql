create table if not exists coach_sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references users(id) on delete cascade,
  client_id uuid not null references users(id) on delete cascade,
  title text not null,
  session_at timestamptz not null,
  duration_minutes integer not null default 60,
  status text not null default 'scheduled' check (status in ('scheduled', 'requested', 'booked', 'completed', 'cancelled')),
  notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coach_sessions_coach_id on coach_sessions(coach_id);
create index if not exists idx_coach_sessions_client_id on coach_sessions(client_id);
create index if not exists idx_coach_sessions_session_at on coach_sessions(session_at);

create table if not exists session_notifications (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references coach_sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_session_notifications_user_id on session_notifications(user_id);
create index if not exists idx_session_notifications_read on session_notifications(read);

alter table coach_sessions enable row level security;
alter table session_notifications enable row level security;

drop policy if exists "coach_sessions_select_policy" on coach_sessions;
create policy "coach_sessions_select_policy"
  on coach_sessions
  for select
  using (auth.uid() = coach_id or auth.uid() = client_id);

drop policy if exists "coach_sessions_insert_policy" on coach_sessions;
create policy "coach_sessions_insert_policy"
  on coach_sessions
  for insert
  with check (auth.uid() = coach_id or auth.uid() = client_id);

drop policy if exists "coach_sessions_update_policy" on coach_sessions;
create policy "coach_sessions_update_policy"
  on coach_sessions
  for update
  using (auth.uid() = coach_id or auth.uid() = client_id)
  with check (auth.uid() = coach_id or auth.uid() = client_id);

drop policy if exists "session_notifications_select_policy" on session_notifications;
create policy "session_notifications_select_policy"
  on session_notifications
  for select
  using (auth.uid() = user_id);

drop policy if exists "session_notifications_insert_policy" on session_notifications;
create policy "session_notifications_insert_policy"
  on session_notifications
  for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1
      from coach_sessions cs
      where cs.id = session_id
        and (cs.coach_id = auth.uid() or cs.client_id = auth.uid())
    )
  );
