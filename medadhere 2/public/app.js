const API = "/api/medications";
let lastInteractionResults = null;

function getToken() {
  return localStorage.getItem("token");
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = Object.assign({}, options.headers || {});
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, Object.assign({}, options, { headers }));
}

// ---------- helpers ----------

function dayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function formatTime12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// Finds the next upcoming dose time across all medications (today, or
// tomorrow's earliest if everything today has already passed).
function computeNextDose(meds) {
  if (meds.length === 0) return "—";
  const now = new Date();
  const nowHHMM = now.toTimeString().slice(0, 5);

  const upcomingToday = meds
    .map((m) => m.time)
    .filter((t) => t >= nowHHMM)
    .sort();

  if (upcomingToday.length > 0) return formatTime12h(upcomingToday[0]);

  const earliestOverall = meds.map((m) => m.time).sort()[0];
  return `${formatTime12h(earliestOverall)} (tmrw)`;
}

// Weighted adherence: total taken / total trackable days, across all meds
function computeAdherencePercent(meds) {
  let taken = 0;
  let trackable = 0;
  meds.forEach((m) => {
    (m.last7 || []).forEach((d) => {
      if (d.status === "before") return;
      trackable += 1;
      if (d.status === "taken") taken += 1;
    });
  });
  if (trackable === 0) return "—";
  return `${Math.round((taken / trackable) * 100)}%`;
}

function renderBlister(last7) {
  return last7
    .map((d) => {
      const isToday = d === last7[last7.length - 1];
      const classes = ["pocket", d.status];
      if (isToday) classes.push("today");
      return `<span class="${classes.join(" ")}" title="${dayLabel(d.date)} — ${d.status}"></span>`;
    })
    .join("");
}

function currentTimeHHMM() {
  return new Date().toTimeString().slice(0, 5);
}

