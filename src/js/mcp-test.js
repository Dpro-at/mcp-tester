let tools = [];
let history = JSON.parse(localStorage.getItem("mcpHistory")) || [];
let endpoints = JSON.parse(localStorage.getItem("mcpEndpoints")) || [];
let settings = JSON.parse(localStorage.getItem("mcpSettings")) || {
  theme: "light",
  notifications: "enabled",
};

// Initialize the app

document.addEventListener("DOMContentLoaded", function () {
  loadSettings();
  updateConnectionStatus();
  renderHistory();
  renderEndpoints();
  // Load last used endpoints
  const lastToolsUrl = localStorage.getItem("lastToolsUrl");
  const lastExecuteUrl = localStorage.getItem("lastExecuteUrl");
  if (lastToolsUrl) document.getElementById("toolsUrl").value = lastToolsUrl;
  if (lastExecuteUrl)
    document.getElementById("executeUrl").value = lastExecuteUrl;
  // Auto-load tools if URL is available
  if (lastToolsUrl) {
    setTimeout(loadTools, 500);
  }
  showCookieBanner();
});

function switchTab(tabId) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });
  document
    .querySelector(`.tab[onclick="switchTab('${tabId}')"]`)
    .classList.add("active");
  document.getElementById(`${tabId}-tab`).classList.add("active");
  if (tabId === "checklist") {
    renderToolsMap();
  }
  if (tabId === "diagram") {
    setTimeout(renderDynamicDiagram, 50);
  } else {
    // Hide diagram when leaving the tab
    const container = document.getElementById("custom-diagram-container");
    if (container) container.innerHTML = "";
  }
}

function updateConnectionStatus() {
  const statusIndicator = document.getElementById("connection-status");
  statusIndicator.classList.remove("status-active");
  // Simulate connection check - in real app you would ping the server
  setTimeout(() => {
    statusIndicator.classList.add("status-active");
  }, 1000);
}

async function loadTools() {
  const url = document.getElementById("toolsUrl").value;
  const button = document.querySelector('button[onclick="loadTools()"]');
  const originalText = button.innerHTML;
  // Save URLs to localStorage
  localStorage.setItem("lastToolsUrl", url);
  localStorage.setItem(
    "lastExecuteUrl",
    document.getElementById("executeUrl").value
  );
  try {
    button.innerHTML = '<span class="loader"></span> Loading...';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    tools = json.tools || [];
    const select = document.createElement("select");
    select.id = "toolSelect";
    select.onchange = renderParams;
    if (tools.length === 0) {
      select.innerHTML = '<option value="">No tools available</option>';
    } else {
      tools.forEach((tool, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        opt.textContent = tool.name;
        select.appendChild(opt);
      });
    }
    // Replace the input with select if it exists
    const toolSection = document.getElementById("tool-section");
    const existingSelect = document.getElementById("toolSelect");
    if (existingSelect) {
      existingSelect.replaceWith(select);
    } else {
      const label = document.createElement("label");
      label.innerHTML = '<i class="fas fa-toolbox"></i> Select Tool:';
      toolSection.insertBefore(label, toolSection.firstChild);
      toolSection.insertBefore(select, label.nextSibling);
    }
    toolSection.style.display = "block";
    document.getElementById("responseBox").textContent =
      '{\n  "status": "ready"\n}';
    renderParams();
    renderToolsMap();
    showNotification("Tools loaded successfully", "success");
  } catch (e) {
    tools = [];
    renderToolsMap();
    document.getElementById(
      "responseBox"
    ).textContent = `❌ Error loading tools: ${e.message}`;
    showNotification("Failed to load tools", "error");
  } finally {
    button.innerHTML = originalText;
  }
}

