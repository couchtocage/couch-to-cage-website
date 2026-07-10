const { createClient } = supabase;

const configured =
  window.CTC_SUPABASE_URL &&
  !window.CTC_SUPABASE_URL.includes("PASTE_") &&
  window.CTC_SUPABASE_ANON_KEY &&
  !window.CTC_SUPABASE_ANON_KEY.includes("PASTE_");

const client = configured
  ? createClient(window.CTC_SUPABASE_URL, window.CTC_SUPABASE_ANON_KEY)
  : null;

const $ = (id) => document.getElementById(id);
const loginView = $("loginView");
const dashboardView = $("dashboardView");

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}

function showDashboard(session) {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  $("adminEmail").textContent = session.user.email || "";
  loadAll();
}

function showLogin() {
  dashboardView.classList.add("hidden");
  loginView.classList.remove("hidden");
}

async function init() {
  if (!configured) {
    setMessage($("loginMessage"), "Admin setup is not connected yet. Add the Supabase URL and key to admin/config.js.", "error");
    return;
  }
  const { data } = await client.auth.getSession();
  if (data.session) showDashboard(data.session);
  else showLogin();
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) return;
  setMessage($("loginMessage"), "Signing in...");
  const { data, error } = await client.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });
  if (error) return setMessage($("loginMessage"), error.message, "error");
  setMessage($("loginMessage"), "");
  showDashboard(data.session);
});

$("signOutButton").addEventListener("click", async () => {
  await client.auth.signOut();
  showLogin();
});

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-button").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    ["overviewPanel", "eventsPanel", "clipsPanel"].forEach((id) => $(id).classList.add("hidden"));
    $(`${button.dataset.view}Panel`).classList.remove("hidden");
  });
});

async function loadAll() {
  await Promise.all([loadEvents(), loadClips()]);
}

async function loadEvents() {
  const { data, error } = await client.from("events").select("*").order("event_date", { ascending: true });
  if (error) {
    $("eventsList").innerHTML = `<p class="message error">${escapeHtml(error.message)}</p>`;
    return;
  }
  $("eventCount").textContent = data.length;
  $("eventsList").innerHTML = data.length ? data.map(eventCard).join("") : `<p class="muted">No events added yet.</p>`;
  document.querySelectorAll("[data-edit-event]").forEach((b) => b.onclick = () => editEvent(data.find(x => x.id === b.dataset.editEvent)));
  document.querySelectorAll("[data-delete-event]").forEach((b) => b.onclick = () => deleteEvent(b.dataset.deleteEvent));
}

function eventCard(item) {
  const date = item.event_date ? new Date(item.event_date).toLocaleString() : "Date not set";
  return `<article class="item">
    <div>
      <span class="status ${item.published ? "" : "draft"}">${item.published ? "Published" : "Draft"}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(date)} · ${escapeHtml(item.location || "")}</p>
      <p>${escapeHtml(item.discipline || "")}${item.venue ? ` · ${escapeHtml(item.venue)}` : ""}</p>
    </div>
    <div class="item-actions">
      <button data-edit-event="${item.id}">Edit</button>
      <button class="delete-button" data-delete-event="${item.id}">Delete</button>
    </div>
  </article>`;
}

$("newEventButton").onclick = () => {
  $("eventForm").reset();
  $("eventId").value = "";
  $("eventPublished").checked = true;
  $("eventForm").classList.remove("hidden");
};
$("cancelEventButton").onclick = () => $("eventForm").classList.add("hidden");

