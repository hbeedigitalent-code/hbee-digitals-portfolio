-- APPLICATION / ACCESS ROLLBACK ONLY — owner review; NOT EXECUTED.
-- FIRST owner disables NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED and deploys that build.
-- No DROP/DELETE: retain both child collections, the revision column, parent
-- portfolio data, and legacy gallery_images. Trusted owner/server access remains.
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