function renderParams() {
  const container = document.getElementById("paramsContainer");
  container.innerHTML = "";
  const toolIndex = document.getElementById("toolSelect").value;
  if (toolIndex === "" || !tools[toolIndex]) {
    document.getElementById("toolDesc").textContent = "";
    return;
  }
  const tool = tools[toolIndex];
  document.getElementById("toolDesc").textContent =
    tool.description || "No description available";
  if (!tool.parameters || !tool.parameters.properties) {
    container.innerHTML =
      '<div class="param-item"><em>No parameters required for this tool.</em></div>';
    return;
  }
  // Display each parameter in a separate row (vertical layout)
  Object.entries(tool.parameters.properties).forEach(([key, val]) => {
    const paramDiv = document.createElement("div");
    paramDiv.className = "param-item";
    paramDiv.style.marginBottom = "1rem";
    const label = document.createElement("label");
    label.innerHTML = `<i class="fas fa-tag"></i> ${key} <small>(${val.type})</small>`;
    let input;
    if (val.type === "boolean") {
      input = document.createElement("div");
      input.style.display = "flex";
      input.style.alignItems = "center";
      input.style.gap = "0.5rem";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "param_" + key;
      checkbox.style.width = "auto";
      const span = document.createElement("span");
      span.textContent = val.description || "";
      input.appendChild(checkbox);
      input.appendChild(span);
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.id = "param_" + key;
      input.placeholder =
        val.example !== undefined ? `Example: ${val.example}` : "";
    }
    paramDiv.appendChild(label);
    paramDiv.appendChild(input);
    container.appendChild(paramDiv);
  });
}

