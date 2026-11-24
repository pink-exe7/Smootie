(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const tray = $("#mode-tools");
  if (!tray) return;

  // ---- Notes ----
  const pad = $("#notes-pad");
  const COLORS = ["#ffffff", "#34c759", "#ff9f0a", "#ff453a", "#bf5af2"];
  let colorIdx = 0;

  try {
    const saved = localStorage.getItem("smootie-notes");
    if (saved) pad.innerHTML = saved;
  } catch (e) {}
  pad.addEventListener("input", () => {
    try { localStorage.setItem("smootie-notes", pad.innerHTML); } catch (e) {}
  });

  // Typing M or Space must not switch modes
  ["keydown", "keyup", "keypress"].forEach((t) =>
    pad.addEventListener(t, (e) => e.stopPropagation())
  );

  function applyColor() {
    const c = COLORS[colorIdx];
    tray.style.setProperty("--accent", c);
    tray.style.setProperty("--accent-glow", "color-mix(in srgb, " + c + " 55%, transparent)");
  }
  const colorBtn = $("#notes-color");
  const panel = document.createElement("div");
  panel.className = "color-panel";
  panel.innerHTML =
    '<button type="button" class="cp-close" aria-label="Close">&#10005;</button>' +
    '<div class="cp-sv"><div class="cp-dot cp-sv-dot"></div></div>' +
    '<div class="cp-hue"><div class="cp-dot cp-hue-dot"></div></div>';
  colorBtn.parentNode.appendChild(panel);
  const sv = panel.querySelector(".cp-sv");
  const svDot = panel.querySelector(".cp-sv-dot");
  const hue = panel.querySelector(".cp-hue");
  const hueDot = panel.querySelector(".cp-hue-dot");
  let H = 0, S = 0, V = 1;
  const clamp = (x) => Math.min(1, Math.max(0, x));

  function setCustomColor(c) {
    COLORS[colorIdx] = c;
    applyColor();
  }
  function hsvToHex(h, s, v) {
    const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0); };
    const to = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
    return "#" + to(f(5)) + to(f(3)) + to(f(1));
  }
  function hexToHsv(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, mx ? d / mx : 0, mx];
  }
  function renderPanel() {
    sv.style.background = "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(" + H + ", 100%, 50%))";
    svDot.style.left = (S * 100) + "%";
    svDot.style.top = ((1 - V) * 100) + "%";
    hueDot.style.left = (H / 360 * 100) + "%";
  }
  function commit(save) {
    const c = hsvToHex(H, S, V);
    setCustomColor(c);
    if (save) { try { localStorage.setItem("smootie-color", c); } catch (e) {} }
  }
  function drag(el, fn) {
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      fn(e);
      const mv = (ev) => fn(ev);
      const up = () => {
        el.removeEventListener("pointermove", mv);
        el.removeEventListener("pointerup", up);
        commit(true);
      };
      el.addEventListener("pointermove", mv);
      el.addEventListener("pointerup", up);
    });
  }
  drag(sv, (e) => {
    const r = sv.getBoundingClientRect();
    S = clamp((e.clientX - r.left) / r.width);
    V = 1 - clamp((e.clientY - r.top) / r.height);
    renderPanel(); commit(false);
  });
  drag(hue, (e) => {
    const r = hue.getBoundingClientRect();
    H = clamp((e.clientX - r.left) / r.width) * 360;
    renderPanel(); commit(false);
  });

  try {
    if (!localStorage.getItem("smootie-white-default")) { localStorage.removeItem("smootie-color"); localStorage.setItem("smootie-white-default", "1"); }
    const savedColor = localStorage.getItem("smootie-color");
    if (savedColor && /^#[0-9a-f]{6}$/i.test(savedColor)) {
      [H, S, V] = hexToHsv(savedColor);
      setCustomColor(savedColor);
    }
  } catch (e) {}
  renderPanel();

  colorBtn.addEventListener("click", () => {
    const r = colorBtn.parentNode.getBoundingClientRect();
    SmootieAPI.toggleColorPanel({ x: r.left + r.width / 2, y: r.bottom, hex: COLORS[colorIdx] });
  });
  SmootieAPI.onColorPicked((d) => { setCustomColor(d.hex); try { localStorage.setItem("smootie-color", d.hex); } catch (e) {} });
  panel.querySelector(".cp-close").addEventListener("click", () => panel.classList.remove("open"));
  document.addEventListener("pointerdown", (e) => { if (!colorBtn.contains(e.target)) SmootieAPI.closeColorPanel(); });
  $$(".notes-format button").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.cmd;
      pad.focus();
      document.execCommand(cmd, false, cmd === "foreColor" ? COLORS[colorIdx] : null);
      refreshFormatState();
    });
  });
  function refreshFormatState() {
    $$(".notes-format button").forEach((btn) => {
      const cmd = btn.dataset.cmd;
      if (cmd === "foreColor") return;
      let on = false;
      try { on = document.queryCommandState(cmd); } catch (e) {}
      btn.classList.toggle("is-on", on);
    });
  }
  document.addEventListener("selectionchange", refreshFormatState);

  const GLYPHS = { diamond: "\u25C6", triangle: "\u25B2", circle: "\u25CF" };
  $$(".shape-btn").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", () => {
      pad.focus();
      document.execCommand(
        "insertHTML", false,
        '<span style="color:' + COLORS[colorIdx] + '">' + GLYPHS[btn.dataset.shape] + "</span>&nbsp;"
      );
    });
  });
  applyColor();
  // ---- Timer ----
  const STEP = { h: 3600, m: 60, s: 1 };
  const MAX = { h: 99, m: 59, s: 59 };
  const MAX_TOTAL = 99 * 3600 + 59 * 60 + 59;
  const cols = {};
  $$(".timer-col").forEach((c) => (cols[c.dataset.unit] = c));
  let total = 0, running = false, endAt = 0, timerId = null;
  const pad2 = (n) => String(n).padStart(2, "0");

  function render() {
    const vals = { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
    for (const u in cols) {
      const v = vals[u];
      $(".timer-val", cols[u]).textContent = pad2(v);
      $(".timer-prev", cols[u]).textContent = v > 0 ? pad2(v - 1) : "";
      $(".timer-next", cols[u]).textContent = v < MAX[u] ? pad2(v + 1) : "";
    }
    $("#timer-play").innerHTML = running ? "&#10074;&#10074;" : "&#9654;";
  }
  function bump(seconds) {
    if (running) return;
    total = Math.max(0, Math.min(MAX_TOTAL, total + seconds));
    render();
  }
  for (const u in cols) {
    cols[u].addEventListener("wheel", (e) => {
      e.preventDefault();
      bump((e.deltaY < 0 ? 1 : -1) * STEP[u]);
    }, { passive: false });
    $(".timer-prev", cols[u]).addEventListener("click", () => bump(-STEP[u]));
    $(".timer-next", cols[u]).addEventListener("click", () => bump(STEP[u]));
  }
  $$(".timer-preset").forEach((b) =>
    b.addEventListener("click", () => bump(parseInt(b.dataset.add, 10)))
  );
  function chime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [880, 1175].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.25;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.start(t); o.stop(t + 0.32);
      });
    } catch (e) {}
  }
  function stop() {
    running = false;
    clearInterval(timerId);
    render();
  }
  $("#timer-play").addEventListener("click", () => {
    if (running) { stop(); return; }
    if (total <= 0) return;
    running = true;
    endAt = Date.now() + total * 1000;
    timerId = setInterval(() => {
      total = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      if (total === 0) { stop(); chime(); return; }
      render();
    }, 200);
    render();
  });
  $("#timer-reset").addEventListener("click", () => { total = 0; stop(); });
  render();
})();
