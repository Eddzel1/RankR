-- ============================================
-- RankR App - Supabase Setup SQL
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create the comparisons table
CREATE TABLE IF NOT EXISTS public.comparisons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  winner_id uuid REFERENCES public.students(id) NOT NULL,
  loser_id uuid REFERENCES public.students(id) NOT NULL,
  voted_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for comparisons table
CREATE POLICY "Authenticated users can insert comparisons"
  ON public.comparisons FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read comparisons"
  ON public.comparisons FOR SELECT
  TO authenticated
  USING (true);

-- 3. RLS Policies for students table (allow authenticated reads)
-- Only run this if you don't already have a SELECT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Authenticated users can read students'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read students" ON public.students FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 4. RLS Policies for admin_users table (allow authenticated reads)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'Authenticated users can read admin_users'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read admin_users" ON public.admin_users FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 5. Create index for faster ranking queries
CREATE INDEX IF NOT EXISTS idx_comparisons_winner ON public.comparisons(winner_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_loser ON public.comparisons(loser_id);
