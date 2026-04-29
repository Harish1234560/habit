DROP POLICY "Anyone can submit a request" ON public.pending_signups;

CREATE POLICY "Anyone can submit a valid request"
ON public.pending_signups FOR INSERT
WITH CHECK (
  email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(email) <= 255
  AND (display_name IS NULL OR length(display_name) <= 100)
  AND (note IS NULL OR length(note) <= 500)
  AND status = 'pending'
);