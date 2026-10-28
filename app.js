/* =========================================================
   Interactive Solar System — Learning Demo
   Canvas animation of the Sun + 8 planets with:
   - click-to-select info panel (name, size, distance, period)
   - play / pause, speed slider, reset
   - orbit & label toggles, keyboard shortcuts
   Display sizes/distances are compressed for visibility;
   orbital PERIODS use real values (Earth years).
   ========================================================= */
"use strict";

/* ---------- Data ---------- */
const SUN = {
  id: "sun",
  name: "Sun",
  type: "G-type Star",
  color: "#ffcf4d",
  glow: "#ff9d2e",
  diameterKm: 1_391_000,
  distAU: 0,
  periodYears: null,          // it doesn't orbit the Sun :)
  dayLength: "~25–35 Earth days (differential rotation)",
  moons: "8 planets orbit it",
  desc: "The Sun holds 99.8% of the Solar System's mass. Its gravity keeps every planet in orbit, and nuclear fusion in its core converts ~600 million tonnes of hydrogen into helium every second.",
};

const PLANETS = [
  {
    id: "mercury", name: "Mercury", type: "Rocky planet",
    color: "#b7b2a8", orbitR: 58, size: 4.2,
    diameterKm: 4_879, distAU: 0.39, distKm: "57.9 million km",
    periodDays: 88, periodYears: 0.24,
    dayLength: "58.6 Earth days", moons: "0",
    desc: "The smallest planet and fastest orbiter. It has almost no atmosphere, so temperatures swing from ~430°C by day to −180°C at night.",
  },
  {
    id: "venus", name: "Venus", type: "Rocky planet",
    color: "#e8c07d", orbitR: 82, size: 6.4,
    diameterKm: 12_104, distAU: 0.72, distKm: "108.2 million km",
    periodDays: 225, periodYears: 0.62,
    dayLength: "243 Earth days (retrograde!)", moons: "0",
    desc: "A runaway greenhouse world wrapped in thick CO₂ clouds. Venus is the hottest planet (~465°C) — even hotter than Mercury — and it spins backwards.",
  },
  {
    id: "earth", name: "Earth", type: "Rocky planet",
    color: "#4f9be0", orbitR: 110, size: 6.8, accent: "#59c26f",
    diameterKm: 12_742, distAU: 1.0, distKm: "149.6 million km",
    periodDays: 365.25, periodYears: 1.0,
    dayLength: "24 hours", moons: "1 (the Moon)",
    desc: "Our home — the only known world with liquid surface water and life. One orbit around the Sun defines our year: 365.25 days.",
  },
  {
    id: "mars", name: "Mars", type: "Rocky planet",
    color: "#d1663d", orbitR: 142, size: 5.2,
    diameterKm: 6_779, distAU: 1.52, distKm: "227.9 million km",
    periodDays: 687, periodYears: 1.88,
    dayLength: "24.6 hours", moons: "2 (Phobos & Deimos)",
    desc: "The red planet, colored by iron-oxide dust. It hosts the largest volcano in the Solar System (Olympus Mons) and shows evidence of ancient rivers.",
  },
  {
    id: "jupiter", name: "Jupiter", type: "Gas giant",
    color: "#d9a066", orbitR: 196, size: 14.5, bands: true,
    diameterKm: 139_820, distAU: 5.2, distKm: "778.5 million km",
    periodDays: 4_333, periodYears: 11.86,
    dayLength: "9.9 hours (fastest spin)", moons: "95 known",
    desc: "The giant of our system — more massive than all other planets combined. Its Great Red Spot is a storm wider than Earth that has raged for centuries.",
  },
  {
    id: "saturn", name: "Saturn", type: "Gas giant",
    color: "#e3cf94", orbitR: 246, size: 12.2, ring: true,
    diameterKm: 116_460, distAU: 9.58, distKm: "1.43 billion km",
    periodDays: 10_759, periodYears: 29.45,
    dayLength: "10.7 hours", moons: "146 known",
    desc: "Famous for its stunning rings of ice and rock. Saturn is so light (less dense than water) that it would float in a big enough ocean.",
  },
  {
    id: "uranus", name: "Uranus", type: "Ice giant",
    color: "#8fd0d9", orbitR: 292, size: 9.0,
    diameterKm: 50_724, distAU: 19.2, distKm: "2.87 billion km",
    periodDays: 30_687, periodYears: 84.0,
    dayLength: "17.2 hours (tilted 98°)", moons: "28 known",
    desc: "The sideways planet — it rolls around the Sun tilted ~98°, likely due to an ancient collision. Methane in its atmosphere gives it a pale cyan hue.",
  },
  {
    id: "neptune", name: "Neptune", type: "Ice giant",
    color: "#4a6fe3", orbitR: 336, size: 8.7,
    diameterKm: 49_244, distAU: 30.05, distKm: "4.5 billion km",
    periodDays: 60_190, periodYears: 164.8,
    dayLength: "16.1 hours", moons: "16 known",
    desc: "The most distant planet, with the Solar System's fastest winds (over 2,000 km/h). It takes nearly 165 Earth years to complete one orbit.",
  },
];

