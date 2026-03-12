// =============================================
// Forja Plugin: Pomodoro Timer
// Demonstrates: notifications, sidebar badge, localStorage persistence
//
// Theme integration is handled automatically by Forja's PluginHost.
// All --forja-* CSS variables are injected on load and updated on
// theme changes. Plugins should NOT manually apply theme colors.
//
// This plugin is GLOBAL — it does not bind to any specific project.
// =============================================

(function () {
  "use strict";

  var STORAGE_KEY_CONFIG = "pomodoro:config";
  var STORAGE_KEY_SESSION = "pomodoro:session";

  // --- Default config ---
  var defaults = {
    sessionTarget: 8,
    focusDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
  };

  // --- Persistence helpers ---
  function loadConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return null;
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({
        sessionTarget: state.sessionTarget,
        focusDuration: state.focusDuration,
        breakDuration: state.breakDuration,
        longBreakDuration: state.longBreakDuration,
      }));
    } catch (_) { /* ignore */ }
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_SESSION);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return null;
  }

  function saveSession() {
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({
        mode: state.mode,
        remaining: state.remaining,
        totalDuration: state.totalDuration,
        completedToday: state.completedToday,
        totalFocusSeconds: state.totalFocusSeconds,
        sessionPomodorosCompleted: state.sessionPomodorosCompleted,
        running: state.running,
        lastTickAt: state.running ? Date.now() : null,
        savedAt: Date.now(),
        savedDate: new Date().toDateString(),
      }));
    } catch (_) { /* ignore */ }
  }

  function clearSession() {
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    } catch (_) { /* ignore */ }
  }

  // --- Load persisted config ---
  var savedConfig = loadConfig();
  var cfg = {
    sessionTarget: (savedConfig && savedConfig.sessionTarget) || defaults.sessionTarget,
    focusDuration: (savedConfig && savedConfig.focusDuration) || defaults.focusDuration,
    breakDuration: (savedConfig && savedConfig.breakDuration) || defaults.breakDuration,
    longBreakDuration: (savedConfig && savedConfig.longBreakDuration) || defaults.longBreakDuration,
  };

  // --- State ---
  var state = {
    mode: "focus",
    running: false,
    remaining: cfg.focusDuration * 60,
    totalDuration: cfg.focusDuration * 60,
    completedToday: 0,
    totalFocusSeconds: 0,
    sessionPomodorosCompleted: 0,
    sessionTarget: cfg.sessionTarget,
    focusDuration: cfg.focusDuration,
    breakDuration: cfg.breakDuration,
    longBreakDuration: cfg.longBreakDuration,
  };

  var timerInterval = null;

  // --- Restore active session ---
  var savedSession = loadSession();
  if (savedSession) {
    // Only restore stats if same day
    var isToday = savedSession.savedDate === new Date().toDateString();

    state.mode = savedSession.mode || "focus";
    state.totalDuration = savedSession.totalDuration || state.totalDuration;
    state.completedToday = isToday ? (savedSession.completedToday || 0) : 0;
    state.totalFocusSeconds = isToday ? (savedSession.totalFocusSeconds || 0) : 0;
    state.sessionPomodorosCompleted = isToday ? (savedSession.sessionPomodorosCompleted || 0) : 0;

    if (savedSession.running && savedSession.lastTickAt) {
      // Calculate elapsed time since last save
      var elapsedMs = Date.now() - savedSession.lastTickAt;
      var elapsedSec = Math.floor(elapsedMs / 1000);
      var newRemaining = (savedSession.remaining || 0) - elapsedSec;

      if (newRemaining > 0) {
        state.remaining = newRemaining;
        state.running = true;
        // Count focus time that elapsed while closed
        if (state.mode === "focus") {
          state.totalFocusSeconds += elapsedSec;
        }
      } else {
        // Timer would have completed — mark complete and set to next phase
        if (state.mode === "focus") {
          state.completedToday++;
          state.sessionPomodorosCompleted++;
          state.totalFocusSeconds += (savedSession.remaining || 0);
          var isLongBreak = state.completedToday % 4 === 0;
          state.mode = isLongBreak ? "longBreak" : "break";
        } else {
          state.mode = "focus";
        }
        state.remaining = getDuration() * 60;
        state.totalDuration = state.remaining;
        state.running = false;
      }
    } else {
      state.remaining = savedSession.remaining || state.remaining;
      state.running = false;
    }
  }

  // --- DOM refs ---
  var display      = document.getElementById("timer-display");
  var stateLabel   = document.getElementById("timer-state-label");
  var progressFill = document.getElementById("progress-bar-fill");
  var sessionDots  = document.getElementById("session-dots");
  var btnStart     = document.getElementById("btn-start");
  var btnClear     = document.getElementById("btn-clear");
  var statPomodoros = document.getElementById("stat-pomodoros");
  var statFinish    = document.getElementById("stat-finish");
  var statTotalFocus = document.getElementById("stat-total-focus");

  var btnSettingsToggle = document.getElementById("btn-settings-toggle");
  var configPanel        = document.getElementById("config-panel");

  var modeTabs = document.querySelectorAll(".mode-tab");

  // Config displays
  var sessionPomodorosDisplay = document.getElementById("session-pomodoros-display");
  var focusDurationDisplay    = document.getElementById("focus-duration-display");
  var breakDurationDisplay    = document.getElementById("break-duration-display");
  var longBreakDurationDisplay = document.getElementById("long-break-duration-display");

  // --- Helpers ---
  function formatTime(seconds) {
    var m = Math.floor(seconds / 60).toString().padStart(2, "0");
    var s = (seconds % 60).toString().padStart(2, "0");
    return m + ":" + s;
  }

  function formatTimeShort(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    if (m >= 60) {
      return Math.floor(m / 60) + "h";
    }
    if (s === 0) return m + "m";
    return m + ":" + s.toString().padStart(2, "0");
  }

  function formatDuration(totalSeconds) {
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return h + "h " + m + "m";
    return m + "m";
  }

  function getDuration() {
    if (state.mode === "focus") return state.focusDuration;
    if (state.mode === "break") return state.breakDuration;
    return state.longBreakDuration;
  }

  function isBreakMode() {
    return state.mode === "break" || state.mode === "longBreak";
  }

  function calcFinishTime() {
    var focusLeft = state.sessionTarget - state.completedToday;
    if (focusLeft <= 0) return null;

    var totalSeconds = state.remaining;
    if (state.mode === "focus" && focusLeft > 1) {
      var extraFocusSessions = focusLeft - 1;
      for (var i = 1; i <= extraFocusSessions; i++) {
        var sessionIndex = state.completedToday + i;
        var isLong = sessionIndex > 0 && sessionIndex % 4 === 0;
        totalSeconds += state.focusDuration * 60;
        totalSeconds += (isLong ? state.longBreakDuration : state.breakDuration) * 60;
      }
    } else if (isBreakMode()) {
      totalSeconds += focusLeft * state.focusDuration * 60;
      for (var j = 0; j < focusLeft - 1; j++) {
        var sIdx = state.completedToday + j + 1;
        var isLongBreak = sIdx > 0 && sIdx % 4 === 0;
        totalSeconds += (isLongBreak ? state.longBreakDuration : state.breakDuration) * 60;
      }
    }

    var finishAt = new Date(Date.now() + totalSeconds * 1000);
    var hh = finishAt.getHours().toString().padStart(2, "0");
    var mm = finishAt.getMinutes().toString().padStart(2, "0");
    return hh + ":" + mm + " (" + formatDuration(totalSeconds) + ")";
  }

  // --- Sidebar badge ---
  function updateBadge() {
    if (typeof forja === "undefined" || !forja.sidebar) return;
    try {
      if (state.running) {
        forja.sidebar.setBadge(formatTimeShort(state.remaining));
      } else {
        forja.sidebar.setBadge("");
      }
    } catch (_) { /* ignore */ }
  }

  // --- Render ---
  function renderDots() {
    sessionDots.innerHTML = "";
    for (var i = 0; i < state.sessionTarget; i++) {
      var dot = document.createElement("span");
      dot.className = "session-dot";
      if (i < state.sessionPomodorosCompleted) {
        dot.classList.add("completed");
      } else if (i === state.sessionPomodorosCompleted && state.mode === "focus") {
        dot.classList.add("current");
      }
      sessionDots.appendChild(dot);
    }
  }

  function updateDisplay() {
    display.textContent = formatTime(state.remaining);

    // Timer color state classes
    display.className = "timer-display";
    stateLabel.className = "timer-state-label";
    progressFill.className = "progress-bar-fill";

    if (state.running && state.mode === "focus") {
      display.classList.add("running");
      stateLabel.classList.add("running");
      stateLabel.textContent = "FOCUS";
    } else if (state.running && isBreakMode()) {
      display.classList.add("break-running");
      stateLabel.classList.add("break-running");
      progressFill.classList.add("break-mode");
      stateLabel.textContent = state.mode === "longBreak" ? "LONG BREAK" : "BREAK";
    } else if (!state.running && state.remaining < state.totalDuration) {
      display.classList.add("paused");
      stateLabel.textContent = "PAUSED";
    } else {
      stateLabel.textContent = "IDLE";
    }

    // Progress bar
    var elapsed = state.totalDuration - state.remaining;
    var pct = state.totalDuration > 0 ? (elapsed / state.totalDuration) * 100 : 0;
    progressFill.style.width = pct + "%";
    if (isBreakMode() && state.running) progressFill.classList.add("break-mode");

    // Start/Pause button
    if (state.running && state.mode === "focus") {
      btnStart.textContent = "Pause";
      btnStart.className = "btn btn-start is-running";
    } else if (state.running && isBreakMode()) {
      btnStart.textContent = "Pause";
      btnStart.className = "btn btn-start is-break";
    } else if (!state.running && state.remaining < state.totalDuration) {
      btnStart.textContent = "Resume";
      btnStart.className = "btn btn-start";
    } else {
      btnStart.textContent = "Start";
      btnStart.className = "btn btn-start";
    }

    // Clear button — visible only when paused mid-session
    var hasPaused = !state.running && state.remaining < state.totalDuration;
    btnClear.style.display = hasPaused ? "inline-block" : "none";

    // Stats
    statPomodoros.innerHTML = state.completedToday + " / <span id=\"session-target\">" + state.sessionTarget + "</span>";
    var finishStr = calcFinishTime();
    statFinish.textContent = finishStr || "--:-- (--)";
    statTotalFocus.textContent = formatDuration(state.totalFocusSeconds);

    // Dots
    renderDots();

    // Config displays
    sessionPomodorosDisplay.textContent = state.sessionTarget;
    focusDurationDisplay.textContent = state.focusDuration;
    breakDurationDisplay.textContent = state.breakDuration;
    longBreakDurationDisplay.textContent = state.longBreakDuration;

    // Sidebar badge
    updateBadge();
  }

  function syncActiveModeTab() {
    modeTabs.forEach(function (tab) {
      tab.classList.remove("active");
      tab.setAttribute("aria-selected", "false");
      if (tab.getAttribute("data-mode") === state.mode) {
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
      }
    });
  }

  // --- Timer logic ---
  function tick() {
    if (state.remaining <= 0) {
      onTimerComplete();
      return;
    }
    state.remaining--;
    if (state.mode === "focus") state.totalFocusSeconds++;
    updateDisplay();
    saveSession();
  }

  function onTimerComplete() {
    clearInterval(timerInterval);
    timerInterval = null;
    state.running = false;

    if (state.mode === "focus") {
      state.completedToday++;
      state.sessionPomodorosCompleted++;
      var isLongBreak = state.completedToday % 4 === 0;

      if (typeof forja !== "undefined") {
        forja.notifications.show({
          title: "Pomodoro Complete!",
          body: isLongBreak
            ? "Great work! Time for a long break."
            : "Good job! Take a short break.",
        }).catch(function () { /* permission not granted, ignore */ });
      }

      state.mode = isLongBreak ? "longBreak" : "break";
    } else {
      if (typeof forja !== "undefined") {
        forja.notifications.show({
          title: "Break Over",
          body: "Ready to focus again?",
        }).catch(function () { /* ignore */ });
      }
      state.mode = "focus";
    }

    state.remaining = getDuration() * 60;
    state.totalDuration = state.remaining;
    syncActiveModeTab();
    updateDisplay();
    saveSession();
  }

  // --- Event handlers ---
  btnStart.addEventListener("click", function () {
    if (state.running) {
      // Pause
      state.running = false;
      clearInterval(timerInterval);
      timerInterval = null;
    } else {
      // Start / Resume
      state.running = true;
      timerInterval = setInterval(tick, 1000);
    }
    updateDisplay();
    saveSession();
  });

  btnClear.addEventListener("click", function () {
    state.running = false;
    clearInterval(timerInterval);
    timerInterval = null;
    state.remaining = getDuration() * 60;
    state.totalDuration = state.remaining;
    updateDisplay();
    saveSession();
  });

  // Mode tabs
  modeTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      if (state.running) return;
      var newMode = this.getAttribute("data-mode");
      state.mode = newMode;
      state.remaining = getDuration() * 60;
      state.totalDuration = state.remaining;
      syncActiveModeTab();
      updateDisplay();
      saveSession();
    });
  });

  // Counter buttons (Session Configuration)
  document.querySelectorAll(".counter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (state.running) return;
      var action = this.getAttribute("data-action");
      var target = this.getAttribute("data-target");

      if (target === "session-pomodoros") {
        if (action === "inc") state.sessionTarget = Math.min(20, state.sessionTarget + 1);
        else state.sessionTarget = Math.max(1, state.sessionTarget - 1);
      } else if (target === "focus-duration") {
        if (action === "inc") state.focusDuration = Math.min(90, state.focusDuration + 1);
        else state.focusDuration = Math.max(1, state.focusDuration - 1);
        if (state.mode === "focus") {
          state.remaining = state.focusDuration * 60;
          state.totalDuration = state.remaining;
        }
      } else if (target === "break-duration") {
        if (action === "inc") state.breakDuration = Math.min(30, state.breakDuration + 1);
        else state.breakDuration = Math.max(1, state.breakDuration - 1);
        if (state.mode === "break") {
          state.remaining = state.breakDuration * 60;
          state.totalDuration = state.remaining;
        }
      } else if (target === "long-break-duration") {
        if (action === "inc") state.longBreakDuration = Math.min(60, state.longBreakDuration + 1);
        else state.longBreakDuration = Math.max(5, state.longBreakDuration - 1);
        if (state.mode === "longBreak") {
          state.remaining = state.longBreakDuration * 60;
          state.totalDuration = state.remaining;
        }
      }

      updateDisplay();
      saveConfig();
      saveSession();
    });
  });

  // Settings toggle
  btnSettingsToggle.addEventListener("click", function () {
    var isHidden = configPanel.hasAttribute("hidden");
    if (isHidden) {
      configPanel.removeAttribute("hidden");
      btnSettingsToggle.setAttribute("aria-expanded", "true");
    } else {
      configPanel.setAttribute("hidden", "");
      btnSettingsToggle.setAttribute("aria-expanded", "false");
    }
  });

  // Save session on page unload (app closing or sidebar closing)
  window.addEventListener("beforeunload", function () {
    saveSession();
  });

  // --- Init ---
  syncActiveModeTab();
  updateDisplay();

  // Auto-resume timer if it was running
  if (state.running) {
    timerInterval = setInterval(tick, 1000);
  }
})();
