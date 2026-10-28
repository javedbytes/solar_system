/* Headless smoke test using jsdom + a stubbed canvas 2D context */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
const { window } = dom;

// --- stub canvas 2D context (jsdom has no real canvas) ---
const noop = () => {};
const gradient = { addColorStop: noop };
const makeCtx = () => ({
  setTransform: noop, clearRect: noop, save: noop, restore: noop,
  beginPath: noop, arc: noop, ellipse: noop, moveTo: noop, lineTo: noop,
  fill: noop, stroke: noop, fillRect: noop, fillText: noop, clip: noop,
  translate: noop, rotate: noop, setLineDash: noop,
  createRadialGradient: () => gradient, createLinearGradient: () => gradient,
  measureText: () => ({ width: 40 }),
  font: "", fillStyle: "", strokeStyle: "", lineWidth: 1,
  textAlign: "", textBaseline: "", globalAlpha: 1,
});
window.HTMLCanvasElement.prototype.getContext = function () { return makeCtx(); };

// give elements a bounding rect
Object.defineProperty(window.HTMLElement.prototype, "getBoundingClientRect", {
  value() { return { left: 0, top: 0, width: 900, height: 620, right: 900, bottom: 620 }; },
});

// capture rAF callbacks so we can step the animation manually
let rafCbs = [];
window.requestAnimationFrame = (cb) => { rafCbs.push(cb); return rafCbs.length; };
window.performance.now = () => Date.now();

// --- run app.js in the window ---
const src = fs.readFileSync(path.join(root, "app.js"), "utf8");
window.eval(src);

const $ = (id) => window.document.getElementById(id);
let failures = 0;
const assert = (cond, msg) => {
  if (!cond) { console.error("FAIL:", msg); failures++; }
  else console.log("PASS:", msg);
};

// 1. All required DOM hooks exist
["stage","btn-play","btn-reset","speed-slider","speed-value","chk-orbits","chk-labels",
 "date-readout","info-card","info-name","info-size","info-dist","info-period"].forEach(id =>
  assert(!!$(id), `element #${id} exists`));

// 2. Animation loop registered; time advances across frames
assert(rafCbs.length === 1, "animation loop scheduled via requestAnimationFrame");
const step = (base, n) => {
  for (let i = 1; i <= n; i++) { const cbs = rafCbs; rafCbs = []; cbs.forEach(cb => cb(base + i * 16)); }
};
step(1000, 30);
assert(/Elapsed: [\d.]+ Earth years/.test($("date-readout").textContent),
       "elapsed-time readout updates -> " + $("date-readout").textContent);

// 3. Clicking the Sun (canvas center) opens info card
const clickAt = (x, y) => $("stage").dispatchEvent(
  new window.MouseEvent("click", { clientX: x, clientY: y, bubbles: true }));
clickAt(450, 310);
assert(!$("info-card").hidden, "clicking the Sun opens the info card");
assert($("info-name").textContent === "Sun", "info card shows 'Sun'");

// 4. Close info
$("info-close").click();
assert($("info-card").hidden && !$("info-default").hidden, "close button returns to default panel");

// 5. Play/pause toggle freezes/resumes time
const playBtn = $("btn-play");
assert(playBtn.textContent.includes("Pause"), "starts playing (button shows Pause)");
playBtn.click();
assert(playBtn.textContent.includes("Play"), "pause toggles button label to 'Play'");
const before = $("date-readout").textContent;
step(5000, 10);
assert($("date-readout").textContent === before, "time frozen while paused");
playBtn.click();
step(7000, 10);
assert($("date-readout").textContent !== before, "time advances after resuming");

// 6. Speed slider updates readout
const slider = $("speed-slider");
slider.value = "12";
slider.dispatchEvent(new window.Event("input", { bubbles: true }));
assert($("speed-value").textContent === "12×", "speed readout follows slider");

// 7. Reset zeroes elapsed time and resumes playback
$("btn-reset").click();
assert(/Elapsed: 0\.0 Earth years/.test($("date-readout").textContent), "reset zeroes elapsed time");

// 8. Keyboard: Space toggles play/pause
window.document.dispatchEvent(new window.KeyboardEvent("keydown", { code: "Space", bubbles: true }));
assert(playBtn.textContent.includes("Play"), "Space key pauses simulation");

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll smoke tests passed.");
process.exit(failures ? 1 : 0);