function renderTodayTimeline(meds) {
  const container = document.getElementById("today-timeline");
  if (!container) return;

  const nowHHMM = currentTimeHHMM();
  if (!meds || meds.length === 0) {
    container.innerHTML = '<p class="hint">No meds scheduled yet.</p>';
    return;
  }

  // Sort by scheduled time
  const sorted = [...meds].sort((a, b) => a.time.localeCompare(b.time));

  container.innerHTML = sorted
    .map((m) => {
      // If takenToday => completed
      // Else if time is in the future => upcoming
      // Else => pending/missed
      let status = "pending";
      let icon = "⏳";
      let small = `Scheduled at ${formatTime12h(m.time)}`;

      if (m.takenToday) {
        status = "done";
        icon = "✅";
        small = "Completed Successfully";
      } else if (m.time >= nowHHMM) {
        status = "upcoming";
        icon = "⏰";
        small = `Scheduled at ${formatTime12h(m.time)}`;
      } else {
        status = "pending";
        icon = "⏳";
        small = `Missed at ${formatTime12h(m.time)}`;
      }

      return `
        <div class="timeline-item ${status}">
          <span>${icon}</span>
          <div>
            <strong>${m.name}</strong>
            <small>${small}</small>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderWeeklySummary(meds) {
  // New dashboard uses *_val IDs; old uses full text IDs.
  const totalVal = document.getElementById("weekly-total-val");
  const completedVal = document.getElementById("weekly-completed-val");
  const adherenceVal = document.getElementById("weekly-adherence-val");

  const totalElFallback = document.getElementById("weekly-total");
  const completedElFallback = document.getElementById("weekly-completed");
  const adherenceElFallback = document.getElementById("weekly-adherence");
  const riskEl = document.getElementById("weekly-risk");

  const totalTarget = totalVal || totalElFallback;
  const completedTarget = completedVal || completedElFallback;
  const adherenceTarget = adherenceVal || adherenceElFallback;

  if (!totalTarget || !completedTarget || !adherenceTarget) return;

  if (!meds || meds.length === 0) {
    totalTarget.textContent = "0";
    completedTarget.textContent = "0";
    adherenceTarget.textContent = "—";
    if (riskEl) riskEl.textContent = "—";
    renderHealthScoreAndStreak(meds, null);
    return;
  }

  let scheduled = 0;
  let completed = 0;

  meds.forEach((m) => {
    (m.last7 || []).forEach((d) => {
      if (d.status === "before") return;
      scheduled += 1;
      if (d.status === "taken") completed += 1;
    });
  });

  const adherencePct =
    scheduled === 0 ? null : Math.round((completed / scheduled) * 100);
  const adherence = adherencePct === null ? "—" : `${adherencePct}%`;

  totalTarget.textContent = String(scheduled);
  completedTarget.textContent = String(completed);
  adherenceTarget.textContent = adherence;
  if (riskEl) riskEl.textContent = "—";

  renderHealthScoreAndStreak(meds, adherencePct);
}

function renderHealthScoreAndStreak(meds, adherencePct) {
  const scoreCircle = document.getElementById("health-score-circle");
  const scoreLabel = document.getElementById("health-score-label");
  const streakDaysEl = document.getElementById("streak-days");
  const streakLabelEl = document.getElementById("streak-label");
  if (!scoreCircle || !scoreLabel || !streakDaysEl || !streakLabelEl) return;

  if (!meds) {
  return;
}

if (meds.length === 0) {
  scoreCircle.textContent = "84";
  scoreLabel.textContent = "Good";

  streakDaysEl.textContent = "7";
  streakLabelEl.textContent = "days";

  return;
}

  const score = Math.max(0, Math.min(100, adherencePct));
  scoreCircle.textContent = score;

  let label = "Excellent";
  if (score < 50) label = "Needs attention";
  else if (score < 75) label = "Good";
  else if (score < 90) label = "Very good";

  scoreLabel.textContent = label;

  // Streak: consecutive days (from today backwards) where all meds that exist on that day are taken.
  // Build per-day completion based on last7 statuses.
  const dates = (meds[0]?.last7 || []).map((x) => x.date);
  if (!dates.length) {
    streakDaysEl.textContent = "—";
    streakLabelEl.textContent = "—";
    return;
  }

  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    const date = dates[i];
    // For each medication, if it existed then it must be taken.
    let dayTrackable = 0;
    let dayTaken = 0;

    meds.forEach((m) => {
      const statusObj = (m.last7 || []).find((d) => d.date === date);
      if (!statusObj) return;
      if (statusObj.status === "before") return;
      dayTrackable += 1;
      if (statusObj.status === "taken") dayTaken += 1;
    });

    if (dayTrackable === 0) break; // nothing to track
    if (dayTaken === dayTrackable) streak += 1;
    else break;
  }

  streakDaysEl.textContent = `${streak} Day${streak === 1 ? "" : "s"}`;
  streakLabelEl.textContent =
    streak > 0 ? "No missed doses this week" : "Start your streak";
}

// ---------- medications ----------

async function loadMedications() {
  const res = await apiFetch(API);
  const meds = await res.json();

  // Toggle onboarding/dashboard based on whether meds exist.
  const onboardingShell = document.getElementById("onboarding-shell");
  const dashboardShell = document.getElementById("dashboard-shell");

  const hasMeds = meds.length > 0;
  if (onboardingShell) onboardingShell.style.display = hasMeds ? "none" : "";
  if (dashboardShell) dashboardShell.style.display = hasMeds ? "" : "none";

  // Updated widget metrics
  const adherencePct = computeAdherencePercent(meds);
  const nextDose = computeNextDose(meds);

  document.getElementById("adherence-percent").textContent = adherencePct;
  const pctNum = adherencePct === "—" ? 0 : parseInt(adherencePct, 10);
  const bar = document.getElementById("adherence-bar");
  if (bar) bar.style.width = `${Number.isFinite(pctNum) ? pctNum : 0}%`;

  document.getElementById("next-dose").textContent = nextDose;

  // Health score + streak + timeline + weekly summary
  renderTodayTimeline(meds);
  renderWeeklySummary(meds);

  const list = document.getElementById("med-list");
  if (list) {
    list.innerHTML = "";

    if (!hasMeds) return;

    meds.forEach((m) => {
      const li = document.createElement("li");
      li.className = "med-item";
      li.innerHTML = `
        <div class="med-top-row">
          <span class="med-name">${m.name}</span>
          <button data-id="${m.id}" class="delete-btn" aria-label="Remove ${m.name}">✕</button>
        </div>
        <div class="med-top-row">
          <span class="med-meta">${m.dosage} · ${formatTime12h(m.time)}</span>
        </div>
        <div class="med-bottom-row">
          <span class="blister" aria-label="Last 7 days">${renderBlister(m.last7 || [])}</span>
          <button data-id="${m.id}" class="taken-btn ${m.takenToday ? "is-taken" : ""}">
            ${m.takenToday ? "✓ Taken today" : "Mark as taken"}
          </button>
        </div>
      `;
      list.appendChild(li);
    });
  }

  // AI insight (simple data-driven text)
  function renderAiInsight(meds, adherencePct){

  }
  

  // If user runs check, dashboard widget will populate results.
  const interactionEmpty = document.getElementById("interaction-empty");
  if (interactionEmpty) interactionEmpty.style.display = "";

  // Reset interaction risk UI until user runs check again.

  const riskPill = document.getElementById("risk-pill");
  const riskLabel = document.getElementById("risk-label");
  const interactionsLastChecked = document.getElementById(
    "interactions-last-checked",
  );
  const confidenceEl = document.getElementById("interactions-confidence");
  if (riskPill) {
    riskPill.className = "risk-pill low";
    riskPill.textContent = "Not checked";
  }
  if (riskLabel) {
    riskLabel.textContent =
      "Run a safety check to evaluate your medication combinations.";
  }
  if (interactionsLastChecked) {
    interactionsLastChecked.textContent = "Last checked: —";
  }
}

document.getElementById("med-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("med-name").value;
  const dosage = document.getElementById("med-dosage").value;
  const time = document.getElementById("med-time").value;
  const errorEl = document.getElementById("med-error");
  errorEl.textContent = "";

  const res = await apiFetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, dosage, time }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    errorEl.textContent = data.error || "Could not add medication.";
    return;
  }

  e.target.reset();
  loadMedications();
});

document.getElementById("med-list").addEventListener("click", async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains("delete-btn")) {
    await apiFetch(`${API}/${id}`, { method: "DELETE" });

    loadMedications();
  }

  if (e.target.classList.contains("taken-btn")) {
    const alreadyTaken = e.target.classList.contains("is-taken");
    await apiFetch(`${API}/${id}/taken`, {
      method: alreadyTaken ? "DELETE" : "POST",
    });

    loadMedications();
  }
});

// ---------- interactions ----------

document
  .getElementById("check-interactions")
  ?.addEventListener("click", async () => {
    const resultsDiv = document.getElementById("interaction-results");
    const pill = document.getElementById("risk-pill");
    const riskLabel = document.getElementById("risk-label");
    const lastChecked = document.getElementById("interactions-last-checked");

    if (!resultsDiv) return;

    resultsDiv.innerHTML = '<p class="hint">Checking safety…</p>';
    if (pill) {
      pill.className = "risk-pill medium";
      pill.textContent = "Checking…";
    }
    if (riskLabel)
      riskLabel.textContent =
        "Running interaction checks across your saved medications.";

    const res = await apiFetch(`${API}/interactions`);
    const results = await res.json();
    lastInteractionResults = results;

    const highs = results.filter((r) => r.severity === "high").length;
    const moderates = results.filter((r) => r.severity === "moderate").length;
    const totalFindings = results.length;

    // Confidence is a UX signal for trust. We only have label-based evidence,
    // so we keep it intentionally conservative.
    const confidence =
      totalFindings === 0
        ? "High (no label warnings)"
        : moderates > 0
          ? "Medium (label-based)"
          : "High (label-based)";

    const nowStr = new Date().toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (lastChecked) lastChecked.textContent = `Last checked: ${nowStr}`;

    // Risk pill mapping for UX trust.
    if (totalFindings === 0) {
      if (pill) {
        pill.className = "risk-pill low";
        pill.textContent = "Low risk";
      }
      if (riskLabel) {
        riskLabel.textContent =
          "No interaction warnings detected from label data. Confirm with your pharmacist for personalized guidance.";
      }
    } else if (highs > 0) {
      if (pill) {
        pill.className = "risk-pill high";
        pill.textContent = "High risk";
      }
      if (riskLabel) {
        riskLabel.textContent = `We found ${highs} high-severity interaction${highs === 1 ? "" : "s"} and ${moderates} moderate warning${moderates === 1 ? "" : "s"}. Review safety notes carefully.`;
      }
    } else {
      if (pill) {
        pill.className = "risk-pill medium";
        pill.textContent = "Moderate risk";
      }
      if (riskLabel) {
        riskLabel.textContent = `We found ${moderates} moderate warning${moderates === 1 ? "" : "s"}. Consider asking your pharmacist about timing and alternatives.`;
      }
    }

    // Populate confidence pill/text for trust. If element exists, set it.
    const confidenceEl = document.getElementById(
  "interactions-confidence"
);

if (confidenceEl) {
  confidenceEl.textContent = confidence;
}

    if (results.length === 0) {
      resultsDiv.innerHTML =
        '<div class="empty-state"><div class="empty-icon" aria-hidden="true">🛡️</div><div class="empty-title">No warnings found</div><div class="empty-sub">Add more medications and run another check if needed.</div></div>';
      return;
    }

    resultsDiv.innerHTML = results
      .map(
        (r) => `
      <div class="interaction-card severity-${r.severity}">
        <strong>${r.pair[0]} + ${r.pair[1]}</strong>
        <p>${r.summary}</p>
      </div>`,
      )
      .join("");
  });

// ---------- notifications ----------

async function loadNotifications() {
  const res = await apiFetch(`${API}/notifications`);

  const notes = await res.json();
  const list = document.getElementById("notifications-list");
  list.innerHTML = notes.length
    ? notes.map((n) => `<li>${n.message}</li>`).join("")
    : '<li class="hint">No reminders yet — they will appear here at the scheduled time.</li>';
}

async function tryInit() {
  const token = localStorage.getItem("token");
  if (!token) return;

  // Verify token with the backend before switching the UI.
  // This prevents stale/invalid localStorage tokens from hiding the login screen.
  try {
    const verifyRes = await apiFetch("/api/auth/me", { method: "GET" });
    if (!verifyRes.ok) throw new Error("Token invalid");
  } catch (e) {
    localStorage.removeItem("token");
    return;
  }

  // Hide marketing/login content when authenticated.
  const marketingSections = [
    "auth-card",
    "stat-strip",
    "dashboard",
    "ai-section",
  ];
  marketingSections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === "auth-card" ? "none" : "";
  });

  // Explicitly hide marketing preview sections that should not appear after login.
  ["marketing-header", "why", "how", "roadmap"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  const authCard = document.getElementById("auth-card");
  if (authCard) authCard.style.display = "none";

  const topActions = document.getElementById("top-actions");
  if (topActions) topActions.style.display = "";

  // Show only the real application
document.getElementById("app-main").style.display = "";

const appMain = document.getElementById("app-main");
if (appMain) appMain.setAttribute("aria-hidden", "false");

// Hide old marketing/dashboard preview sections
const statStrip = document.getElementById("stat-strip");
if (statStrip) statStrip.style.display = "none";

const dashboard = document.getElementById("dashboard");
if (dashboard) dashboard.style.display = "none";

const aiSection = document.getElementById("ai-section");
if (aiSection) aiSection.style.display = "none";
  
  // Attempt load; if it fails, force sign-in.
  try {
    await loadMedications();
    await loadNotifications();
    setInterval(loadNotifications, 30000);
  } catch (e) {
    localStorage.removeItem("token");
    location.reload();
  }
}

// ----- auth handlers -----

// ----- auth UI (login/register tabs) -----
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginFormEl = document.getElementById("login-form");
const registerFormEl = document.getElementById("register-form");
const authErrorEl = document.getElementById("auth-error");
const authErrorRegisterEl = document.getElementById("auth-error-register");

function setAuthMode(mode) {
  if (!loginFormEl || !registerFormEl) return;
  if (mode === "register") {
    loginFormEl.style.display = "none";
    registerFormEl.style.display = "";
    tabLogin?.classList?.remove("active");
    tabRegister?.classList?.add("active");
  } else {
    loginFormEl.style.display = "";
    registerFormEl.style.display = "none";
    tabRegister?.classList?.remove("active");
    tabLogin?.classList?.add("active");
  }
  if (authErrorEl) authErrorEl.style.display = "none";
  if (authErrorRegisterEl) authErrorRegisterEl.style.display = "none";
}

tabLogin?.addEventListener("click", () => setAuthMode("login"));
tabRegister?.addEventListener("click", () => setAuthMode("register"));
setAuthMode("login");

document.getElementById("login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("auth-error");
  errorEl.style.display = "none";

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    errorEl.textContent = data.error || "Login failed";
    errorEl.style.display = "";
    return;
  }

  const data = await res.json();
  localStorage.setItem("token", data.token);
  location.reload();
});

document
  .getElementById("register-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const errorEl = document.getElementById("auth-error");
    errorEl.style.display = "none";

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      errorEl.textContent = data.error || "Registration failed";
      errorEl.style.display = "";
      return;
    }

    const data = await res.json();
    localStorage.setItem("token", data.token);
    location.reload();
  });

document.getElementById("logout-btn")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  location.reload();
});

// ---------- Google auth ----------
const googleBtn = document.getElementById("google-signin-btn");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    const errorEl = document.getElementById("auth-error");
    try {
      if (errorEl) {
        errorEl.style.display = "none";
        errorEl.textContent = "";
      }

      googleBtn.disabled = true;
      const oldText = googleBtn.textContent;
      googleBtn.textContent = "Signing in…";

      window.googleSignIn({
        onToken: async (idToken) => {
          const res = await fetch("/api/google/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Google sign-in failed");
          }

          const data = await res.json().catch(() => ({}));
          if (!data.token) {
            throw new Error(data.error || "Server did not return token");
          }
          localStorage.setItem("token", data.token);
          location.reload();
        },
        onError: (e) => {
          throw e;
        },
      });

      googleBtn.textContent = oldText;
      googleBtn.disabled = false;
    } catch (e) {
      if (errorEl) {
        errorEl.textContent = e?.message || "Google sign-in failed";
        errorEl.style.display = "";
      }
      googleBtn.disabled = false;
      googleBtn.textContent = "Continue with Google";
    }
  });
}

function renderAiInsight(meds, adherencePct) {
  const el = document.getElementById("ai-insight");
  if (!el) return;

  const adherenceNum =
    adherencePct === "—"
      ? null
      : parseInt(String(adherencePct).replace("%", ""), 10);
  const hasMeds = meds && meds.length > 0;

  if (!hasMeds) {
    el.textContent =
      "Add your first medication to unlock personalized adherence insights.";
    return;
  }

  const missedCount = meds.reduce((acc, m) => {
    const missed = (m.last7 || []).filter((d) => d.status === "missed");
    return acc + missed.length;
  }, 0);

  let headline = "Your routine is taking shape";
  if (adherenceNum !== null) {
    if (adherenceNum >= 90) headline = "Strong adherence this week";
    else if (adherenceNum >= 75) headline = "Good adherence—keep going";
    else if (adherenceNum >= 50) headline = "Momentum—reduce missed doses";
    else headline = "Needs attention—start with the next dose";
  }

  const missedText = Number.isFinite(missedCount)
    ? `${missedCount} tracked missed dose${missedCount === 1 ? "" : "s"} in the last 7 days.`
    : "Missed-dose patterns will appear once you start tracking.";

  // Missed window hint based on timeline times that are already passed and not taken.
  const nowHHMM = currentTimeHHMM();
  const missedTimes = meds
    .flatMap((m) => {
      // if not taken today and time is before now, treat as missed-time signal
      if (!m.takenToday && m.time < nowHHMM) return [m.time];
      return [];
    })
    .sort();

  const eveningHint = (() => {
    const evening = missedTimes.filter((t) => {
      const [hh] = t.split(":").map(Number);
      return hh >= 17 || hh < 6;
    });
    if (evening.length > 0)
      return "Evening dosing is the biggest improvement opportunity right now.";
    return "Double-check upcoming times so reminders stay effortless.";
  })();

  let insight = "";

if (adherenceNum >= 90) {
  insight =
    "Excellent adherence this week. Your medication routine is consistent and no major issues were detected.";
} else if (adherenceNum >= 70) {
  insight =
    "Good adherence. A few doses were missed. Maintaining a fixed routine can further improve consistency.";
} else {
  insight =
    "Several doses were missed this week. Consider setting reminders and associating medications with daily habits.";
}

if (lastInteractionResults?.length > 0) {
  insight +=
    " Safety analysis detected medication interactions that should be reviewed.";
}

el.textContent = insight;

  const howEl = document.getElementById("ai-how");
  if (howEl) {
    howEl.textContent =
      "How this works: we combine your adherence timeline with medication times to generate plain-language next steps (not medical advice).";
  }
}

tryInit();
