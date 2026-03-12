// =============================================
// Forja Plugin: Tasks
// Manages project tasks from a TASKS.md file.
//
// Theme integration is handled automatically by Forja's PluginHost.
// All --forja-* CSS variables are injected on load and updated on
// theme changes. Plugins should NOT manually apply theme colors.
// =============================================

(function () {
  "use strict";

  var FILENAME = "TASKS.md";

  // --- State ---
  var state = {
    projectPath: null,
    projectName: null,
    sections: [], // [{ title: string|null, tasks: [{ title, description, done }] }]
    loading: false,
  };

  var saveTimer = null;

  // --- DOM refs ---
  var projectNameEl = document.getElementById("project-name");
  var statsEl = document.getElementById("stats");
  var statsTextEl = document.getElementById("stats-text");
  var statsProgressFill = document.getElementById("stats-progress-fill");
  var noProjectState = document.getElementById("no-project-state");
  var emptyState = document.getElementById("empty-state");
  var loadingState = document.getElementById("loading-state");
  var taskListEl = document.getElementById("task-list");
  var addFormEl = document.getElementById("add-form");
  var newTitleInput = document.getElementById("new-task-title");
  var newDescInput = document.getElementById("new-task-description");
  var newSectionSelect = document.getElementById("new-task-section");
  var btnAdd = document.getElementById("btn-add");
  var btnAddSection = document.getElementById("btn-add-section");

  // --- Markdown Parser ---
  function parseMarkdown(text) {
    var lines = text.split("\n");
    var sections = [];
    var current = { title: null, tasks: [] };
    sections.push(current);

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      // Section header: ## Title
      var sectionMatch = trimmed.match(/^##\s+(.+)$/);
      if (sectionMatch) {
        current = { title: sectionMatch[1].trim(), tasks: [] };
        sections.push(current);
        continue;
      }

      // Task: - [ ] or - [x]
      var taskMatch = trimmed.match(/^-\s+\[([ xX])\]\s+(.+)$/);
      if (taskMatch) {
        current.tasks.push({
          title: taskMatch[2].trim(),
          description: "",
          done: taskMatch[1] !== " ",
        });
        continue;
      }

      // Description: > text (belongs to last task)
      var descMatch = trimmed.match(/^>\s*(.*)$/);
      if (descMatch && current.tasks.length > 0) {
        var lastTask = current.tasks[current.tasks.length - 1];
        if (lastTask.description) {
          lastTask.description += "\n" + descMatch[1];
        } else {
          lastTask.description = descMatch[1];
        }
        continue;
      }
    }

    return sections;
  }

  // --- Markdown Generator ---
  function toMarkdown(sections) {
    var lines = ["# TASKS.md", ""];

    for (var i = 0; i < sections.length; i++) {
      var section = sections[i];

      if (section.title) {
        lines.push("## " + section.title);
        lines.push("");
      }

      for (var j = 0; j < section.tasks.length; j++) {
        var task = section.tasks[j];
        var checkbox = task.done ? "[x]" : "[ ]";
        lines.push("- " + checkbox + " " + task.title);
        if (task.description) {
          var descLines = task.description.split("\n");
          for (var k = 0; k < descLines.length; k++) {
            lines.push("  > " + descLines[k]);
          }
        }
        lines.push("");
      }
    }

    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  // --- Rendering ---
  function render() {
    // Stats
    var total = 0;
    var done = 0;
    for (var i = 0; i < state.sections.length; i++) {
      for (var j = 0; j < state.sections[i].tasks.length; j++) {
        total++;
        if (state.sections[i].tasks[j].done) done++;
      }
    }

    projectNameEl.textContent = state.projectName || "No project";
    if (total > 0) {
      statsEl.classList.add("visible");
      statsTextEl.textContent = done + "/" + total;
      statsProgressFill.style.width = Math.round((done / total) * 100) + "%";
    } else {
      statsEl.classList.remove("visible");
    }

    // Visibility
    var hasProject = !!state.projectPath;
    var hasTasks = total > 0;

    noProjectState.style.display = !hasProject ? "" : "none";
    loadingState.style.display = hasProject && state.loading ? "" : "none";
    emptyState.style.display = hasProject && !state.loading && !hasTasks ? "" : "none";
    taskListEl.style.display = hasProject && !state.loading ? "" : "none";
    addFormEl.style.display = hasProject && !state.loading ? "" : "none";

    // Task list
    taskListEl.innerHTML = "";

    for (var si = 0; si < state.sections.length; si++) {
      var section = state.sections[si];
      var sectionEl = document.createElement("div");
      sectionEl.className = "section";

      if (section.title) {
        var sectionDone = 0;
        for (var sc = 0; sc < section.tasks.length; sc++) {
          if (section.tasks[sc].done) sectionDone++;
        }

        var headerEl = document.createElement("div");
        headerEl.className = "section-header";
        headerEl.innerHTML =
          '<span class="section-title">' + escapeHtml(section.title) + "</span>" +
          '<span class="section-count">' + sectionDone + "/" + section.tasks.length + "</span>";
        sectionEl.appendChild(headerEl);
      }

      for (var ti = 0; ti < section.tasks.length; ti++) {
        sectionEl.appendChild(createTaskEl(si, ti, section.tasks[ti]));
      }

      taskListEl.appendChild(sectionEl);
    }

    // Section select
    updateSectionSelect();
  }

  function createTaskEl(sectionIndex, taskIndex, task) {
    var el = document.createElement("div");
    el.className = "task-item" + (task.done ? " completed" : "");

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", "Toggle " + task.title);
    checkbox.addEventListener("change", function () {
      toggleTask(sectionIndex, taskIndex);
    });

    var content = document.createElement("div");
    content.className = "task-content";

    var titleEl = document.createElement("div");
    titleEl.className = "task-title";
    titleEl.textContent = task.title;
    content.appendChild(titleEl);

    if (task.description) {
      var descEl = document.createElement("div");
      descEl.className = "task-description";
      descEl.textContent = task.description;
      content.appendChild(descEl);
    }

    var deleteBtn = document.createElement("button");
    deleteBtn.className = "task-delete";
    deleteBtn.type = "button";
    deleteBtn.textContent = "\u00d7";
    deleteBtn.setAttribute("aria-label", "Delete " + task.title);
    deleteBtn.addEventListener("click", function () {
      deleteTask(sectionIndex, taskIndex);
    });

    el.appendChild(checkbox);
    el.appendChild(content);
    el.appendChild(deleteBtn);

    return el;
  }

  function updateSectionSelect() {
    var currentValue = newSectionSelect.value;
    newSectionSelect.innerHTML = '<option value="">No section</option>';

    for (var i = 0; i < state.sections.length; i++) {
      if (state.sections[i].title) {
        var opt = document.createElement("option");
        opt.value = state.sections[i].title;
        opt.textContent = state.sections[i].title;
        newSectionSelect.appendChild(opt);
      }
    }

    newSectionSelect.value = currentValue;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // --- CRUD Operations ---
  function addTask() {
    var title = newTitleInput.value.trim();
    if (!title) return;

    var description = newDescInput.value.trim();
    var sectionTitle = newSectionSelect.value;
    var task = { title: title, description: description, done: false };

    var added = false;
    if (sectionTitle) {
      for (var i = 0; i < state.sections.length; i++) {
        if (state.sections[i].title === sectionTitle) {
          state.sections[i].tasks.push(task);
          added = true;
          break;
        }
      }
    }

    if (!added) {
      // Add to the first (untitled) section, create one if needed
      if (state.sections.length === 0 || state.sections[0].title !== null) {
        state.sections.unshift({ title: null, tasks: [] });
      }
      state.sections[0].tasks.push(task);
    }

    newTitleInput.value = "";
    newDescInput.value = "";
    render();
    scheduleSave();
    newTitleInput.focus();
  }

  function toggleTask(sectionIndex, taskIndex) {
    var task = state.sections[sectionIndex].tasks[taskIndex];
    task.done = !task.done;
    render();
    scheduleSave();
  }

  function deleteTask(sectionIndex, taskIndex) {
    state.sections[sectionIndex].tasks.splice(taskIndex, 1);

    // Remove empty titled sections
    if (
      state.sections[sectionIndex].title &&
      state.sections[sectionIndex].tasks.length === 0
    ) {
      state.sections.splice(sectionIndex, 1);
    }

    render();
    scheduleSave();
  }

  function addSection() {
    var name = prompt("Section name:");
    if (!name || !name.trim()) return;

    name = name.trim();

    // Check for duplicates
    for (var i = 0; i < state.sections.length; i++) {
      if (state.sections[i].title === name) return;
    }

    state.sections.push({ title: name, tasks: [] });
    render();
    scheduleSave();
  }

  // --- File I/O ---
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveFile, 300);
  }

  function saveFile() {
    if (!state.projectPath || typeof forja === "undefined") return;

    var content = toMarkdown(state.sections);
    forja.fs.writeFile(FILENAME, content).catch(function (err) {
      console.error("Failed to save TASKS.md:", err);
    });
  }

  function loadFile() {
    if (!state.projectPath || typeof forja === "undefined") {
      state.sections = [];
      state.loading = false;
      render();
      return;
    }

    state.loading = true;
    render();

    forja.fs
      .readFile(FILENAME)
      .then(function (content) {
        state.sections = parseMarkdown(content || "");
        state.loading = false;
        render();
      })
      .catch(function () {
        // File doesn't exist yet - start fresh
        state.sections = [];
        state.loading = false;
        render();
      });
  }

  // --- Event Handlers ---
  btnAdd.addEventListener("click", addTask);

  newTitleInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
    }
  });

  btnAddSection.addEventListener("click", addSection);

  // --- Forja API Integration ---
  if (typeof forja !== "undefined") {
    // Load active project on init
    forja.project
      .getActive()
      .then(function (project) {
        if (project && project.path) {
          state.projectPath = project.path;
          state.projectName = project.name || null;
          loadFile();
        } else {
          render();
        }
      })
      .catch(function (err) {
        console.error("[Tasks] getActive error:", err);
        render();
      });

    // React to project changes
    forja.on("project-changed", function (payload) {
      state.projectPath = payload.path || null;
      state.projectName = payload.name || null;
      loadFile();
    });
  } else {
    console.warn("[Tasks] forja API not available");
    render();
  }
})();
