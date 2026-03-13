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

  // --- Drag & Drop State ---
  var dragState = {
    active: false,
    type: null, // "task" or "section"
    fromSection: -1,
    fromIndex: -1,
  };

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
  var newSectionNameInput = document.getElementById("new-section-name");

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

  // --- Inline Editing ---
  function makeEditable(el, sectionIndex, taskIndex, field) {
    if (el.classList.contains("editing")) return;
    el.classList.add("editing");

    var originalValue = state.sections[sectionIndex].tasks[taskIndex][field];
    var input = document.createElement(field === "description" ? "textarea" : "input");
    input.className = "task-inline-input" + (field === "description" ? " task-inline-textarea" : "");
    input.value = originalValue;

    if (field === "title") {
      input.type = "text";
      input.placeholder = "Task title...";
    } else {
      input.placeholder = "Description (optional)";
      input.rows = 2;
    }

    el.textContent = "";
    el.appendChild(input);
    input.focus();
    input.select();

    function commit() {
      var newValue = input.value.trim();
      if (field === "title" && !newValue) {
        el.classList.remove("editing");
        el.textContent = originalValue;
        return;
      }
      state.sections[sectionIndex].tasks[taskIndex][field] = newValue;
      el.classList.remove("editing");
      render();
      scheduleSave();
    }

    function cancel() {
      el.classList.remove("editing");
      el.textContent = originalValue;
    }

    input.addEventListener("blur", commit);

    input.addEventListener("keydown", function (e) {
      if (field === "title" && e.key === "Enter") {
        e.preventDefault();
        input.removeEventListener("blur", commit);
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        input.removeEventListener("blur", commit);
        cancel();
      }
    });
  }

  function makeEditableEmpty(el, sectionIndex, taskIndex, field) {
    if (el.classList.contains("editing")) return;
    el.classList.add("editing");

    var input = document.createElement("textarea");
    input.className = "task-inline-input task-inline-textarea";
    input.value = "";
    input.placeholder = "Description (optional)";
    input.rows = 2;

    el.textContent = "";
    el.appendChild(input);
    input.focus();

    function commit() {
      var newValue = input.value.trim();
      state.sections[sectionIndex].tasks[taskIndex][field] = newValue;
      el.classList.remove("editing");
      render();
      scheduleSave();
    }

    function cancel() {
      state.sections[sectionIndex].tasks[taskIndex][field] = "";
      el.classList.remove("editing");
      render();
    }

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        input.removeEventListener("blur", commit);
        cancel();
      }
    });
  }

  // --- Drag & Drop ---
  function clearDropIndicators() {
    var items = taskListEl.querySelectorAll(".drop-above, .drop-below");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove("drop-above", "drop-below");
    }
    var zones = taskListEl.querySelectorAll(".section-drop-zone-active");
    for (var j = 0; j < zones.length; j++) {
      zones[j].classList.remove("section-drop-zone-active");
    }
    var sectionIndicators = taskListEl.querySelectorAll(".section-drop-above, .section-drop-below");
    for (var k = 0; k < sectionIndicators.length; k++) {
      sectionIndicators[k].classList.remove("section-drop-above", "section-drop-below");
    }
  }

  // --- Task Drag ---
  function onTaskDragStart(e, sectionIndex, taskIndex) {
    dragState.active = true;
    dragState.type = "task";
    dragState.fromSection = sectionIndex;
    dragState.fromIndex = taskIndex;

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "task:" + sectionIndex + ":" + taskIndex);

    document.body.classList.add("is-dragging");
    document.body.classList.add("is-dragging-task");

    requestAnimationFrame(function () {
      if (e.target && e.target.classList) {
        e.target.classList.add("dragging");
      }
    });
  }

  function onTaskDragEnd(e) {
    if (e.target && e.target.classList) {
      e.target.classList.remove("dragging");
    }
    dragState.active = false;
    dragState.type = null;
    document.body.classList.remove("is-dragging", "is-dragging-task", "is-dragging-section");
    clearDropIndicators();
  }

  function onTaskDragOver(e) {
    if (!dragState.active || dragState.type !== "task") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    clearDropIndicators();

    var taskItem = e.currentTarget;
    var rect = taskItem.getBoundingClientRect();
    var midY = rect.top + rect.height / 2;

    if (e.clientY < midY) {
      taskItem.classList.add("drop-above");
    } else {
      taskItem.classList.add("drop-below");
    }
  }

  function onTaskDrop(e, toSection, toIndex) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragState.active || dragState.type !== "task") return;

    var rect = e.currentTarget.getBoundingClientRect();
    var midY = rect.top + rect.height / 2;
    var insertIndex = e.clientY < midY ? toIndex : toIndex + 1;

    moveTask(dragState.fromSection, dragState.fromIndex, toSection, insertIndex);
    dragState.active = false;
    dragState.type = null;
    document.body.classList.remove("is-dragging", "is-dragging-task");
    clearDropIndicators();
  }

  function onDropZoneDragOver(e) {
    if (!dragState.active || dragState.type !== "task") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    clearDropIndicators();
    e.currentTarget.classList.add("section-drop-zone-active");
  }

  function onDropZoneDragLeave(e) {
    e.currentTarget.classList.remove("section-drop-zone-active");
  }

  function onDropZoneDrop(e, sectionIndex) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragState.active || dragState.type !== "task") return;

    var toIndex = state.sections[sectionIndex].tasks.length;
    moveTask(dragState.fromSection, dragState.fromIndex, sectionIndex, toIndex);
    dragState.active = false;
    dragState.type = null;
    document.body.classList.remove("is-dragging", "is-dragging-task");
    clearDropIndicators();
  }

  // --- Section Drag ---
  function onSectionDragStart(e, sectionIndex) {
    dragState.active = true;
    dragState.type = "section";
    dragState.fromSection = sectionIndex;
    dragState.fromIndex = -1;

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "section:" + sectionIndex);

    document.body.classList.add("is-dragging");
    document.body.classList.add("is-dragging-section");

    requestAnimationFrame(function () {
      var sectionEl = e.target.closest(".section");
      if (sectionEl) {
        sectionEl.classList.add("section-dragging");
      }
    });
  }

  function onSectionDragEnd() {
    var allSections = taskListEl.querySelectorAll(".section-dragging");
    for (var i = 0; i < allSections.length; i++) {
      allSections[i].classList.remove("section-dragging");
    }
    dragState.active = false;
    dragState.type = null;
    document.body.classList.remove("is-dragging", "is-dragging-task", "is-dragging-section");
    clearDropIndicators();
  }

  // Find which section element the cursor is over by position
  function findSectionAtPoint(clientY) {
    var sectionEls = taskListEl.querySelectorAll(".section[data-section-index]");
    for (var i = 0; i < sectionEls.length; i++) {
      var rect = sectionEls[i].getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return sectionEls[i];
      }
    }
    // If below all sections, return the last one
    if (sectionEls.length > 0) {
      var lastRect = sectionEls[sectionEls.length - 1].getBoundingClientRect();
      if (clientY > lastRect.bottom) {
        return sectionEls[sectionEls.length - 1];
      }
    }
    return null;
  }

  // Delegated section drag handlers on taskListEl
  function initSectionDragDelegation() {
    taskListEl.addEventListener("dragover", function (e) {
      if (!dragState.active || dragState.type !== "section") return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      clearDropIndicators();

      var targetEl = findSectionAtPoint(e.clientY);
      if (!targetEl) return;

      var targetIndex = parseInt(targetEl.getAttribute("data-section-index"), 10);
      if (targetIndex === dragState.fromSection) return;

      var rect = targetEl.getBoundingClientRect();
      var midY = rect.top + rect.height / 2;

      if (e.clientY < midY) {
        targetEl.classList.add("section-drop-above");
      } else {
        targetEl.classList.add("section-drop-below");
      }
    });

    taskListEl.addEventListener("drop", function (e) {
      if (!dragState.active || dragState.type !== "section") return;
      e.preventDefault();

      var targetEl = findSectionAtPoint(e.clientY);
      if (!targetEl) return;

      var targetIndex = parseInt(targetEl.getAttribute("data-section-index"), 10);
      if (targetIndex === dragState.fromSection) {
        dragState.active = false;
        dragState.type = null;
        document.body.classList.remove("is-dragging", "is-dragging-section");
        clearDropIndicators();
        return;
      }

      var rect = targetEl.getBoundingClientRect();
      var midY = rect.top + rect.height / 2;
      var insertIndex = e.clientY < midY ? targetIndex : targetIndex + 1;

      moveSection(dragState.fromSection, insertIndex);
      dragState.active = false;
      dragState.type = null;
      document.body.classList.remove("is-dragging", "is-dragging-section");
      clearDropIndicators();
    });
  }

  initSectionDragDelegation();

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
        sectionEl.setAttribute("data-section-index", si);
      }

      if (section.title) {
        var sectionDone = 0;
        for (var sc = 0; sc < section.tasks.length; sc++) {
          if (section.tasks[sc].done) sectionDone++;
        }

        var headerEl = document.createElement("div");
        headerEl.className = "section-header";
        headerEl.draggable = true;

        // Section drag handle
        var sectionDragHandle = document.createElement("span");
        sectionDragHandle.className = "section-drag-handle";
        sectionDragHandle.setAttribute("aria-hidden", "true");
        sectionDragHandle.title = "Drag to reorder section";

        // Wire up section drag from header
        (function (sIdx) {
          headerEl.addEventListener("dragstart", function (e) {
            onSectionDragStart(e, sIdx);
          });
          headerEl.addEventListener("dragend", onSectionDragEnd);
        })(si);

        var titleSpan = document.createElement("span");
        titleSpan.className = "section-title";
        titleSpan.textContent = section.title;

        var actionsSpan = document.createElement("span");
        actionsSpan.className = "section-actions";

        var countSpan = document.createElement("span");
        countSpan.className = "section-count";
        countSpan.textContent = sectionDone + "/" + section.tasks.length;

        var deleteSectionBtn = document.createElement("button");
        deleteSectionBtn.type = "button";
        deleteSectionBtn.className = "section-delete-btn";
        deleteSectionBtn.textContent = "\u00d7";
        deleteSectionBtn.title = "Remove section";
        deleteSectionBtn.setAttribute("aria-label", "Remove section " + section.title);
        (function (sIdx) {
          deleteSectionBtn.addEventListener("click", function () {
            deleteSection(sIdx);
          });
        })(si);

        actionsSpan.appendChild(countSpan);
        actionsSpan.appendChild(deleteSectionBtn);
        headerEl.appendChild(sectionDragHandle);
        headerEl.appendChild(titleSpan);
        headerEl.appendChild(actionsSpan);
        sectionEl.appendChild(headerEl);
      }

      for (var ti = 0; ti < section.tasks.length; ti++) {
        sectionEl.appendChild(createTaskEl(si, ti, section.tasks[ti]));
      }

      // Drop zone at end of section (visible only while dragging)
      var dropZone = document.createElement("div");
      dropZone.className = "section-drop-zone";
      (function (sIdx) {
        dropZone.addEventListener("dragover", onDropZoneDragOver);
        dropZone.addEventListener("dragleave", onDropZoneDragLeave);
        dropZone.addEventListener("drop", function (e) {
          onDropZoneDrop(e, sIdx);
        });
      })(si);
      sectionEl.appendChild(dropZone);

      // "+ Add task" button at the bottom of each section
      var addTaskBtn = createAddTaskBtn(si);
      sectionEl.appendChild(addTaskBtn);

      taskListEl.appendChild(sectionEl);
    }

  }

  function createAddTaskBtn(sectionIndex) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-add-inline";
    btn.textContent = "+ Add task";
    btn.setAttribute("aria-label", "Add task to this section");

    btn.addEventListener("click", function () {
      showInlineAddForm(sectionIndex, btn);
    });

    return btn;
  }

  function showInlineAddForm(sectionIndex, triggerBtn) {
    // Remove any existing inline forms
    var existing = taskListEl.querySelectorAll(".inline-add-form");
    existing.forEach(function (el) { el.remove(); });
    // Restore any hidden add-task buttons
    var hiddenBtns = taskListEl.querySelectorAll(".btn-add-inline");
    hiddenBtns.forEach(function (b) { b.style.display = ""; });

    var form = document.createElement("div");
    form.className = "inline-add-form";

    var titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "input-field input-title";
    titleInput.placeholder = "Task title...";

    var descInput = document.createElement("input");
    descInput.type = "text";
    descInput.className = "input-field input-description";
    descInput.placeholder = "Description (optional)";

    var actionsRow = document.createElement("div");
    actionsRow.className = "inline-add-actions";

    var confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "btn btn-primary btn-small";
    confirmBtn.textContent = "Add";

    var cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-ghost btn-small";
    cancelBtn.textContent = "Cancel";

    actionsRow.appendChild(confirmBtn);
    actionsRow.appendChild(cancelBtn);

    form.appendChild(titleInput);
    form.appendChild(descInput);
    form.appendChild(actionsRow);

    // Insert form before the trigger button
    triggerBtn.parentNode.insertBefore(form, triggerBtn);
    triggerBtn.style.display = "none";
    titleInput.focus();

    function doAdd() {
      var title = titleInput.value.trim();
      if (!title) {
        titleInput.focus();
        return;
      }
      var desc = descInput.value.trim();
      state.sections[sectionIndex].tasks.push({
        title: title,
        description: desc,
        done: false,
      });
      render();
      scheduleSave();
    }

    function doCancel() {
      form.remove();
      triggerBtn.style.display = "";
    }

    confirmBtn.addEventListener("click", doAdd);
    cancelBtn.addEventListener("click", doCancel);

    titleInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        doAdd();
      } else if (e.key === "Escape") {
        e.preventDefault();
        doCancel();
      }
    });

    descInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        doCancel();
      }
    });
  }

  function createTaskEl(sectionIndex, taskIndex, task) {
    var el = document.createElement("div");
    el.className = "task-item" + (task.done ? " completed" : "");
    el.draggable = true;

    // Drag handle
    var handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.title = "Drag to reorder";

    // Drag events
    (function (sIdx, tIdx) {
      el.addEventListener("dragstart", function (e) {
        onTaskDragStart(e, sIdx, tIdx);
      });
      el.addEventListener("dragend", onTaskDragEnd);
      el.addEventListener("dragover", onTaskDragOver);
      el.addEventListener("drop", function (e) {
        onTaskDrop(e, sIdx, tIdx);
      });
      el.addEventListener("dragleave", function (e) {
        if (!el.contains(e.relatedTarget)) {
          el.classList.remove("drop-above", "drop-below");
        }
      });
    })(sectionIndex, taskIndex);

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
    titleEl.title = "Click to edit";
    titleEl.addEventListener("click", function () {
      if (!task.done) {
        makeEditable(titleEl, sectionIndex, taskIndex, "title");
      }
    });
    content.appendChild(titleEl);

    if (task.description) {
      var descEl = document.createElement("div");
      descEl.className = "task-description";
      descEl.textContent = task.description;
      descEl.title = "Click to edit";
      descEl.addEventListener("click", function () {
        if (!task.done) {
          makeEditable(descEl, sectionIndex, taskIndex, "description");
        }
      });
      content.appendChild(descEl);
    } else {
      var descPlaceholderEl = document.createElement("div");
      descPlaceholderEl.className = "task-description-placeholder";
      descPlaceholderEl.textContent = "Add description...";
      descPlaceholderEl.addEventListener("click", function () {
        if (!task.done) {
          state.sections[sectionIndex].tasks[taskIndex].description = "";
          makeEditableEmpty(descPlaceholderEl, sectionIndex, taskIndex, "description");
        }
      });
      content.appendChild(descPlaceholderEl);
    }

    var deleteBtn = document.createElement("button");
    deleteBtn.className = "task-delete";
    deleteBtn.type = "button";
    deleteBtn.textContent = "\u00d7";
    deleteBtn.setAttribute("aria-label", "Delete " + task.title);
    deleteBtn.addEventListener("click", function () {
      deleteTask(sectionIndex, taskIndex);
    });

    el.appendChild(handle);
    el.appendChild(checkbox);
    el.appendChild(content);
    el.appendChild(deleteBtn);

    return el;
  }

  // --- CRUD Operations ---
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
    if (!newSectionNameInput) return;
    var name = newSectionNameInput.value.trim();
    if (!name) return;

    // Check for duplicates
    for (var i = 0; i < state.sections.length; i++) {
      if (state.sections[i].title === name) {
        newSectionNameInput.focus();
        return;
      }
    }

    state.sections.push({ title: name, tasks: [] });
    newSectionNameInput.value = "";
    render();
    scheduleSave();
  }

  function moveTask(fromSection, fromIndex, toSection, toIndex) {
    // No-op if dropped in same position
    if (fromSection === toSection && (fromIndex === toIndex || fromIndex + 1 === toIndex)) {
      return;
    }

    var task = state.sections[fromSection].tasks[fromIndex];

    // Remove from source
    state.sections[fromSection].tasks.splice(fromIndex, 1);

    // Adjust target index if in same section and after removed item
    if (fromSection === toSection && toIndex > fromIndex) {
      toIndex--;
    }

    // Insert at destination
    state.sections[toSection].tasks.splice(toIndex, 0, task);

    render();
    scheduleSave();
  }

  function moveSection(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex + 1 === toIndex) return;

    var section = state.sections[fromIndex];
    state.sections.splice(fromIndex, 1);

    if (toIndex > fromIndex) {
      toIndex--;
    }

    state.sections.splice(toIndex, 0, section);
    render();
    scheduleSave();
  }

  function deleteSection(sectionIndex) {
    var section = state.sections[sectionIndex];

    if (section.tasks.length > 0) {
      // Move orphaned tasks to the untitled section
      var unsortedIndex = -1;
      for (var i = 0; i < state.sections.length; i++) {
        if (state.sections[i].title === null) {
          unsortedIndex = i;
          break;
        }
      }

      if (unsortedIndex === -1) {
        // Create untitled section at the top
        state.sections.unshift({ title: null, tasks: [] });
        unsortedIndex = 0;
        sectionIndex++; // adjust because we shifted
      }

      for (var j = 0; j < section.tasks.length; j++) {
        state.sections[unsortedIndex].tasks.push(section.tasks[j]);
      }
    }

    state.sections.splice(sectionIndex, 1);
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
  if (newSectionNameInput) {
    newSectionNameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addSection();
      }
    });
  }

  // --- Forja API Integration ---
  if (typeof forja !== "undefined") {
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