async function executeTool() {
  const toolIndex = document.getElementById("toolSelect").value;
  if (toolIndex === "" || !tools[toolIndex]) {
    showNotification("Please select a tool first", "warning");
    return;
  }
  const tool = tools[toolIndex];
  const input = {};
  if (tool.parameters && tool.parameters.properties) {
    for (const key of Object.keys(tool.parameters.properties)) {
      const paramType = tool.parameters.properties[key].type;
      const element = document.getElementById("param_" + key);
      if (!element) continue;
      let val;
      if (paramType === "boolean") {
        val = element.checked;
      } else {
        val = element.value;
        if (paramType === "number") {
          val = val !== "" ? Number(val) : undefined;
        }
      }
      if (val !== undefined && val !== "") {
        input[key] = val;
      }
    }
  }
  const payload = {
    action: tool.name,
    input: input,
    timestamp: new Date().toISOString(),
  };
  const executeUrl = document.getElementById("executeUrl").value;
  const responseBox = document.getElementById("responseBox");
  const button = document.querySelector('button[onclick="executeTool()"]');
  const originalText = button.innerHTML;
  try {
    button.innerHTML = '<span class="loader"></span> Executing...';
    responseBox.textContent = "⏳ Executing request...";
    const startTime = performance.now();
    const res = await fetch(executeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const responseTime = ((performance.now() - startTime) / 1000).toFixed(2);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const responseJson = await res.json();
    const formattedResponse = JSON.stringify(responseJson, null, 2);
    responseBox.textContent = formattedResponse;
    // Add to history
    addToHistory({
      tool: tool.name,
      input: input,
      response: responseJson,
      timestamp: payload.timestamp,
      responseTime: responseTime,
      endpoint: executeUrl,
    });
    showNotification(
      `Tool executed successfully (${responseTime}s)`,
      "success"
    );
  } catch (e) {
    responseBox.textContent = `❌ Error executing tool: ${e.message}`;
    showNotification("Execution failed", "error");
  } finally {
    button.innerHTML = originalText;
  }
}

function addToHistory(entry) {
  history.unshift(entry);
  if (history.length > 50) history.pop();
  localStorage.setItem("mcpHistory", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = "";
  history.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <div class="history-title">${item.tool}</div>
      <div class="history-details">
        <span>${new Date(item.timestamp).toLocaleString()}</span>
        <span>${item.responseTime}s</span>
        <span>${item.endpoint}</span>
      </div>
    `;
    div.onclick = () => {
      document
        .querySelectorAll(".history-item.selected")
        .forEach((el) => el.classList.remove("selected"));
      div.classList.add("selected");
      const responseBox = document.getElementById("responseBox");
      responseBox.textContent = JSON.stringify(item.response, null, 2);
    };
    historyList.appendChild(div);
  });
}

function copyResponse() {
  const responseText = document.getElementById("responseBox").textContent;
  navigator.clipboard
    .writeText(responseText)
    .then(() => showNotification("Response copied to clipboard", "success"))
    .catch(() => showNotification("Failed to copy text", "error"));
}

function clearResponse() {
  document.getElementById("responseBox").textContent =
    '{\n  "status": "ready"\n}';
}

function shareResponse() {
  const responseText = document.getElementById("responseBox").textContent;
  if (navigator.share) {
    navigator
      .share({
        title: "MCP Tool Response",
        text: "Check out this MCP tool response:",
        url: window.location.href,
      })
      .catch(() => {
        // Fallback if share fails
        copyResponse();
      });
  } else {
    // Fallback if Web Share API not supported
    copyResponse();
  }
}

function renderEndpoints() {
  const endpointList = document.getElementById("endpointList");
  endpointList.innerHTML = "";
  if (endpoints.length === 0) {
    endpointList.innerHTML =
      "<p>No endpoints saved yet. Add your frequently used endpoints for quick access.</p>";
    return;
  }
  endpoints.forEach((endpoint, index) => {
    const tag = document.createElement("div");
    tag.className = "endpoint-tag";
    tag.innerHTML = `
      <span>${endpoint.name}</span>
      <button onclick="loadEndpoint(${index}, event)"><i class="fas fa-check"></i></button>
    `;
    endpointList.appendChild(tag);
  });
}

// Modal for endpoint name input
let endpointModal = null;
function showEndpointModal(onSubmit) {
  if (endpointModal) endpointModal.remove();
  endpointModal = document.createElement("div");
  endpointModal.style.position = "fixed";
  endpointModal.style.top = 0;
  endpointModal.style.left = 0;
  endpointModal.style.width = "100vw";
  endpointModal.style.height = "100vh";
  endpointModal.style.background = "rgba(0,0,0,0.35)";
  endpointModal.style.display = "flex";
  endpointModal.style.alignItems = "center";
  endpointModal.style.justifyContent = "center";
  endpointModal.style.zIndex = 2000;
  endpointModal.innerHTML = `
    <div style="background:#fff;padding:2rem 2.5rem;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.18);min-width:320px;max-width:90vw;display:flex;flex-direction:column;align-items:center;">
      <h3 style="margin-bottom:1.2rem;color:var(--primary);font-size:1.2rem;">Save Endpoint</h3>
      <input id="endpointModalInput" type="text" placeholder="Enter a name for this endpoint (e.g. Local Dev)" style="width:100%;padding:0.8rem 1rem;font-size:1rem;border-radius:8px;border:1px solid #ccc;margin-bottom:1.2rem;">
      <div style="display:flex;gap:1rem;">
        <button class="btn btn-primary" id="endpointModalSave">Save</button>
        <button class="btn btn-secondary" id="endpointModalCancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(endpointModal);
  document.getElementById("endpointModalInput").focus();
  document.getElementById("endpointModalSave").onclick = () => {
    const val = document.getElementById("endpointModalInput").value.trim();
    if (val) {
      onSubmit(val);
      endpointModal.remove();
    }
  };
  document.getElementById("endpointModalCancel").onclick = () =>
    endpointModal.remove();
}

function saveCurrentEndpoints() {
  const toolsUrl = document.getElementById("toolsUrl").value.trim();
  const executeUrl = document.getElementById("executeUrl").value.trim();
  if (!toolsUrl || !executeUrl) {
    showNotification("Please enter both URLs", "warning");
    return;
  }
  showEndpointModal(function (name) {
    endpoints.push({
      name: name,
      toolsUrl: toolsUrl,
      executeUrl: executeUrl,
    });
    localStorage.setItem("mcpEndpoints", JSON.stringify(endpoints));
    renderEndpoints();
    showNotification("Endpoint saved", "success");
  });
}

function loadEndpoint(index, event) {
  event.stopPropagation();
  const endpoint = endpoints[index];
  document.getElementById("toolsUrl").value = endpoint.toolsUrl;
  document.getElementById("executeUrl").value = endpoint.executeUrl;
  // Save as last used
  localStorage.setItem("lastToolsUrl", endpoint.toolsUrl);
  localStorage.setItem("lastExecuteUrl", endpoint.executeUrl);
  switchTab("test");
  loadTools();
  showNotification(`Endpoint "${endpoint.name}" loaded`, "success");
}

function deleteEndpoint(index, event) {
  event.stopPropagation();
  confirmModal("Are you sure you want to delete this endpoint?", () => {
    endpoints.splice(index, 1);
    localStorage.setItem("mcpEndpoints", JSON.stringify(endpoints));
    renderEndpoints();
    showNotification("Endpoint deleted", "success");
  });
}

function loadSettings() {
  if (!settings.theme) {
    detectAndApplyTheme();
  } else {
    document.getElementById("themeSelect").value = settings.theme || "light";
    applyTheme(settings.theme);
  }
  document.getElementById("notificationsSelect").value =
    settings.notifications || "enabled";
}

function saveSettings() {
  settings.theme = document.getElementById("themeSelect").value;
  settings.notifications = document.getElementById("notificationsSelect").value;
  localStorage.setItem("mcpSettings", JSON.stringify(settings));
  applyTheme(settings.theme);
  showNotification("Settings saved", "success");
}

function clearAllData() {
  confirmModal(
    "Are you sure you want to clear ALL local data? This cannot be undone.",
    () => {
      localStorage.clear();
      history = [];
      endpoints = [];
      settings = {
        theme: "light",
        notifications: "enabled",
      };
      document.getElementById("toolsUrl").value = "";
      document.getElementById("executeUrl").value = "";
      document.getElementById("responseBox").textContent =
        '{\n  "status": "ready"\n}';
      document.getElementById("tool-section").style.display = "none";
      renderHistory();
      renderEndpoints();
      loadSettings();
      showNotification("All data cleared", "success");
    }
  );
}

function applyTheme(theme) {
  document.body.className = theme;
}

function showNotification(message, type) {
  if (settings.notifications === "disabled") return;
  const colors = {
    success: "var(--success)",
    error: "var(--danger)",
    warning: "var(--warning)",
    info: "var(--primary)",
  };
  const notification = document.createElement("div");
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.padding = "12px 24px";
  notification.style.background = colors[type] || "var(--primary)";
  notification.style.color = "white";
  notification.style.borderRadius = "var(--border-radius)";
  notification.style.boxShadow = "var(--box-shadow)";
  notification.style.zIndex = "1000";
  notification.style.display = "flex";
  notification.style.alignItems = "center";
  notification.style.gap = "10px";
  notification.style.animation = "fadeIn 0.3s ease-out";
  const icon = document.createElement("i");
  icon.className =
    {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    }[type] || "fas fa-info-circle";
  const text = document.createElement("span");
  text.textContent = message;
  notification.appendChild(icon);
  notification.appendChild(text);
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = "fadeOut 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showAbout() {
  alert(
    `MCP Tool Tester Pro v2.0\n\nDeveloped by Flowxtra & Dpro\n\nA powerful tool for testing MCP APIs with advanced features like:\n- Endpoint management\n- Execution history\n- Parameter validation\n- And more!\n\n© 2025 All rights reserved`
  );
}

// --- Custom Diagram JS (Vanilla) ---
(function () {
  const ns = "http://www.w3.org/2000/svg";
  let connection = [];

  function mark_start(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("showmark", "start");
      el.classList.remove("end");
    }
  }
  function mark_end(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("showmark", "end");
      el.classList.remove("start");
    }
  }
  function connect(from, to) {
    mark_start(to);
    mark_end(from);
    const path = document.createElementNS(ns, "path");
    path.setAttribute("id", `connector-${from}-to-${to}`);
    path.setAttribute("class", "connector");
    path.setAttribute("chart-from", from);
    path.setAttribute("chart-to", to);
    document.querySelector("svg.global_canvas").appendChild(path);
    connection.push(path);
  }
  function build_connection() {
    connection.forEach((c) => c.remove());
    connection = [];
    document
      .querySelectorAll(".actor .members li[chart-connect]")
      .forEach(function (e) {
        const source = e.getAttribute("id");
        const target = e.getAttribute("chart-connect");
        connect(source, target);
      });
  }
  function redraw_connection() {
    if (connection.length) {
      connection.forEach(function (e) {
        const from = e.getAttribute("chart-from");
        const to = e.getAttribute("chart-to");
        const fromEl = document.getElementById(from);
        const toEl = document.getElementById(to);
        if (!fromEl || !toEl) return;
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const svgRect = document
          .querySelector("svg.global_canvas")
          .getBoundingClientRect();
        let x1 = fromRect.left + fromRect.width + 15 - svgRect.left;
        let x2 = toRect.left - 15 - svgRect.left;
        let y1 = fromRect.top + fromRect.height / 2 - svgRect.top;
        let y2 = toRect.top + toRect.height / 2 - svgRect.top;
        let mx1 = x1 + 50;
        let mx2 = x2 - 50;
        if (x1 > x2) {
          x1 = fromRect.left - 15 - svgRect.left;
          x2 = toRect.left + toRect.width + 15 - svgRect.left;
          mx1 = x1 - 50;
          mx2 = x2 + 50;
          mark_start(from);
          mark_end(to);
        } else {
          mark_start(to);
          mark_end(from);
        }
        e.setAttribute(
          "d",
          `M ${x1.toFixed(2)},${y1.toFixed(2)} C ${mx1.toFixed(2)},${y1.toFixed(
            2
          )} ${mx2.toFixed(2)},${y2.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(
            2
          )}`
        );
      });
    }
  }
  // Draggable support (Vanilla JS)
  function makeDraggable(el) {
    let isDragging = false,
      startX,
      startY,
      origX,
      origY;
    el.addEventListener("mousedown", function (e) {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = el.getBoundingClientRect();
      origX = rect.left + window.scrollX;
      origY = rect.top + window.scrollY;
      el.style.zIndex = 10;
      document.body.style.userSelect = "none";
    });
    document.addEventListener("mousemove", function (e) {
      if (!isDragging) return;
      let dx = e.clientX - startX;
      let dy = e.clientY - startY;
      el.style.left =
        origX + dx - el.parentElement.getBoundingClientRect().left + "px";
      el.style.top =
        origY + dy - el.parentElement.getBoundingClientRect().top + "px";
      redraw_connection();
    });
    document.addEventListener("mouseup", function () {
      if (isDragging) {
        isDragging = false;
        el.style.zIndex = 1;
        document.body.style.userSelect = "";
      }
    });
  }
  window.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".actor").forEach(makeDraggable);
    build_connection();
    redraw_connection();
    window.addEventListener("resize", redraw_connection);
    window.addEventListener("scroll", redraw_connection);
  });
})();

