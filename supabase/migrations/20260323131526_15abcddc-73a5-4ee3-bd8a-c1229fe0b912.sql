
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  student_name text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS method text DEFAULT 'cash';

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
