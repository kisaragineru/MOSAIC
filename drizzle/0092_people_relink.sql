-- One card per person: connecting again with someone whose connection had ended re-attaches each
-- side's card about the other (the one linked to their latest ended connection), instead of
-- leaving a new connection to be filed as a second card. Runs for every way a connection starts.
CREATE OR REPLACE FUNCTION comparison_session_relink() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE people p SET connection_session_id = NEW.id, updated_at = now()
   WHERE p.id IN (
     SELECT DISTINCT ON (pe.user_id) pe.id
       FROM people pe
       JOIN comparison_sessions s ON s.id = pe.connection_session_id
      WHERE s.status = 'revoked' AND s.id <> NEW.id
        AND pe.user_id IN (NEW.user_a, NEW.user_b)
        AND s.user_a IN (NEW.user_a, NEW.user_b) AND s.user_b IN (NEW.user_a, NEW.user_b)
      ORDER BY pe.user_id, s.revoked_at DESC NULLS LAST, pe.updated_at DESC
   );
  RETURN NEW;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION comparison_session_relink() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER comparison_sessions_relink AFTER INSERT ON comparison_sessions
  FOR EACH ROW EXECUTE FUNCTION comparison_session_relink();
