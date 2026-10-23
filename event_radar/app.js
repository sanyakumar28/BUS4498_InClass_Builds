// Club Event Radar: the website's code.
// It lists published events from the database and sends new announcements to the AI agent.
// All text from posts is shown with textContent, never innerHTML.

(function () {
  "use strict";

  var config = window.EVENT_RADAR_CONFIG || {};
  var AGENT_URL = (config.supabaseUrl || "") + "/functions/v1/submit-event";
  // Only the columns the website is allowed to read (see the Stage 4 grants).
  var COLUMNS = "id, created_at, status, title, club, event_date, start_time, end_time, place_name, place_detail, cost, free_food, summary";

  var board = document.getElementById("board");
  var form = document.getElementById("post-form");
  var textarea = document.getElementById("announcement");
  var postButton = document.getElementById("post-button");
  var resultBox = document.getElementById("result");
  var refreshButton = document.getElementById("refresh");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));

  var allEvents = [];
  var filter = "all";

  var db = null;
  if (window.supabase && config.supabaseUrl && config.publishableKey) {
    db = window.supabase.createClient(config.supabaseUrl, config.publishableKey);
  }

  // ---------- small helpers ----------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function parseDate(iso) {
    if (!iso) return null;
    var parts = iso.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatTime(value) {
    if (!value) return "";
    var parts = value.split(":").map(Number);
    var hours = parts[0];
    var minutes = parts[1] || 0;
    var suffix = hours >= 12 ? "PM" : "AM";
    var h12 = hours % 12 === 0 ? 12 : hours % 12;
    return h12 + ":" + String(minutes).padStart(2, "0") + " " + suffix;
  }

  function whenText(event) {
    var pieces = [];
    var date = parseDate(event.event_date);
    if (date) {
      pieces.push(date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
    } else {
      pieces.push("Date to be announced");
    }
    var start = formatTime(event.start_time);
    var end = formatTime(event.end_time);
    if (start && end) pieces.push(start + " to " + end);
    else if (start) pieces.push(start);
    return pieces.join(" · ");
  }

  // ---------- the event list ----------

  function eventCard(event) {
    var li = el("li", "event");

    var date = parseDate(event.event_date);
    var dateBox;
    if (date) {
      dateBox = el("div", "date");
      dateBox.appendChild(el("span", "mon", date.toLocaleDateString("en-US", { month: "short" })));
      dateBox.appendChild(el("span", "day", String(date.getDate())));
    } else {
      dateBox = el("div", "date tba");
      dateBox.appendChild(el("span", "day", "TBA"));
    }
    li.appendChild(dateBox);

    var body = el("div", "event-body");
    body.appendChild(el("p", "when", whenText(event)));
    body.appendChild(el("h3", null, event.title || "Untitled event"));

    var place = [event.place_name, event.place_detail].filter(Boolean).join(", ");
    var meta = [event.club, place].filter(Boolean).join(" · ");
    if (meta) body.appendChild(el("p", "meta", meta));
    if (event.summary) body.appendChild(el("p", "summary", event.summary));

    var tags = el("p", "tags");
    if (event.cost) tags.appendChild(el("span", "tag", event.cost));
    if (event.free_food) tags.appendChild(el("span", "tag food", "🍕 Free food"));
    if (tags.childNodes.length) body.appendChild(tags);

    li.appendChild(body);
    return li;
  }

  function showMessage(text) {
    board.replaceChildren(el("li", "empty", text));
  }

  function renderBoard() {
    var shown = allEvents.filter(function (event) {
      return filter === "food" ? event.free_food : true;
    });
    if (!shown.length) {
      showMessage(filter === "food" && allEvents.length
        ? "No events with free food right now."
        : "No events yet. Post the first one!");
      return;
    }
    board.replaceChildren.apply(board, shown.map(eventCard));
  }

  async function loadEvents() {
    if (!db) {
      showMessage("The website isn't connected to Supabase yet. Check config.js.");
      return;
    }
    refreshButton.disabled = true;
    var response = await db
      .from("events")
      .select(COLUMNS)
      .eq("status", "published")
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("start_time", { ascending: true, nullsFirst: false });
    refreshButton.disabled = false;

    if (response.error) {
      console.error("Couldn't load events:", response.error);
      showMessage("Couldn't load events right now. Try Refresh in a minute.");
      return;
    }
    allEvents = response.data || [];
    renderBoard();
  }

  // ---------- posting to the agent ----------

  var LABELS = {
    published: "Posted!",
    waiting: "Waiting for a moderator",
    rejected: "Not posted",
    duplicate: "Already posted",
    error: "Something went wrong",
  };

  function showResult(kind, message, reasons) {
    resultBox.className = "result " + kind;
    resultBox.replaceChildren();
    resultBox.appendChild(el("p", "result-label", LABELS[kind] || LABELS.error));
    if (message) resultBox.appendChild(el("p", null, message));
    if (reasons && reasons.length) {
      var list = el("ul", "reasons");
      reasons.forEach(function (reason) { list.appendChild(el("li", null, reason)); });
      resultBox.appendChild(list);
    }
    resultBox.hidden = false;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var text = textarea.value.trim();
    if (!text) {
      showResult("error", "Please paste an announcement first.");
      return;
    }

    postButton.disabled = true;
    postButton.textContent = "The agent is reading your post…";

    try {
      var body = new FormData();
      body.append("announcement", text);
      var res = await fetch(AGENT_URL, {
        method: "POST",
        headers: { apikey: config.publishableKey },
        body: body,
      });
      var data = await res.json().catch(function () { return null; });

      if (!data || !data.ok) {
        showResult("error", (data && data.message) || "The agent didn't answer. Please try again in a minute.");
      } else {
        showResult(data.status, data.message, data.reasons);
        if (data.status === "published") {
          textarea.value = "";
          loadEvents();
        }
      }
    } catch (err) {
      console.error("Post failed:", err);
      showResult("error", "Couldn't reach the agent. Check your internet connection and try again.");
    } finally {
      postButton.disabled = false;
      postButton.textContent = "Send to the agent";
    }
  });

  // ---------- filters and refresh ----------

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      filter = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
      renderBoard();
    });
  });

  refreshButton.addEventListener("click", loadEvents);

  loadEvents();
})();
