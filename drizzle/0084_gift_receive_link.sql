-- A receive link: the receive code, sent as a link (LINE, mail). Whoever holds it sees the box's
-- cover before signing in (the child's name and who it's from, nothing inside), may sign up
-- without the invite code like someone handed a story, and receives it once signed in.

-- Whether a box can be received with this code now.
CREATE OR REPLACE FUNCTION gift_receivable(b gift_boxes) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT b.receive_code_hash IS NOT NULL AND b.receive_code_expires_at > now() AND b.deliver_on <= current_date
     AND (b.status = 'open' OR (b.delivered_via = 'pdf' AND b.delivered_to IS NULL))
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION gift_receivable(gift_boxes) FROM PUBLIC;
--> statement-breakpoint

-- The cover, for a code that can be received now: the child's name, and the writers as they
-- signed (their label, else their role). Nothing for any other code.
CREATE OR REPLACE FUNCTION gift_link_peek(p_code_hash text)
RETURNS TABLE (child_name text, writers jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT b.child_name,
         coalesce((SELECT jsonb_agg(jsonb_build_object('label', w.label, 'role', w.role) ORDER BY w.joined_at)
                   FROM gift_writers w WHERE w.box_id = b.id AND w.removed_at IS NULL), '[]'::jsonb)
  FROM gift_boxes b
  WHERE b.receive_code_hash = p_code_hash AND gift_receivable(b)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION gift_link_peek(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION gift_link_peek(text) TO mosaic_app;
--> statement-breakpoint

-- As before, and a gift box's receive link is an invitation too (while it can be received).
CREATE OR REPLACE FUNCTION invite_valid(p_kind text, p_token_hash text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE p_kind
    WHEN 'work' THEN EXISTS (SELECT 1 FROM work_links WHERE token_hash = p_token_hash AND revoked_at IS NULL AND expires_at > now())
    WHEN 'share' THEN EXISTS (SELECT 1 FROM profile_shares WHERE token_hash = p_token_hash AND revoked_at IS NULL AND expires_at > now() AND (max_uses IS NULL OR use_count < max_uses))
    WHEN 'gift' THEN EXISTS (SELECT 1 FROM gift_boxes b WHERE b.receive_code_hash = p_token_hash AND gift_receivable(b))
    ELSE false
  END;
$$;
