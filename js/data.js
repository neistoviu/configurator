// ─────────────────────────────────────────────────────────────────────────────
//  Static data for the configurator: models, specs, hotspots, scenes, palette.
//  Editing copy or numbers? Everything user-visible lives in this file.
// ─────────────────────────────────────────────────────────────────────────────

// ── Roaster models ───────────────────────────────────────────────────────────
//
//  file        optimized GLB built by scripts/build-models.sh
//  frontFace   which local axis the machine's operator side points down.
//              Everything downstream — the opening camera angle and every
//              hotspot anchor — is expressed relative to this, so a model that
//              gets re-exported at a different orientation only needs this one
//              value corrected.
//  faceYaw     degrees to spin the model so its front meets the camera
//  defaultBody / defaultAccent  the paint the configurator opens on. These win
//              over defaultBodyHex/defaultAccentHex in config-*.json, so every
//              model greets a visitor in the signature ivory + vermilion rather
//              than whichever colour was last saved from the admin tool. Delete
//              a line here to hand that model back to its config.
export const MODELS = {
  '10pro': {
    file: '10pro.opt.glb',
    config: 'config-10pro.json',
    label: 'Typhoon 10 PRO',
    short: '10 PRO',
    frontFace: '+x',
    faceYaw: 270,
    defaultBody: 'RAL 1015',
    defaultAccent: 'RAL 2002',
    mobileDisplayScale: 0.95,
  },
  '5pro': {
    file: '5pro.opt.glb',
    config: 'config-5pro.json',
    label: 'Typhoon 5 PRO',
    short: '5 PRO',
    frontFace: '+z',
    faceYaw: 0,
    defaultBody: 'RAL 1015',
    defaultAccent: 'RAL 2002',
    mobileDisplayScale: 0.95,
  },
  '2pro': {
    file: '2pro.opt.glb',
    config: 'config-2pro.json',
    label: 'Typhoon 2.5 PRO',
    short: '2.5 PRO',
    frontFace: '+z',
    faceYaw: 0,
    defaultBody: 'RAL 1015',
    defaultAccent: 'RAL 2002',
  },
};

/** Local axes in clockwise order, used to rotate anchors onto a model's front. */
export const FACE_RING = ['+z', '+x', '-z', '-x'];
export const FACE_NAMES = ['front', 'right', 'back', 'left'];

// Legacy alias kept so old links keep resolving.
MODELS.newroaster = MODELS['10pro'];

export const DEFAULT_MODEL = '10pro';

// ── Headline specs (company-knowledge/product/specs.md) ──────────────────────
export const SPECS = {
  '10pro': [
    { label: 'Batch size',       value: '5–10 kg' },
    { label: 'Capacity',         value: '60 kg/hr' },
    { label: 'Connection power', value: '46 kW' },
    { label: 'Energy per kg',    value: '0.3 kWh' },
    { label: 'Machine weight',   value: '920 kg' },
    { label: 'Min. room area',   value: '40 m²' },
  ],
  '5pro': [
    { label: 'Batch size',       value: '0.6–5 kg' },
    { label: 'Capacity',         value: '30 kg/hr' },
    { label: 'Connection power', value: '23 kW' },
    { label: 'Energy per kg',    value: '0.3 kWh' },
    { label: 'Machine weight',   value: '480 kg' },
    { label: 'Min. room area',   value: '25 m²' },
  ],
  '2pro': [
    { label: 'Batch size',       value: '0.3–2.5 kg' },
    { label: 'Capacity',         value: '15 kg/hr' },
    { label: 'Connection power', value: '16 kW' },
    { label: 'Energy per kg',    value: '0.3 kWh' },
    { label: 'Machine weight',   value: '310 kg' },
    { label: 'Min. room area',   value: '15 m²' },
  ],
};

// Savings line under the viewport, per model.
export const SAVINGS = {
  '10pro': { total: '€5,572', labour: '€1,594', electricity: '€731', defects: '€3,247', payback: '2 months' },
  '5pro':  { total: '€3,583', labour: '€1,594', electricity: '€365', defects: '€1,624', payback: '2.5 months' },
  '2pro':  { total: '€2,590', labour: '€1,594', electricity: '€183', defects: '€812',   payback: '3 months' },
};

