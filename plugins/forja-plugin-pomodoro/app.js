// =============================================
// Forja Plugin: Pomodoro Timer
// Demonstrates: notifications, project info
//
// Theme integration is handled automatically by Forja's PluginHost.
// All --forja-* CSS variables are injected on load and updated on
// theme changes. Plugins should NOT manually apply theme colors.
// =============================================

(function () {
  "use strict";

  // --- State ---
  var state = {
    mode: "focus",       // "focus" | "break" | "longBreak"
    running: false,
    remaining: 25 * 60,  // seconds
    completedSessions: 0,
    totalFocusSeconds: 0,
    focusDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
  };

  var timerInterval = null;

  // --- DOM refs ---
  var display = document.getElementById("timer-display");
  var label = document.getElementById("timer-label");
  var btnStart = document.getElementById("btn-start");
  var btnPause = document.getElementById("btn-pause");
  var btnReset = document.getElementById("btn-reset");
  var projectName = document.getElementById("project-name");
  var completedCount = document.getElementById("completed-count");
  var totalFocus = document.getElementById("total-focus");
  var focusInput = document.getElementById("focus-duration");
  var breakInput = document.getElementById("break-duration");
  var longBreakInput = document.getElementById("long-break-duration");

  // --- Helpers ---
  function formatTime(seconds) {
    var m = Math.floor(seconds / 60).toString().padStart(2, "0");
    var s = (seconds % 60).toString().padStart(2, "0");
    return m + ":" + s;
  }

  function getDuration() {
    if (state.mode === "focus") return state.focusDuration;
    if (state.mode === "break") return state.breakDuration;
    return state.longBreakDuration;
  }

  function updateDisplay() {
    display.textContent = formatTime(state.remaining);
    display.className = "timer-display";

    if (state.running && state.mode === "focus") display.classList.add("running");
    else if (state.running) display.classList.add("break");
    else if (!state.running && state.remaining < getDuration() * 60) display.classList.add("paused");

    var labels = { focus: "Focus", break: "Break", longBreak: "Long Break" };
    label.textContent = labels[state.mode];

    completedCount.textContent = state.completedSessions;
    totalFocus.textContent = Math.floor(state.totalFocusSeconds / 60) + "m";

    btnStart.disabled = state.running;
    btnPause.disabled = !state.running;
  }

  function tick() {
    if (state.remaining <= 0) {
      onTimerComplete();
      return;
    }
    state.remaining--;
    if (state.mode === "focus") state.totalFocusSeconds++;
    updateDisplay();
  }

  function onTimerComplete() {
    clearInterval(timerInterval);
    timerInterval = null;
    state.running = false;

    if (state.mode === "focus") {
      state.completedSessions++;
      var isLongBreak = state.completedSessions % 4 === 0;

      // Send notification via Forja API
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
    updateDisplay();
  }

  // --- Event handlers ---
  btnStart.addEventListener("click", function () {
    if (state.running) return;
    state.running = true;
    timerInterval = setInterval(tick, 1000);
    updateDisplay();
  });

  btnPause.addEventListener("click", function () {
    if (!state.running) return;
    state.running = false;
    clearInterval(timerInterval);
    timerInterval = null;
    updateDisplay();
  });

  btnReset.addEventListener("click", function () {
    state.running = false;
    clearInterval(timerInterval);
    timerInterval = null;
    state.mode = "focus";
    state.remaining = state.focusDuration * 60;
    updateDisplay();
  });

  focusInput.addEventListener("change", function () {
    state.focusDuration = Math.max(1, Math.min(90, parseInt(this.value) || 25));
    this.value = state.focusDuration;
    if (!state.running && state.mode === "focus") {
      state.remaining = state.focusDuration * 60;
      updateDisplay();
    }
  });

  breakInput.addEventListener("change", function () {
    state.breakDuration = Math.max(1, Math.min(30, parseInt(this.value) || 5));
    this.value = state.breakDuration;
    if (!state.running && state.mode === "break") {
      state.remaining = state.breakDuration * 60;
      updateDisplay();
    }
  });

  longBreakInput.addEventListener("change", function () {
    state.longBreakDuration = Math.max(5, Math.min(60, parseInt(this.value) || 15));
    this.value = state.longBreakDuration;
    if (!state.running && state.mode === "longBreak") {
      state.remaining = state.longBreakDuration * 60;
      updateDisplay();
    }
  });

  // --- Forja API integration ---
  if (typeof forja !== "undefined") {
    // Load active project name
    forja.project.getActive()
      .then(function (project) {
        if (project && project.name) {
          projectName.textContent = project.name;
        }
      })
      .catch(function () {
        projectName.textContent = "No project";
      });

    // Theme colors are injected automatically by Forja's PluginHost
    // via --forja-* CSS variables. No manual theme handling needed.
  }

  // --- Init ---
  updateDisplay();
})();
