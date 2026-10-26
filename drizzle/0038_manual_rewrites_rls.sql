-- The AI-rewritten manual: only its owner reads, writes or removes it.
GRANT SELECT, INSERT, UPDATE, DELETE ON manual_rewrites TO mosaic_app;
--> statement-breakpoint
ALTER TABLE manual_rewrites ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_all ON manual_rewrites FOR ALL TO mosaic_app USING (user_id = app_current_user_id()) WITH CHECK (user_id = app_current_user_id());