// ── Hotspots ─────────────────────────────────────────────────────────────────
// Shared feature copy. Per-model positions live in HOTSPOT_POSITIONS below so
// the same story can be told on every machine without duplicating text.
export const FEATURES = {
  chamber: {
    icon: '◎',
    title: 'Transparent roasting chamber',
    metric: '1 second to open',
    text: 'Watch the bean through every stage instead of guessing from a trier. '
        + 'The chamber opens in one second without tools, and the food-grade '
        + 'stainless interior is chemically washable.',
  },
  convection: {
    icon: '≋',
    title: '100% convection, fully electric',
    metric: 'No gas · no open flame',
    text: 'Heat is carried entirely by air, so there is no drum wall to scorch '
        + 'the bean and no burner to calibrate. No gas line, no flame, no leak '
        + 'risk — and permits get dramatically simpler.',
  },
  throughput: {
    icon: '↻',
    title: 'No cooldown between batches',
    metric: 'Up to 6–7 batches/hour',
    text: 'Thermal conditions reset instantly after each drop, so batch 1 and '
        + 'batch 20 roast identically. No warm-up protocol, no waiting — which '
        + 'is where the labour saving actually comes from.',
  },
  control: {
    icon: '⌁',
    title: 'Typhoon PRO control',
    metric: 'Cropster & Artisan',
    text: 'Three auto-repeat modes lock a profile in place across operators. '
        + 'Airflow, heat and recirculation run on guardrails with manual '
        + 'override, and the huge heater reserve beats any gas burner on RoR.',
  },
  efficiency: {
    icon: '⌾',
    title: 'Hot-air recirculation',
    metric: '≈0.3 kWh per kg',
    text: 'Air is recirculated rather than dumped, and 50+ mm of insulation '
        + 'keeps the heat inside. The outer surface stays cool during '
        + 'operation — safe to stand next to all shift.',
  },
  safety: {
    icon: '⛨',
    title: 'Fire safety in the cyclone',
    metric: 'Integrated system',
    text: 'Chaff is the usual fire source in a roastery. The suppression system '
        + 'sits inside the cyclone where it belongs, with no open flame '
        + 'anywhere in the machine to start with.',
  },
  service: {
    icon: '⚙',
    title: 'Service in minutes',
    metric: '24-month warranty',
    text: 'Few moving parts, no burner and no gas valves. Remote diagnostics, '
        + 'software updates and a spare-parts kit ship with the machine — '
        + 'heaters, sensors, glasses, gaskets and actuators.',
  },
};

// Where each hotspot sits on the machine.
//
// Rather than hard-coding metre coordinates that break the moment a model is
// re-exported, an anchor names a face and a position across it (u, v from 0 to
// 1). At load time the viewer fires a ray at that spot and pins the marker to
// whatever hardware it hits — so the markers follow the geometry.
//
//   face: front · back · left · right (all relative to MODELS[].frontFace)
//         plus top
//   front/back/left/right → u runs across the face, v runs bottom-to-top
//   top                   → u runs across, v runs front-to-back
//
// Override any of these with an explicit [x, y, z] via HOTSPOT_POSITIONS below
// (use ?edit=hotspots to capture the numbers by clicking).
export const HOTSPOT_ANCHORS = {
  '10pro': {
    chamber:    { face: 'front', u: 0.46, v: 0.62 },
    control:    { face: 'front', u: 0.76, v: 0.44 },
    throughput: { face: 'top',   u: 0.62, v: 0.42 },
    convection: { face: 'back',  u: 0.46, v: 0.58 },
    efficiency: { face: 'front', u: 0.22, v: 0.20 },
    safety:     { face: 'left',  u: 0.50, v: 0.86 },
  },
  '5pro': {
    chamber:    { face: 'front', u: 0.50, v: 0.62 },
    control:    { face: 'right', u: 0.45, v: 0.50 },
    throughput: { face: 'top',   u: 0.62, v: 0.50 },
    convection: { face: 'back',  u: 0.46, v: 0.58 },
    efficiency: { face: 'front', u: 0.30, v: 0.20 },
    safety:     { face: 'left',  u: 0.48, v: 0.84 },
  },
  '2pro': {
    chamber:    { face: 'front', u: 0.50, v: 0.60 },
    control:    { face: 'right', u: 0.45, v: 0.50 },
    throughput: { face: 'top',   u: 0.60, v: 0.50 },
    convection: { face: 'back',  u: 0.46, v: 0.56 },
    efficiency: { face: 'front', u: 0.30, v: 0.20 },
    safety:     { face: 'left',  u: 0.48, v: 0.84 },
  },
};

