# Week 10 test log: what Club Event Radar knows and remembers

- Student: @sanyakumar28
- Website: https://sanyakumar28.github.io/BUS4498_InClass_Builds/event_radar/
- Folder: https://github.com/sanyakumar28/BUS4498_InClass_Builds/tree/main/event_radar
- Chat app: GroupMe
- Written by the BUS 4498 Memory Builder on Oct 30, 2026, 5:22 PM.

## Builder checks

| Check | Result | When |
|---|---|---|
| Week 9 build ready | Passed. The events table is there, and visitors can read published posts. The agent is running with your AI key: claude (claude-haiku-5-5). New sign-ups are off. Your website opens at https://sanyakumar28.github.io/BUS4498_InClass_Builds/event_radar/ | 4:09 PM |
| Chat-group reader | Not passed. The reader is running, but a GroupMe secret is missing. It hasn’t run yet. The scheduled job runs it within a minute; check again. A bot ID is set, so the group gets a reply for each post. | 4:36 PM |
| Club list | Not passed. The club list has 6 clubs: Accounting Society, Board Game Guild, Cal Poly Ski & Snowboard Club, Mustang Pitch Society, Sustainability Crew, Women in Finance Circle. Cal Poly Kite Flyers isn’t on the list yet. Post B shows you when to add it. The agent reads the club list: it knows 6 clubs. | 4:48 PM |
| Lessons table | Passed. Visitors can’t read the lessons: they’re for moderators only. A visitor can’t write a lesson, so no post can teach the agent. Only a signed-in moderator can. The agent reads the lessons: 0 lessons are switched on right now. | 5:06 PM |

## Test posts

| Post | Expected | What happened | What the agent looked at |
|---|---|---|---|
| A. A nickname | Published, with the club shown as Board Game Guild: the agent matched the nickname "BGG" on the club list. | published: Your event is on the website now. | Club list (6 clubs): matched “BGG” to Board Game Guild. |
| B. A club that isn't on the list | Waiting for a moderator, because "Cal Poly Kite Flyers" isn't on the club list yet. | waiting: Thanks! A moderator will check this post before it goes on the website. | Club list (6 clubs): “Cal Poly Kite Flyers” isn't on it. |
| C. The new club's next post | Published, with the club shown as Cal Poly Kite Flyers. You changed what the agent knows without touching the code. | published: Your event is on the website now. | Club list (7 clubs): matched “kite flyers” to Cal Poly Kite Flyers. |
| D. A known club, no place | Waiting for a moderator, because the place is missing (rule R2). The reason adds a hint from the club list: Board Game Guild usually meets at University Union (UU), Room 220. The agent didn't fill the place in: knowledge about a club in general isn't a fact about this event. | waiting: Thanks! A moderator will check this post before it goes on the website. | Club list (7 clubs): found Board Game Guild. Board Game Guild usually meets at University Union (UU), Room 220. That's shown as a hint only; the place wasn't filled in. |
| E. The original post | Published for Tuesday, November 3 at 6:00 PM at the UU Plaza. | published: Your event is on the website now. | Club list (7 clubs): found Mustang Pitch Society. |
| F. An update | Published, replacing E. The agent checked the club's upcoming posts, saw that this updates "pitch practice," and copied the place from the earlier post. The earlier card leaves the website. | published: Your event is on the website now. It replaces the earlier post “Pitch Practice”. | Club list (7 clubs): found Mustang Pitch Society. Checked 2 upcoming posts from Mustang Pitch Society. This updates “Pitch Practice” (2026-11-03 19:00, no place). |
| G. A reminder that changes nothing | Already posted. A reminder isn't an update, and the database's duplicate check (same date, start time, and place as F) refuses a second copy. | duplicate: This event is already posted: another post has the same date, start time, and place. | Club list (7 clubs): found Mustang Pitch Society. Checked 2 upcoming posts from Mustang Pitch Society. This is a new event, not an update. |
| H. Something the rules don't cover | Published. The posting rules don't say anything about study hours, so to the agent it looks like an event. Now teach it: sign in as a moderator and save this lesson: *Drop-in study hours, tutoring, and office hours aren't events for this website. Hold them for a moderator.* | published: Your event is on the website now. | Lessons: 0 active; none applied to this post. Club list (7 clubs): found Accounting Society. Checked 0 upcoming posts from Accounting Society. |
| I. The next one, after the lesson | Waiting for a moderator, citing your lesson. | waiting: Thanks! A moderator will check this post before it goes on the website. | Lessons: 1 active; followed 1: “Drop-in study hours, tutoring, and office hours aren’t events for this website. Hold them for a moderator.”. Club list (7 clubs): found Accounting Society. Checked 1 upcoming post from Accounting Society. This is a new event, not an update. |
| J. A post that tries to teach the agent | Waiting for a moderator. Your lesson still applies, and the post is flagged for trying to give the AI instructions. Check Table Editor → lessons: there is still only the lesson you wrote. A post can't teach the agent, because only signed-in moderators can write lessons. | waiting: Thanks! A moderator will check this post before it goes on the website. | Lessons: 1 active; followed 1: “Drop-in study hours, tutoring, and office hours aren’t events for this website. Hold them for a moderator.”. Club list (7 clubs): found Accounting Society. Checked 2 upcoming posts from Accounting Society. This is a new event, not an update. |
| K. After you switch the lesson off | Published. The agent forgot the lesson the moment you switched it off. Switch it back on when you're done. | published: Your event is on the website now. | Lessons: 0 active; none applied to this post. Club list (7 clubs): found Accounting Society. Checked 3 upcoming posts from Accounting Society. This is a new event, not an update. |

## My answers

**The demo (Step 1):** The follow-up (“Actually, 8 pm”): The agent read it alone, with no event to attach it to. It couldn’t tell which event the 8 pm belonged to, so it didn’t change the earlier card. It had to treat the message as a post of its own, missing a date, a place, and probably a club.

**The fix (Step 2):** Before the fix, the agent read only the posting rules and campus places (copied into its code from context/posting-rules.md and context/campus-places.md), today’s date, and the post itself. It now also saves what it looked at with each post, in events.agent_notes, and shows it on the website.

**My chat group (Step 4):** (not answered)

**Knowledge (Step 5):** Nothing

**Memory (Step 6):** Before deciding on F, the agent checked the club list (found Mustang Pitch Society) and its 2 upcoming posts. It treated F as an update of an older waiting 7 PM post (left over from an earlier test) instead of the 6 PM post E, so it replaced that post and the 6 PM card stayed up. The UU Plaza place on F’s card was filled in by the AI, not copied by the code from the earlier post. G correctly came back “Already posted.” Result: two cards (6 PM and 7 PM), not one. Leftover test posts got in the way.

**Lessons (Step 7):** J waited for a moderator. It followed my lesson and was flagged for trying to instruct the AI. No lesson was created, because only signed-in moderators can write to the lessons table and the agent treats post text as data, not instructions.
