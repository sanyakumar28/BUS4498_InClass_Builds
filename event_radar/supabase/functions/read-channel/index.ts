// The chat-channel reader for Club Event Radar (Supabase Edge Function "read-channel").
// It reads new messages from the club's GroupMe group, sends each one to the
// AI agent (submit-event), and posts the agent's decision back to the group.
// The scheduled job "read-chat-channel" calls it every minute; GroupMe's bot
// callback can call it too, for instant updates.

import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const SOURCE = "groupme";
const GROUPME_API = "https://api.groupme.com/v3";
const MAX_MESSAGES = 20;
const THREAD_MINUTES = 10;
const THREAD_MAX = 4;
const MAX_REPLY_CHARS = 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
};

type Message = {
  id: string;
  created_at: number;
  sender_id: string;
  sender_type: string;
  name: string;
  text: string | null;
  system?: boolean;
};

type Cursor = { last_id: string; read_count: number };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// The new secret key comes from SUPABASE_SECRET_KEYS (JSON, "default" entry).
function secretKey(): string {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      const parsed = JSON.parse(keys);
      if (typeof parsed?.default === "string" && parsed.default) return parsed.default;
    } catch {
      // Fall through to the older key.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

// The publishable key, sent to the agent on the apikey header like the website does.
function publishableKey(): string {
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keys) {
    try {
      const parsed = JSON.parse(keys);
      if (typeof parsed?.default === "string" && parsed.default) return parsed.default;
    } catch {
      // Fall through to the older key.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

function settings() {
  return {
    token: Deno.env.get("GROUPME_TOKEN")?.trim() ?? "",
    groupId: Deno.env.get("GROUPME_GROUP_ID")?.trim() ?? "",
    botId: Deno.env.get("GROUPME_BOT_ID")?.trim() ?? "",
  };
}

// Reads a page of the group's messages. GroupMe answers 304 when there is nothing new.
async function groupMessages(token: string, groupId: string, query: Record<string, string>): Promise<Message[]> {
  const params = new URLSearchParams({ limit: String(MAX_MESSAGES), ...query });
  const res = await fetch(`${GROUPME_API}/groups/${encodeURIComponent(groupId)}/messages?${params}`, {
    headers: { "X-Access-Token": token },
  });
  if (res.status === 304) return [];
  if (!res.ok) throw new Error(`GroupMe answered ${res.status} when reading messages`);
  const data = await res.json();
  return (data?.response?.messages ?? []) as Message[];
}

function oldestFirst(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => a.created_at - b.created_at || (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
}

// A message the agent should read: from a person, not a system note, with text.
function isReadable(m: Message): boolean {
  return m.sender_type !== "bot" && m.sender_type !== "system" && !m.system && !!m.text?.trim();
}

// The same sender's messages from the 10 minutes before this one (at most 4, oldest first).
async function threadFor(token: string, groupId: string, message: Message): Promise<string[]> {
  const before = await groupMessages(token, groupId, { before_id: message.id });
  const since = message.created_at - THREAD_MINUTES * 60;
  return oldestFirst(before)
    .filter((m) => m.sender_id === message.sender_id && m.created_at >= since && isReadable(m))
    .slice(-THREAD_MAX)
    .map((m) => m.text!.trim());
}

// Posts the agent's decision back to the group (only when a bot id is set).
async function reply(botId: string, text: string): Promise<void> {
  if (!botId) return;
  const res = await fetch(`${GROUPME_API}/bots/post`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bot_id: botId, text: text.slice(0, MAX_REPLY_CHARS) }),
  });
  if (!res.ok) console.error(`GroupMe answered ${res.status} when the bot posted`);
}

// deno-lint-ignore no-explicit-any
function decisionText(name: string, result: any): string {
  const title = result?.event?.title ? ` “${result.event.title}”` : "";
  const labels: Record<string, string> = {
    published: `✅ ${name}, your event${title} is on Event Radar now.`,
    waiting: `⏳ ${name}, your post${title} is waiting for a moderator.`,
    rejected: `🚫 ${name}, this wasn't posted because it doesn't look like an event.`,
    duplicate: `🔁 ${name}, this event is already posted.`,
  };
  const head = labels[result?.status] ?? `⚠️ ${name}, Event Radar couldn't read this post: ${result?.message ?? "please try again."}`;
  const reasons = Array.isArray(result?.reasons) && result.reasons.length > 0 && result.status !== "published"
    ? "\n" + result.reasons.map((r: string) => `• ${r}`).join("\n")
    : "";
  return head + reasons;
}

// Sends one chat message to the agent as JSON.
// deno-lint-ignore no-explicit-any
async function sendToAgent(message: Message, thread: string[]): Promise<any> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/submit-event`;
  const key = publishableKey();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(key ? { apikey: key } : {}) },
      body: JSON.stringify({
        announcement: message.text!.trim(),
        source: SOURCE,
        source_id: message.id,
        source_name: message.name ?? "",
        thread,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error("Calling the agent failed:", err);
    return { ok: false, message: "the agent didn't answer." };
  }
}

// The reader's status: whether the secrets are set, and the bookmark.
function status(cursor: Cursor | null) {
  const { token, groupId, botId } = settings();
  return {
    ready: !!token && !!groupId,
    last_message_id: cursor?.last_id || null,
    read_count: cursor?.read_count ?? 0,
    bot: !!botId,
  };
}

// Asks GroupMe whether the token, the group, and the bot work. Results only, never values.
// The answer also carries the reader's status, so one check shows everything.
async function check(cursor: Cursor | null): Promise<Response> {
  const { token, groupId, botId } = settings();
  const result: Record<string, string> = {
    token: token ? "set" : "missing: add GROUPME_TOKEN in Edge Functions → Secrets",
    group: groupId ? "set" : "missing: add GROUPME_GROUP_ID in Edge Functions → Secrets",
    bot: botId ? "set" : "not set: the reader works, but it can't reply in the group",
  };
  if (token && groupId) {
    const res = await fetch(`${GROUPME_API}/groups/${encodeURIComponent(groupId)}`, {
      headers: { "X-Access-Token": token },
    });
    if (res.ok) result.group = "works: the token can read this group";
    else if (res.status === 401) result.token = "doesn't work: GroupMe refused the token";
    else result.group = `doesn't work: GroupMe answered ${res.status} for this group`;
  }
  if (token && botId) {
    const res = await fetch(`${GROUPME_API}/bots`, { headers: { "X-Access-Token": token } });
    if (res.ok) {
      const bots = (await res.json())?.response ?? [];
      // deno-lint-ignore no-explicit-any
      const bot = bots.find((b: any) => b.bot_id === botId);
      if (!bot) result.bot = "doesn't work: this token has no bot with that id";
      else if (groupId && bot.group_id !== groupId) result.bot = "doesn't work: the bot is in a different group";
      else result.bot = `works: the bot “${bot.name}” can post in the group`;
    }
  }
  const works = result.group.startsWith("works") && !result.bot.startsWith("doesn't");
  return json({
    ok: true,
    ...status(cursor),
    check: SOURCE,
    works,
    token: result.token,
    group: result.group,
    bot_check: result.bot,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { token, groupId, botId } = settings();

  const { data: row, error: cursorError } = await db
    .from("channel_cursor").select("last_id, read_count").eq("source", SOURCE).maybeSingle();
  if (cursorError) {
    console.error("Reading the cursor failed:", cursorError);
    return json({ ok: false, message: "The reader couldn't reach its database." }, 500);
  }
  const cursor: Cursor | null = row;

  if (req.method === "GET") {
    if (new URL(req.url).searchParams.get("check") === SOURCE) return await check(cursor);
    return json({ ok: true, ...status(cursor) });
  }

  if (req.method !== "POST") return json({ ok: false, message: "Use GET or POST." }, 405);
  if (!token || !groupId) {
    return json({ ok: false, message: "Add GROUPME_TOKEN and GROUPME_GROUP_ID in Edge Functions → Secrets." }, 503);
  }

  const saveCursor = async (lastId: string, readCount: number) => {
    const { error } = await db.from("channel_cursor").upsert({
      source: SOURCE, last_id: lastId, read_count: readCount, updated_at: new Date().toISOString(),
    });
    if (error) console.error("Saving the cursor failed:", error);
  };

  try {
    // First run: bookmark the newest message and stop, so old history is never read.
    if (!cursor?.last_id) {
      const newest = oldestFirst(await groupMessages(token, groupId, {})).at(-1);
      await saveCursor(newest?.id ?? "0", cursor?.read_count ?? 0);
      return json({ ok: true, first_run: true, last_message_id: newest?.id ?? "0", read: 0 });
    }

    const messages = oldestFirst(await groupMessages(token, groupId, { after_id: cursor.last_id }));
    let readCount = cursor.read_count;
    let sent = 0;
    for (const message of messages) {
      if (isReadable(message)) {
        const thread = await threadFor(token, groupId, message);
        const result = await sendToAgent(message, thread);
        if (!result?.already_read) await reply(botId, decisionText(message.name || "there", result));
        sent++;
      }
      // Move the bookmark past every message, including skipped ones.
      readCount++;
      await saveCursor(message.id, readCount);
    }
    return json({ ok: true, read: messages.length, sent, last_message_id: messages.at(-1)?.id ?? cursor.last_id });
  } catch (err) {
    console.error("Reading GroupMe failed:", err);
    return json({ ok: false, message: "The reader couldn't read the GroupMe group right now." }, 502);
  }
});