// Explicit overrides win over the anchors above. Empty by default.
export const HOTSPOT_POSITIONS = {
  '10pro': {},
  '5pro': {},
  '2pro': {},
};

// ── Scene presets ────────────────────────────────────────────────────────────
// Every preset is generated procedurally at runtime — no image downloads.
// Drop a real photo in later by adding `envUrl: 'scenes/whatever.jpg'`
// (equirectangular 2:1); the viewer will use it instead of the procedural one.
// Room shell is 22 m wide × 24 m deep × 6.4 m high (see scene-presets.js ROOM),
// so walls sit at x = ±11 and z = ±12. Fixtures are placed just inside those.
export const SCENES = {
  studio: {
    label: 'Studio',
    hint: 'Neutral light — truest colour match',
    // Wall gradient, top → bottom.
    backdrop: ['#1b1e24', '#111318', '#08090b'],
    ceiling: '#0a0b0e',
    floor: { color: '#0f1013', roughness: 0.30, metalness: 0.20 },
    exposure: 1.20,
    envIntensity: 1.15,
    fog: { color: '#0b0c0f', near: 6, far: 20 },
    hideLights: true,
    // Big softboxes — this is what you see mirrored in the steel.
    lights: [
      { type: 'panel', pos: [ 5.0, 3.4,  4.0], size: [5.0, 3.6], color: '#ffffff', power: 6.5 },
      { type: 'panel', pos: [-5.6, 3.0, -2.0], size: [4.4, 3.4], color: '#dce8ff', power: 3.0 },
      { type: 'panel', pos: [ 0.0, 6.2,  0.5], size: [8.0, 6.0], color: '#ffffff', power: 1.8, faceDown: true },
    ],
    key:  { color: '#fff7ee', intensity: 2.6, pos: [ 5, 8,  6] },
    fill: { color: '#dbe8ff', intensity: 1.1, pos: [-6, 4, -4] },
    rim:  { color: '#ffffff', intensity: 1.4, pos: [ 0, 3, -8] },
  },

  roastery: {
    label: 'Roastery',
    hint: 'Industrial hall — daylight from tall windows',
    backdrop: ['#3a3f47', '#252930', '#171a1e'],
    ceiling: '#15171b',
    floor: { color: '#3c3c3f', roughness: 0.66, metalness: 0.05 },
    exposure: 1.05,
    envIntensity: 1.25,
    fog: { color: '#262a31', near: 8, far: 27 },
    lights: [
      // Tall daylight windows down the left wall.
      { type: 'panel', pos: [-10.7, 3.3,  4.5], size: [2.4, 4.2], color: '#d5e7ff', power: 9.0 },
      { type: 'panel', pos: [-10.7, 3.3,  0.0], size: [2.4, 4.2], color: '#d5e7ff', power: 9.0 },
      { type: 'panel', pos: [-10.7, 3.3, -4.5], size: [2.4, 4.2], color: '#d5e7ff', power: 9.0 },
      // Industrial ceiling strips.
      { type: 'panel', pos: [ 0.0, 6.15,  2.5], size: [11.0, 0.55], color: '#fff3df', power: 4.0, faceDown: true },
      { type: 'panel', pos: [ 0.0, 6.15, -3.5], size: [11.0, 0.55], color: '#fff3df', power: 4.0, faceDown: true },
      // Warm wash on the right-hand wall.
      { type: 'panel', pos: [ 10.6, 2.4, -1.0], size: [7.0, 4.0], color: '#7d6047', power: 1.1 },
    ],
    key:  { color: '#e9f2ff', intensity: 3.2, pos: [-7, 8,  4] },
    fill: { color: '#ffd9a8', intensity: 1.0, pos: [ 6, 4, -3] },
    rim:  { color: '#ffffff', intensity: 1.3, pos: [ 0, 3, -8] },
    props: 'warehouse',
  },

  cafe: {
    label: 'Café',
    hint: 'Warm interior — roast-in-shop look',
    backdrop: ['#4b3a2e', '#2c221b', '#181210'],
    ceiling: '#171110',
    floor: { color: '#46341f', roughness: 0.46, metalness: 0.04 },
    exposure: 1.05,
    envIntensity: 1.30,
    fog: { color: '#241b15', near: 7, far: 24 },
    lights: [
      // Warm pendants over the bar.
      { type: 'sphere', pos: [-2.4, 4.7, 1.4], size: [0.32], color: '#ffb35e', power: 26 },
      { type: 'sphere', pos: [ 2.4, 4.7, 1.4], size: [0.32], color: '#ffb35e', power: 26 },
      { type: 'sphere', pos: [ 0.0, 4.9, -2.6], size: [0.28], color: '#ffc98a', power: 18 },
      // Shopfront daylight on the right.
      { type: 'panel', pos: [ 10.6, 2.6, 1.5], size: [8.0, 4.4], color: '#eaf3ff', power: 3.0 },
      // Warm bounce off the left wall.
      { type: 'panel', pos: [-10.6, 2.2, -1.0], size: [6.0, 3.4], color: '#a06a41', power: 1.6 },
    ],
    key:  { color: '#ffe3bd', intensity: 1.9, pos: [ 7, 6,  5] },
    fill: { color: '#ffc99a', intensity: 0.9, pos: [-5, 3, -3] },
    rim:  { color: '#dceaff', intensity: 1.1, pos: [ 0, 3, -8] },
    props: 'cafe',
  },
};

