-- VSFit Gym - Migration: Fix Workout-Plan Association
-- This migration adds missing tables and columns for premium workout features

-- 1. Create Plans Table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id UUID NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  duration_months INT DEFAULT 0,
  duration_days INT,
  is_featured BOOLEAN DEFAULT FALSE,
  tagline TEXT,
  features JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT plan_duration_check CHECK (duration_months > 0 OR duration_days > 0)
);

-- 2. Create Subscriptions Table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'pending')) DEFAULT 'pending',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, plan_id)
);

-- 3. Alter Workouts Table - Add missing columns
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- 4. Enable Row Level Security on Plans Table
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Plans Table
-- Personals can manage their own plans
CREATE POLICY "Personals can manage their plans" 
ON plans FOR ALL 
USING (auth.uid() = personal_id)
WITH CHECK (auth.uid() = personal_id);

-- Students can view plans from their personals
CREATE POLICY "Students can view their personal's plans" 
ON plans FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM subscriptions 
  WHERE subscriptions.plan_id = plans.id 
  AND subscriptions.student_id = auth.uid()
  AND subscriptions.status = 'active'
));

-- Public can view featured plans
CREATE POLICY "Public can view featured plans" 
ON plans FOR SELECT 
USING (is_featured = TRUE);

-- 6. Enable Row Level Security on Subscriptions Table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for Subscriptions Table
-- Students can view their own subscriptions
CREATE POLICY "Students can view their subscriptions" 
ON subscriptions FOR SELECT 
USING (auth.uid() = student_id);

-- Personals can manage subscriptions for their plans
CREATE POLICY "Personals can view subscriptions for their plans" 
ON subscriptions FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM plans 
  WHERE plans.id = subscriptions.plan_id 
  AND plans.personal_id = auth.uid()
));

-- 8. Update Workouts RLS - Add plan-based access
-- Students can view workouts assigned to their active plans
CREATE POLICY "Students can view workouts from their active subscriptions" 
ON workouts FOR SELECT 
USING (
  (auth.uid() = student_id)
  OR
  (
    is_premium = TRUE 
    AND EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE subscriptions.plan_id = workouts.plan_id
      AND subscriptions.student_id = auth.uid()
      AND subscriptions.status = 'active'
      AND NOW() <= subscriptions.end_date
    )
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plans_personal_id ON plans(personal_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_student_id ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_workouts_plan_id ON workouts(plan_id);
CREATE INDEX IF NOT EXISTS idx_workouts_is_premium ON workouts(is_premium);