function renderToolsMap() {
  const container = document.getElementById("tools-map-container");
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(tools) || tools.length === 0) {
    container.innerHTML =
      '<p style="color:#888;text-align:center;margin:2rem 0;">No tools loaded. Please load tools first.</p>';
    return;
  }

  // --- Filter UI ---
  const filterDiv = document.createElement("div");
  filterDiv.style.display = "flex";
  filterDiv.style.alignItems = "center";
  filterDiv.style.gap = "1rem";
  filterDiv.style.marginBottom = "2rem";

  // Group dropdown
  const groupSet = new Set(tools.map((t) => t.name.split("/")[0]));
  const groupList = Array.from(groupSet);
  const groupSelect = document.createElement("select");
  groupSelect.style.padding = "0.5rem 1rem";
  groupSelect.style.borderRadius = "6px";
  groupSelect.style.border = "1px solid #ccc";
  groupSelect.style.fontSize = "1rem";
  groupSelect.innerHTML =
    '<option value="all">Show All</option>' +
    groupList.map((g) => `<option value="${g}">${g}</option>`).join("");

  // Max items input
  const maxInput = document.createElement("input");
  maxInput.type = "number";
  maxInput.min = 1;
  maxInput.value = 10;
  maxInput.style.width = "80px";
  maxInput.style.padding = "0.5rem";
  maxInput.style.borderRadius = "6px";
  maxInput.style.border = "1px solid #ccc";
  maxInput.style.fontSize = "1rem";

  // Apply button
  const applyBtn = document.createElement("button");
  applyBtn.textContent = "Apply";
  applyBtn.className = "btn btn-primary";
  applyBtn.style.padding = "0.5rem 1.5rem";
  applyBtn.style.fontSize = "1rem";

  filterDiv.appendChild(groupSelect);
  filterDiv.appendChild(maxInput);
  filterDiv.appendChild(applyBtn);
  container.appendChild(filterDiv);

  // --- Filter logic ---
  let filteredTools = tools.slice();
  function doFilter() {
    let group = groupSelect.value;
    let max = parseInt(maxInput.value) || 10;
    let result = tools.filter((t) => {
      let ok = true;
      if (group !== "all") ok = t.name.startsWith(group + "/");
      return ok;
    });
    if (group === "all") {
      // Group by resource
      const grouped = {};
      result.forEach((t) => {
        const res = t.name.split("/")[0];
        if (!grouped[res]) grouped[res] = [];
        grouped[res].push(t);
      });
      renderGroupedTools(grouped, max);
    } else {
      renderFlatTools(result.slice(0, max));
    }
  }
  applyBtn.onclick = doFilter;
  groupSelect.onchange = doFilter;
  maxInput.oninput = () => {
    if (groupSelect.value !== "all") doFilter();
  };
  // Initial render
  doFilter();

  // --- Render helpers ---
  function renderGroupedTools(grouped, max) {
    container.querySelectorAll(".tools-group").forEach((e) => e.remove());
    Object.keys(grouped).forEach((res) => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "tools-group";
      groupDiv.style.marginBottom = "2.5rem";
      // Group title
      const title = document.createElement("div");
      title.textContent = res.charAt(0).toUpperCase() + res.slice(1);
      title.style.fontWeight = "bold";
      title.style.fontSize = "1.2rem";
      title.style.margin = "1.5rem 0 1rem 0";
      groupDiv.appendChild(title);
      // Horizontal line
      const hr = document.createElement("hr");
      hr.style.border = "none";
      hr.style.borderTop = "2px solid #eee";
      hr.style.margin = "0 0 1.5rem 0";
      groupDiv.appendChild(hr);
      // Tools
      const grid = document.createElement("div");
      grid.style.display = "flex";
      grid.style.flexWrap = "wrap";
      grid.style.gap = "2rem";
      grouped[res].slice(0, max).forEach((tool) => {
        grid.appendChild(renderToolCard(tool));
      });
      groupDiv.appendChild(grid);
      container.appendChild(groupDiv);
    });
  }
  function renderFlatTools(list) {
    container.querySelectorAll(".tools-group").forEach((e) => e.remove());
    const grid = document.createElement("div");
    grid.style.display = "flex";
    grid.style.flexWrap = "wrap";
    grid.style.gap = "2rem";
    list.forEach((tool) => {
      grid.appendChild(renderToolCard(tool));
    });
    container.appendChild(grid);
  }
  function renderToolCard(tool) {
    const colorMap = {
      get: "#3498db",
      add: "#2ecc40",
      create: "#2ecc40",
      edit: "#f1c40f",
      update: "#f1c40f",
      delete: "#e74c3c",
      remove: "#e74c3c",
      post: "#8e44ad",
      put: "#f39c12",
      patch: "#e67e22",
    };
    const actionLabels = {
      get: "Get",
      add: "Add",
      create: "Add",
      edit: "Edit",
      update: "Edit",
      delete: "Delete",
      remove: "Delete",
      post: "Post",
      put: "Put",
      patch: "Patch",
    };
    // --- Validation ---
    const checks = [
      { key: "name", label: "Name", value: !!tool.name },
      { key: "description", label: "Description", value: !!tool.description },
      { key: "parameters", label: "Parameters", value: !!tool.parameters },
      {
        key: "properties",
        label: "Parameter Properties",
        value: !!(
          tool.parameters &&
          tool.parameters.properties &&
          Object.keys(tool.parameters.properties).length > 0
        ),
      },
    ];
    const passed = checks.filter((c) => c.value).length;
    let status = "success";
    if (passed === checks.length) status = "success";
    else if (passed >= 2) status = "warning";
    else status = "error";
    const statusIcon = {
      success:
        '<span style="color:#27ae60;font-size:1.05em;vertical-align:middle;" title="All required fields present">✅</span>',
      warning:
        '<span style="color:#f1c40f;font-size:1.3em;vertical-align:middle;" title="Some fields missing">⚠️</span>',
      error:
        '<span style="color:#e74c3c;font-size:1.3em;vertical-align:middle;" title="Most fields missing">❌</span>',
    };
    // --- Card ---
    const card = document.createElement("div");
    // Detect dark mode
    const isDark = document.body.classList.contains("dark");
    card.style.background = isDark ? "#23272f" : "white";
    card.style.border = isDark ? "1px solid #333" : "1px solid #e0e0e0";
    card.style.borderRadius = "12px";
    card.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
    card.style.padding = "1.2rem";
    card.style.width = "260px";
    card.style.marginBottom = "1.5rem";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.alignItems = "flex-start";
    card.style.position = "relative";
    // Tool name + status
    const title = document.createElement("div");
    title.innerHTML = `${tool.name} <span class="tool-status-icon" style="margin-left:0.5rem;cursor:pointer;">${statusIcon[status]}</span>`;
    title.style.fontWeight = "bold";
    title.style.fontSize = "1.1rem";
    title.style.marginBottom = "0.7rem";
    card.appendChild(title);
    // Tooltip
    const tooltip = document.createElement("div");
    tooltip.style.position = "absolute";
    tooltip.style.top = "2.2rem";
    tooltip.style.left = "0.5rem";
    tooltip.style.background = isDark ? "#23272f" : "#fff";
    tooltip.style.border = isDark ? "1px solid #333" : "1px solid #ccc";
    tooltip.style.borderRadius = "8px";
    tooltip.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
    tooltip.style.padding = "0.7rem 1.2rem";
    tooltip.style.fontSize = "0.98rem";
    tooltip.style.zIndex = "10";
    tooltip.style.display = "none";
    tooltip.style.minWidth = "180px";
    tooltip.style.color = isDark ? "#fff" : "#23272f";
    tooltip.innerHTML = checks
      .map((c) => {
        let icon = c.value ? "✅" : "❌";
        let color = c.value ? "#27ae60" : "#e74c3c";
        let size = c.value ? "1em" : "1.1em";
        return `<div style="margin-bottom:0.2rem;"><span style="color:${color};font-size:${size};vertical-align:middle;">${icon}</span> <span>${c.label}</span></div>`;
      })
      .join("");
    card.appendChild(tooltip);
    // Show tooltip on hover (now on the whole card, not just the icon)
    card.addEventListener("mouseenter", () => {
      tooltip.style.display = "block";
    });
    card.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
    // Action button
    let actionType = "";
    if (tool.name && tool.name.includes("/")) {
      actionType = tool.name.split("/").pop().toLowerCase();
    }
    if (actionType && colorMap[actionType]) {
      const btn = document.createElement("button");
      btn.textContent = actionLabels[actionType] || actionType;
      btn.style.background = colorMap[actionType];
      btn.style.color = "#fff";
      btn.style.border = "none";
      btn.style.borderRadius = "6px";
      btn.style.padding = "0.5rem 1.1rem";
      btn.style.fontWeight = "600";
      btn.style.fontSize = "1rem";
      btn.style.cursor = "pointer";
      btn.style.marginBottom = "0.3rem";
      card.appendChild(btn);
    } else {
      const noActions = document.createElement("div");
      noActions.textContent = "No actions available.";
      noActions.style.color = "#888";
      card.appendChild(noActions);
    }
    return card;
  }
}

