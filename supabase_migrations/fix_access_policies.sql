-- Fix access and visibility policies for workouts + diets
-- Safe to run multiple times

-- =========================
-- WORKOUT TABLES
-- =========================
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_plans_select" ON workout_plans;
DROP POLICY IF EXISTS "workout_plans_insert" ON workout_plans;
DROP POLICY IF EXISTS "workout_plans_update" ON workout_plans;
DROP POLICY IF EXISTS "workout_plans_delete" ON workout_plans;

CREATE POLICY "workout_plans_select"
ON workout_plans
FOR SELECT
USING (
  auth.uid() = coach_id
  OR auth.uid() = client_id
  OR client_id IS NULL
);

CREATE POLICY "workout_plans_insert"
ON workout_plans
FOR INSERT
WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "workout_plans_update"
ON workout_plans
FOR UPDATE
USING (auth.uid() = coach_id)
WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "workout_plans_delete"
ON workout_plans
FOR DELETE
USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "workout_days_select" ON workout_days;
DROP POLICY IF EXISTS "workout_days_manage" ON workout_days;

CREATE POLICY "workout_days_select"
ON workout_days
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM workout_plans wp
    WHERE wp.id = workout_days.plan_id
      AND (wp.coach_id = auth.uid() OR wp.client_id = auth.uid() OR wp.client_id IS NULL)
  )
);

CREATE POLICY "workout_days_manage"
ON workout_days
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM workout_plans wp
    WHERE wp.id = workout_days.plan_id
      AND wp.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_plans wp
    WHERE wp.id = workout_days.plan_id
      AND wp.coach_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "workout_exercises_select" ON workout_exercises;
DROP POLICY IF EXISTS "workout_exercises_manage" ON workout_exercises;

CREATE POLICY "workout_exercises_select"
ON workout_exercises
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM workout_days wd
    JOIN workout_plans wp ON wp.id = wd.plan_id
    WHERE wd.id = workout_exercises.day_id
      AND (wp.coach_id = auth.uid() OR wp.client_id = auth.uid() OR wp.client_id IS NULL)
  )
);

CREATE POLICY "workout_exercises_manage"
ON workout_exercises
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM workout_days wd
    JOIN workout_plans wp ON wp.id = wd.plan_id
    WHERE wd.id = workout_exercises.day_id
      AND wp.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_days wd
    JOIN workout_plans wp ON wp.id = wd.plan_id
    WHERE wd.id = workout_exercises.day_id
      AND wp.coach_id = auth.uid()
  )
);

-- =========================
-- DIET TABLES
-- =========================
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plan_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diet_plans_select" ON diet_plans;
DROP POLICY IF EXISTS "diet_plans_insert" ON diet_plans;
DROP POLICY IF EXISTS "diet_plans_update" ON diet_plans;
DROP POLICY IF EXISTS "diet_plans_delete" ON diet_plans;

CREATE POLICY "diet_plans_select"
ON diet_plans
FOR SELECT
USING (
  auth.uid() = created_by
  OR auth.uid() = user_id
);

CREATE POLICY "diet_plans_insert"
ON diet_plans
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "diet_plans_update"
ON diet_plans
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "diet_plans_delete"
ON diet_plans
FOR DELETE
USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "diet_meals_select" ON diet_meals;
DROP POLICY IF EXISTS "diet_meals_insert" ON diet_meals;
DROP POLICY IF EXISTS "diet_meals_update" ON diet_meals;
DROP POLICY IF EXISTS "diet_meals_delete" ON diet_meals;

CREATE POLICY "diet_meals_select"
ON diet_meals
FOR SELECT
USING (
  auth.uid() = coach_id
  OR auth.uid() = assigned_to_client_id
  OR EXISTS (
    SELECT 1
    FROM diet_plan_meals dpm
    JOIN diet_plans dp ON dp.id = dpm.diet_plan_id
    WHERE dpm.diet_meal_id = diet_meals.id
      AND dp.user_id = auth.uid()
  )
);

CREATE POLICY "diet_meals_insert"
ON diet_meals
FOR INSERT
WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "diet_meals_update"
ON diet_meals
FOR UPDATE
USING (auth.uid() = coach_id)
WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "diet_meals_delete"
ON diet_meals
FOR DELETE
USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "diet_plan_meals_select" ON diet_plan_meals;
DROP POLICY IF EXISTS "diet_plan_meals_insert" ON diet_plan_meals;
DROP POLICY IF EXISTS "diet_plan_meals_update" ON diet_plan_meals;
DROP POLICY IF EXISTS "diet_plan_meals_delete" ON diet_plan_meals;

CREATE POLICY "diet_plan_meals_select"
ON diet_plan_meals
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM diet_plans dp
    WHERE dp.id = diet_plan_meals.diet_plan_id
      AND (dp.created_by = auth.uid() OR dp.user_id = auth.uid())
  )
);

CREATE POLICY "diet_plan_meals_insert"
ON diet_plan_meals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM diet_plans dp
    WHERE dp.id = diet_plan_meals.diet_plan_id
      AND dp.created_by = auth.uid()
  )
);

CREATE POLICY "diet_plan_meals_update"
ON diet_plan_meals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM diet_plans dp
    WHERE dp.id = diet_plan_meals.diet_plan_id
      AND dp.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM diet_plans dp
    WHERE dp.id = diet_plan_meals.diet_plan_id
      AND dp.created_by = auth.uid()
  )
);

CREATE POLICY "diet_plan_meals_delete"
ON diet_plan_meals
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM diet_plans dp
    WHERE dp.id = diet_plan_meals.diet_plan_id
      AND dp.created_by = auth.uid()
  )
);