export const DEFAULT_SCENE = 'roastery';

// ── Colour presets ───────────────────────────────────────────────────────────
// One-click combinations so a visitor sees a good-looking machine immediately
// instead of hunting through 180 RAL chips.
export const COLOR_PRESETS = [
  { name: 'Signature',  body: 'RAL 1015', accent: 'RAL 2002' },
  { name: 'Graphite',   body: 'RAL 7016', accent: 'RAL 9005' },
  { name: 'Bone',       body: 'RAL 9001', accent: 'RAL 8017' },
  { name: 'Steel blue', body: 'RAL 7047', accent: 'RAL 5011' },
  { name: 'Forest',     body: 'RAL 9002', accent: 'RAL 6005' },
  { name: 'Monochrome', body: 'RAL 9005', accent: 'RAL 9006' },
];

// ── RAL palette ──────────────────────────────────────────────────────────────
// `f` groups chips into the filter row: yellow, red, violet, blue, green,
// grey, brown, white.
export const RAL = [
  { n:'RAL 1000', name:'Green beige',        hex:'#CDBA88', f:'yellow' },
  { n:'RAL 1001', name:'Beige',              hex:'#D0B084', f:'yellow' },
  { n:'RAL 1002', name:'Sand yellow',        hex:'#D2AA6D', f:'yellow' },
  { n:'RAL 1003', name:'Signal yellow',      hex:'#F9A12E', f:'yellow' },
  { n:'RAL 1004', name:'Golden yellow',      hex:'#E49E00', f:'yellow' },
  { n:'RAL 1005', name:'Honey yellow',       hex:'#CB8F00', f:'yellow' },
  { n:'RAL 1011', name:'Brown beige',        hex:'#AF804F', f:'yellow' },
  { n:'RAL 1012', name:'Lemon yellow',       hex:'#DFCA00', f:'yellow' },
  { n:'RAL 1013', name:'Oyster white',       hex:'#E9E0D2', f:'yellow' },
  { n:'RAL 1014', name:'Ivory',              hex:'#E4D098', f:'yellow' },
  { n:'RAL 1015', name:'Light ivory',        hex:'#EAE0C8', f:'yellow' },
  { n:'RAL 1016', name:'Sulphur yellow',     hex:'#F0E000', f:'yellow' },
  { n:'RAL 1017', name:'Saffron yellow',     hex:'#F5A100', f:'yellow' },
  { n:'RAL 1018', name:'Zinc yellow',        hex:'#F5E000', f:'yellow' },
  { n:'RAL 1019', name:'Grey beige',         hex:'#A48060', f:'yellow' },
  { n:'RAL 1020', name:'Olive yellow',       hex:'#A0822D', f:'yellow' },
  { n:'RAL 1021', name:'Rape yellow',        hex:'#F4B800', f:'yellow' },
  { n:'RAL 1023', name:'Traffic yellow',     hex:'#F7B500', f:'yellow' },
  { n:'RAL 1024', name:'Ochre yellow',       hex:'#BA8F4C', f:'yellow' },
  { n:'RAL 1027', name:'Curry',              hex:'#A87C00', f:'yellow' },
  { n:'RAL 1028', name:'Melon yellow',       hex:'#FF9B00', f:'yellow' },
  { n:'RAL 1032', name:'Broom yellow',       hex:'#E2A400', f:'yellow' },
  { n:'RAL 1033', name:'Dahlia yellow',      hex:'#F79B00', f:'yellow' },
  { n:'RAL 1034', name:'Pastel yellow',      hex:'#EB9C52', f:'yellow' },
  { n:'RAL 2000', name:'Yellow orange',      hex:'#DA6600', f:'red' },
  { n:'RAL 2001', name:'Red orange',         hex:'#BA481B', f:'red' },
  { n:'RAL 2002', name:'Vermilion',          hex:'#BE3A34', f:'red' },
  { n:'RAL 2003', name:'Pastel orange',      hex:'#F47036', f:'red' },
  { n:'RAL 2004', name:'Pure orange',        hex:'#E05B00', f:'red' },
  { n:'RAL 2008', name:'Bright red orange',  hex:'#F16D31', f:'red' },
  { n:'RAL 2009', name:'Traffic orange',     hex:'#DE5B12', f:'red' },
  { n:'RAL 2010', name:'Signal orange',      hex:'#D4652F', f:'red' },
  { n:'RAL 2011', name:'Deep orange',        hex:'#EC7C25', f:'red' },
  { n:'RAL 2012', name:'Salmon orange',      hex:'#DC6444', f:'red' },
  { n:'RAL 3000', name:'Flame red',          hex:'#AB2524', f:'red' },
  { n:'RAL 3001', name:'Signal red',         hex:'#A02128', f:'red' },
  { n:'RAL 3002', name:'Carmine red',        hex:'#A1232B', f:'red' },
  { n:'RAL 3003', name:'Ruby red',           hex:'#8D1D2C', f:'red' },
  { n:'RAL 3004', name:'Purple red',         hex:'#701F29', f:'red' },
  { n:'RAL 3005', name:'Wine red',           hex:'#5E2028', f:'red' },
  { n:'RAL 3007', name:'Black red',          hex:'#3F1E24', f:'red' },
  { n:'RAL 3009', name:'Oxide red',          hex:'#712122', f:'red' },
  { n:'RAL 3011', name:'Brown red',          hex:'#7E292C', f:'red' },
  { n:'RAL 3012', name:'Beige red',          hex:'#CB8276', f:'red' },
  { n:'RAL 3013', name:'Tomato red',         hex:'#9C322E', f:'red' },
  { n:'RAL 3014', name:'Antique pink',       hex:'#D47479', f:'red' },
  { n:'RAL 3015', name:'Light pink',         hex:'#E1A6AD', f:'red' },
  { n:'RAL 3016', name:'Coral red',          hex:'#AC4034', f:'red' },
  { n:'RAL 3017', name:'Rose',               hex:'#D3545F', f:'red' },
  { n:'RAL 3018', name:'Strawberry red',     hex:'#D14152', f:'red' },
  { n:'RAL 3020', name:'Traffic red',        hex:'#CC0605', f:'red' },
  { n:'RAL 3022', name:'Salmon pink',        hex:'#D56D56', f:'red' },
  { n:'RAL 3027', name:'Raspberry red',      hex:'#B42041', f:'red' },
  { n:'RAL 3031', name:'Orient red',         hex:'#B32428', f:'red' },
  { n:'RAL 4001', name:'Red lilac',          hex:'#8D668A', f:'violet' },
  { n:'RAL 4002', name:'Red violet',         hex:'#922B3E', f:'violet' },
  { n:'RAL 4003', name:'Heather violet',     hex:'#DE4C8A', f:'violet' },
  { n:'RAL 4004', name:'Claret violet',      hex:'#641C34', f:'violet' },
  { n:'RAL 4005', name:'Blue lilac',         hex:'#6C6695', f:'violet' },
  { n:'RAL 4006', name:'Traffic purple',     hex:'#A03472', f:'violet' },
  { n:'RAL 4007', name:'Purple violet',      hex:'#4A192C', f:'violet' },
  { n:'RAL 4008', name:'Signal violet',      hex:'#924E7D', f:'violet' },
  { n:'RAL 4009', name:'Pastel violet',      hex:'#A18594', f:'violet' },
  { n:'RAL 4010', name:'Telemagenta',        hex:'#CF3476', f:'violet' },
  { n:'RAL 5000', name:'Violet blue',        hex:'#384C70', f:'blue' },
  { n:'RAL 5001', name:'Green blue',         hex:'#1F4764', f:'blue' },
  { n:'RAL 5002', name:'Ultramarine blue',   hex:'#20214F', f:'blue' },
  { n:'RAL 5003', name:'Sapphire blue',      hex:'#1D334A', f:'blue' },
  { n:'RAL 5005', name:'Signal blue',        hex:'#1A5784', f:'blue' },
  { n:'RAL 5007', name:'Brilliant blue',     hex:'#3E5F8A', f:'blue' },
  { n:'RAL 5009', name:'Azure blue',         hex:'#025669', f:'blue' },
  { n:'RAL 5010', name:'Gentian blue',       hex:'#0E4C8A', f:'blue' },
  { n:'RAL 5011', name:'Steel blue',         hex:'#1B2A4A', f:'blue' },
  { n:'RAL 5012', name:'Light blue',         hex:'#3B83BD', f:'blue' },
  { n:'RAL 5013', name:'Cobalt blue',        hex:'#1E213D', f:'blue' },
  { n:'RAL 5014', name:'Pigeon blue',        hex:'#6C8198', f:'blue' },
  { n:'RAL 5015', name:'Sky blue',           hex:'#2071B5', f:'blue' },
  { n:'RAL 5017', name:'Traffic blue',       hex:'#0E518D', f:'blue' },
  { n:'RAL 5018', name:'Turquoise blue',     hex:'#2A6478', f:'blue' },
  { n:'RAL 5019', name:'Capri blue',         hex:'#1B5583', f:'blue' },
  { n:'RAL 5021', name:'Water blue',         hex:'#07737A', f:'blue' },
  { n:'RAL 5022', name:'Night blue',         hex:'#2A2168', f:'blue' },
  { n:'RAL 5023', name:'Distant blue',       hex:'#4D668E', f:'blue' },
  { n:'RAL 5024', name:'Pastel blue',        hex:'#6A93B0', f:'blue' },
  { n:'RAL 6000', name:'Patina green',       hex:'#3E7460', f:'green' },
  { n:'RAL 6001', name:'Emerald green',      hex:'#2D6E4E', f:'green' },
  { n:'RAL 6003', name:'Olive green',        hex:'#4B5928', f:'green' },
  { n:'RAL 6005', name:'Moss green',         hex:'#0F4336', f:'green' },
  { n:'RAL 6007', name:'Bottle green',       hex:'#2B3A2C', f:'green' },
  { n:'RAL 6009', name:'Fir green',          hex:'#27352A', f:'green' },
  { n:'RAL 6010', name:'Grass green',        hex:'#4D6F39', f:'green' },
  { n:'RAL 6011', name:'Reseda green',       hex:'#70785E', f:'green' },
  { n:'RAL 6013', name:'Reed green',         hex:'#7C7B4D', f:'green' },
  { n:'RAL 6016', name:'Turquoise green',    hex:'#1F784C', f:'green' },
  { n:'RAL 6017', name:'May green',          hex:'#4B8B4A', f:'green' },
  { n:'RAL 6018', name:'Yellow green',       hex:'#5B8930', f:'green' },
  { n:'RAL 6019', name:'Pastel green',       hex:'#C7D9B4', f:'green' },
  { n:'RAL 6024', name:'Traffic green',      hex:'#308B6C', f:'green' },
  { n:'RAL 6025', name:'Fern green',         hex:'#5C7A4B', f:'green' },
  { n:'RAL 6029', name:'Mint green',         hex:'#2D8B57', f:'green' },
  { n:'RAL 6032', name:'Signal green',       hex:'#28895C', f:'green' },
  { n:'RAL 6034', name:'Pastel turquoise',   hex:'#88C4C0', f:'green' },
  { n:'RAL 7000', name:'Squirrel grey',      hex:'#7B8C96', f:'grey' },
  { n:'RAL 7001', name:'Silver grey',        hex:'#8D9BA8', f:'grey' },
  { n:'RAL 7002', name:'Olive grey',         hex:'#8B8775', f:'grey' },
  { n:'RAL 7003', name:'Moss grey',          hex:'#808070', f:'grey' },
  { n:'RAL 7004', name:'Signal grey',        hex:'#969EA0', f:'grey' },
  { n:'RAL 7005', name:'Mouse grey',         hex:'#6C7477', f:'grey' },
  { n:'RAL 7006', name:'Beige grey',         hex:'#756E60', f:'grey' },
  { n:'RAL 7008', name:'Khaki grey',         hex:'#6B6245', f:'grey' },
  { n:'RAL 7011', name:'Iron grey',          hex:'#52616A', f:'grey' },
  { n:'RAL 7012', name:'Basalt grey',        hex:'#596165', f:'grey' },
  { n:'RAL 7015', name:'Slate grey',         hex:'#5B6166', f:'grey' },
  { n:'RAL 7016', name:'Anthracite grey',    hex:'#383E42', f:'grey' },
  { n:'RAL 7021', name:'Black grey',         hex:'#303638', f:'grey' },
  { n:'RAL 7022', name:'Umbra grey',         hex:'#3E3C3C', f:'grey' },
  { n:'RAL 7023', name:'Concrete grey',      hex:'#7B7C7C', f:'grey' },
  { n:'RAL 7024', name:'Graphite grey',      hex:'#474A50', f:'grey' },
  { n:'RAL 7026', name:'Granite grey',       hex:'#3A4045', f:'grey' },
  { n:'RAL 7030', name:'Stone grey',         hex:'#938E85', f:'grey' },
  { n:'RAL 7031', name:'Blue grey',          hex:'#5B6E7C', f:'grey' },
  { n:'RAL 7032', name:'Pebble grey',        hex:'#B5B0A0', f:'grey' },
  { n:'RAL 7033', name:'Cement grey',        hex:'#818A79', f:'grey' },
  { n:'RAL 7035', name:'Light grey',         hex:'#CBD0CC', f:'grey' },
  { n:'RAL 7036', name:'Platinum grey',      hex:'#9A9697', f:'grey' },
  { n:'RAL 7037', name:'Dusty grey',         hex:'#7C7F7E', f:'grey' },
  { n:'RAL 7038', name:'Agate grey',         hex:'#B4B8B0', f:'grey' },
  { n:'RAL 7039', name:'Quartz grey',        hex:'#6A6A68', f:'grey' },
  { n:'RAL 7040', name:'Window grey',        hex:'#9BA0A6', f:'grey' },
  { n:'RAL 7042', name:'Traffic grey A',     hex:'#8F9695', f:'grey' },
  { n:'RAL 7043', name:'Traffic grey B',     hex:'#4E5451', f:'grey' },
  { n:'RAL 7044', name:'Silk grey',          hex:'#BEC1B3', f:'grey' },
  { n:'RAL 7045', name:'Telegrey 1',         hex:'#8C9295', f:'grey' },
  { n:'RAL 7046', name:'Telegrey 2',         hex:'#7D848C', f:'grey' },
  { n:'RAL 7047', name:'Telegrey 4',         hex:'#C5C7C4', f:'grey' },
  { n:'RAL 8000', name:'Green brown',        hex:'#826C34', f:'brown' },
  { n:'RAL 8001', name:'Ochre brown',        hex:'#955F20', f:'brown' },
  { n:'RAL 8002', name:'Signal brown',       hex:'#6C3B2A', f:'brown' },
  { n:'RAL 8003', name:'Clay brown',         hex:'#734222', f:'brown' },
  { n:'RAL 8004', name:'Copper brown',       hex:'#8E402A', f:'brown' },
  { n:'RAL 8007', name:'Fawn brown',         hex:'#6F4A2F', f:'brown' },
  { n:'RAL 8008', name:'Olive brown',        hex:'#6F4F28', f:'brown' },
  { n:'RAL 8011', name:'Nut brown',          hex:'#4F3024', f:'brown' },
  { n:'RAL 8012', name:'Red brown',          hex:'#4C2F27', f:'brown' },
  { n:'RAL 8014', name:'Sepia brown',        hex:'#382616', f:'brown' },
  { n:'RAL 8015', name:'Chestnut brown',     hex:'#5C2E2C', f:'brown' },
  { n:'RAL 8016', name:'Mahogany brown',     hex:'#4C2224', f:'brown' },
  { n:'RAL 8017', name:'Chocolate brown',    hex:'#44292C', f:'brown' },
  { n:'RAL 8019', name:'Grey brown',         hex:'#3D3632', f:'brown' },
  { n:'RAL 8022', name:'Black brown',        hex:'#211E1D', f:'brown' },
  { n:'RAL 8023', name:'Orange brown',       hex:'#7B4022', f:'brown' },
  { n:'RAL 8024', name:'Beige brown',        hex:'#7B5141', f:'brown' },
  { n:'RAL 8025', name:'Pale brown',         hex:'#7B6045', f:'brown' },
  { n:'RAL 8028', name:'Terra brown',        hex:'#4F3829', f:'brown' },
  { n:'RAL 9001', name:'Cream',              hex:'#FDF4E3', f:'white' },
  { n:'RAL 9002', name:'Grey white',         hex:'#E7EBDA', f:'white' },
  { n:'RAL 9003', name:'Signal white',       hex:'#F4F4F4', f:'white' },
  { n:'RAL 9004', name:'Signal black',       hex:'#2B2B2C', f:'white' },
  { n:'RAL 9005', name:'Jet black',          hex:'#0A0A0A', f:'white' },
  { n:'RAL 9006', name:'White aluminium',    hex:'#A5A5A5', f:'white' },
  { n:'RAL 9007', name:'Grey aluminium',     hex:'#8F8F8F', f:'white' },
  { n:'RAL 9010', name:'Pure white',         hex:'#FFFFFF', f:'white' },
  { n:'RAL 9011', name:'Graphite black',     hex:'#272727', f:'white' },
  { n:'RAL 9016', name:'Traffic white',      hex:'#F6F6F6', f:'white' },
  { n:'RAL 9017', name:'Traffic black',      hex:'#1C1C1C', f:'white' },
  { n:'RAL 9018', name:'Papyrus white',      hex:'#D7D7D0', f:'white' },
];

export const RAL_FILTERS = [
  { key: 'all',    label: 'All' },
  { key: 'white',  label: 'White & black' },
  { key: 'grey',   label: 'Grey' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'red',    label: 'Red' },
  { key: 'brown',  label: 'Brown' },
  { key: 'green',  label: 'Green' },
  { key: 'blue',   label: 'Blue' },
  { key: 'violet', label: 'Violet' },
];

export const ralByCode = code => RAL.find(r => r.n === code);
export const ralByHex  = hex  => RAL.find(r => r.hex.toLowerCase() === String(hex).toLowerCase());