// Call renderToolsMap when switching to the map tab
const originalSwitchTab = switchTab;
switchTab = function (tabId) {
  originalSwitchTab(tabId);
  if (tabId === "map") {
    renderToolsMap();
  }
};

// Add this helper for dynamic tab content loading
async function loadMcpTabContent(lang) {
  const tabDiv = document.getElementById("mcp-sdk-" + lang);
  if (!tabDiv) return;
  if (tabDiv.getAttribute("data-loaded")) return; // Already loaded
  try {
    const res = await fetch("src/tabs/mcp-sdk-" + lang + ".html");
    if (!res.ok) throw new Error("Failed to load tab content");
    const html = await res.text();
    tabDiv.innerHTML = html;
    tabDiv.setAttribute("data-loaded", "1");
  } catch (e) {
    tabDiv.innerHTML =
      '<div style="color:red;padding:1em;">Failed to load tab content.</div>';
  }
}

// Patch showMcpSdkTab to load content dynamically for all tabs
const mcpTabLangs = [
  "python",
  "typescript",
  "java",
  "kotlin",
  "csharp",
  "swift",
  "flutter",
  "php",
  "other",
];
function showMcpSdkTab(lang) {
  document.querySelectorAll("#mcp-sdk-tabs .tab").forEach((el, idx) => {
    if (
      el.textContent.trim().toLowerCase().includes(lang) ||
      (lang === "other" && el.textContent.includes("Other"))
    ) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });
  document.querySelectorAll(".mcp-sdk-tab-content").forEach((el) => {
    el.style.display = "none";
  });
  const tabDiv = document.getElementById("mcp-sdk-" + lang);
  if (tabDiv) {
    tabDiv.style.display = "block";
    if (mcpTabLangs.includes(lang)) loadMcpTabContent(lang);
  }
  setTimeout(enhanceCodeBlocks, 200);
}

