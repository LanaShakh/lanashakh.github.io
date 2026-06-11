(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Scroll reveal ---------- */
  if (!reduced && "IntersectionObserver" in window) {
    var targets = document.querySelectorAll(
      ".section, .metrics, .metric-card, .case-card, .sample-card, .stack-card, .cta-band, .case-article, .contact-block"
    );
    targets.forEach(function (el) { el.classList.add("reveal"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Living letters ---------- */
  var canvas = document.getElementById("letters");
  if (!canvas || reduced) return;

  var phrases;
  try { phrases = JSON.parse(canvas.getAttribute("data-phrases")); }
  catch (e) { return; }
  if (!phrases || !phrases.length) return;

  var pool = {};
  phrases.forEach(function (ph) {
    ph.toUpperCase().split("").forEach(function (ch) { if (ch !== " ") pool[ch] = 1; });
  });
  var chars = Object.keys(pool);

  var order = phrases.slice();
  for (var i = order.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1)), tmp = order[i];
    order[i] = order[j]; order[j] = tmp;
  }

  var host = canvas.parentElement;
  var ctx = canvas.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  var autoMode = window.matchMedia("(hover: none)").matches;
  var W, H, Z, absolute;

  function resize() {
    absolute = getComputedStyle(canvas).position === "absolute";
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (absolute && W > 700) {
      Z = { x0: W * 0.60, x1: W - 24, y0: 44, y1: H - 44 };
    } else {
      Z = { x0: 16, x1: W - 16, y0: 18, y1: H - 18 };
    }
    Z.cx = (Z.x0 + Z.x1) / 2; Z.cy = (Z.y0 + Z.y1) / 2;
  }
  resize();
  window.addEventListener("resize", resize);

  var N = 30, pts = [], FS = 19, BASE = 11;
  for (var k = 0; k < N; k++) {
    var a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * 0.95;
    pts.push({
      x: Z.cx + Math.cos(a) * (Z.x1 - Z.x0) / 2 * rr,
      y: Z.cy + Math.sin(a) * (Z.y1 - Z.y0) / 2 * rr,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      ch: chars[Math.floor(Math.random() * chars.length)],
      ph: Math.random() * 6.28,
      tx: null, ty: null, k: 0, prog: 0, delay: 0
    });
  }

  var m = { x: -999, y: -999, inside: autoMode };
  var phrase = null, wi = 0, lastSwitch = 0;

  function disperse() {
    phrase = null;
    for (var i = 0; i < N; i++) { pts[i].tx = null; pts[i].prog = 0; }
  }

  if (!autoMode) {
    host.addEventListener("mousemove", function (e) {
      var r = canvas.getBoundingClientRect();
      m.x = e.clientX - r.left; m.y = e.clientY - r.top;
      var was = m.inside;
      m.inside = m.x > Z.x0 - 40 && m.x < Z.x1 + 40 && m.y > 0 && m.y < H;
      if (was && !m.inside && phrase) disperse();
    });
    host.addEventListener("mouseleave", function () {
      m.inside = false;
      if (phrase) disperse();
    });
  }

  function setPhrase(t) {
    phrase = order[wi % order.length].toUpperCase(); wi++;
    lastSwitch = t;
    var adv = FS * 0.78, gap = FS * 0.55, w = 0;
    for (var k = 0; k < phrase.length; k++) w += (phrase[k] === " ") ? gap : adv;
    var cx = Math.min(Math.max(Z.cx, w / 2 + Z.x0), W - w / 2 - 14);
    var cy = Z.cy;
    for (var i = 0; i < N; i++) pts[i].tx = null;
    var used = [], px = cx - w / 2, idx = 0;
    for (var k = 0; k < phrase.length; k++) {
      var ch = phrase[k];
      if (ch === " ") { px += gap; continue; }
      var gx = px + adv / 2; px += adv;
      var best = -1, bd = 1e9;
      for (var i = 0; i < N; i++) {
        if (used.indexOf(i) >= 0) continue;
        var dx = pts[i].x - gx, dy = pts[i].y - cy, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
      if (best < 0) break;
      used.push(best);
      var p = pts[best];
      p.ch = ch; p.tx = gx; p.ty = cy; p.k = idx;
      p.delay = t + idx * 70; p.prog = 0; idx++;
    }
  }

  var holdTime = autoMode ? 4200 : 3600;

  function tick(t) {
    ctx.clearRect(0, 0, W, H);
    if (m.inside && (!phrase || t - lastSwitch > holdTime)) setPhrase(t);
    for (var i = 0; i < N; i++) {
      var p = pts[i];
      if (p.tx !== null) {
        if (t > p.delay) {
          p.prog += (1 - p.prog) * 0.06;
          var bob = Math.sin(t / 950 + p.k * 0.7) * (1.2 * p.prog);
          p.x += (p.tx - p.x) * 0.06;
          p.y += (p.ty + bob - p.y) * 0.06;
        }
      } else {
        p.vx += (Z.cx - p.x) * 0.000012;
        p.vy += (Z.cy - p.y) * 0.000018;
        if (m.inside && !autoMode) {
          var dx = p.x - m.x, dy = p.y - m.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 70 && d > 1) { p.vx += dx / d * 0.018; p.vy += dy / d * 0.018; }
        }
        p.vx = Math.max(-0.28, Math.min(0.28, p.vx * 0.997));
        p.vy = Math.max(-0.28, Math.min(0.28, p.vy * 0.997));
        p.x += p.vx + Math.sin(t / 2500 + p.ph) * 0.06;
        p.y += p.vy + Math.cos(t / 3000 + p.ph) * 0.06;
        if (p.x < Z.x0) { p.x = Z.x0; p.vx = Math.abs(p.vx); }
        if (p.x > Z.x1) { p.x = Z.x1; p.vx = -Math.abs(p.vx); }
        if (p.y < Z.y0) { p.y = Z.y0; p.vy = Math.abs(p.vy); }
        if (p.y > Z.y1) { p.y = Z.y1; p.vy = -Math.abs(p.vy); }
        p.prog *= 0.92;
      }
      var g = p.prog;
      var fs = BASE + (FS - BASE) * g;
      var al = 0.32 + 0.6 * g;
      ctx.font = "500 " + fs + "px 'Space Grotesk', 'Inter', sans-serif";
      ctx.fillStyle = "rgba(10,125,82," + al + ")";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.ch, p.x, p.y);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
