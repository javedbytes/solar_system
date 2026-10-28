# 🪐 Interactive Solar System — Learning Demo

A self-contained, dependency-free web demo showing the Sun and the orbital motion of all eight planets.

## Features
- **Animated orbits** for Mercury → Neptune on an HTML canvas, using each planet's *real orbital period* (relative speeds are accurate; sizes/distances are compressed so everything fits on screen).
- **Click any planet (or the Sun)** to open an info card with its name, type, diameter, distance from the Sun (km + AU), orbital period (years + days), day length, moon count, and a short learning fact.
- **Playback controls**: Play/Pause button (or press `Space`), Reset button, and a speed slider (0.25× – 20×).
- **Toggles** for orbit rings and name labels, plus a live "elapsed Earth years/days" readout.
- Hover highlighting, touch support, responsive layout, crisp rendering on high-DPI screens.

## Run it
No build step required. Either:

```bash
# Option 1: just open the file
open index.html          # macOS
xdg-open index.html      # Linux

# Option 2: serve locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files
| File | Purpose |
|---|---|
| `index.html` | Page structure: canvas stage, control bar, info panel |
| `style.css`  | Dark space theme, layout, responsive breakpoints |
| `app.js`     | Planet data, animation loop, hit-testing, UI logic |

## Data notes
Orbital periods (days): Mercury 88 · Venus 225 · Earth 365.25 · Mars 687 · Jupiter 4,333 · Saturn 10,759 · Uranus 30,687 · Neptune 60,190. Distances range from 0.39 AU (Mercury) to 30.05 AU (Neptune). Display radii use a compressed scale for visibility — clearly labeled in the UI as "not to scale".
