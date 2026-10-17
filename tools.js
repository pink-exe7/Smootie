(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const tray = $("#mode-tools");
  if (!tray) return;

  // ---- Notes ----
  const pad = $("#notes-pad");
  const COLORS = ["#2f7bff", "#34c759", "#ff9f0a", "#ff453a", "#bf5af2"];
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
  $("#notes-color").addEventListener("click", () => {
    colorIdx = (colorIdx + 1) % COLORS.length;
    applyColor();
  });
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