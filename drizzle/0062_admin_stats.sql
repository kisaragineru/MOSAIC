-- Numbers for the people running MOSAIC (the app checks who is an admin before asking): counts
-- only, never anyone's content. Test accounts (companions, trials) are left out.
CREATE OR REPLACE FUNCTION admin_stats() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH real_users AS (
    SELECT id, created_at FROM users
     WHERE email NOT LIKE '%@companion.invalid' AND email NOT LIKE '%@trial.mosaic.invalid'
  )
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM real_users),
    'users_7d', (SELECT count(*) FROM real_users WHERE created_at > now() - interval '7 days'),
    'users_30d', (SELECT count(*) FROM real_users WHERE created_at > now() - interval '30 days'),
    'active_7d', (SELECT count(DISTINCT s.user_id) FROM sessions s JOIN real_users u ON u.id = s.user_id WHERE s.created_at > now() - interval '7 days'),
    'charts', (SELECT count(DISTINCT c.user_id) FROM tuvi_charts c JOIN real_users u ON u.id = c.user_id WHERE c.is_current),
    'records_7d', (SELECT count(*) FROM memory_entries m JOIN real_users u ON u.id = m.user_id WHERE m.created_at > now() - interval '7 days'),
    'answers_7d', (SELECT count(*) FROM question_responses r JOIN real_users u ON u.id = r.user_id WHERE r.answered_at > now() - interval '7 days'),
    'connections', (SELECT count(*) FROM comparison_sessions WHERE status = 'active'),
    'messages_7d', (SELECT count(*) FROM dm_messages WHERE created_at > now() - interval '7 days'),
    'works', (SELECT count(*) FROM works),
    'links', (SELECT count(*) FROM work_links),
    'links_opened', (SELECT count(*) FROM work_links WHERE opened_at IS NOT NULL),
    'offers_accepted', (SELECT count(*) FROM work_offers WHERE accepted_at IS NOT NULL)
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION admin_stats() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION admin_stats() TO mosaic_app;
