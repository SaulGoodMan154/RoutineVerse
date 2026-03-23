-- =============================================
-- HabitTracker - Supabase Setup SQL
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

-- 1. habits table
CREATE TABLE IF NOT EXISTS habits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL UNIQUE,
  habit_list jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2. habit_tracking table
CREATE TABLE IF NOT EXISTS habit_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  date date NOT NULL,
  habit_status jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 3. memorable_moments table
CREATE TABLE IF NOT EXISTS memorable_moments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  date date NOT NULL,
  moment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- =============================================
-- Enable RLS
-- =============================================
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorable_moments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies (allow all ops for anon key since
-- user_id is an email, not Supabase auth UID)
-- =============================================

-- habits
CREATE POLICY "Allow all for habits" ON habits
  FOR ALL USING (true) WITH CHECK (true);

-- habit_tracking
CREATE POLICY "Allow all for habit_tracking" ON habit_tracking
  FOR ALL USING (true) WITH CHECK (true);

-- memorable_moments
CREATE POLICY "Allow all for memorable_moments" ON memorable_moments
  FOR ALL USING (true) WITH CHECK (true);