/* Give each planet a pleasant starting angle so they're spread out */
PLANETS.forEach((p, i) => { p.theta0 = (i * 2.39996) % (Math.PI * 2); }); // golden-angle spread

/* ---------- DOM ---------- */
const canvas     = document.getElementById("stage");
const ctx        = canvas.getContext("2d");
const btnPlay    = document.getElementById("btn-play");
const btnReset   = document.getElementById("btn-reset");
const speedSlider= document.getElementById("speed-slider");
const speedValue = document.getElementById("speed-value");
const chkOrbits  = document.getElementById("chk-orbits");
const chkLabels  = document.getElementById("chk-labels");
const dateReadout= document.getElementById("date-readout");

const infoDefault= document.getElementById("info-default");
const infoCard   = document.getElementById("info-card");
const el = (id) => document.getElementById(id);

/* ---------- State ---------- */
const state = {
  playing: true,
  speed: parseFloat(speedSlider.value), // multiplier
  simDays: 0,            // elapsed simulated days
  selected: null,        // body being shown in info card
  hover: null,           // body under mouse
  showOrbits: true,
  showLabels: true,
};

/* Base pace: at speed 1×, ~10 simulated days per real second */
const DAYS_PER_SEC_BASE = 10;

/* Stars background (generated once, regenerated on resize) */
let stars = [];
function makeStars(w, h) {
  const n = Math.round((w * h) / 6000);
  stars = Array.from({ length: n }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.2 + 0.3,
    a: Math.random() * 0.7 + 0.15,
    tw: Math.random() * Math.PI * 2,
  }));
}

/* ---------- Sizing ---------- */
let W = 0, H = 0, DPR = 1, scaleFit = 1, cx = 0, cy = 0;

function resize() {
  DPR = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  W = Math.max(rect.width, 100);
  H = Math.max(rect.height, 100);
  canvas.width  = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // Fit Neptune's orbit (max radius 336 + margin) inside the smaller half-dimension
  const maxOrbit = PLANETS[PLANETS.length - 1].orbitR + 26;
  scaleFit = Math.min(W, H) / 2 / maxOrbit;
  scaleFit = Math.min(scaleFit, 1.35); // don't over-zoom on huge screens
  cx = W / 2;
  cy = H / 2;
  makeStars(W, H);
}
window.addEventListener("resize", resize);

/* ---------- Geometry helpers ---------- */
function planetPos(p) {
  const angle = p.theta0 + (state.simDays / (p.periodDays)) * Math.PI * 2;
  const r = p.orbitR * scaleFit;
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, r };
}

function sunRadius() { return 20 * scaleFit; }

function hitTest(mx, my) {
  // planets first (they're small), then the Sun
  for (const p of PLANETS) {
    const pos = planetPos(p);
    const rad = Math.max(p.size * scaleFit, 9); // generous touch target
    const dx = mx - pos.x, dy = my - pos.y;
    if (dx * dx + dy * dy <= (rad + 6) ** 2) return p;
  }
  const sr = sunRadius();
  const dx = mx - cx, dy = my - cy;
  if (dx * dx + dy * dy <= (sr + 6) ** 2) return SUN;
  return null;
}