function copyStepCode(el) {
  // Find the nearest code block
  let code = el.closest(".mcp-code-block")?.querySelector("code");
  if (!code) return;
  let text = code.innerText || code.textContent;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showNotification("Code copied to clipboard", "success");
    })
    .catch(() => {
      showNotification("Failed to copy code", "error");
    });
}

// Refactor code block copy icon logic for all code blocks
function enhanceCodeBlocks() {
  // Find all code blocks in .mcp-sdk-tab-content and add a copy icon on the right
  document.querySelectorAll(".mcp-sdk-tab-content pre").forEach((pre) => {
    // Remove any existing copy buttons to avoid duplicates
    pre.querySelectorAll(".copy-btn").forEach((btn) => btn.remove());
    // Only add if there is not already a copy icon/button on the right
    if (
      pre.lastElementChild &&
      pre.lastElementChild.classList &&
      pre.lastElementChild.classList.contains("copy-btn")
    ) {
      return;
    }
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.title = "Copy code";
    btn.innerHTML = '<i class="fas fa-copy"></i>';
    btn.style.position = "absolute";
    btn.style.top = "10px";
    btn.style.right = "10px";
    btn.style.background = "transparent";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "1.2em";
    btn.style.color = "var(--primary)";
    btn.onclick = function (e) {
      e.stopPropagation();
      const code = pre.querySelector("code");
      if (!code) return;
      const text = code.innerText || code.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          btn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 1200);
      });
    };
    pre.style.position = "relative";
    pre.appendChild(btn);
  });
}

