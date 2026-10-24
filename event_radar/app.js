// Club Event Radar: the website's code.
// It lists published events from the database and sends new announcements to the AI agent.
// All text from posts is shown with textContent, never innerHTML.

(function () {
  "use strict";

  var config = window.EVENT_RADAR_CONFIG || {};
  var AGENT_URL = (config.supabaseUrl || "") + "/functions/v1/submit-event";
  // Only the columns the website is allowed to read (see the Stage 4 grants).
  var COLUMNS = "id, created_at, status, title, club, event_date, start_time, end_time, place_name, place_detail, cost, free_food, summary, flyer_url";
  // Signed-in moderators may also read the original post and the review notes (see the Stage 8 grants).
  var MOD_COLUMNS = COLUMNS + ", announcement, status_reason, note_for_moderator";
  // Only show flyer photos stored in this project's "flyers" bucket.
  var FLYER_PREFIX = (config.supabaseUrl || "") + "/storage/v1/object/public/flyers/";
  var MAX_FLYER_BYTES = 5 * 1024 * 1024;

  var board = document.getElementById("board");
  var form = document.getElementById("post-form");
  var textarea = document.getElementById("announcement");
  var flyerInput = document.getElementById("flyer");
  var postButton = document.getElementById("post-button");
  var resultBox = document.getElementById("result");
  var refreshButton = document.getElementById("refresh");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));

  var modBox = document.getElementById("mod");
  var signInForm = document.getElementById("sign-in-form");
  var signInButton = document.getElementById("sign-in-button");
  var signInResult = document.getElementById("sign-in-result");
  var modPanel = document.getElementById("mod-panel");
  var modWho = document.getElementById("mod-who");
  var modResult = document.getElementById("mod-result");
  var waitingBoard = document.getElementById("waiting-board");
  var currentUser = null;

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

    if (config.supabaseUrl && typeof event.flyer_url === "string" && event.flyer_url.indexOf(FLYER_PREFIX) === 0) {
      var img = el("img", "flyer");
      img.src = event.flyer_url;
      img.alt = "Flyer for " + (event.title || "this event");
      img.loading = "lazy";
      li.appendChild(img);
    }
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

  function showResultIn(box, kind, label, message, reasons) {
    box.className = "result " + kind;
    box.replaceChildren();
    box.appendChild(el("p", "result-label", label));
    if (message) box.appendChild(el("p", null, message));
    if (reasons && reasons.length) {
      var list = el("ul", "reasons");
      reasons.forEach(function (reason) { list.appendChild(el("li", null, reason)); });
      box.appendChild(list);
    }
    box.hidden = false;
  }

  function showResult(kind, message, reasons) {
    showResultIn(resultBox, kind, LABELS[kind] || LABELS.error, message, reasons);
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var text = textarea.value.trim();
    if (!text) {
      showResult("error", "Please paste an announcement first.");
      return;
    }
    var flyer = flyerInput.files && flyerInput.files[0];
    if (flyer && flyer.type !== "image/jpeg" && flyer.type !== "image/png") {
      showResult("error", "The photo must be a JPG or PNG.");
      return;
    }
    if (flyer && flyer.size > MAX_FLYER_BYTES) {
      showResult("error", "The photo is over 5 MB. Please use a smaller one.");
      return;
    }

    postButton.disabled = true;
    postButton.textContent = "The agent is reading your post…";

    try {
      var body = new FormData();
      body.append("announcement", text);
      if (flyer) body.append("flyer", flyer);
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
        if (data.status === "published" || data.status === "waiting") {
          textarea.value = "";
          flyerInput.value = "";
        }
        if (data.status === "published") loadEvents();
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

  // ---------- moderators ----------
  // New sign-ups are turned off in Supabase, so only accounts made by hand can sign in.

  function reviewCard(event) {
    var li = eventCard(event);
    var review = el("div", "review");
    review.appendChild(el("p", "why", event.status_reason || "Waiting for a moderator."));
    if (event.note_for_moderator) review.appendChild(el("p", null, "Note from the agent: " + event.note_for_moderator));
    review.appendChild(el("p", "original", event.announcement));

    var actions = el("p", "actions");
    var approve = el("button", null, "Approve");
    approve.type = "button";
    var reject = el("button", "ghost", "Reject");
    reject.type = "button";
    approve.addEventListener("click", function () { reviewPost(event, "published", [approve, reject]); });
    reject.addEventListener("click", function () { reviewPost(event, "rejected", [approve, reject]); });
    actions.appendChild(approve);
    actions.appendChild(reject);
    review.appendChild(actions);

    li.querySelector(".event-body").appendChild(review);
    return li;
  }

  async function reviewPost(event, status, buttons) {
    buttons.forEach(function (b) { b.disabled = true; });
    var response = await db
      .from("events")
      .update({
        status: status,
        status_reason: status === "published" ? "Approved by a moderator." : "Rejected by a moderator.",
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentUser ? currentUser.email : "",
      })
      .eq("id", event.id)
      .eq("status", "waiting")
      .select("id");

    if (response.error) {
      console.error("Review failed:", response.error);
      var message = response.error.code === "23505"
        ? "Another live post already has the same date, start time, and place. Reject this one instead."
        : "Couldn't save your decision. Please try again.";
      showResultIn(modResult, "error", "Not saved", message);
      buttons.forEach(function (b) { b.disabled = false; });
      return;
    }
    if (!response.data || !response.data.length) {
      showResultIn(modResult, "duplicate", "Already reviewed", "Someone already reviewed this post.");
    } else {
      showResultIn(modResult, status === "published" ? "published" : "rejected",
        status === "published" ? "Approved" : "Rejected",
        status === "published" ? "The post is on the website now." : "The post won't appear on the website.");
    }
    loadWaiting();
    loadEvents();
  }

  async function loadWaiting() {
    if (!currentUser) return;
    var response = await db
      .from("events")
      .select(MOD_COLUMNS)
      .eq("status", "waiting")
      .order("created_at", { ascending: true });
    if (response.error) {
      console.error("Couldn't load waiting posts:", response.error);
      waitingBoard.replaceChildren(el("li", "empty", "Couldn't load waiting posts. Try Refresh."));
      return;
    }
    var rows = response.data || [];
    if (!rows.length) {
      waitingBoard.replaceChildren(el("li", "empty", "Nothing is waiting. All caught up!"));
      return;
    }
    waitingBoard.replaceChildren.apply(waitingBoard, rows.map(reviewCard));
  }

  function showSignedIn(user) {
    currentUser = user;
    signInForm.hidden = !!user;
    modPanel.hidden = !user;
    modResult.hidden = true;
    if (user) {
      modWho.textContent = "Signed in as " + (user.email || "a moderator");
      modBox.open = true;
      loadWaiting();
    } else {
      waitingBoard.replaceChildren();
    }
  }

  if (db) {
    signInForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      signInButton.disabled = true;
      signInResult.hidden = true;
      var response = await db.auth.signInWithPassword({
        email: document.getElementById("mod-email").value.trim(),
        password: document.getElementById("mod-password").value,
      });
      signInButton.disabled = false;
      if (response.error) {
        showResultIn(signInResult, "error", "Couldn't sign in", "Check your email and password.");
        return;
      }
      document.getElementById("mod-password").value = "";
      showSignedIn(response.data.user);
    });

    document.getElementById("sign-out").addEventListener("click", async function () {
      await db.auth.signOut();
      showSignedIn(null);
    });

    document.getElementById("mod-refresh").addEventListener("click", loadWaiting);

    db.auth.getSession().then(function (result) {
      var session = result.data && result.data.session;
      if (session) showSignedIn(session.user);
    });
  }

  loadEvents();
})();
