-- /go/<slug> click counter.
--
-- The site talks to Supabase with the public anon key, whose RLS policy only
-- permits SELECT. This function runs as its owner (security definer) so the
-- anon role can bump `clicks` without being granted UPDATE on the table.
--
-- Apply in the Supabase SQL editor (project clahebrsbyqptkfoqogq) or via
-- `supabase db push`.

create or replace function public.increment_clicks(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.reel_posts
     set clicks = coalesce(clicks, 0) + 1
   where slug = p_slug
     and type = 'tool';
$$;

-- Lock it down: only the roles the web tier uses may call it.
revoke all on function public.increment_clicks(text) from public;
grant execute on function public.increment_clicks(text) to anon, authenticated, service_role;
