# Planets Sandbox

A browser-based gravity playground where you can build, alter, and explore planetary systems.

![Original solar-system game artwork](assets/solar-system-game-art.png)

## Play locally

No installation or build step is required. Open `index.html` directly, or start a local server from the project folder:

```bash
python3 -m http.server 4173
```

Then visit `http://127.0.0.1:4173`.

## Features

- Momentum-conserving pairwise N-body gravity: every interaction applies equal-and-opposite forces
- Solar System with eight planets, realistic planetary eccentricities, and 21 major moons (Mercury and Venus have no natural moons)
- Readable close-moon rendering keeps moons visible beside their planets at system-wide zoom while physics retains true orbital distances
- Smaller planet/moon visuals and one-direction close-moon animation prevent high-speed wobble around giant planets even at the full 333-days-per-second setting
- Solar System, Earth and Moon, binary-star, and five-body-chaos presets
- Pause, resume, reset, clear, and time-speed controls
- Per-body gravity strength from 0× to 100× with adaptive close-encounter timesteps
- Barycentric Solar System initialization, including the Sun's Jupiter-driven motion around the system center of mass
- Automatic merge-on-impact collisions, except inside Roche zones where the smaller body is tidally shredded into debris
- A New Planet launcher with asteroid, gas-giant, terrestrial, and hot-planet types
- Impact and orbit modes with a live system roster for choosing the target body
- Binary creation mode mass-matches a new companion and initializes both bodies around their shared barycenter
- Automatic binary-planet, binary-moon, and binary-star classification with a live barycenter marker
- Spawnable G-type, red-dwarf, blue main-sequence, red-giant, and white-dwarf stars
- Mouse-controlled orbit distance, prograde/retrograde motion, and adjustable eccentricity (“Accentuary”) with periapsis/apoapsis previews
- Enlarged, visible density-aware Roche zones with gradual tidal stretching, escaping shards, physical breakup into gravitating fragments, and debris-fed ring growth
- Visible impact flashes, expanding shockwaves, rocky fragments, sparks, and gas clouds
- Scientific profiles for every body, including composition, atmosphere, temperature, density, magnetic-field strength, surface gravity, and escape velocity
- Editable mass, color, name, and velocity for selected bodies
- Changing mass automatically changes physical radius using constant-density scaling, so gravity, surface gravity, collisions, and size respond together
- Editable 0–100× natural magnetic fields for every built-in or spawned body, with hover-visible blue magnetospheres
- Camera panning, pointer-centered zooming, focus, and fit-to-system controls
- Double-click tracking camera that continuously follows a moving planet, moon, or star until the player pans away
- Fast pointer-centered manual zoom; creating an impact or orbit never moves or zooms the camera automatically
- Move Bodies mode: press `T`, then drag any planet, moon, or star while preserving its velocity; attached moons move with their parent
- Configurable trails, labels, grid, and velocity vectors
- Optimized NASA/JPL planet and Sun imagery with procedural fallback surfaces, atmosphere glows, lighting, rings, and magnetic fields
- Optimized NASA/JPL 2MASS Milky Way background with parallax stars, deep-space shading, and a futuristic HUD treatment
- Responsive settings drawer for smaller screens
- Keyboard shortcuts available from the in-game help panel

## Controls

- Drag empty space to move the camera
- Scroll to zoom toward the pointer
- Click a body to select and edit it
- Double-click a body to focus it
- Press `A` to open the New Planet launcher
- Press `T` to toggle Move Bodies, then drag a body to reposition it
- Press `Space` to pause or resume
- Press `F` to fit the system in view
- Press `Esc` to cancel the current tool or action

## Publish an update

After changing the game, open Terminal and run:

```bash
cd "/Users/ayedan/Documents/ChatGPT/Space-planets Sandbox"
git add .
git commit -m "Update Planets Sandbox"
git push origin main
```

If Git asks for a password, paste your GitHub personal access token. GitHub Pages will automatically rebuild the public game after the push finishes.

## Project files

- `index.html` — game interface and control panel
- `styles.css` — visual design and responsive layout
- `app.js` — simulation, rendering, camera, editing, and input logic
- `assets/solar-system-game-art.png` — original 1672 × 941 reference artwork used in the game header

## Visual asset

The included artwork features the Sun, eight major planets, orbital paths, an asteroid belt, stars, and a comet. The live simulation itself is rendered dynamically so every planet can move and interact.

## Simulation scope

The physics model is two-dimensional, so orbital inclination and three-dimensional axial tilt are not simulated. The built-in system includes the major moons used for gameplay rather than every known minor satellite. Close-orbit accuracy is prioritized automatically; at very high requested speeds the game slows simulated-time throughput instead of taking unstable oversized physics steps.

Planet graphics are deliberately enlarged so they remain clickable; gravitational calculations use their true positions and physical radii. A visually close pass can therefore still be millions of kilometres away. The simulator does not fake capture: a flyby becomes a permanent orbit only when a collision, tidal event, or multi-body encounter removes enough orbital energy.
