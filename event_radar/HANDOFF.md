# Club Event Radar: handoff notes for Jacob

## 1. What works now

**Website:** https://sanyakumar28.github.io/BUS4498_InClass_Builds/event_radar/

- Club officers paste an announcement, and optionally a flyer photo, and send it to the AI agent.
- The agent (Claude) turns it into an event card and checks the posting rules. The code then decides the result: **published**, **waiting** for a moderator, **not posted** (not an event), or **already posted** (same date, start time, and place as a live post).
- The website lists published events, soonest first, with a **Free food** filter.
- Moderators sign in at the bottom of the page to **Approve** or **Reject** waiting posts.
- New sign-ups are turned off, so only accounts made by hand can sign in.

## 2. Where things live

- **GitHub repository:** `sanyakumar28/BUS4498_InClass_Builds`, folder `event_radar/`. GitHub Pages serves the website from the `main` branch.
- **Supabase project:** `event_radar`, Project URL `https://lvadnnnihgjcrvyuheju.supabase.co`
- **Files that matter:**
  - `index.html`, `app.js`, `style.css`: the website
  - `config.js`: the Project URL and the publishable key (both public)
  - `supabase/functions/submit-event/index.ts`: the AI agent (Edge Function), deployed with JWT verification off
  - `supabase/migrations/`: the database table, the `flyers` storage bucket, and the security rules (grants and row-level security), one file per stage
  - `context/posting-rules.md` and `context/campus-places.md`: the rules and place codes. These are copied into the agent's code, so change both together.
  - `test/sample-announcements.md` and `test/sample-flyer.png`: test posts
  - `AGENTS.md`: build instructions for Claude Code or Codex

## 3. Secrets

They're set in Supabase → **Edge Functions → Secrets**. You don't need the values, and they're never in this repository.

- `ANTHROPIC_API_KEY`: the AI key the agent uses.
- `ANTHROPIC_WORKSPACE_ID`: needed only if the AI key isn't tied to an Anthropic workspace.
- `HOLD_ALL_POSTS` (optional): set it to `true` to make every post wait for a moderator.
- `SUPABASE_URL` and `SUPABASE_SECRET_KEYS`: Supabase sets these itself. Don't touch them.

Moderator accounts are in **Authentication → Users**. Ask me to add one for you. Don't turn **Allow new users to sign up** back on, because anyone signed in can approve posts.

## 4. How to test

Paste these on the website (full text in `test/sample-announcements.md`):

- **Post A** (Board Game Guild game night, Oct 29, UU Room 220): **Already posted**, since A is on the site.
- **Post F** (selling a textbook): **Not posted**, because it's a sale, not an event.
- **Flyer:** attach `test/sample-flyer.png` with "Clothing swap next week, all the details are on the flyer!" → **Waiting**, with the card read from the flyer: Wed, Nov 4, 11:00 AM to 2:00 PM, Dexter Lawn, Free. Approve it under Moderator sign-in and it appears with the photo.

To check the agent is running without saving anything, open `https://lvadnnnihgjcrvyuheju.supabase.co/functions/v1/submit-event` in a browser. It should say `"ready": true`.

## 5. What's next

- **Clean up the test posts.** Post D (Kickoff Party) and a dateless Clothing Swap were approved by mistake and are on the site. The real Clothing Swap with the flyer is still waiting.
- **Make reviewing safer.** Ask "Are you sure?" before approving a post that broke a rule, and show the rule problems more clearly on each card.
- **Nightly clean-up** (optional stage in `AGENTS.md`): archive events after their date passes. Right now, past events stay on the list.
- **Duplicate waiting posts.** Two copies of the same post with no date (like post E sent twice) both wait, because the duplicate check needs a date, start time, and place.
- **Ideas:** a "This week" filter, letting clubs edit a waiting post, and an email to the club when a post is approved.

## 6. How we take turns

1. **Before you start:** in GitHub Desktop, click **Fetch origin**, then **Pull origin**, so you have the latest version.
2. **Tell me before you work** (text me), so we don't both edit the same files at once.
3. **When you stop:** commit with a short message saying what you changed, then **Push origin**.
4. Changes to the database or the agent go to the live Supabase project right away, so tell me before you change them too.
