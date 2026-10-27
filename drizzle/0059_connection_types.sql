-- The type behind each person's initial, for the people I'm connected with whose calling card
-- shows their type (and only them). Returns the chart (for its type) or the types they picked.
CREATE OR REPLACE FUNCTION connection_types(p_users uuid[]) RETURNS TABLE (user_id uuid, chart jsonb, self_types text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me uuid := app_current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT p.user_id,
           (SELECT c.chart FROM tuvi_charts c WHERE c.user_id = p.user_id AND c.is_current LIMIT 1),
           p.self_types
      FROM profiles p
     WHERE p.user_id = ANY (p_users[1:200])
       AND p.user_id <> me
       AND 'type' = ANY (coalesce(p.card_items, ARRAY[]::text[]))
       AND EXISTS (SELECT 1 FROM comparison_sessions s
                    WHERE s.status = 'active'
                      AND ((s.user_a = me AND s.user_b = p.user_id) OR (s.user_b = me AND s.user_a = p.user_id)));
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION connection_types(uuid[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION connection_types(uuid[]) TO mosaic_app;
