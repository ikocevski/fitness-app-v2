-- Enable coaches to view weight logs for their linked clients
-- Safe to run multiple times

ALTER TABLE IF EXISTS weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weight_logs_select_own" ON weight_logs;
DROP POLICY IF EXISTS "weight_logs_insert_own" ON weight_logs;
DROP POLICY IF EXISTS "weight_logs_update_own" ON weight_logs;
DROP POLICY IF EXISTS "weight_logs_delete_own" ON weight_logs;
DROP POLICY IF EXISTS "weight_logs_select_coach_linked" ON weight_logs;

CREATE POLICY "weight_logs_select_own"
ON weight_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "weight_logs_select_coach_linked"
ON weight_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM coach_clients cc
    WHERE cc.coach_id = auth.uid()
      AND cc.client_id = weight_logs.user_id
  )
);

CREATE POLICY "weight_logs_insert_own"
ON weight_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weight_logs_update_own"
ON weight_logs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weight_logs_delete_own"
ON weight_logs
FOR DELETE
USING (auth.uid() = user_id);