function editEvent(item) {
  $("eventId").value = item.id;
  $("eventName").value = item.name || "";
  $("eventPromotion").value = item.promotion || "";
  $("eventDate").value = item.event_date ? item.event_date.slice(0, 16) : "";
  $("eventDiscipline").value = item.discipline || "";
  $("eventVenue").value = item.venue || "";
  $("eventLocation").value = item.location || "";
  $("eventImage").value = item.image_url || "";
  $("eventTicket").value = item.ticket_url || "";
  $("eventDescription").value = item.description || "";
  $("eventPublished").checked = !!item.published;
  $("eventForm").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("eventForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("eventId").value;
  const payload = {
    name: $("eventName").value.trim(),
    promotion: $("eventPromotion").value.trim() || null,
    event_date: $("eventDate").value,
    discipline: $("eventDiscipline").value,
    venue: $("eventVenue").value.trim() || null,
    location: $("eventLocation").value.trim(),
    image_url: $("eventImage").value.trim() || null,
    ticket_url: $("eventTicket").value.trim() || null,
    description: $("eventDescription").value.trim() || null,
    published: $("eventPublished").checked
  };
  const query = id ? client.from("events").update(payload).eq("id", id) : client.from("events").insert(payload);
  const { error } = await query;
  if (error) return setMessage($("eventMessage"), error.message, "error");
  setMessage($("eventMessage"), "Event saved.", "success");
  $("eventForm").classList.add("hidden");
  await loadEvents();
});

async function deleteEvent(id) {
  if (!confirm("Delete this event?")) return;
  const { error } = await client.from("events").delete().eq("id", id);
  if (error) alert(error.message);
  await loadEvents();
}

async function loadClips() {
  const { data, error } = await client.from("fight_clips").select("*").order("fight_date", { ascending: false });
  if (error) {
    $("clipsList").innerHTML = `<p class="message error">${escapeHtml(error.message)}</p>`;
    return;
  }
  $("clipCount").textContent = data.length;
  $("clipsList").innerHTML = data.length ? data.map(clipCard).join("") : `<p class="muted">No fight clips added yet.</p>`;
  document.querySelectorAll("[data-edit-clip]").forEach((b) => b.onclick = () => editClip(data.find(x => x.id === b.dataset.editClip)));
  document.querySelectorAll("[data-delete-clip]").forEach((b) => b.onclick = () => deleteClip(b.dataset.deleteClip));
}

function clipCard(item) {
  return `<article class="item">
    <div>
      <span class="status ${item.published ? "" : "draft"}">${item.published ? "Published" : "Draft"}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.fighters || "")}${item.discipline ? ` · ${escapeHtml(item.discipline)}` : ""}</p>
      <p>${escapeHtml(item.event_name || "")}${item.featured ? " · Featured" : ""}</p>
    </div>
    <div class="item-actions">
      <button data-edit-clip="${item.id}">Edit</button>
      <button class="delete-button" data-delete-clip="${item.id}">Delete</button>
    </div>
  </article>`;
}

$("newClipButton").onclick = () => {
  $("clipForm").reset();
  $("clipId").value = "";
  $("clipPublished").checked = true;
  $("clipForm").classList.remove("hidden");
};
$("cancelClipButton").onclick = () => $("clipForm").classList.add("hidden");

function editClip(item) {
  $("clipId").value = item.id;
  $("clipTitle").value = item.title || "";
  $("clipFighters").value = item.fighters || "";
  $("clipDiscipline").value = item.discipline || "";
  $("clipDate").value = item.fight_date || "";
  $("clipUrl").value = item.video_url || "";
  $("clipEvent").value = item.event_name || "";
  $("clipCaption").value = item.caption || "";
  $("clipFeatured").checked = !!item.featured;
  $("clipPublished").checked = !!item.published;
  $("clipForm").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("clipForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("clipId").value;
  const payload = {
    title: $("clipTitle").value.trim(),
    fighters: $("clipFighters").value.trim() || null,
    discipline: $("clipDiscipline").value,
    fight_date: $("clipDate").value || null,
    video_url: $("clipUrl").value.trim(),
    event_name: $("clipEvent").value.trim() || null,
    caption: $("clipCaption").value.trim() || null,
    featured: $("clipFeatured").checked,
    published: $("clipPublished").checked
  };
  const query = id ? client.from("fight_clips").update(payload).eq("id", id) : client.from("fight_clips").insert(payload);
  const { error } = await query;
  if (error) return setMessage($("clipMessage"), error.message, "error");
  setMessage($("clipMessage"), "Fight clip saved.", "success");
  $("clipForm").classList.add("hidden");
  await loadClips();
});

async function deleteClip(id) {
  if (!confirm("Delete this fight clip?")) return;
  const { error } = await client.from("fight_clips").delete().eq("id", id);
  if (error) alert(error.message);
  await loadClips();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
