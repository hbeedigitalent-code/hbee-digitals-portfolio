-- APPLICATION / ACCESS ROLLBACK ONLY — owner review; NOT EXECUTED.
-- FIRST owner disables NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED and deploys that build.
-- No DROP/DELETE: retain both child collections, the revision column, parent
-- portfolio data, and legacy gallery_images. Trusted owner/server access remains.
--
-- v3 notes (what this rollback deliberately does NOT undo):
--   * portfolio_media video columns (media_kind, title, description, video_url,
--     captions_url, transcript) and their CHECK constraints stay in place. Revoking
--     browser/anon access below removes ALL public reads of typed assets, so videos
--     disappear publicly; the public template falls back to the legacy gallery.
--   * portfolio_items.engagement_type / project_status stay. They are inert unless
--     the build reads them, and the safe default ('studio_team') cannot label a row
--     Client. Reverting the build restores the previous labels.
--   * Optional columns from 04-optional-forward (deliverables, og_image_url), if
--     applied, also stay and are ignored by the reverted build.
--   * Uploaded files in storage are never removed by this script.
-- If a single published video must be withdrawn WITHOUT revoking access to the
-- other assets, use the editor's Visible checkbox, or (owner-run, data-mutating,
-- deliberately left commented out):
--   -- update public.portfolio_media set is_visible = false where media_kind = 'video';
begin;
do $disable_rpc$
declare fn record; grant_entry record;
begin
  for fn in select p.oid,p.proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='save_portfolio_creative' loop
    execute format('revoke all privileges on function %s from public cascade',fn.oid::regprocedure);
    for grant_entry in select distinct a.grantee from pg_proc p,lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid=fn.oid and a.grantee not in (0,fn.proowner) loop
      execute format('revoke all privileges on function %s from %I cascade',fn.oid::regprocedure,pg_get_userbyid(grant_entry.grantee));
    end loop;
  end loop;
end $disable_rpc$;
revoke all on public.portfolio_media, public.portfolio_capabilities from public, anon, authenticated;
commit;
-- Reviewed forward reapplication restores intended access. Any destructive
-- physical cleanup is a separate manual procedure, NOT AUTHORIZED or included.
