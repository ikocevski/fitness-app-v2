-- Add comprehensive RLS policies for diet plans and related tables
-- Run this in Supabase SQL Editor

-- ==========================
-- DIET PLANS RLS POLICIES
-- ==========================

ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "diet_plans_select" ON diet_plans;
DROP POLICY IF EXISTS "diet_plans_select_as_client" ON diet_plans;
DROP POLICY IF EXISTS "diet_plans_select_as_coach" ON diet_plans;
DROP POLICY IF EXISTS "diet_plans_insert" ON diet_plans;
DROP POLICY IF EXISTS "diet_plans_update" ON diet_plans;
DROP POLICY IF EXISTS "diet_plans_delete" ON diet_plans;

-- Policy: Users can see diet plans assigned to them (clients)
CREATE POLICY "diet_plans_select_as_client"
ON diet_plans
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Coaches can see plans they created
CREATE POLICY "diet_plans_select_as_coach"
ON diet_plans
FOR SELECT
USING (auth.uid() = created_by);

-- Policy: Only coaches can create diet plans
CREATE POLICY "diet_plans_insert"
ON diet_plans
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Policy: Only coaches can update plans they created
CREATE POLICY "diet_plans_update"
ON diet_plans
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Policy: Only coaches can delete plans they created
CREATE POLICY "diet_plans_delete"
ON diet_plans
FOR DELETE
USING (auth.uid() = created_by);

-- ==========================
-- DIET MEALS RLS POLICIES
-- ==========================

ALTER TABLE diet_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diet_meals_select" ON diet_meals;
DROP POLICY IF EXISTS "diet_meals_insert" ON diet_meals;
DROP POLICY IF EXISTS "diet_meals_update" ON diet_meals;
DROP POLICY IF EXISTS "diet_meals_delete" ON diet_meals;

-- Coaches can create and modify their own meals
CREATE POLICY "diet_meals_insert"
ON diet_meals
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "diet_meals_update"
ON diet_meals
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "diet_meals_delete"
ON diet_meals
FOR DELETE
USING (auth.uid() = created_by);

-- Clients can see meals from their assigned plans
-- Coaches can see all meals they created
CREATE POLICY "diet_meals_select"
ON diet_meals
FOR SELECT
USING (
  auth.uid() = created_by
  OR
  EXISTS (
    SELECT 1 FROM diet_plans dp
    INNER JOIN diet_plan_meals dpm ON dpm.diet_plan_id = dp.id
    WHERE dpm.diet_meal_id = diet_meals.id
    AND dp.user_id = auth.uid()
  )
);

-- ==========================
-- DIET PLAN MEALS RLS POLICIES
-- ==========================

ALTER TABLE diet_plan_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diet_plan_meals_select" ON diet_plan_meals;
DROP POLICY IF EXISTS "diet_plan_meals_insert" ON diet_plan_meals;
DROP POLICY IF EXISTS "diet_plan_meals_update" ON diet_plan_meals;
DROP POLICY IF EXISTS "diet_plan_meals_delete" ON diet_plan_meals;
DROP POLICY IF EXISTS "diet_plan_meals_manage" ON diet_plan_meals;

CREATE POLICY "diet_plan_meals_select"
ON diet_plan_meals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_meals.diet_plan_id
    AND (dp.user_id = auth.uid() OR dp.created_by = auth.uid())
  )
);

CREATE POLICY "diet_plan_meals_insert"
ON diet_plan_meals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_meals.diet_plan_id
    AND dp.created_by = auth.uid()
  )
);

CREATE POLICY "diet_plan_meals_update"
ON diet_plan_meals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_meals.diet_plan_id
    AND dp.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_meals.diet_plan_id
    AND dp.created_by = auth.uid()
  )
);

CREATE POLICY "diet_plan_meals_delete"
ON diet_plan_meals
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM diet_plans dp
    WHERE dp.id = diet_plan_meals.diet_plan_id
    AND dp.created_by = auth.uid()
  )
);

-- ==========================
-- VERIFY POLICIES (Test these)
-- ==========================

-- Test as coach: should see only plans they created
-- SELECT * FROM diet_plans WHERE role = 'admin';

-- Test as client: should see only plans assigned to them
-- SELECT * FROM diet_plans WHERE role = 'client';
