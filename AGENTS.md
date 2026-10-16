# Hbee Digitals Development Rules

## Project

This repository contains the Hbee Digitals public website, Growth OS administrative platform, and Client Portal.

Primary stack:

- Next.js 14.2 App Router
- React 18
- TypeScript
- Supabase / PostgreSQL / Auth / Storage / RLS
- Vercel
- Resend
- Cloudflare Turnstile
- Upstash
- GA4

The public experience and operational platform are already in production.

This is a refinement and controlled-development environment, not a greenfield rebuild.

## Primary worktree

Normal implementation work must happen in:

C:\Users\ADDIS\hbee-worktrees\rebuild-public-experience

Branch:

rebuild/public-experience

Do not modify other linked worktrees unless the owner explicitly instructs you to.

In particular, do not drift into:

security/growth-assessment-route-auth

without explicit instruction.

## Git safety

Never:

- work directly on main unless explicitly instructed;
- push to GitHub without explicit owner approval;
- deploy automatically;
- rebase, reset, force-push or rewrite history without explicit approval;
- stage or commit scratchpad/;
- stage unrelated files;
- create broad cleanup commits containing unrelated changes.

scratchpad/ is intentionally untracked and must remain untracked.

Normal workflow:

inspect
→ determine root cause
→ implement narrowly
→ test
→ show diff/status
→ stop for owner review
→ commit only when instructed
→ owner-controlled promotion to main
→ owner-controlled push/deployment

## Production safety

Never perform production mutations without explicit owner approval.

This includes:

- production SQL;
- Supabase migrations;
- destructive database commands;
- data modification;
- auth-user manipulation;
- storage deletion;
- DNS modification;
- Vercel production changes;
- production email sends;
- Shopify production theme publication.

Read-only investigation is preferred before any production change.

Never request, print or expose secrets, passwords, tokens, cookies, service-role keys or private authentication material.

## Architecture preservation

Preserve the current architecture unless explicitly told otherwise.

Do not casually redesign or replace:

- Growth OS;
- Client Portal;
- Growth Review system;
- Growth Profile system;
- merchant/client linking;
- portal invitation flow;
- Supabase RLS model;
- existing public-site information architecture.

Existing working functionality must not be changed merely because another implementation appears simpler.

## Brand direction

Hbee Digitals positioning:

CONNECTED GROWTH IN MOTION

Client Portal positioning:

CONNECTED GROWTH IN PRACTICE

Visual language:

Digital Systems, Built in Motion

Narrative:

Disconnected
→ Understood
→ Connected
→ Activated
→ Growing

Typography:

- Manrope for headings
- Inter for body and UI

Preserve the established Hbee visual system unless explicitly asked to redesign it.

## Investigation standard

Do not guess at root causes.

When debugging:

1. inspect the real implementation;
2. trace the relevant data / rendering path;
3. reproduce where practical;
4. distinguish facts from hypotheses;
5. explain the proven root cause where possible;
6. implement the narrowest safe fix.

If a root cause cannot be proven, say so explicitly.

Do not describe speculation as fact.

## Testing standard

Before owner review, normally run the relevant subset of:

- focused automated tests;
- npx tsc --noEmit;
- npm run build;
- git diff --check;
- git diff --stat;
- git status -sb.

Use additional targeted tests when appropriate.

Do not claim a fix is production-verified unless it has actually been verified in production.

## Email development

Transactional email work is sensitive to:

- HTML email-client compatibility;
- Gmail behaviour;
- line length / transport encoding;
- remote-image handling;
- sender-domain behaviour.

Do not repeatedly change delivery strategies without evidence.

Use real rendered HTML and payload inspection when debugging email issues.

Never send a production email without explicit approval.

## Database changes

Database work requires additional care.

Before proposing a database mutation:

- inspect current schema and policies;
- identify exact affected objects;
- provide forward and rollback strategy where appropriate;
- separate browser-role privileges from service-role privileges;
- preserve existing RLS isolation.

Do not execute SQL against production without explicit approval.

## Client Portal

The Client Portal currently uses Requests, not a real-time Messages system.

Do not rename Requests to Messages or invent message functionality without instruction.

Portal merchant/client ownership and isolation must remain intact.

## Output standard

After implementation, report:

- root cause;
- files changed;
- exact behaviour changed;
- tests run and results;
- typecheck result;
- build result where relevant;
- git diff --check;
- git diff --stat;
- git status -sb;
- anything still unproven.

Then stop for owner review.

## Current development discipline

Do not commit unless explicitly instructed.

Do not push unless explicitly instructed.

Do not deploy unless explicitly instructed.

Do not modify production unless explicitly instructed.

If uncertain whether an action crosses one of these boundaries, stop and ask.
