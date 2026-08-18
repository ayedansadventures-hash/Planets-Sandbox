(() => {
  "use strict";

  const G = 4 * Math.PI * Math.PI;
  const EARTHS_PER_SUN = 332946;
  const DAY_TO_YEAR = 1 / 365.25;
  const KM_PER_AU = 149597870.7;
  const EARTH_RADIUS_AU = 6371 / KM_PER_AU;
  const MAX_BODIES = 80;
  const canvas = document.querySelector("#spaceCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  const ui = Object.fromEntries([...document.querySelectorAll("[id]")].map((node) => [node.id, node]));
  const state = {
    bodies: [],
    initialSnapshot: [],
    selectedId: null,
    running: true,
    simYears: 0,
    speedDays: 10,
    collisionMode: "merge",
    trailLength: 180,
    showTrails: true,
    showLabels: true,
    showGrid: true,
    showVelocity: false,
    showOrbits: true,
    camera: { x: 0, y: 0, zoom: 30 },
    pointer: { x: 0, y: 0, downX: 0, downY: 0, worldX: 0, worldY: 0, dragging: false, moved: false },
    addMode: false,
    launchStart: null,
    idCounter: 1,
    lastFrame: performance.now(),
    trailTick: 0,
    fps: 60,
    stars: [],
    effects: [],
    launchTargetId: null,
    launchMode: "impact",
    orbitPlacement: false,
    orbitDistance: 0,
    orbitAngle: 0,
    resumeAfterOrbit: true,
  };

  const scienceByName = {
    Sun: { className: "G-type star", summary: "Main-sequence stellar body", composition: "Hydrogen 73%, helium 25%", atmosphere: "Photosphere and corona", temperature: "5,500 °C surface", density: "1.41 g/cm³", magnetic: 8, magneticLabel: "Variable · ~2× Earth", magneticNote: "A dynamic field drives sunspots, flares, and solar wind." },
    Mercury: { className: "Terrestrial planet", summary: "Small iron-rich world", composition: "Iron core, silicate crust", atmosphere: "Extremely thin exosphere", temperature: "−180 to 430 °C", density: "5.43 g/cm³", magnetic: .01, magneticLabel: "0.01× Earth", magneticNote: "A weak but measurable global magnetic field." },
    Venus: { className: "Terrestrial planet", summary: "Cloud-covered greenhouse world", composition: "Silicate rock, iron core", atmosphere: "CO₂ 96.5%, nitrogen", temperature: "465 °C", density: "5.24 g/cm³", magnetic: 0, magneticLabel: "No intrinsic field", magneticNote: "The solar wind creates a weak induced magnetosphere." },
    Earth: { className: "Terrestrial planet", summary: "Temperate ocean world", composition: "Silicate rock, iron-nickel core", atmosphere: "Nitrogen 78%, oxygen 21%", temperature: "15 °C average", density: "5.51 g/cm³", magnetic: 1, magneticLabel: "1.00× Earth", magneticNote: "A strong global field shields the atmosphere and surface." },
    Mars: { className: "Terrestrial planet", summary: "Cold desert world", composition: "Basaltic rock, iron-rich soil", atmosphere: "CO₂ 95%, very thin", temperature: "−63 °C average", density: "3.93 g/cm³", magnetic: .002, magneticLabel: "Crustal remnants only", magneticNote: "Mars lost its global field; magnetism remains in its crust." },
    Jupiter: { className: "Gas giant", summary: "Largest planet in the system", composition: "Hydrogen, helium, metallic H₂", atmosphere: "Hydrogen 90%, helium 10%", temperature: "−110 °C cloud tops", density: "1.33 g/cm³", magnetic: 14, magneticLabel: "14× Earth", magneticNote: "The strongest planetary magnetic field in this system." },
    Saturn: { className: "Gas giant", summary: "Ringed hydrogen-rich world", composition: "Hydrogen, helium, rocky core", atmosphere: "Hydrogen 96%, helium", temperature: "−140 °C cloud tops", density: "0.69 g/cm³", magnetic: .58, magneticLabel: "0.58× Earth", magneticNote: "A broad, unusually symmetrical magnetic field." },
    Uranus: { className: "Ice giant", summary: "Sideways rotating frozen world", composition: "Water, methane, ammonia ices", atmosphere: "Hydrogen, helium, methane", temperature: "−195 °C", density: "1.27 g/cm³", magnetic: .74, magneticLabel: "0.74× Earth", magneticNote: "A strongly tilted, off-center magnetic field." },
    Neptune: { className: "Ice giant", summary: "Distant world with supersonic winds", composition: "Water, methane, ammonia ices", atmosphere: "Hydrogen, helium, methane", temperature: "−200 °C", density: "1.64 g/cm³", magnetic: .55, magneticLabel: "0.55× Earth", magneticNote: "A tilted field generated far from the planet's center." },
    Moon: { className: "Rocky moon", summary: "Airless natural satellite", composition: "Silicate rock, small iron core", atmosphere: "Trace exosphere", temperature: "−173 to 127 °C", density: "3.34 g/cm³", magnetic: 0, magneticLabel: "No global field", magneticNote: "Small patches of ancient crust retain magnetism." },
  };

  const scienceByType = {
    asteroid: { className: "Small body", summary: "Irregular rocky asteroid", composition: "Silicate rock, nickel-iron", atmosphere: "None", temperature: "Variable", density: "2.4 g/cm³", magnetic: .001, magneticLabel: "Negligible", magneticNote: "May contain locally magnetized metallic minerals." },
    gasGiant: { className: "Gas giant", summary: "Massive hydrogen-rich world", composition: "Hydrogen, helium, dense core", atmosphere: "Hydrogen and helium", temperature: "−120 °C cloud tops", density: "1.2 g/cm³", magnetic: 9, magneticLabel: "~9× Earth", magneticNote: "Conductive metallic hydrogen powers a vast magnetosphere." },
    planet: { className: "Terrestrial planet", summary: "Rocky Earth-class world", composition: "Silicate mantle, iron core", atmosphere: "Nitrogen, CO₂, water vapor", temperature: "18 °C average", density: "5.2 g/cm³", magnetic: .8, magneticLabel: "0.80× Earth", magneticNote: "A rotating liquid core sustains a protective global field." },
    hotPlanet: { className: "Lava planet", summary: "Molten high-energy world", composition: "Molten silicates, iron core", atmosphere: "Rock vapor, sodium, oxygen", temperature: "1,400 °C", density: "5.8 g/cm³", magnetic: .25, magneticLabel: "0.25× Earth", magneticNote: "Heat and tidal forces create an unstable magnetic field." },
    star: { className: "Main-sequence star", summary: "Self-luminous fusion body", composition: "Hydrogen and helium plasma", atmosphere: "Photosphere and corona", temperature: "5,000 °C surface", density: "1.4 g/cm³", magnetic: 6, magneticLabel: "Strong and variable", magneticNote: "Plasma circulation creates a changing stellar field." },
    ice: { className: "Ice giant", summary: "Cold volatile-rich world", composition: "Water, methane, ammonia ices", atmosphere: "Hydrogen, helium, methane", temperature: "−190 °C", density: "1.5 g/cm³", magnetic: .6, magneticLabel: "0.60× Earth", magneticNote: "An offset dynamo creates a tilted magnetosphere." },
    rock: { className: "Rocky body", summary: "Airless terrestrial object", composition: "Silicate rock and iron", atmosphere: "Trace gases", temperature: "Variable", density: "4.1 g/cm³", magnetic: .08, magneticLabel: "0.08× Earth", magneticNote: "Only a weak remnant or induced field is present." },
  };

  const spawnCatalog = {
    asteroid: { label: "Asteroid", mass: .02, radius: .026, collisionRadius: 80 / KM_PER_AU, color: "#9c8778", texture: "rock", scienceType: "asteroid" },
    gasGiant: { label: "Gas giant", mass: 180, radius: .12, collisionRadius: 60000 / KM_PER_AU, color: "#d19a68", texture: "jupiter", scienceType: "gasGiant", ring: true },
    planet: { label: "New planet", mass: 1, radius: .055, collisionRadius: EARTH_RADIUS_AU, color: "#4d9fe8", texture: "earth", scienceType: "planet" },
    hotPlanet: { label: "Hot planet", mass: 2.5, radius: .064, collisionRadius: 8500 / KM_PER_AU, color: "#f05b38", texture: "mars", scienceType: "hotPlanet" },
  };

  const atmosphereStyles = {
    earth: ["rgba(91,190,255,.72)", .075],
    venus: ["rgba(255,201,105,.5)", .09],
    mars: ["rgba(205,106,69,.24)", .025],
    jupiter: ["rgba(241,203,157,.28)", .035],
    saturn: ["rgba(238,217,158,.24)", .03],
    uranus: ["rgba(140,239,245,.38)", .055],
    neptune: ["rgba(91,137,255,.48)", .055],
  };

  const planetData = [
    { name: "Sun", mass: 332946, radius: .19, radiusKm: 696340, color: "#ffb13b", texture: "sun", x: 0, phase: 0 },
    { name: "Mercury", mass: .055, radius: .034, radiusKm: 2439.7, color: "#8d8982", texture: "mercury", x: .39, eccentricity: .2056, phase: .45 },
    { name: "Venus", mass: .815, radius: .05, radiusKm: 6051.8, color: "#e6a65c", texture: "venus", x: .72, eccentricity: .0068, phase: 2.2 },
    { name: "Earth", mass: 1, radius: .055, radiusKm: 6371, color: "#4f9cff", texture: "earth", x: 1, eccentricity: .0167, phase: 4.1 },
    { name: "Mars", mass: .107, radius: .043, radiusKm: 3389.5, color: "#a94f36", texture: "mars", x: 1.52, eccentricity: .0934, phase: 5.5 },
    { name: "Jupiter", mass: 317.8, radius: .13, radiusKm: 69911, color: "#d7ad7d", texture: "jupiter", x: 5.2, eccentricity: .0489, phase: 3.25 },
    { name: "Saturn", mass: 95.2, radius: .115, radiusKm: 58232, color: "#d7bd7d", texture: "saturn", x: 9.58, eccentricity: .0565, phase: .9, ring: true },
    { name: "Uranus", mass: 14.5, radius: .083, radiusKm: 25362, color: "#79cbd3", texture: "uranus", x: 19.2, eccentricity: .0472, phase: 5.8, ring: true },
    { name: "Neptune", mass: 17.1, radius: .08, radiusKm: 24622, color: "#315fc9", texture: "neptune", x: 30.05, eccentricity: .0086, phase: 2.75 },
  ];

  const moonSystems = {
    Earth: [{ name: "Moon", mass: .0123, radiusKm: 1737.4, distance: .00257, eccentricity: .0549, phase: .4 }],
    Mars: [
      { name: "Phobos", mass: 1.78e-9, radiusKm: 11.3, distance: .0000627, eccentricity: .0151, phase: 1.2 },
      { name: "Deimos", mass: 2.48e-10, radiusKm: 6.2, distance: .0001568, phase: 4.4 },
    ],
    Jupiter: [
      { name: "Io", mass: .015, radiusKm: 1821.6, distance: .00282, eccentricity: .0041, phase: .2, color: "#e6c36f" },
      { name: "Europa", mass: .008, radiusKm: 1560.8, distance: .00449, eccentricity: .009, phase: 1.7, color: "#c8b89b" },
      { name: "Ganymede", mass: .0248, radiusKm: 2634.1, distance: .00715, eccentricity: .0013, phase: 3.1, color: "#9c8a75" },
      { name: "Callisto", mass: .018, radiusKm: 2410.3, distance: .01259, eccentricity: .0074, phase: 5.2, color: "#756b63" },
    ],
    Saturn: [
      { name: "Mimas", mass: 6.3e-6, radiusKm: 198.2, distance: .00124, phase: .3 },
      { name: "Enceladus", mass: 1.8e-5, radiusKm: 252.1, distance: .00159, phase: 1.1, color: "#e5edf1" },
      { name: "Tethys", mass: 1.03e-4, radiusKm: 531.1, distance: .00197, phase: 2.0 },
      { name: "Dione", mass: 1.83e-4, radiusKm: 561.4, distance: .00252, phase: 3.0 },
      { name: "Rhea", mass: 3.9e-4, radiusKm: 763.8, distance: .00352, phase: 4.1 },
      { name: "Titan", mass: .0225, radiusKm: 2574.7, distance: .00817, phase: 5.0, color: "#d5a659" },
      { name: "Iapetus", mass: 3e-4, radiusKm: 734.5, distance: .0238, phase: 5.8, color: "#918477" },
    ],
    Uranus: [
      { name: "Miranda", mass: 1.1e-5, radiusKm: 235.8, distance: .000868, phase: .5 },
      { name: "Ariel", mass: 2.26e-4, radiusKm: 578.9, distance: .001276, phase: 1.6 },
      { name: "Umbriel", mass: 2e-4, radiusKm: 584.7, distance: .001778, phase: 2.7, color: "#777b82" },
      { name: "Titania", mass: 5.9e-4, radiusKm: 788.9, distance: .00291, phase: 4.0 },
      { name: "Oberon", mass: 5e-4, radiusKm: 761.4, distance: .00390, phase: 5.3 },
    ],
    Neptune: [
      { name: "Triton", mass: .00359, radiusKm: 1353.4, distance: .00237, phase: 1.0, retrograde: true, color: "#c6b5aa" },
      { name: "Nereid", mass: 5e-5, radiusKm: 170, distance: .0369, eccentricity: .75, phase: 3.7, color: "#8d9298" },
    ],
  };

  function estimatedCollisionRadius(massEarths, texture) {
    if (texture === "sun") return .00465 * Math.max(.2, (massEarths / EARTHS_PER_SUN) ** .75);
    if (["jupiter", "saturn"].includes(texture)) return 60000 / KM_PER_AU;
    return EARTH_RADIUS_AU * Math.max(.08, massEarths ** .28);
  }

  function gravitationalMass(body) {
    return body.mass * (body.gravityScale ?? 1);
  }

  function makeBody(data) {
    return {
      id: state.idCounter++,
      name: data.name || `Body ${state.idCounter}`,
      x: data.x || 0,
      y: data.y || 0,
      vx: data.vx || 0,
      vy: data.vy || 0,
      mass: Math.max(1e-12, data.mass ?? .1) / EARTHS_PER_SUN,
      gravityScale: clamp(data.gravityScale ?? 1, 0, 2),
      radius: data.radius || .035,
      collisionRadius: data.collisionRadius || (data.radiusKm ? data.radiusKm / KM_PER_AU : estimatedCollisionRadius(data.mass ?? .1, data.texture)),
      color: data.color || "#9cb8d8",
      texture: data.texture || "rock",
      ring: Boolean(data.ring),
      scienceType: data.scienceType || (data.texture === "sun" ? "star" : data.texture === "ice" ? "ice" : "rock"),
      science: data.science || scienceByName[data.name] || null,
      parentId: data.parentId || null,
      isMoon: Boolean(data.isMoon),
      tidalImmune: Boolean(data.tidalImmune),
      orbit: data.orbit ? { ...data.orbit } : null,
      trail: [],
    };
  }

  function makeOrbiter(parent, data) {
    const semiMajor = data.distance;
    const eccentricity = clamp(data.eccentricity || 0, 0, .92);
    const angle = data.phase || 0;
    const distance = semiMajor * (1 - eccentricity);
    const direction = data.retrograde ? -1 : 1;
    const orbiterMass = Math.max(1e-12, data.mass ?? .1) / EARTHS_PER_SUN;
    const orbiterGravityScale = clamp(data.gravityScale ?? 1, 0, 2);
    const speed = Math.sqrt(G * (gravitationalMass(parent) + orbiterMass * orbiterGravityScale) * (2 / distance - 1 / semiMajor));
    return makeBody({
      ...data,
      x: parent.x + Math.cos(angle) * distance,
      y: parent.y + Math.sin(angle) * distance,
      vx: parent.vx - Math.sin(angle) * speed * direction,
      vy: parent.vy + Math.cos(angle) * speed * direction,
      parentId: parent.id,
      isMoon: Boolean(data.isMoon),
      orbit: { parentId: parent.id, a: semiMajor, e: eccentricity, angle, direction },
    });
  }

  function addMajorMoons() {
    const planets = new Map(state.bodies.map((body) => [body.name, body]));
    for (const [planetName, moons] of Object.entries(moonSystems)) {
      const parent = planets.get(planetName);
      if (!parent) continue;
      const anchor = { x: parent.x, y: parent.y, vx: parent.vx, vy: parent.vy };
      const subsystem = [parent];
      for (const moon of moons) {
        const body = makeOrbiter(parent, {
          ...moon,
          radius: .02,
          color: moon.color || "#b6b8bc",
          texture: "rock",
          scienceType: "rock",
          isMoon: true,
          tidalImmune: true,
        });
        subsystem.push(body);
        state.bodies.push(body);
      }
      recenterSubsystem(subsystem, anchor);
    }
  }

  function recenterSubsystem(bodies, anchor) {
    const totalMass = bodies.reduce((sum, body) => sum + body.mass, 0);
    const center = bodies.reduce((result, body) => ({
      x: result.x + body.x * body.mass / totalMass,
      y: result.y + body.y * body.mass / totalMass,
      vx: result.vx + body.vx * body.mass / totalMass,
      vy: result.vy + body.vy * body.mass / totalMass,
    }), { x: 0, y: 0, vx: 0, vy: 0 });
    for (const body of bodies) {
      body.x += anchor.x - center.x;
      body.y += anchor.y - center.y;
      body.vx += anchor.vx - center.vx;
      body.vy += anchor.vy - center.vy;
    }
  }

  function loadPreset(name, saveSnapshot = true) {
    state.idCounter = 1;
    state.simYears = 0;
    state.selectedId = null;
    state.launchTargetId = null;
    state.orbitPlacement = false;
    state.effects = [];
    if (name === "solar") {
      const sun = makeBody(planetData[0]);
      state.bodies = [sun];
      for (const planet of planetData.slice(1)) state.bodies.push(makeOrbiter(sun, { ...planet, distance: planet.x }));
      addMajorMoons();
      state.camera = { x: 0, y: 0, zoom: 17 };
    } else if (name === "earthMoon") {
      const earth = makeBody({ name: "Earth", mass: 1, radius: .08, radiusKm: 6371, color: "#4f9cff", texture: "earth" });
      const moon = makeOrbiter(earth, { name: "Moon", mass: .0123, radius: .035, radiusKm: 1737.4, color: "#b9bcc2", texture: "rock", distance: .00257, eccentricity: .0549, phase: .4, isMoon: true, tidalImmune: true });
      state.bodies = [earth, moon];
      recenterSubsystem(state.bodies, { x: 0, y: 0, vx: 0, vy: 0 });
      state.camera = { x: 0, y: 0, zoom: 110000 };
    } else if (name === "binary") {
      const distance = 2.4;
      const speed = Math.sqrt(G * .7 / (distance * 2));
      state.bodies = [
        makeBody({ name: "Aurelia", mass: 230000, radius: .17, color: "#ffd072", texture: "sun", x: -distance / 2, vy: -speed }),
        makeBody({ name: "Cyanis", mass: 230000, radius: .17, color: "#88c9ff", texture: "sun", x: distance / 2, vy: speed }),
        makeBody({ name: "Drifter", mass: 3, radius: .055, color: "#b37aff", texture: "ice", y: 5.2, vx: -2.35 }),
      ];
      state.camera = { x: 0, y: 0, zoom: 78 };
    } else {
      const colors = ["#ffc35c", "#62b8ff", "#f36f56", "#b992ff", "#6ce0b1"];
      state.bodies = Array.from({ length: 5 }, (_, i) => makeBody({
        name: `Wanderer ${i + 1}`,
        mass: 18000 + i * 6500,
        radius: .1 + i * .008,
        color: colors[i],
        texture: i === 0 ? "sun" : "rock",
        x: Math.cos(i * 1.257) * (1.3 + i * .18),
        y: Math.sin(i * 1.257) * (1.3 + i * .18),
        vx: -Math.sin(i * 1.257) * 1.3,
        vy: Math.cos(i * 1.257) * 1.3,
      }));
      state.camera = { x: 0, y: 0, zoom: 120 };
    }
    state.running = true;
    if (name === "solar") fitView(true);
    if (saveSnapshot) state.initialSnapshot = serializeBodies();
    updateSelectionUI();
    renderSystemRoster();
    updateHUD();
    toast(`${ui.presetSelect.options[ui.presetSelect.selectedIndex]?.text || "System"} loaded`);
  }

  function serializeBodies() {
    return state.bodies.map(({ trail, ...body }) => ({ ...body }));
  }

  function restoreSnapshot() {
    const wasRunning = state.running;
    state.bodies = state.initialSnapshot.map((body) => ({ ...body, trail: [] }));
    state.idCounter = Math.max(1, ...state.bodies.map((b) => b.id + 1));
    state.simYears = 0;
    state.selectedId = null;
    state.launchTargetId = null;
    state.orbitPlacement = false;
    state.effects = [];
    state.running = wasRunning;
    updateSelectionUI();
    renderSystemRoster();
    toast("Simulation reset");
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.viewport = { width: rect.width, height: rect.height, dpr };
    buildStars();
  }

  function buildStars() {
    const count = Math.floor((state.viewport.width * state.viewport.height) / 5200);
    let seed = 92831;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    state.stars = Array.from({ length: count }, () => ({
      x: random() * state.viewport.width,
      y: random() * state.viewport.height,
      radius: random() * 1.25 + .2,
      alpha: random() * .55 + .18,
      blue: random() > .74,
    }));
  }

  function screenToWorld(x, y) {
    return {
      x: (x - state.viewport.width / 2) / state.camera.zoom + state.camera.x,
      y: (y - state.viewport.height / 2) / state.camera.zoom + state.camera.y,
    };
  }

  function worldToScreen(x, y) {
    return {
      x: (x - state.camera.x) * state.camera.zoom + state.viewport.width / 2,
      y: (y - state.camera.y) * state.camera.zoom + state.viewport.height / 2,
    };
  }

  function computeAccelerations() {
    const acceleration = state.bodies.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < state.bodies.length; i++) {
      for (let j = i + 1; j < state.bodies.length; j++) {
        const a = state.bodies[i];
        const b = state.bodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy + 1e-16;
        const invDist = 1 / Math.sqrt(distSq);
        const factor = G * invDist * invDist * invDist;
        acceleration[i].x += factor * gravitationalMass(b) * dx;
        acceleration[i].y += factor * gravitationalMass(b) * dy;
        acceleration[j].x -= factor * gravitationalMass(a) * dx;
        acceleration[j].y -= factor * gravitationalMass(a) * dy;
      }
    }
    return acceleration;
  }

  function integrate(dt) {
    const acceleration = computeAccelerations();
    for (let i = 0; i < state.bodies.length; i++) {
      const body = state.bodies[i];
      body.vx += acceleration[i].x * dt * .5;
      body.vy += acceleration[i].y * dt * .5;
      body.prevX = body.x;
      body.prevY = body.y;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
    }
    const nextAcceleration = computeAccelerations();
    for (let i = 0; i < state.bodies.length; i++) {
      state.bodies[i].vx += nextAcceleration[i].x * dt * .5;
      state.bodies[i].vy += nextAcceleration[i].y * dt * .5;
    }
    if (state.collisionMode !== "none") resolveCollisions();
    resolveTidalDisruptions();
  }

  function resolveCollisions() {
    for (let i = 0; i < state.bodies.length; i++) {
      for (let j = i + 1; j < state.bodies.length; j++) {
        const a = state.bodies[i];
        const b = state.bodies[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const collisionDistance = a.collisionRadius + b.collisionRadius;
        const previousDx = (b.prevX ?? b.x) - (a.prevX ?? a.x);
        const previousDy = (b.prevY ?? b.y) - (a.prevY ?? a.y);
        const segmentX = dx - previousDx;
        const segmentY = dy - previousDy;
        const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;
        const closestT = segmentLengthSq > 0 ? clamp(-(previousDx * segmentX + previousDy * segmentY) / segmentLengthSq, 0, 1) : 1;
        const closestDx = previousDx + segmentX * closestT;
        const closestDy = previousDy + segmentY * closestT;
        if (distance >= collisionDistance && Math.hypot(closestDx, closestDy) >= collisionDistance) continue;
        const quadraticB = 2 * (previousDx * segmentX + previousDy * segmentY);
        const quadraticC = previousDx * previousDx + previousDy * previousDy - collisionDistance * collisionDistance;
        const discriminant = quadraticB * quadraticB - 4 * segmentLengthSq * quadraticC;
        const contactT = segmentLengthSq > 0 && discriminant >= 0
          ? clamp((-quadraticB - Math.sqrt(discriminant)) / (2 * segmentLengthSq), 0, 1)
          : closestT;
        const firstName = a.name;
        const secondName = b.name;
        spawnImpactEffect(a, b, (a.x + b.x) / 2, (a.y + b.y) / 2);
        if (state.collisionMode === "merge") {
          const totalMass = a.mass + b.mass;
          const survivor = a.mass >= b.mass ? a : b;
          const mergedGravityScale = (gravitationalMass(a) + gravitationalMass(b)) / totalMass;
          survivor.x = (a.x * a.mass + b.x * b.mass) / totalMass;
          survivor.y = (a.y * a.mass + b.y * b.mass) / totalMass;
          survivor.vx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
          survivor.vy = (a.vy * a.mass + b.vy * b.mass) / totalMass;
          survivor.mass = totalMass;
          survivor.gravityScale = mergedGravityScale;
          survivor.radius = Math.cbrt(a.radius ** 3 + b.radius ** 3);
          survivor.collisionRadius = Math.cbrt(a.collisionRadius ** 3 + b.collisionRadius ** 3);
          survivor.name = `${survivor.name} + ${survivor === a ? b.name : a.name}`.slice(0, 24);
          survivor.trail = [];
          const removed = survivor === a ? b : a;
          if (state.selectedId === removed.id) state.selectedId = survivor.id;
          state.bodies.splice(state.bodies.indexOf(removed), 1);
          updateSelectionUI();
          renderSystemRoster();
          toast(`${firstName} and ${secondName} merged`);
          return;
        }
        if (distance >= collisionDistance && contactT < 1) {
          a.x = (a.prevX ?? a.x) + (a.x - (a.prevX ?? a.x)) * contactT;
          a.y = (a.prevY ?? a.y) + (a.y - (a.prevY ?? a.y)) * contactT;
          b.x = (b.prevX ?? b.x) + (b.x - (b.prevX ?? b.x)) * contactT;
          b.y = (b.prevY ?? b.y) + (b.y - (b.prevY ?? b.y)) * contactT;
          dx = b.x - a.x;
          dy = b.y - a.y;
          distance = Math.max(Math.hypot(dx, dy), collisionDistance * .999);
        }
        const nx = dx / Math.max(distance, 1e-12);
        const ny = dy / Math.max(distance, 1e-12);
        const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relative < 0) {
          const impulse = (2 * relative) / (a.mass + b.mass);
          a.vx += impulse * b.mass * nx;
          a.vy += impulse * b.mass * ny;
          b.vx -= impulse * a.mass * nx;
          b.vy -= impulse * a.mass * ny;
        }
        const overlap = Math.max(0, collisionDistance - distance);
        const totalMass = a.mass + b.mass;
        a.x -= nx * overlap * (b.mass / totalMass);
        a.y -= ny * overlap * (b.mass / totalMass);
        b.x += nx * overlap * (a.mass / totalMass);
        b.y += ny * overlap * (a.mass / totalMass);
        toast(`${firstName} and ${secondName} collided`);
      }
    }
  }

  function spawnImpactEffect(a, b, x, y) {
    const relativeSpeed = Math.hypot(a.vx - b.vx, a.vy - b.vy);
    const intensity = clamp(relativeSpeed / 8 + Math.log10((a.mass + b.mass) * EARTHS_PER_SUN + 1) / 4, .65, 2.4);
    const gasImpact = [a.texture, b.texture].some((texture) => ["jupiter", "saturn", "ice"].includes(texture));
    const count = Math.round(36 * intensity);
    state.effects.push({ kind: "shockwave", x, y, life: 2.2, maxLife: 2.2, radius: 8, growth: 115 * intensity, color: lighten(a.mass > b.mass ? a.color : b.color, .35) });
    state.effects.push({ kind: "shockwave", x, y, life: 1.45, maxLife: 1.45, radius: 3, growth: 72 * intensity, color: "#fff0bd" });
    state.effects.push({ kind: "flash", x, y, life: 1.05, maxLife: 1.05, radius: 18 + 12 * intensity, color: "#fff2c2" });
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (.08 + Math.random() * .32) * intensity;
      state.effects.push({
        kind: i % 3 === 0 ? "spark" : "fragment", x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI, spin: (Math.random() - .5) * 8,
        life: 2 + Math.random() * 2.2, maxLife: 4.2,
        size: 3 + Math.random() * 6 * intensity,
        color: Math.random() > .5 ? a.color : b.color,
      });
    }
    const gasCount = gasImpact ? Math.round(24 * intensity) : Math.round(7 * intensity);
    for (let i = 0; i < gasCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (.025 + Math.random() * .1) * intensity;
      state.effects.push({ kind: "gas", x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 2.4 + Math.random() * 2.4, maxLife: 4.8, size: 14 + Math.random() * 22 * intensity, color: Math.random() > .5 ? a.color : b.color });
    }
    if (state.effects.length > 320) state.effects.splice(0, state.effects.length - 320);
  }

  function resolveTidalDisruptions() {
    if (state.bodies.length >= MAX_BODIES - 3) return;
    for (let i = 0; i < state.bodies.length; i++) {
      for (let j = i + 1; j < state.bodies.length; j++) {
        const a = state.bodies[i];
        const b = state.bodies[j];
        const primary = a.mass >= b.mass ? a : b;
        const vulnerable = primary === a ? b : a;
        if (vulnerable.tidalImmune || primary.mass < vulnerable.mass * 12) continue;
        const distance = Math.hypot(primary.x - vulnerable.x, primary.y - vulnerable.y);
        const roche = rocheLimit(primary, vulnerable.mass, vulnerable.collisionRadius, vulnerable.gravityScale);
        if (distance >= roche || distance <= primary.collisionRadius + vulnerable.collisionRadius) continue;
        const available = Math.min(7, MAX_BODIES - state.bodies.length + 1);
        if (available < 3) return;
        const fragments = [];
        const fragmentMassEarths = vulnerable.mass * EARTHS_PER_SUN / available;
        const baseAngle = Math.atan2(vulnerable.y - primary.y, vulnerable.x - primary.x);
        for (let index = 0; index < available; index++) {
          const angle = baseAngle + index / available * Math.PI * 2;
          const spread = vulnerable.collisionRadius * (1.5 + index * .18);
          const kick = .025 + index * .004;
          fragments.push(makeBody({
            name: `${vulnerable.name} fragment ${index + 1}`,
            mass: fragmentMassEarths,
            radius: Math.max(.008, vulnerable.radius / Math.cbrt(available)),
            collisionRadius: vulnerable.collisionRadius / Math.cbrt(available) * .58,
            color: vulnerable.color,
            texture: vulnerable.texture,
            scienceType: vulnerable.scienceType,
            x: vulnerable.x + Math.cos(angle) * spread,
            y: vulnerable.y + Math.sin(angle) * spread,
            vx: vulnerable.vx + Math.cos(angle) * kick,
            vy: vulnerable.vy + Math.sin(angle) * kick,
            tidalImmune: true,
            gravityScale: vulnerable.gravityScale,
          }));
        }
        spawnImpactEffect(primary, vulnerable, vulnerable.x, vulnerable.y);
        state.bodies.splice(state.bodies.indexOf(vulnerable), 1, ...fragments);
        if (state.selectedId === vulnerable.id) state.selectedId = fragments[0].id;
        updateSelectionUI();
        renderSystemRoster();
        toast(`${vulnerable.name} broke apart inside ${primary.name}'s Roche limit`);
        return;
      }
    }
  }

  function updateEffects(realSeconds) {
    for (const effect of state.effects) {
      effect.life -= realSeconds;
      if ("vx" in effect) {
        effect.x += effect.vx * realSeconds;
        effect.y += effect.vy * realSeconds;
        effect.vx *= effect.kind === "gas" ? .992 : .997;
        effect.vy *= effect.kind === "gas" ? .992 : .997;
      }
      if (effect.rotation != null) effect.rotation += effect.spin * realSeconds;
      if (effect.kind === "shockwave") effect.radius += effect.growth * realSeconds;
      if (effect.kind === "gas") effect.size += 7 * realSeconds;
    }
    state.effects = state.effects.filter((effect) => effect.life > 0);
  }

  function updateSimulation(realSeconds) {
    if (!state.running || state.speedDays <= 0 || !state.bodies.length) return;
    const requestedDt = realSeconds * state.speedDays * DAY_TO_YEAR;
    const shortestPeriod = state.bodies.reduce((shortest, body) => {
      if (!body.orbit) return shortest;
      const parent = state.bodies.find((candidate) => candidate.id === body.orbit.parentId);
      if (!parent || !body.orbit.a) return shortest;
      const period = Math.sqrt(body.orbit.a ** 3 / Math.max(gravitationalMass(parent) + gravitationalMass(body), 1e-15));
      return Math.min(shortest, period);
    }, Infinity);
    const accuracyStep = Math.min(.002 * DAY_TO_YEAR, Number.isFinite(shortestPeriod) ? shortestPeriod / 100 : .002 * DAY_TO_YEAR);
    const steps = Math.min(750, Math.max(1, Math.ceil(requestedDt / accuracyStep)));
    const simDt = Math.min(requestedDt, steps * accuracyStep);
    const dt = simDt / steps;
    for (let i = 0; i < steps; i++) integrate(dt);
    state.simYears += simDt;
    state.trailTick += 1;
    if (state.trailTick >= 3 && state.trailLength > 0) {
      state.trailTick = 0;
      for (const body of state.bodies) {
        body.trail.push({ x: body.x, y: body.y });
        if (body.trail.length > state.trailLength) body.trail.splice(0, body.trail.length - state.trailLength);
      }
    }
  }

  function drawBackground() {
    const { width, height } = state.viewport;
    const gradient = ctx.createRadialGradient(width * .58, height * .45, 0, width * .58, height * .45, Math.max(width, height) * .8);
    gradient.addColorStop(0, "#0a1729");
    gradient.addColorStop(.45, "#050c17");
    gradient.addColorStop(1, "#010308");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    for (const star of state.stars) {
      const parallaxX = ((-state.camera.x * state.camera.zoom * .012) % width + width) % width;
      const parallaxY = ((-state.camera.y * state.camera.zoom * .012) % height + height) % height;
      const x = (star.x + parallaxX) % width;
      const y = (star.y + parallaxY) % height;
      ctx.fillStyle = star.blue ? `rgba(143,190,255,${star.alpha})` : `rgba(255,255,255,${star.alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGrid() {
    if (!state.showGrid) return;
    const { width, height } = state.viewport;
    const desiredWorld = 95 / state.camera.zoom;
    const power = 10 ** Math.floor(Math.log10(desiredWorld));
    const fraction = desiredWorld / power;
    const step = (fraction < 2 ? 2 : fraction < 5 ? 5 : 10) * power;
    const left = state.camera.x - width / 2 / state.camera.zoom;
    const right = state.camera.x + width / 2 / state.camera.zoom;
    const top = state.camera.y - height / 2 / state.camera.zoom;
    const bottom = state.camera.y + height / 2 / state.camera.zoom;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(94,133,191,.07)";
    ctx.beginPath();
    for (let x = Math.floor(left / step) * step; x <= right; x += step) {
      const sx = worldToScreen(x, 0).x;
      ctx.moveTo(sx, 0); ctx.lineTo(sx, height);
    }
    for (let y = Math.floor(top / step) * step; y <= bottom; y += step) {
      const sy = worldToScreen(0, y).y;
      ctx.moveTo(0, sy); ctx.lineTo(width, sy);
    }
    ctx.stroke();
  }

  function visualRadius(body) {
    const physical = body.collisionRadius * state.camera.zoom;
    const massEarths = body.mass * EARTHS_PER_SUN;
    const minimum = massEarths > 10000 ? 24 : massEarths > 20 ? 17 : body.isMoon ? 8 : 11;
    return Math.max(minimum, Math.min(120, physical));
  }

  function drawOrbitGuides() {
    if (!state.showOrbits) return;
    for (const body of state.bodies) {
      if (!body.orbit) continue;
      const parent = state.bodies.find((candidate) => candidate.id === body.orbit.parentId);
      if (!parent) continue;
      const liveOrbit = osculatingOrbit(body, parent) || body.orbit;
      const a = liveOrbit.a;
      const e = liveOrbit.e || 0;
      if (!Number.isFinite(a) || a <= 0 || e >= 1) continue;
      const b = a * Math.sqrt(1 - e * e);
      if (a * state.camera.zoom < 3) continue;
      const angle = liveOrbit.angle || 0;
      const center = worldToScreen(parent.x - Math.cos(angle) * a * e, parent.y - Math.sin(angle) * a * e);
      ctx.strokeStyle = body.isMoon ? "rgba(151,181,220,.16)" : "rgba(104,155,224,.2)";
      ctx.lineWidth = body === selectedBody() ? 1.2 : .7;
      ctx.setLineDash(body === selectedBody() ? [5, 4] : []);
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, a * state.camera.zoom, b * state.camera.zoom, angle, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawTrails() {
    if (!state.showTrails) return;
    ctx.lineCap = "round";
    for (const body of state.bodies) {
      if (body.trail.length < 2) continue;
      ctx.beginPath();
      body.trail.forEach((point, index) => {
        const p = worldToScreen(point.x, point.y);
        if (index === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.globalAlpha = .42;
      ctx.strokeStyle = body.color;
      ctx.lineWidth = 1.15;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawBody(body) {
    const p = worldToScreen(body.x, body.y);
    const radius = visualRadius(body);
    if (p.x < -radius * 4 || p.x > state.viewport.width + radius * 4 || p.y < -radius * 4 || p.y > state.viewport.height + radius * 4) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    if (body.texture === "sun") {
      const glow = ctx.createRadialGradient(0, 0, radius * .3, 0, 0, radius * 3.2);
      glow.addColorStop(0, `${body.color}88`);
      glow.addColorStop(.25, `${body.color}3d`);
      glow.addColorStop(1, `${body.color}00`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, radius * 3.2, 0, Math.PI * 2); ctx.fill();
    }
    if (body.ring) drawRing(body, radius, true);
    const sphere = ctx.createRadialGradient(-radius * .33, -radius * .38, radius * .06, 0, 0, radius * 1.05);
    sphere.addColorStop(0, lighten(body.color, .42));
    sphere.addColorStop(.42, body.color);
    sphere.addColorStop(1, darken(body.color, .72));
    ctx.fillStyle = sphere;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.clip();
    drawTexture(body, radius);
    ctx.restore();
    drawAtmosphere(body, radius);
    if (body.ring) drawRing(body, radius, false);
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.lineWidth = .7;
    ctx.beginPath(); ctx.arc(0, 0, radius - .3, 0, Math.PI * 2); ctx.stroke();
    if (state.selectedId === body.id) {
      ctx.strokeStyle = "rgba(115,183,255,.88)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(0, 0, radius + 8, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    if (state.showVelocity) drawVelocity(body, p);
  }

  function drawLabels() {
    if (!state.showLabels) return;
    const boxes = [];
    ctx.font = "500 10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const body of [...state.bodies].sort((a, b) => b.mass - a.mass)) {
      if (body.isMoon && (!body.orbit || body.orbit.a * state.camera.zoom < 20)) continue;
      const p = worldToScreen(body.x, body.y);
      const radius = visualRadius(body);
      if (p.x < -40 || p.x > state.viewport.width + 40 || p.y < -40 || p.y > state.viewport.height + 40) continue;
      const width = Math.max(28, ctx.measureText(body.name).width + 10);
      let y = p.y + radius + 14;
      let box = { left: p.x - width / 2, right: p.x + width / 2, top: y - 7, bottom: y + 7 };
      let attempts = 0;
      while (boxes.some((other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top) && attempts < 8) {
        y += 14;
        box = { ...box, top: y - 7, bottom: y + 7 };
        attempts += 1;
      }
      if (y > state.viewport.height - 18) y = p.y - radius - 14;
      if (attempts > 0) {
        ctx.strokeStyle = "rgba(126,164,218,.22)";
        ctx.lineWidth = .7;
        ctx.beginPath(); ctx.moveTo(p.x, p.y + radius + 3); ctx.lineTo(p.x, y - 7); ctx.stroke();
      }
      ctx.fillStyle = state.selectedId === body.id ? "#b9d8ff" : "rgba(205,222,248,.78)";
      ctx.fillText(body.name, p.x, y);
      boxes.push({ left: p.x - width / 2, right: p.x + width / 2, top: y - 7, bottom: y + 7 });
    }
  }

  function drawTexture(body, radius) {
    if (radius < 8) return;
    if (body.texture === "earth") {
      ctx.fillStyle = "rgba(42,122,69,.92)";
      ctx.beginPath();
      ctx.ellipse(-radius * .31, -radius * .2, radius * .29, radius * .17, -.55, 0, Math.PI * 2);
      ctx.ellipse(radius * .22, radius * .12, radius * .35, radius * .16, .72, 0, Math.PI * 2);
      ctx.ellipse(radius * .05, -radius * .5, radius * .13, radius * .1, .2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(122,164,71,.55)";
      ctx.beginPath(); ctx.ellipse(-radius * .2, -.08 * radius, radius * .17, radius * .07, -.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(244,250,255,.78)";
      ctx.fillRect(-radius, -radius, radius * 2, radius * .08);
      ctx.fillRect(-radius, radius * .9, radius * 2, radius * .1);
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = Math.max(1, radius * .045);
      ctx.beginPath();
      ctx.arc(-radius * .2, radius * .1, radius * .7, 3.7, 5.35);
      ctx.arc(radius * .2, -radius * .1, radius * .65, .25, 1.7);
      ctx.stroke();
    } else if (body.texture === "jupiter" || body.texture === "saturn") {
      const colors = body.texture === "jupiter"
        ? ["#f4dfc3aa", "#8f533fa0", "#dfaa7590", "#fff0d0a0", "#a9664a92", "#e8c79e9c"]
        : ["#f3d89788", "#a78b5680", "#e8c77d76", "#866b436a", "#f6e3ab78"];
      colors.forEach((color, i) => {
        ctx.fillStyle = color;
        const bandHeight = radius * (i % 2 ? .13 : .09);
        const y = -radius * .72 + i * radius * .29;
        ctx.fillRect(-radius, y, radius * 2, bandHeight);
      });
      if (body.texture === "jupiter") {
        ctx.fillStyle = "#a8433299"; ctx.beginPath(); ctx.ellipse(radius * .35, radius * .28, radius * .22, radius * .105, -.08, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,208,174,.35)"; ctx.lineWidth = Math.max(1, radius * .035);
        ctx.stroke();
      }
    } else if (body.texture === "venus") {
      ctx.strokeStyle = "rgba(255,234,178,.48)"; ctx.lineWidth = Math.max(1.5, radius * .11);
      ctx.beginPath(); ctx.arc(-radius * .18, radius * .08, radius * .78, 3.45, 5.75); ctx.stroke();
      ctx.strokeStyle = "rgba(164,104,54,.3)"; ctx.lineWidth = Math.max(1, radius * .07);
      ctx.beginPath(); ctx.arc(radius * .14, -radius * .2, radius * .68, .15, 2.45); ctx.stroke();
    } else if (body.texture === "mercury") {
      ctx.fillStyle = "rgba(42,39,36,.38)";
      for (let i = 0; i < 7; i++) {
        const angle = body.id * 1.31 + i * 2.19;
        const craterRadius = radius * (.055 + (i % 3) * .028);
        const x = Math.cos(angle) * radius * (.18 + (i % 4) * .14);
        const y = Math.sin(angle) * radius * (.22 + (i % 3) * .16);
        ctx.beginPath(); ctx.arc(x, y, craterRadius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(230,223,210,.2)"; ctx.lineWidth = Math.max(.6, radius * .018); ctx.stroke();
      }
    } else if (body.texture === "mars") {
      ctx.fillStyle = "rgba(73,31,23,.52)";
      ctx.beginPath();
      ctx.ellipse(-radius * .2, -radius * .08, radius * .43, radius * .19, -.35, 0, Math.PI * 2);
      ctx.ellipse(radius * .4, radius * .25, radius * .22, radius * .13, .35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(72,25,21,.68)"; ctx.lineWidth = Math.max(1, radius * .055);
      ctx.beginPath(); ctx.arc(0, radius * .04, radius * .68, .15, 1.4); ctx.stroke();
      ctx.fillStyle = "rgba(246,225,197,.65)";
      ctx.beginPath(); ctx.ellipse(0, -radius * .88, radius * .29, radius * .09, 0, 0, Math.PI * 2); ctx.fill();
    } else if (body.texture === "rock") {
      ctx.fillStyle = "rgba(45,29,24,.3)";
      for (let i = 0; i < 5; i++) {
        const angle = body.id * 2.1 + i * 1.7;
        ctx.beginPath(); ctx.arc(Math.cos(angle) * radius * .48, Math.sin(angle) * radius * .48, radius * (.07 + i * .015), 0, Math.PI * 2); ctx.fill();
      }
    } else if (body.texture === "uranus") {
      ctx.strokeStyle = "rgba(224,255,255,.24)"; ctx.lineWidth = Math.max(1, radius * .065);
      ctx.beginPath(); ctx.ellipse(0, radius * .13, radius, radius * .22, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (body.texture === "neptune") {
      ctx.fillStyle = "rgba(25,47,124,.36)";
      ctx.fillRect(-radius, -radius * .12, radius * 2, radius * .18);
      ctx.fillStyle = "rgba(10,28,82,.58)";
      ctx.beginPath(); ctx.ellipse(radius * .3, radius * .22, radius * .22, radius * .1, -.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(195,224,255,.33)"; ctx.lineWidth = Math.max(1, radius * .045);
      ctx.beginPath(); ctx.arc(-radius * .1, -radius * .12, radius * .75, .3, 2.4); ctx.stroke();
    } else if (body.texture === "ice") {
      ctx.strokeStyle = "rgba(226,249,255,.22)"; ctx.lineWidth = Math.max(1, radius * .08);
      ctx.beginPath(); ctx.ellipse(0, radius * .12, radius, radius * .25, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (body.texture === "sun") {
      ctx.globalAlpha = .25; ctx.fillStyle = "#fff3a3";
      for (let i = 0; i < 8; i++) {
        const angle = i * 2.399 + body.id;
        ctx.beginPath(); ctx.arc(Math.cos(angle) * radius * .55, Math.sin(angle) * radius * .55, radius * .1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawAtmosphere(body, radius) {
    const style = atmosphereStyles[body.texture];
    if (!style || radius < 5) return;
    ctx.save();
    ctx.strokeStyle = style[0];
    ctx.lineWidth = Math.max(.7, radius * style[1]);
    ctx.shadowColor = style[0];
    ctx.shadowBlur = Math.max(2, radius * .18);
    ctx.beginPath(); ctx.arc(0, 0, radius + ctx.lineWidth * .45, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawRing(body, radius, behind) {
    ctx.save();
    ctx.rotate(-.22);
    ctx.scale(1, .34);
    ctx.strokeStyle = behind ? "rgba(175,157,123,.42)" : "rgba(232,215,177,.7)";
    ctx.lineWidth = Math.max(2, radius * .18);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.7, behind ? Math.PI : 0, behind ? Math.PI * 2 : Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function drawVelocity(body, p) {
    const scale = 6;
    const ex = p.x + body.vx * scale;
    const ey = p.y + body.vy * scale;
    ctx.strokeStyle = `${body.color}aa`;
    ctx.fillStyle = body.color;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.stroke();
    const angle = Math.atan2(ey - p.y, ex - p.x);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(angle - .5) * 6, ey - Math.sin(angle - .5) * 6);
    ctx.lineTo(ex - Math.cos(angle + .5) * 6, ey - Math.sin(angle + .5) * 6);
    ctx.closePath(); ctx.fill();
  }

  function drawEffects() {
    for (const effect of state.effects) {
      const p = worldToScreen(effect.x, effect.y);
      const alpha = clamp(effect.life / effect.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = effect.kind === "gas" ? alpha * .38 : alpha;
      if (effect.kind === "shockwave") {
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = Math.max(1.5, 5 * alpha);
        ctx.beginPath(); ctx.arc(p.x, p.y, effect.radius * (1 - alpha * .25), 0, Math.PI * 2); ctx.stroke();
      } else if (effect.kind === "flash") {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, effect.radius * (1.6 - alpha * .4));
        glow.addColorStop(0, "rgba(255,255,255,.98)");
        glow.addColorStop(.24, effect.color);
        glow.addColorStop(1, "rgba(255,130,55,0)");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(p.x, p.y, effect.radius * 1.6, 0, Math.PI * 2); ctx.fill();
      } else if (effect.kind === "gas") {
        const gas = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, effect.size);
        gas.addColorStop(0, effect.color);
        gas.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gas;
        ctx.beginPath(); ctx.arc(p.x, p.y, effect.size, 0, Math.PI * 2); ctx.fill();
      } else if (effect.kind === "spark") {
        ctx.strokeStyle = lighten(effect.color, .55);
        ctx.lineWidth = Math.max(1, effect.size * .45);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - effect.vx * 28, p.y - effect.vy * 28); ctx.stroke();
      } else {
        ctx.translate(p.x, p.y); ctx.rotate(effect.rotation);
        ctx.fillStyle = effect.color;
        ctx.fillRect(-effect.size / 2, -effect.size / 3, effect.size, effect.size * .66);
      }
      ctx.restore();
    }
  }

  function drawLaunchPreview() {
    if (state.orbitPlacement) {
      const target = state.bodies.find((body) => body.id === state.launchTargetId);
      if (!target) return;
      const eccentricity = Number(ui.eccentricity.value) / 100;
      const semiMajor = state.orbitDistance / Math.max(.05, 1 - eccentricity);
      const semiMinor = semiMajor * Math.sqrt(1 - eccentricity * eccentricity);
      const center = worldToScreen(
        target.x - Math.cos(state.orbitAngle) * semiMajor * eccentricity,
        target.y - Math.sin(state.orbitAngle) * semiMajor * eccentricity,
      );
      const start = worldToScreen(
        target.x + Math.cos(state.orbitAngle) * state.orbitDistance,
        target.y + Math.sin(state.orbitAngle) * state.orbitDistance,
      );
      const targetScreen = worldToScreen(target.x, target.y);
      const { spec } = currentSpawnSpec();
      const limits = orbitLimits(target, spec, eccentricity);
      ctx.save();
      ctx.strokeStyle = "rgba(92,220,183,.18)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 7]);
      ctx.beginPath(); ctx.arc(targetScreen.x, targetScreen.y, limits.stableRadius * state.camera.zoom, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,102,111,.45)";
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.arc(targetScreen.x, targetScreen.y, limits.roche * state.camera.zoom, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(102,198,255,.9)";
      ctx.fillStyle = "#8fd4ff";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, semiMajor * state.camera.zoom, semiMinor * state.camera.zoom, state.orbitAngle, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(132,191,255,.35)";
      ctx.beginPath(); ctx.moveTo(targetScreen.x, targetScreen.y); ctx.lineTo(start.x, start.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(start.x, start.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.font = "600 10px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(194,225,255,.9)";
      ctx.fillText(`Periapsis ${formatDistance(state.orbitDistance)}`, start.x + 12, start.y - 8);
      const apoapsis = semiMajor * (1 + eccentricity);
      const far = worldToScreen(target.x - Math.cos(state.orbitAngle) * apoapsis, target.y - Math.sin(state.orbitAngle) * apoapsis);
      ctx.textAlign = "right";
      ctx.fillText(`Apoapsis ${formatDistance(apoapsis)}`, far.x - 10, far.y - 8);
      ctx.restore();
      return;
    }
    if (!state.addMode || !state.launchStart || !state.pointer.dragging) return;
    const start = worldToScreen(state.launchStart.x, state.launchStart.y);
    ctx.strokeStyle = "#8bc1ff";
    ctx.fillStyle = "#8bc1ff";
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.arc(start.x, start.y, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(state.pointer.x, state.pointer.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(state.pointer.x, state.pointer.y, 3, 0, Math.PI * 2); ctx.fill();
  }

  function render() {
    drawBackground();
    drawGrid();
    drawOrbitGuides();
    drawTrails();
    [...state.bodies].sort((a, b) => a.mass - b.mass).forEach(drawBody);
    drawLabels();
    drawEffects();
    drawLaunchPreview();
  }

  function frame(now) {
    const elapsed = Math.min(.05, (now - state.lastFrame) / 1000);
    state.lastFrame = now;
    state.fps += ((1 / Math.max(elapsed, .001)) - state.fps) * .06;
    updateSimulation(elapsed);
    updateEffects(elapsed);
    render();
    updateHUD();
    requestAnimationFrame(frame);
  }

  function bodyAt(screenX, screenY) {
    let found = null;
    let bestDistance = Infinity;
    for (const body of state.bodies) {
      const p = worldToScreen(body.x, body.y);
      const distance = Math.hypot(screenX - p.x, screenY - p.y);
      const hitRadius = Math.max(22, visualRadius(body) + 8);
      if (distance <= hitRadius && distance < bestDistance) { found = body; bestDistance = distance; }
    }
    return found;
  }

  function selectBody(body) {
    state.selectedId = body?.id ?? null;
    updateSelectionUI();
  }

  function selectedBody() {
    return state.bodies.find((body) => body.id === state.selectedId) || null;
  }

  function updateSelectionUI() {
    const body = selectedBody();
    ui.emptySelection.hidden = Boolean(body);
    ui.bodyEditor.hidden = !body;
    ui.selectionDot.style.background = body?.color || "#43516a";
    ui.selectionDot.style.color = body?.color || "#43516a";
    if (!body) return;
    ui.bodyName.value = body.name;
    ui.bodyMass.value = formatNumber(body.mass * EARTHS_PER_SUN, 5);
    ui.bodyColor.value = normalizeHex(body.color);
    ui.bodyVelocityX.value = formatNumber(body.vx, 8);
    ui.bodyVelocityY.value = formatNumber(body.vy, 8);
    ui.gravityScale.value = Math.round(body.gravityScale * 100);
    ui.gravityScaleValue.value = `${body.gravityScale.toFixed(2)}×`;
    const science = scienceByName[body.name] || body.science || scienceByType[body.scienceType] || scienceByType.rock;
    ui.bodyClass.textContent = science.className;
    ui.bodySummary.textContent = science.summary;
    ui.bodyComposition.textContent = science.composition;
    ui.bodyAtmosphere.textContent = science.atmosphere;
    ui.bodyTemperature.textContent = science.temperature;
    ui.bodyDensity.textContent = science.density;
    const massEarths = body.mass * EARTHS_PER_SUN;
    const radiusEarths = body.collisionRadius / EARTH_RADIUS_AU;
    const surfaceGravity = massEarths * body.gravityScale / Math.max(radiusEarths ** 2, 1e-15);
    const escapeVelocity = 11.186 * Math.sqrt(massEarths * body.gravityScale / Math.max(radiusEarths, 1e-15));
    ui.bodySurfaceGravity.textContent = `${formatNumber(surfaceGravity, 2)} g`;
    ui.bodyEscapeVelocity.textContent = `${formatNumber(escapeVelocity, 1)} km/s`;
    ui.bodyMagneticValue.textContent = science.magneticLabel;
    ui.bodyMagneticNote.textContent = science.magneticNote;
    ui.bodyMagneticMeter.style.width = `${science.magnetic <= 0 ? 2 : clamp(Math.log10(science.magnetic + 1) / Math.log10(15) * 100, 4, 100)}%`;
    ui.planetPreview.style.setProperty("--planet-color", body.color);
  }

  function updateHUD() {
    ui.simulationTime.textContent = state.simYears < 1 ? `${(state.simYears * 365.25).toFixed(1)} days` : `${state.simYears.toFixed(2)} years`;
    ui.bodyCount.textContent = state.bodies.length;
    ui.zoomValue.textContent = `${Math.round(state.camera.zoom / 30 * 100)}%`;
    ui.runStatus.textContent = state.running ? "RUNNING" : "PAUSED";
    ui.runStatus.parentElement.classList.toggle("paused", !state.running);
    ui.playPause.textContent = state.running ? "Ⅱ" : "▶";
    ui.playPause.setAttribute("aria-label", state.running ? "Pause simulation" : "Continue simulation");
    const scaleChoices = [.001, .002, .005, .01, .02, .05, .1, .2, .5, 1, 2, 5, 10, 20, 50, 100];
    const target = 90 / state.camera.zoom;
    const scale = scaleChoices.reduce((best, value) => Math.abs(value - target) < Math.abs(best - target) ? value : best, 1);
    ui.scaleBar.style.width = `${scale * state.camera.zoom}px`;
    ui.scaleLabel.textContent = formatDistance(scale);
  }

  function fitView(silent = false) {
    if (!state.bodies.length) { state.camera = { x: 0, y: 0, zoom: 30 }; return; }
    const xs = state.bodies.map((b) => b.x);
    const ys = state.bodies.map((b) => b.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    state.camera.x = (minX + maxX) / 2;
    state.camera.y = (minY + maxY) / 2;
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    state.camera.zoom = clamp(Math.min(state.viewport.width * .72 / width, state.viewport.height * .72 / height), 2, 2500);
    if (!silent) toast("Camera fitted to system");
  }

  function focusBody(body = selectedBody()) {
    if (!body) return;
    state.camera.x = body.x;
    state.camera.y = body.y;
    const children = state.bodies.filter((candidate) => candidate.parentId === body.id);
    if (children.length) {
      const farthest = Math.max(...children.map((child) => Math.hypot(child.x - body.x, child.y - body.y)));
      state.camera.zoom = clamp(Math.min(state.viewport.width, state.viewport.height) * .38 / Math.max(farthest, body.collisionRadius * 8), 90, 250000);
    } else {
      state.camera.zoom = clamp(Math.max(state.camera.zoom, 32 / body.collisionRadius), 90, 250000);
    }
    toast(`Focused on ${body.name}`);
  }

  function currentSpawnSpec() {
    const type = document.querySelector('input[name="spawnType"]:checked')?.value || "asteroid";
    return { type, spec: spawnCatalog[type] };
  }

  function osculatingOrbit(body, parent) {
    const x = body.x - parent.x;
    const y = body.y - parent.y;
    const vx = body.vx - parent.vx;
    const vy = body.vy - parent.vy;
    const distance = Math.hypot(x, y);
    if (distance <= 0) return null;
    const mu = G * (gravitationalMass(body) + gravitationalMass(parent));
    const speedSq = vx * vx + vy * vy;
    const energy = speedSq / 2 - mu / distance;
    if (energy >= 0) return null;
    const a = -mu / (2 * energy);
    const dot = x * vx + y * vy;
    const eX = ((speedSq - mu / distance) * x - dot * vx) / mu;
    const eY = ((speedSq - mu / distance) * y - dot * vy) / mu;
    const e = Math.hypot(eX, eY);
    const angle = e > 1e-5 ? Math.atan2(eY, eX) : body.orbit?.angle || Math.atan2(y, x);
    const direction = x * vy - y * vx >= 0 ? 1 : -1;
    return { parentId: parent.id, a, e, angle, direction };
  }

  function hillRadius(body) {
    let primary = body.parentId ? state.bodies.find((candidate) => candidate.id === body.parentId) : null;
    if (!primary) {
      primary = state.bodies
        .filter((candidate) => candidate.id !== body.id && candidate.mass > body.mass)
        .sort((a, b) => (b.mass / Math.max(1e-12, (b.x - body.x) ** 2 + (b.y - body.y) ** 2)) - (a.mass / Math.max(1e-12, (a.x - body.x) ** 2 + (a.y - body.y) ** 2)))[0];
    }
    if (!primary) {
      if (body.texture === "sun") return 100;
      const farthestChild = state.bodies
        .filter((candidate) => candidate.parentId === body.id)
        .reduce((farthest, child) => Math.max(farthest, Math.hypot(child.x - body.x, child.y - body.y)), 0);
      return Math.max(.01, farthestChild * 4, body.collisionRadius * 1000);
    }
    const distance = Math.hypot(body.x - primary.x, body.y - primary.y);
    return distance * Math.cbrt(gravitationalMass(body) / Math.max(3 * gravitationalMass(primary), 1e-15));
  }

  function rocheLimit(primary, satelliteMass, satelliteRadius, satelliteGravityScale = 1) {
    const primaryDensity = gravitationalMass(primary) / Math.max(primary.collisionRadius ** 3, 1e-30);
    const satelliteDensity = satelliteMass * satelliteGravityScale / Math.max(satelliteRadius ** 3, 1e-30);
    const densityRatio = clamp(primaryDensity / Math.max(satelliteDensity, 1e-30), .12, 12);
    return 2.44 * primary.collisionRadius * Math.cbrt(densityRatio);
  }

  function orbitLimits(target, spec, eccentricity) {
    const roche = rocheLimit(target, spec.mass / EARTHS_PER_SUN, spec.collisionRadius);
    const minimum = Math.max((target.collisionRadius + spec.collisionRadius) * 1.35, roche * 1.05);
    const stableRadius = hillRadius(target) * .48;
    const maximumPeriapsis = stableRadius * (1 - eccentricity) / Math.max(.05, 1 + eccentricity);
    return { minimum, maximum: maximumPeriapsis, stableRadius, roche, viable: maximumPeriapsis > minimum * 1.15 };
  }

  function setLaunchMode(mode) {
    state.launchMode = mode;
    const orbit = mode === "orbit";
    ui.impactMode.classList.toggle("active", !orbit);
    ui.orbitMode.classList.toggle("active", orbit);
    ui.impactMode.setAttribute("aria-pressed", String(!orbit));
    ui.orbitMode.setAttribute("aria-pressed", String(orbit));
    ui.impactOptions.hidden = orbit;
    ui.orbitOptions.hidden = !orbit;
    ui.launchAtTarget.innerHTML = orbit ? "<span>◉</span> Place orbit with mouse" : "<span>➤</span> Launch at selected target";
    ui.launchNote.textContent = orbit ? "After pressing the button, move the mouse around the target to set distance, then click to create the orbit." : "The object spawns outside the target and automatically aims toward it.";
  }

  function beginOrbitPlacement() {
    const target = state.bodies.find((body) => body.id === state.launchTargetId);
    if (!target) { toast("Select an X target first"); return; }
    const { spec } = currentSpawnSpec();
    const eccentricity = Number(ui.eccentricity.value) / 100;
    const limits = orbitLimits(target, spec, eccentricity);
    if (!limits.viable) {
      toast(`${target.name} cannot hold this object outside its Roche limit`);
      return;
    }
    state.orbitDistance = clamp(limits.stableRadius * .12, limits.minimum, limits.maximum);
    state.orbitAngle = 0;
    state.orbitPlacement = true;
    state.resumeAfterOrbit = state.running;
    state.running = false;
    closeLauncher();
    ui.modeHint.hidden = false;
    ui.modeHint.textContent = `Move around ${target.name} to set orbit distance · Click to place · Esc to cancel`;
    updateOrbitReadout();
  }

  function updateOrbitPlacement(screenX, screenY) {
    const target = state.bodies.find((body) => body.id === state.launchTargetId);
    if (!target) return;
    const point = screenToWorld(screenX, screenY);
    const eccentricity = Number(ui.eccentricity.value) / 100;
    const { spec } = currentSpawnSpec();
    const limits = orbitLimits(target, spec, eccentricity);
    if (!limits.viable) return;
    state.orbitAngle = Math.atan2(point.y - target.y, point.x - target.x);
    state.orbitDistance = clamp(Math.hypot(point.x - target.x, point.y - target.y), limits.minimum, limits.maximum);
    updateOrbitReadout();
  }

  function updateOrbitReadout() {
    const eccentricity = Number(ui.eccentricity.value) / 100;
    const semiMajor = state.orbitDistance / Math.max(.05, 1 - eccentricity);
    const apoapsis = semiMajor * (1 + eccentricity);
    ui.orbitDistanceValue.textContent = `${formatDistance(state.orbitDistance)} periapsis`;
    ui.orbitRangeValue.textContent = `${formatDistance(state.orbitDistance)} near · ${formatDistance(apoapsis)} far`;
  }

  function createOrbitalBody() {
    const target = state.bodies.find((body) => body.id === state.launchTargetId);
    if (!target || state.bodies.length >= MAX_BODIES) { cancelOrbitPlacement(); return; }
    const { spec } = currentSpawnSpec();
    const eccentricity = Number(ui.eccentricity.value) / 100;
    const semiMajor = state.orbitDistance / Math.max(.05, 1 - eccentricity);
    const direction = ui.orbitDirection.value === "retrograde" ? -1 : 1;
    const bodyMass = spec.mass / EARTHS_PER_SUN;
    const speed = Math.sqrt(G * (gravitationalMass(target) + bodyMass) * (2 / state.orbitDistance - 1 / semiMajor));
    const cos = Math.cos(state.orbitAngle);
    const sin = Math.sin(state.orbitAngle);
    const body = makeBody({
      ...spec,
      name: `${spec.label} ${state.idCounter}`,
      x: target.x + cos * state.orbitDistance,
      y: target.y + sin * state.orbitDistance,
      vx: target.vx - sin * speed * direction,
      vy: target.vy + cos * speed * direction,
      parentId: target.id,
      orbit: { parentId: target.id, a: semiMajor, e: eccentricity, angle: state.orbitAngle, direction },
    });
    state.bodies.push(body);
    state.orbitPlacement = false;
    state.running = state.resumeAfterOrbit;
    ui.modeHint.hidden = true;
    selectBody(body);
    renderSystemRoster();
    toast(`${body.name} placed in orbit around ${target.name}`);
  }

  function cancelOrbitPlacement() {
    state.orbitPlacement = false;
    state.running = state.resumeAfterOrbit;
    ui.modeHint.hidden = true;
  }

  function openLauncher() {
    if (state.orbitPlacement) cancelOrbitPlacement();
    ui.controlPanel.classList.remove("open");
    ui.mobilePanelButton.setAttribute("aria-label", "Open settings");
    state.launchTargetId = selectedBody()?.id || null;
    renderSystemRoster();
    ui.launchPanel.classList.add("open");
    ui.launchPanel.setAttribute("aria-hidden", "false");
    ui.launchPanel.inert = false;
  }

  function closeLauncher() {
    ui.launchPanel.classList.remove("open");
    ui.launchPanel.setAttribute("aria-hidden", "true");
    ui.launchPanel.inert = true;
  }

  function renderSystemRoster() {
    if (!ui.systemRoster) return;
    if (!state.bodies.some((body) => body.id === state.launchTargetId)) state.launchTargetId = null;
    ui.systemRoster.replaceChildren();
    ui.rosterCount.textContent = `${state.bodies.length} ${state.bodies.length === 1 ? "body" : "bodies"}`;
    for (const body of [...state.bodies].sort((a, b) => b.mass - a.mass)) {
      const science = scienceByName[body.name] || body.science || scienceByType[body.scienceType] || scienceByType.rock;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `roster-body${body.id === state.launchTargetId ? " selected" : ""}`;
      button.dataset.bodyId = body.id;
      button.setAttribute("aria-pressed", body.id === state.launchTargetId ? "true" : "false");
      button.setAttribute("aria-label", `Target ${body.name}`);
      button.style.setProperty("--body-color", body.color);
      const orb = document.createElement("i");
      const copy = document.createElement("div");
      const name = document.createElement("strong");
      const type = document.createElement("small");
      const mass = document.createElement("span");
      name.textContent = body.name;
      type.textContent = science.className;
      mass.textContent = `${formatNumber(body.mass * EARTHS_PER_SUN, 2)} M⊕`;
      copy.append(name, type);
      button.append(orb, copy, mass);
      ui.systemRoster.append(button);
    }
    ui.launchAtTarget.disabled = !state.launchTargetId || !state.bodies.length;
  }

  function launchAtSelectedTarget() {
    const target = state.bodies.find((body) => body.id === state.launchTargetId);
    if (!target || state.bodies.length >= MAX_BODIES) {
      toast(target ? `Maximum of ${MAX_BODIES} bodies reached` : "Select a target first");
      return;
    }
    if (state.launchMode === "orbit") { beginOrbitPlacement(); return; }
    const { spec } = currentSpawnSpec();
    const angle = (state.idCounter * 2.399963) % (Math.PI * 2);
    const minimumDistance = (target.collisionRadius + spec.collisionRadius) * 8;
    const targetHillRadius = hillRadius(target);
    const distance = target.parentId
      ? clamp(targetHillRadius * .18, minimumDistance, Math.max(minimumDistance, targetHillRadius * .35))
      : clamp(targetHillRadius * .01, minimumDistance, 1);
    const x = target.x + Math.cos(angle) * distance;
    const y = target.y + Math.sin(angle) * distance;
    const escapeSpeed = Math.sqrt(2 * G * (gravitationalMass(target) + spec.mass / EARTHS_PER_SUN) / distance);
    const speed = escapeSpeed * [.55, .9, 1.4][Number(ui.impactSpeed.value) - 1];
    const body = makeBody({
      ...spec,
      name: `${spec.label} ${state.idCounter}`,
      x, y,
      vx: target.vx - Math.cos(angle) * speed,
      vy: target.vy - Math.sin(angle) * speed,
    });
    state.bodies.push(body);
    selectBody(body);
    renderSystemRoster();
    closeLauncher();
    toast(`${body.name} launched toward ${target.name}`);
  }

  function toggleAddMode(force) {
    state.addMode = force ?? !state.addMode;
    state.launchStart = null;
    canvas.classList.toggle("adding", state.addMode);
    ui.addBody.classList.toggle("active", state.addMode);
    ui.modeHint.hidden = !state.addMode;
  }

  function createLaunchedBody(start, end) {
    if (state.bodies.length >= MAX_BODIES) { toast(`Maximum of ${MAX_BODIES} bodies reached`); return; }
    const velocityScale = .8;
    const body = makeBody({
      name: `New world ${state.idCounter}`,
      mass: .25,
      radius: .045,
      color: randomColor(),
      texture: "rock",
      x: start.x,
      y: start.y,
      vx: (end.x - start.x) * velocityScale,
      vy: (end.y - start.y) * velocityScale,
    });
    state.bodies.push(body);
    selectBody(body);
    toggleAddMode(false);
    toast(`${body.name} launched`);
  }

  function bindEvents() {
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", (event) => {
      canvas.setPointerCapture(event.pointerId);
      if (state.orbitPlacement) {
        state.pointer.x = event.offsetX;
        state.pointer.y = event.offsetY;
        return;
      }
      state.pointer.downX = state.pointer.x = event.offsetX;
      state.pointer.downY = state.pointer.y = event.offsetY;
      state.pointer.dragging = true;
      state.pointer.moved = false;
      const world = screenToWorld(event.offsetX, event.offsetY);
      state.pointer.worldX = world.x;
      state.pointer.worldY = world.y;
      if (state.addMode) state.launchStart = world;
      else canvas.classList.add("dragging");
    });
    canvas.addEventListener("pointermove", (event) => {
      if (state.orbitPlacement) {
        state.pointer.x = event.offsetX;
        state.pointer.y = event.offsetY;
        updateOrbitPlacement(event.offsetX, event.offsetY);
        return;
      }
      const dx = event.offsetX - state.pointer.x;
      const dy = event.offsetY - state.pointer.y;
      state.pointer.x = event.offsetX;
      state.pointer.y = event.offsetY;
      if (!state.pointer.dragging) return;
      if (Math.hypot(event.offsetX - state.pointer.downX, event.offsetY - state.pointer.downY) > 3) state.pointer.moved = true;
      if (!state.addMode) {
        state.camera.x -= dx / state.camera.zoom;
        state.camera.y -= dy / state.camera.zoom;
      }
    });
    canvas.addEventListener("pointerup", (event) => {
      if (state.orbitPlacement) {
        updateOrbitPlacement(event.offsetX, event.offsetY);
        createOrbitalBody();
        return;
      }
      if (state.addMode && state.launchStart) {
        createLaunchedBody(state.launchStart, screenToWorld(event.offsetX, event.offsetY));
      } else if (!state.pointer.moved) {
        selectBody(bodyAt(event.offsetX, event.offsetY));
      }
      state.pointer.dragging = false;
      state.launchStart = null;
      canvas.classList.remove("dragging");
    });
    canvas.addEventListener("pointercancel", () => {
      state.pointer.dragging = false;
      state.launchStart = null;
      canvas.classList.remove("dragging");
    });
    canvas.addEventListener("dblclick", (event) => focusBody(bodyAt(event.offsetX, event.offsetY)));
    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      const before = screenToWorld(event.offsetX, event.offsetY);
      const wheelDelta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * state.viewport.height : event.deltaY;
      state.camera.zoom = clamp(state.camera.zoom * Math.exp(-wheelDelta * .0042), 1.5, 250000);
      const after = screenToWorld(event.offsetX, event.offsetY);
      state.camera.x += before.x - after.x;
      state.camera.y += before.y - after.y;
    }, { passive: false });

    ui.playPause.addEventListener("click", () => { state.running = !state.running; });
    ui.loadPreset.addEventListener("click", () => loadPreset(ui.presetSelect.value));
    ui.resetSimulation.addEventListener("click", restoreSnapshot);
    ui.clearSimulation.addEventListener("click", () => {
      cancelOrbitPlacement(); state.bodies = []; state.effects = []; state.selectedId = null; state.simYears = 0; updateSelectionUI(); renderSystemRoster(); toast("Universe cleared");
    });
    ui.fitView.addEventListener("click", () => fitView());
    ui.addBody.addEventListener("click", openLauncher);
    ui.newPlanetTop.addEventListener("click", openLauncher);
    ui.closeLauncher.addEventListener("click", closeLauncher);
    ui.launchAtTarget.addEventListener("click", launchAtSelectedTarget);
    ui.impactMode.addEventListener("click", () => setLaunchMode("impact"));
    ui.orbitMode.addEventListener("click", () => setLaunchMode("orbit"));
    ui.eccentricity.addEventListener("input", () => {
      const value = Number(ui.eccentricity.value) / 100;
      ui.eccentricityValue.value = value.toFixed(2);
      updateOrbitReadout();
    });
    ui.systemRoster.addEventListener("click", (event) => {
      const item = event.target.closest(".roster-body");
      if (!item) return;
      state.launchTargetId = Number(item.dataset.bodyId);
      renderSystemRoster();
    });
    ui.impactSpeed.addEventListener("input", () => {
      ui.impactSpeedValue.value = ["Low", "Medium", "High"][Number(ui.impactSpeed.value) - 1];
    });
    ui.timeScale.addEventListener("input", () => {
      const normalized = Number(ui.timeScale.value) / 100;
      state.speedDays = normalized === 0 ? 0 : Math.round(10 ** (normalized * 3) / 3);
      ui.timeScaleValue.value = `${state.speedDays} days/s`;
    });
    ui.gravityScale.addEventListener("input", () => {
      const body = selectedBody();
      if (!body) return;
      body.gravityScale = Number(ui.gravityScale.value) / 100;
      updateSelectionUI();
    });
    ui.trailLength.addEventListener("input", () => {
      state.trailLength = Number(ui.trailLength.value);
      ui.trailLengthValue.value = state.trailLength;
      for (const body of state.bodies) if (body.trail.length > state.trailLength) body.trail.splice(0, body.trail.length - state.trailLength);
    });
    ui.collisionMode.addEventListener("change", () => { state.collisionMode = ui.collisionMode.value; });
    [["showTrails", "showTrails"], ["showLabels", "showLabels"], ["showGrid", "showGrid"], ["showVelocity", "showVelocity"], ["showOrbits", "showOrbits"]].forEach(([id, property]) => {
      ui[id].addEventListener("change", () => { state[property] = ui[id].checked; });
    });

    ui.bodyName.addEventListener("change", () => { const body = selectedBody(); if (body) { body.name = ui.bodyName.value.trim() || "Unnamed body"; updateSelectionUI(); renderSystemRoster(); } });
    ui.bodyMass.addEventListener("change", () => { const body = selectedBody(); if (body) { body.mass = Math.max(1e-12, Number(ui.bodyMass.value)) / EARTHS_PER_SUN; renderSystemRoster(); } });
    ui.bodyColor.addEventListener("input", () => { const body = selectedBody(); if (body) { body.color = ui.bodyColor.value; ui.selectionDot.style.background = body.color; ui.planetPreview.style.setProperty("--planet-color", body.color); } });
    ui.bodyVelocityX.addEventListener("input", () => {
      const body = selectedBody();
      const velocity = Number(ui.bodyVelocityX.value);
      if (body && Number.isFinite(velocity)) body.vx = velocity;
    });
    ui.bodyVelocityY.addEventListener("input", () => {
      const body = selectedBody();
      const velocity = Number(ui.bodyVelocityY.value);
      if (body && Number.isFinite(velocity)) body.vy = velocity;
    });
    ui.focusBody.addEventListener("click", () => focusBody());
    ui.deleteBody.addEventListener("click", () => {
      const body = selectedBody();
      if (!body) return;
      state.bodies = state.bodies.filter((item) => item.id !== body.id);
      state.selectedId = null;
      updateSelectionUI();
      renderSystemRoster();
      toast(`${body.name} removed`);
    });

    ui.helpButton.addEventListener("click", () => ui.helpDialog.showModal());
    ui.closeHelp.addEventListener("click", () => ui.helpDialog.close());
    ui.mobilePanelButton.addEventListener("click", () => {
      const isOpen = ui.controlPanel.classList.toggle("open");
      ui.mobilePanelButton.setAttribute("aria-label", isOpen ? "Close settings" : "Open settings");
    });
    document.addEventListener("pointerdown", (event) => {
      if (!ui.controlPanel.classList.contains("open")) return;
      if (ui.controlPanel.contains(event.target) || ui.mobilePanelButton.contains(event.target)) return;
      ui.controlPanel.classList.remove("open");
      ui.mobilePanelButton.setAttribute("aria-label", "Open settings");
    });
    window.addEventListener("keydown", (event) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (event.code === "Space") { event.preventDefault(); state.running = !state.running; }
      if (event.key.toLowerCase() === "a") openLauncher();
      if (event.key.toLowerCase() === "f") fitView();
      if (event.key === "Escape") {
        toggleAddMode(false);
        closeLauncher();
        cancelOrbitPlacement();
        ui.controlPanel.classList.remove("open");
        ui.mobilePanelButton.setAttribute("aria-label", "Open settings");
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedBody()) ui.deleteBody.click();
    });
  }

  let toastTimer;
  function toast(message) {
    clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.classList.add("visible");
    toastTimer = setTimeout(() => ui.toast.classList.remove("visible"), 2200);
  }

  function formatNumber(value, precision) {
    if (Math.abs(value) >= 10000) return Math.round(value).toString();
    if (value !== 0 && Math.abs(value) < 10 ** -precision) return value.toExponential(3);
    return Number(value.toFixed(precision)).toString();
  }

  function formatDistance(au) {
    if (au >= .1) return `${au.toFixed(2)} AU`;
    const kilometers = au * KM_PER_AU;
    if (kilometers >= 1000000) return `${(kilometers / 1000000).toFixed(2)}M km`;
    if (kilometers >= 1000) return `${Math.round(kilometers).toLocaleString()} km`;
    return `${Math.round(kilometers)} km`;
  }

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function randomColor() { return ["#7eb7ff", "#e68d60", "#9b83e8", "#72d6c5", "#d8b76f"][Math.floor(Math.random() * 5)]; }
  function normalizeHex(color) { return /^#[0-9a-f]{6}$/i.test(color) ? color : "#9cb8d8"; }
  function lighten(hex, amount) { return mixColor(hex, "#ffffff", amount); }
  function darken(hex, amount) { return mixColor(hex, "#000000", amount); }
  function mixColor(a, b, amount) {
    const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const [ar, ag, ab] = parse(normalizeHex(a));
    const [br, bg, bb] = parse(b);
    return `rgb(${Math.round(ar + (br - ar) * amount)},${Math.round(ag + (bg - ag) * amount)},${Math.round(ab + (bb - ab) * amount)})`;
  }

  resizeCanvas();
  bindEvents();
  loadPreset("solar");
  setLaunchMode("impact");
  ui.timeScale.dispatchEvent(new Event("input"));
  requestAnimationFrame(frame);
})();