/* ---------- Drawing ---------- */
function drawStars(t) {
  for (const s of stars) {
    const alpha = s.a * (0.75 + 0.25 * Math.sin(t * 0.0013 + s.tw));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawOrbits() {
  if (!state.showOrbits) return;
  ctx.lineWidth = 1;
  for (const p of PLANETS) {
    ctx.strokeStyle = state.selected === p || state.hover === p
      ? "rgba(255,215,94,0.55)" : "rgba(140,160,220,0.16)";
    ctx.beginPath();
    ctx.arc(cx, cy, p.orbitR * scaleFit, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawSun(t) {
  const r = sunRadius();
  const pulse = 1 + 0.03 * Math.sin(t * 0.002);
  // outer glow
  const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 3.2 * pulse);
  g.addColorStop(0, "rgba(255,200,80,0.85)");
  g.addColorStop(0.35, "rgba(255,150,40,0.28)");
  g.addColorStop(1, "rgba(255,120,20,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 3.2 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // body
  const b = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  b.addColorStop(0, "#fff6d0");
  b.addColorStop(0.6, SUN.color);
  b.addColorStop(1, "#f28f2b");
  ctx.fillStyle = b;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (state.selected === SUN || state.hover === SUN) highlightRing(cx, cy, r + 5);
  if (state.showLabels) label("Sun", cx, cy - r - 10);
}

function highlightRing(x, y, r) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,215,94,0.9)";
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function label(text, x, y) {
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  const w = ctx.measureText(text).width;
  ctx.fillRect(x - w / 2 - 4, y - 14, w + 8, 15);
  ctx.fillStyle = "#dbe3ff";
  ctx.fillText(text, x, y);
}

function drawPlanet(p) {
  const pos = planetPos(p);
  const r = Math.max(p.size * scaleFit, 3.2);

  // Saturn back-ring
  if (p.ring) drawRing(pos.x, pos.y, r, false);

  // body with simple shading toward the Sun
  const angToSun = Math.atan2(cy - pos.y, cx - pos.x);
  const lx = pos.x + Math.cos(angToSun) * r * 0.35;
  const ly = pos.y + Math.sin(angToSun) * r * 0.35;
  const grad = ctx.createRadialGradient(lx, ly, r * 0.15, pos.x, pos.y, r);
  grad.addColorStop(0, lighten(p.color, 0.35));
  grad.addColorStop(0.75, p.color);
  grad.addColorStop(1, darken(p.color, 0.45));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Jupiter bands
  if (p.bands && r > 6) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = "rgba(120,70,40,0.35)";
    ctx.lineWidth = Math.max(r * 0.14, 1);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(pos.x - r, pos.y + i * r * 0.35);
      ctx.lineTo(pos.x + r, pos.y + i * r * 0.35);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Earth hint of continents
  if (p.accent && r > 5) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(89,194,111,0.55)";
    ctx.beginPath();
    ctx.ellipse(pos.x - r * 0.25, pos.y - r * 0.15, r * 0.4, r * 0.28, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(pos.x + r * 0.35, pos.y + r * 0.3, r * 0.3, r * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Saturn front-ring
  if (p.ring) drawRing(pos.x, pos.y, r, true);

  // selection / hover
  if (state.selected === p || state.hover === p) highlightRing(pos.x, pos.y, r + 6);

  if (state.showLabels) label(p.name, pos.x, pos.y - r - 6);
}

function drawRing(x, y, r, front) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.45);
  ctx.strokeStyle = "rgba(226,205,150,0.8)";
  ctx.lineWidth = Math.max(r * 0.28, 1.5);
  ctx.beginPath();
  if (front) ctx.ellipse(0, 0, r * 1.9, r * 0.62, 0, 0, Math.PI);       // near half
  else       ctx.ellipse(0, 0, r * 1.9, r * 0.62, 0, Math.PI, Math.PI*2); // far half
  ctx.stroke();
  ctx.strokeStyle = "rgba(180,160,110,0.45)";
  ctx.lineWidth = Math.max(r * 0.1, 1);
  ctx.beginPath();
  if (front) ctx.ellipse(0, 0, r * 2.25, r * 0.75, 0, 0, Math.PI);
  else       ctx.ellipse(0, 0, r * 2.25, r * 0.75, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/* Color helpers */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lighten(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, r + 255 * amt)|0},${Math.min(255, g + 255 * amt)|0},${Math.min(255, b + 255 * amt)|0})`;
}
function darken(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.max(0, r * (1 - amt))|0},${Math.max(0, g * (1 - amt))|0},${Math.max(0, b * (1 - amt))|0})`;
}

/* ---------- Main loop ---------- */
let lastT = null; // initialized on first animation frame (rAF timestamp)
function frame(t) {
  if (lastT === null) lastT = t;
  const dt = Math.min(Math.max((t - lastT) / 1000, 0), 0.1);
  lastT = t;

  if (state.playing) {
    state.simDays += dt * DAYS_PER_SEC_BASE * state.speed;
    dateReadout.textContent =
      `Elapsed: ${(state.simDays / 365.25).toFixed(1)} Earth years (${Math.floor(state.simDays)} days)`;
  }

  ctx.clearRect(0, 0, W, H);
  drawStars(t);
  drawOrbits();
  drawSun(t);
  for (const p of PLANETS) drawPlanet(p);

  requestAnimationFrame(frame);
}

/* ---------- Info panel ---------- */
function fmtNum(n) { return n.toLocaleString("en-US"); }

function showInfo(body) {
  state.selected = body;
  infoDefault.hidden = true;
  infoCard.hidden = false;

  el("info-name").textContent = body.name;
  el("info-type").textContent = body.type;
  el("info-desc").textContent = body.desc;
  el("info-size").textContent = `${fmtNum(body.diameterKm)} km`;

  if (body === SUN) {
    el("info-dist").textContent = "— (center of the system)";
    el("info-period").textContent = "—";
  } else {
    el("info-dist").textContent = `${body.distKm} (${body.distAU} AU)`;
    const yrs = body.periodYears >= 1
      ? `${body.periodYears.toLocaleString("en-US", { maximumFractionDigits: 2 })} Earth years`
      : `${body.periodDays} Earth days`;
    el("info-period").textContent = `${yrs} (${body.periodDays.toLocaleString("en-US")} days)`;
  }
  el("info-day").textContent = body.dayLength;
  el("info-moons").textContent = body.moons;

  const sw = el("info-swatch");
  if (body === SUN) {
    sw.style.background = `radial-gradient(circle at 35% 35%, #fff6d0, ${body.color} 55%, #f28f2b)`;
  } else {
    sw.style.background = `radial-gradient(circle at 35% 35%, ${lighten(body.color, .3)}, ${body.color} 60%, ${darken(body.color, .45)})`;
  }
}

function closeInfo() {
  state.selected = null;
  infoCard.hidden = true;
  infoDefault.hidden = false;
}

el("info-close").addEventListener("click", closeInfo);

/* ---------- Interaction ---------- */
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

canvas.addEventListener("mousemove", (e) => {
  const pt = canvasPoint(e);
  state.hover = hitTest(pt.x, pt.y);
  canvas.classList.toggle("hovering", !!state.hover);
});

canvas.addEventListener("mouseleave", () => { state.hover = null; });

canvas.addEventListener("click", (e) => {
  const pt = canvasPoint(e);
  const body = hitTest(pt.x, pt.y);
  if (body) showInfo(body);
  else closeInfo();
});

/* Touch support */
canvas.addEventListener("touchstart", (e) => {
  const t0 = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const body = hitTest(t0.clientX - rect.left, t0.clientY - rect.top);
  if (body) { showInfo(body); e.preventDefault(); }
}, { passive: false });

/* ---------- Controls ---------- */
function setPlaying(on) {
  state.playing = on;
  btnPlay.textContent = on ? "⏸ Pause" : "▶ Play";
}

btnPlay.addEventListener("click", () => setPlaying(!state.playing));

btnReset.addEventListener("click", () => {
  state.simDays = 0;
  dateReadout.textContent = "Elapsed: 0.0 Earth years";
  setPlaying(true);
});

speedSlider.addEventListener("input", () => {
  state.speed = parseFloat(speedSlider.value);
  speedValue.textContent = `${state.speed}×`;
});

chkOrbits.addEventListener("change", () => (state.showOrbits = chkOrbits.checked));
chkLabels.addEventListener("change", () => (state.showLabels = chkLabels.checked));

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); setPlaying(!state.playing); }
  if (e.key === "Escape") closeInfo();
});

/* ---------- Boot ---------- */
resize();
requestAnimationFrame(frame);
