(() => {
  "use strict";

  const STORAGE_HISTORY = "calc.history.v1";
  const STORAGE_MEMORY = "calc.memory.v1";
  const STORAGE_FORMAT = "calc.format.v1";
  const STORAGE_ANGLE = "calc.angle.v1";
  const MAX_HISTORY = 100;

  const el = {
    app: document.getElementById("app"),
    expression: document.getElementById("expression"),
    result: document.getElementById("result"),
    sciPad: document.getElementById("sciPad"),
    sciToggle: document.getElementById("sciToggle"),
    historyToggle: document.getElementById("historyToggle"),
    historyPanel: document.getElementById("historyPanel"),
    historyList: document.getElementById("historyList"),
    menuBtn: document.getElementById("menuBtn"),
    menuPanel: document.getElementById("menuPanel"),
    angleMode: document.getElementById("angleMode"),
    invToggle: document.getElementById("invToggle"),
    formatLabel: document.getElementById("formatLabel"),
    installItem: document.getElementById("installItem"),
    toast: document.getElementById("toast"),
    currentLabel: document.getElementById("currentLabel"),
  };

  const state = {
    expr: "",
    justEvaluated: false,
    scientific: false,
    historyOpen: false,
    inverse: false,
    degrees: localStorage.getItem(STORAGE_ANGLE) !== "rad",
    useGrouping: localStorage.getItem(STORAGE_FORMAT) !== "plain",
    history: loadHistory(),
    memory: Number(localStorage.getItem(STORAGE_MEMORY) || 0),
    selectedHistory: null,
    deferredPrompt: null,
  };

  function loadHistory() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_HISTORY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(state.history.slice(0, MAX_HISTORY)));
  }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.toast.hidden = true;
    }, 1600);
  }

  function displayExpr() {
    return state.expr || "0";
  }

  function fitExpression() {
    const node = el.expression;
    node.classList.remove("small");
    node.textContent = displayExpr();
    requestAnimationFrame(() => {
      const parent = node.parentElement;
      if (!parent) return;
      if (node.scrollWidth > parent.clientWidth + 2) {
        node.classList.add("small");
      }
    });
  }

  function liveEvaluate() {
    const expr = state.expr.trim();
    if (!expr) {
      el.result.textContent = "";
      el.result.classList.remove("error");
      return null;
    }

    const out = CalcEngine.evaluate(expr, { degrees: state.degrees });
    if (out.ok) {
      el.result.classList.remove("error");
      el.result.textContent = CalcEngine.formatNumber(out.value, {
        useGrouping: state.useGrouping,
      });
      return out.value;
    }

    if (out.incomplete) {
      el.result.textContent = "";
      el.result.classList.remove("error");
      return null;
    }

    el.result.classList.add("error");
    el.result.textContent = out.error === "Error" ? "Error" : "";
    return null;
  }

  function refresh() {
    fitExpression();
    liveEvaluate();
    updateAcLabel();
  }

  function updateAcLabel() {
    const ac = document.querySelector('[data-key="AC"]');
    if (!ac) return;
    ac.textContent = state.expr ? "C" : "AC";
  }

  function updateAngleLabel() {
    el.angleMode.textContent = state.degrees ? "Deg" : "Rad";
  }

  function updateInvLabels() {
    const map = state.inverse
      ? { sin: "sin⁻¹", cos: "cos⁻¹", tan: "tan⁻¹", ln: "eˣ", log: "10ˣ" }
      : { sin: "sin", cos: "cos", tan: "tan", ln: "ln", log: "log" };

    Object.entries(map).forEach(([key, label]) => {
      const btn = document.querySelector(`.sci-pad [data-key="${key}"]`);
      if (btn) btn.textContent = label;
    });
    el.invToggle.classList.toggle("active", state.inverse);
  }

  function openParenCount(expr) {
    let n = 0;
    for (const ch of expr) {
      if (ch === "(") n++;
      else if (ch === ")") n--;
    }
    return n;
  }

  function lastNumberSlice(expr) {
    const m = expr.match(/(\d*\.?\d+)$/);
    return m ? m[0] : "";
  }

  function endsWithOperator(expr) {
    return /[+\-−×÷^%]$/.test(expr);
  }

  function append(text) {
    if (state.justEvaluated && /^[0-9.]/.test(text)) {
      state.expr = "";
    }
    state.justEvaluated = false;
    state.expr += text;
    refresh();
  }

  function setExpr(text) {
    state.expr = text;
    state.justEvaluated = false;
    refresh();
  }

  function clearAll() {
    state.expr = "";
    state.justEvaluated = false;
    refresh();
  }

  function backspace() {
    if (state.justEvaluated) {
      clearAll();
      return;
    }
    state.expr = state.expr.slice(0, -1);
    refresh();
  }

  function insertFunction(name) {
    if (state.justEvaluated) state.expr = "";
    state.justEvaluated = false;
    state.expr += `${name}(`;
    refresh();
  }

  function insertConstant(symbol) {
    if (state.justEvaluated) state.expr = "";
    state.justEvaluated = false;
    const prev = state.expr.slice(-1);
    if (prev && /[0-9)πe!]/.test(prev)) state.expr += "×";
    state.expr += symbol;
    refresh();
  }

  function toggleParens(force) {
    if (state.justEvaluated) {
      state.expr = "";
      state.justEvaluated = false;
    }
    const open = openParenCount(state.expr);
    const last = state.expr.slice(-1);
    if (force === ")") {
      if (open > 0) state.expr += ")";
      refresh();
      return;
    }
    if (force === "(") {
      if (last && /[0-9)πe!]/.test(last)) state.expr += "×";
      state.expr += "(";
      refresh();
      return;
    }
    if (!state.expr || endsWithOperator(state.expr) || last === "(") {
      state.expr += "(";
    } else if (open > 0) {
      state.expr += ")";
    } else {
      state.expr += "×(";
    }
    refresh();
  }

  function applyPercent() {
    if (!state.expr) return;
    if (endsWithOperator(state.expr)) return;

    // Google-style: a op b% → a op (a * b / 100) for + −; a ×/% b% → a ×/% (b/100)
    const m = state.expr.match(/^(.*?)([+\-−×÷])(\d*\.?\d+)$/);
    if (m) {
      const left = m[1];
      const op = m[2];
      const right = parseFloat(m[3]);
      const leftVal = CalcEngine.evaluate(left || "0", { degrees: state.degrees });
      if (!leftVal.ok) {
        append("%");
        return;
      }
      let replacement;
      if (op === "+" || op === "−" || op === "-") {
        replacement = `(${leftVal.value}×${right}÷100)`;
      } else {
        replacement = `(${right}÷100)`;
      }
      state.expr = left + op + replacement;
      refresh();
      return;
    }

    const num = lastNumberSlice(state.expr);
    if (!num) {
      append("%");
      return;
    }
    const prefix = state.expr.slice(0, -num.length);
    state.expr = prefix + `(${num}÷100)`;
    refresh();
  }

  function equals() {
    const out = CalcEngine.evaluate(state.expr, { degrees: state.degrees });
    if (!out.ok) {
      el.result.classList.add("error");
      el.result.textContent = out.incomplete ? "" : "Error";
      return;
    }

    const formatted = CalcEngine.formatNumber(out.value, {
      useGrouping: state.useGrouping,
    });
    const raw = CalcEngine.formatNumber(out.value, { useGrouping: false });

    pushHistory(state.expr, formatted, out.value);
    state.expr = raw;
    state.justEvaluated = true;
    el.result.textContent = "";
    fitExpression();
    updateAcLabel();
  }

  function dayLabel(ts) {
    const d = new Date(ts);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = (startToday - startThat) / 86400000;
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function pushHistory(expression, resultText, value) {
    state.history.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      expression,
      resultText,
      value,
      ts: Date.now(),
    });
    state.history = state.history.slice(0, MAX_HISTORY);
    saveHistory();
    if (state.historyOpen || isWide()) renderHistory();
  }

  function renderHistory() {
    const list = el.historyList;
    list.innerHTML = "";

    if (!state.history.length) {
      list.innerHTML = `<div class="history-empty">No history yet</div>`;
      return;
    }

    let lastDay = "";
    state.history.forEach((item) => {
      const day = dayLabel(item.ts);
      if (day !== lastDay) {
        lastDay = day;
        const label = document.createElement("div");
        label.className = "history-day";
        label.textContent = day;
        list.appendChild(label);
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "history-item" + (state.selectedHistory === item.id ? " selected" : "");
      btn.dataset.id = item.id;
      btn.innerHTML = `
        <div class="history-expr">${escapeHtml(item.expression)}</div>
        <div class="history-result">${escapeHtml(item.resultText)}</div>
      `;

      if (state.selectedHistory === item.id) {
        const actions = document.createElement("div");
        actions.className = "history-actions";
        actions.innerHTML = `
          <button type="button" data-act="ms">MS</button>
          <button type="button" data-act="copy">Copy</button>
        `;
        actions.addEventListener("click", (e) => {
          e.stopPropagation();
          const act = e.target.closest("[data-act]")?.dataset.act;
          if (act === "copy") {
            copyText(String(item.value));
          } else if (act === "ms") {
            state.memory = item.value;
            localStorage.setItem(STORAGE_MEMORY, String(item.value));
            toast("Stored in memory");
          }
        });
        btn.appendChild(actions);
      }

      btn.addEventListener("click", () => {
        if (state.selectedHistory === item.id) {
          setExpr(String(item.value));
          state.selectedHistory = null;
        } else {
          state.selectedHistory = item.id;
        }
        renderHistory();
      });

      list.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied");
    } catch {
      toast("Copy failed");
    }
  }

  function handleKey(key) {
    switch (key) {
      case "AC":
        clearAll();
        break;
      case "back":
        backspace();
        break;
      case "=":
        equals();
        break;
      case "()":
        toggleParens();
        break;
      case "(":
        toggleParens("(");
        break;
      case ")":
        toggleParens(")");
        break;
      case "%":
        applyPercent();
        break;
      case "sqrt":
        insertFunction("sqrt");
        break;
      case "pi":
        insertConstant("π");
        break;
      case "e":
        insertConstant("e");
        break;
      case "^":
      case "!":
      case "+":
      case "−":
      case "×":
      case "÷":
        if (state.justEvaluated) state.justEvaluated = false;
        if (key !== "!" && endsWithOperator(state.expr) && key !== "^") {
          state.expr = state.expr.replace(/[+\-−×÷^%]$/, key);
          refresh();
        } else {
          append(key);
        }
        break;
      case "deg":
        state.degrees = !state.degrees;
        localStorage.setItem(STORAGE_ANGLE, state.degrees ? "deg" : "rad");
        updateAngleLabel();
        liveEvaluate();
        break;
      case "inv":
        state.inverse = !state.inverse;
        updateInvLabels();
        break;
      case "sin":
      case "cos":
      case "tan":
      case "ln":
      case "log":
        if (state.inverse) {
          if (key === "sin") insertFunction("asin");
          else if (key === "cos") insertFunction("acos");
          else if (key === "tan") insertFunction("atan");
          else if (key === "ln") {
            append("e^");
          } else if (key === "log") {
            append("10^");
          }
        } else {
          insertFunction(key);
        }
        break;
      case ".": {
        const num = lastNumberSlice(state.expr);
        if (num.includes(".")) return;
        if (!num || endsWithOperator(state.expr) || state.expr.endsWith("(")) {
          append("0.");
        } else {
          append(".");
        }
        break;
      }
      default:
        if (/^[0-9]$/.test(key)) append(key);
        break;
    }
  }

  document.querySelectorAll(".key").forEach((btn) => {
    btn.addEventListener("click", () => handleKey(btn.dataset.key));
  });

  el.sciToggle.addEventListener("click", () => {
    state.scientific = !state.scientific;
    el.sciPad.hidden = !state.scientific;
    el.sciToggle.setAttribute("aria-expanded", String(state.scientific));
    el.sciToggle.setAttribute(
      "aria-label",
      state.scientific ? "Hide scientific functions" : "Show scientific functions"
    );
  });

  const wideMq = window.matchMedia("(min-width: 900px) and (min-aspect-ratio: 1/1)");

  function isWide() {
    return wideMq.matches;
  }

  function syncHistoryUi() {
    const wide = isWide();
    el.app.classList.toggle("wide", wide);
    el.historyToggle.classList.toggle("history-toggle-wide-hide", wide);

    if (wide) {
      el.historyPanel.hidden = false;
      el.app.classList.add("history-open");
      el.historyToggle.setAttribute("aria-expanded", "true");
      renderHistory();
      return;
    }

    el.historyPanel.hidden = !state.historyOpen;
    el.app.classList.toggle("history-open", state.historyOpen);
    el.historyToggle.setAttribute("aria-expanded", String(state.historyOpen));
    if (state.historyOpen) renderHistory();
  }

  el.historyToggle.addEventListener("click", () => {
    if (isWide()) return;
    state.historyOpen = !state.historyOpen;
    if (!state.historyOpen) state.selectedHistory = null;
    syncHistoryUi();
  });

  wideMq.addEventListener("change", syncHistoryUi);

  el.menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = el.menuPanel.hidden;
    el.menuPanel.hidden = !open;
    el.menuBtn.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (e) => {
    if (!el.menuPanel.hidden && !el.menuPanel.contains(e.target) && e.target !== el.menuBtn) {
      el.menuPanel.hidden = true;
      el.menuBtn.setAttribute("aria-expanded", "false");
    }
  });

  el.menuPanel.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    el.menuPanel.hidden = true;
    el.menuBtn.setAttribute("aria-expanded", "false");

    if (action === "clear-history") {
      state.history = [];
      saveHistory();
      if (state.historyOpen || isWide()) renderHistory();
      toast("History cleared");
    } else if (action === "toggle-format") {
      state.useGrouping = !state.useGrouping;
      localStorage.setItem(STORAGE_FORMAT, state.useGrouping ? "standard" : "plain");
      el.formatLabel.textContent = state.useGrouping ? "standard" : "plain";
      liveEvaluate();
    } else if (action === "copy-result") {
      const v = liveEvaluate();
      if (v == null && state.expr) {
        const out = CalcEngine.evaluate(state.expr, { degrees: state.degrees });
        if (out.ok) copyText(String(out.value));
        else toast("Nothing to copy");
      } else if (v != null) {
        copyText(String(v));
      } else if (state.expr) {
        copyText(state.expr);
      } else {
        toast("Nothing to copy");
      }
    } else if (action === "install" && state.deferredPrompt) {
      state.deferredPrompt.prompt();
      state.deferredPrompt.userChoice.finally(() => {
        state.deferredPrompt = null;
        el.installItem.hidden = true;
      });
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const map = {
      Enter: "=",
      "=": "=",
      Escape: "AC",
      Backspace: "back",
      Delete: "AC",
      "*": "×",
      "/": "÷",
      "-": "−",
      "+": "+",
      "%": "%",
      "^": "^",
      "!": "!",
      "(": "(",
      ")": ")",
      ".": ".",
    };

    if (map[e.key]) {
      e.preventDefault();
      handleKey(map[e.key]);
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      handleKey(e.key);
    }
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.deferredPrompt = e;
    el.installItem.hidden = false;
  });

  // Init
  updateAngleLabel();
  updateInvLabels();
  el.formatLabel.textContent = state.useGrouping ? "standard" : "plain";
  syncHistoryUi();
  refresh();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