// Patch showMcpSdkTab to call enhanceCodeBlocks after loading
const originalShowMcpSdkTab = showMcpSdkTab;
showMcpSdkTab = function (lang) {
  originalShowMcpSdkTab(lang);
  setTimeout(enhanceCodeBlocks, 200);
};

// Also enhance code blocks on DOMContentLoaded
window.addEventListener("DOMContentLoaded", enhanceCodeBlocks);

// Placeholder for GSAP animation integration
function animatePageTransition() {
  // Example: gsap.to('.container', { opacity: 0, duration: 0.5 });
}

// Custom confirm modal
let confirmModalDiv = null;
function confirmModal(message, onConfirm, onCancel) {
  if (confirmModalDiv) confirmModalDiv.remove();
  confirmModalDiv = document.createElement("div");
  confirmModalDiv.style.position = "fixed";
  confirmModalDiv.style.top = 0;
  confirmModalDiv.style.left = 0;
  confirmModalDiv.style.width = "100vw";
  confirmModalDiv.style.height = "100vh";
  confirmModalDiv.style.background = "rgba(0,0,0,0.35)";
  confirmModalDiv.style.display = "flex";
  confirmModalDiv.style.alignItems = "center";
  confirmModalDiv.style.justifyContent = "center";
  confirmModalDiv.style.zIndex = 3000;
  confirmModalDiv.innerHTML = `
    <div style="background:#fff;padding:2rem 2.5rem;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.18);min-width:320px;max-width:90vw;display:flex;flex-direction:column;align-items:center;">
      <h3 style="margin-bottom:1.2rem;color:var(--danger);font-size:1.2rem;">Confirm Action</h3>
      <div style="margin-bottom:1.5rem;font-size:1.05rem;text-align:center;">${message}</div>
      <div style="display:flex;gap:1rem;">
        <button class="btn btn-primary" id="confirmModalYes">Yes</button>
        <button class="btn btn-secondary" id="confirmModalNo">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmModalDiv);
  document.getElementById("confirmModalYes").onclick = () => {
    onConfirm && onConfirm();
    confirmModalDiv.remove();
  };
  document.getElementById("confirmModalNo").onclick = () => {
    onCancel && onCancel();
    confirmModalDiv.remove();
  };
}

// Detect browser theme if not set
function detectAndApplyTheme() {
  if (!settings.theme || settings.theme === "auto") {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    settings.theme = prefersDark ? "dark" : "light";
    applyTheme(settings.theme);
  }
}

// Cookie consent banner
function showCookieBanner() {
  if (localStorage.getItem("cookieConsent")) return;
  const banner = document.createElement("div");
  banner.id = "cookie-banner";
  banner.style.position = "fixed";
  banner.style.bottom = 0;
  banner.style.left = 0;
  banner.style.width = "100vw";
  banner.style.background = "#23272f";
  banner.style.color = "#fff";
  banner.style.padding = "1.2rem 1.5rem";
  banner.style.display = "flex";
  banner.style.justifyContent = "center";
  banner.style.alignItems = "center";
  banner.style.zIndex = 5000;
  banner.innerHTML = `
    <span style="margin-right:1.5rem;">This site uses cookies to enhance your experience. Do you accept cookies?</span>
    <button class="btn btn-primary" style="margin-right:0.7rem;" id="cookieAccept">Accept</button>
    <button class="btn btn-secondary" id="cookieReject">Reject</button>
  `;
  document.body.appendChild(banner);
  document.getElementById("cookieAccept").onclick = function () {
    localStorage.setItem("cookieConsent", "accepted");
    banner.remove();
  };
  document.getElementById("cookieReject").onclick = function () {
    localStorage.setItem("cookieConsent", "rejected");
    banner.remove();
  };
}
