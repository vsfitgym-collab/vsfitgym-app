-- VSFit Gym - FIXED RLS Policies (Simplified)
-- Drop existing broken policies
DROP POLICY IF EXISTS "Personals can manage their plans" ON plans;
DROP POLICY IF EXISTS "Students can view their personal's plans" ON plans;
DROP POLICY IF EXISTS "Public can view featured plans" ON plans;
DROP POLICY IF EXISTS "Students can view their subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Personals can view subscriptions for their plans" ON subscriptions;
DROP POLICY IF EXISTS "Students can view workouts from their active subscriptions" ON workouts;

-- ============================================
-- PLANS TABLE - SIMPLIFIED RLS
-- ============================================

-- 1. Personals can SELECT their own plans
CREATE POLICY "Personals can select their own plans" 
ON plans FOR SELECT 
USING (auth.uid() = personal_id);

-- 2. Personals can INSERT plans
CREATE POLICY "Personals can insert plans" 
ON plans FOR INSERT 
WITH CHECK (auth.uid() = personal_id);

-- 3. Personals can UPDATE their own plans
CREATE POLICY "Personals can update their own plans" 
ON plans FOR UPDATE 
USING (auth.uid() = personal_id)
WITH CHECK (auth.uid() = personal_id);

-- 4. Personals can DELETE their own plans
CREATE POLICY "Personals can delete their own plans" 
ON plans FOR DELETE 
USING (auth.uid() = personal_id);

-- 5. Students can view featured plans
CREATE POLICY "Students can view featured plans" 
ON plans FOR SELECT 
USING (is_featured = TRUE);

-- ============================================
-- SUBSCRIPTIONS TABLE - SIMPLIFIED RLS
-- ============================================

-- 1. Students can SELECT their own subscriptions
CREATE POLICY "Students can select their subscriptions" 
ON subscriptions FOR SELECT 
USING (auth.uid() = student_id);

-- 2. Students can INSERT subscriptions (when buying)
CREATE POLICY "Students can insert subscriptions" 
ON subscriptions FOR INSERT 
WITH CHECK (auth.uid() = student_id);

-- 3. Trainers can view subscriptions for their plans
CREATE POLICY "Trainers can view subscriptions for their plans" 
ON subscriptions FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM plans 
  WHERE plans.id = subscriptions.plan_id 
  AND plans.personal_id = auth.uid()
));

-- ============================================
-- WORKOUTS TABLE - ADD MISSING POLICIES
-- ============================================

-- 1. Users can view their own workouts (already exists, but make sure it's there)
CREATE POLICY "Users can view their workouts" 
ON workouts FOR SELECT 
USING (auth.uid() = student_id OR auth.uid() = personal_id);

-- 2. Personals can manage workouts (UPDATE, DELETE)
CREATE POLICY "Personals can update their workouts" 
ON workouts FOR UPDATE 
USING (auth.uid() = personal_id)
WITH CHECK (auth.uid() = personal_id);

CREATE POLICY "Personals can delete their workouts" 
ON workouts FOR DELETE 
USING (auth.uid() = personal_id);

-- 3. Students can view workouts from their active subscriptions (PREMIUM)
CREATE POLICY "Students can view premium workouts from subscriptions" 
ON workouts FOR SELECT 
USING (
  is_premium = TRUE 
  AND EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE subscriptions.plan_id = workouts.plan_id
    AND subscriptions.student_id = auth.uid()
    AND subscriptions.status = 'active'
  )
);
