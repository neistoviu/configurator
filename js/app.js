// ─────────────────────────────────────────────────────────────────────────────
//  App wiring: boots the viewer, builds the sidebar, keeps the URL in sync and
//  handles the offer form.
// ─────────────────────────────────────────────────────────────────────────────
import { Viewer, THREE } from './viewer.js';
import { Hotspots, HotspotEditor } from './hotspots.js';
import {
  MODELS, DEFAULT_MODEL, SCENES, DEFAULT_SCENE, SPECS, SAVINGS, FACE_RING,
  RAL, RAL_FILTERS, COLOR_PRESETS, ralByCode, ralByHex,
} from './data.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);

const state = {
  model: MODELS[params.get('model')] ? params.get('model') : DEFAULT_MODEL,
  scene: SCENES[params.get('scene')] ? params.get('scene') : DEFAULT_SCENE,
  activeGroup: 'body',
  filter: 'all',
  search: '',
};

/**
 * A visitor on a locked-down machine or an old browser can end up without
 * WebGL. Without this they would sit on the loading screen forever, so say
 * what happened and keep the enquiry route open.
 */
function bail(message) {
  $('load-txt').textContent = message;
  $('prog').parentElement.style.display = 'none';
  $('load-fallback').innerHTML =
    'You can still tell us what you need and we will send the configuration by email — '
    + '<a href="mailto:info@typhoonroasters.com">info@typhoonroasters.com</a>.';
  throw new Error(message);
}

let viewer;
try {
  viewer = new Viewer($('canvas-wrap'));
} catch (err) {
  console.error(err);
  bail('This browser could not start 3D graphics (WebGL).');
}

const hotspots = new Hotspots($('hotspot-layer'), viewer);

// Handy from the browser console when tuning scenes or placing hotspots.
window.__typhoon = { viewer, hotspots, state, THREE };
viewer.onAfterRender = () => hotspots.update();
viewer.onUserInteract = () => setRotate(false);
// Reading a card while the machine keeps turning is unusable, so opening one
// stops the spin.
hotspots.onOpenChange = open => { if (open) setRotate(false); };

// ── Loading overlay ──────────────────────────────────────────────────────────
function showLoading(label) {
  $('load-model-name').textContent = label;
  $('load-txt').textContent = 'Loading model…';
  $('prog').style.width = '0%';
  const el = $('loading');
  el.style.display = 'flex';
  el.classList.remove('fade');
}
function hideLoading() {
  const el = $('loading');
  el.classList.add('fade');
  setTimeout(() => { el.style.display = 'none'; }, 420);
}

// ── Model loading ────────────────────────────────────────────────────────────
async function loadModel(key) {
  const def = MODELS[key];
  if (!def) return;
  state.model = key;

  syncModelSelectors(key);
  syncUrl();
  renderSpecs(key);
  hotspots.clear();
  showLoading(def.label);

  const cfg = await fetch(def.config).then(r => r.json()).catch(() => ({}));

  // MODELS owns the opening angle; the config value is only a fallback.
  if (def.faceYaw !== undefined) cfg.initialRotationY = def.faceYaw;

  try {
    const stats = await viewer.loadModel(def.file, cfg, {
      displayScale: viewer.isCompact ? (def.mobileDisplayScale || 1) : 1,
      onProgress: pct => {
        $('prog').style.width = pct + '%';
        $('load-txt').textContent = `Loading… ${pct}%`;
      },
    });
    console.info(
      `[typhoon] ${def.label}: ${stats.mergedFrom} meshes → ${stats.drawMeshes} draw calls`);
  } catch (err) {
    $('load-txt').textContent = '⚠ Could not load the model';
    console.error(err);
    return;
  }

  // Open on the signature paint. MODELS wins over the config so a colour left
  // behind in the admin tool never becomes a visitor's first impression.
  if (def.defaultBody) applyColor('body', ralByCode(def.defaultBody));
  if (def.defaultAccent) applyColor('accent', ralByCode(def.defaultAccent));
  ['body', 'accent'].forEach(group => {
    const hex = viewer.getGroupColor(group);
    if (hex) updateSelectedSwatch(group, hex);
  });

  hotspots.setModel(key, FACE_RING.indexOf(def.frontFace || '+z'));
  setRotate(true);
  hideLoading();

  if (params.get('edit') === 'hotspots') new HotspotEditor(viewer, key, THREE);
}

function syncModelSelectors(key) {
  document.querySelectorAll('.model-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.model === key);
    btn.setAttribute('aria-pressed', String(btn.dataset.model === key));
  });
  $('model-dropdown').value = key;
}

function syncUrl() {
  const url = new URL(location.href);
  if (state.model === DEFAULT_MODEL) url.searchParams.delete('model');
  else url.searchParams.set('model', state.model);
  if (state.scene === DEFAULT_SCENE) url.searchParams.delete('scene');
  else url.searchParams.set('scene', state.scene);
  history.replaceState({}, '', url);
}

// ── Specs strip ──────────────────────────────────────────────────────────────
function renderSpecs(key) {
  const specs = SPECS[key] || [];
  $('spec-row').innerHTML = specs.map(s => `
    <div class="spec">
      <div class="spec-val">${s.value}</div>
      <div class="spec-lab">${s.label}</div>
    </div>`).join('');

  const s = SAVINGS[key];
  $('savings').innerHTML = s
    ? `Against a drum roaster at the same utilisation you save about
       <b class="n-total">${s.total}/month</b> — labour <b class="n-labour">${s.labour}</b>,
       electricity <b class="n-elec">${s.electricity}</b>,
       fewer defects <b class="n-defect">${s.defects}</b>.
       Payback at 50% utilisation ≈ <b class="n-pay">${s.payback}</b>.`
    : '';
}

// ── Scene presets ────────────────────────────────────────────────────────────
function buildSceneSwitch() {
  $('scene-switch').innerHTML = Object.entries(SCENES).map(([key, preset]) => `
    <button class="scene-btn${key === state.scene ? ' active' : ''}"
            data-scene="${key}" type="button" title="${preset.hint}">
      <span class="scene-chip" style="background:linear-gradient(160deg,${preset.backdrop[0]},${preset.backdrop[2]})"></span>
      ${preset.label}
    </button>`).join('');

  $('scene-switch').querySelectorAll('.scene-btn').forEach(btn => {
    btn.addEventListener('click', () => setScene(btn.dataset.scene));
  });
}

async function setScene(key) {
  state.scene = key;
  $('scene-switch').querySelectorAll('.scene-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.scene === key);
  });
  $('scene-hint').textContent = SCENES[key].hint;
  await viewer.applyScene(key);
  syncUrl();
}

// ── Colour picker ────────────────────────────────────────────────────────────
function buildGroupTabs() {
  document.querySelectorAll('.group-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.activeGroup = tab.dataset.group;
      document.querySelectorAll('.group-tab').forEach(t => {
        const on = t.dataset.group === state.activeGroup;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', String(on));
      });
      renderGrid();
    });
  });
}

function buildFilters() {
  $('ral-filters').innerHTML = RAL_FILTERS.map(f => `
    <button class="filter-btn${f.key === state.filter ? ' active' : ''}"
            data-filter="${f.key}" type="button">${f.label}</button>`).join('');
  $('ral-filters').querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      $('ral-filters').querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === state.filter);
      });
      renderGrid();
    });
  });
}

function buildPresets() {
  $('presets').innerHTML = COLOR_PRESETS.map(p => {
    const body = ralByCode(p.body);
    const accent = ralByCode(p.accent);
    return `<button class="preset" type="button"
              data-body="${p.body}" data-accent="${p.accent}" title="${p.name}">
        <span class="preset-sw">
          <i style="background:${body.hex}"></i><i style="background:${accent.hex}"></i>
        </span>
        <span class="preset-name">${p.name}</span>
      </button>`;
  }).join('');

  $('presets').querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => {
      applyColor('body', ralByCode(btn.dataset.body));
      applyColor('accent', ralByCode(btn.dataset.accent));
      renderGrid();
    });
  });
}

function renderGrid() {
  const q = state.search.trim().toLowerCase();
  const activeHex = viewer.getGroupColor(state.activeGroup);
  const list = RAL.filter(r => {
    if (state.filter !== 'all' && r.f !== state.filter) return false;
    if (!q) return true;
    return r.n.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
  });

  $('ral-grid').innerHTML = list.map(r => `
    <button class="sw${r.hex === activeHex ? ' on' : ''}" type="button"
            data-code="${r.n}" style="background:${r.hex}"
            title="${r.n} — ${r.name}" aria-label="${r.n} ${r.name}"></button>`).join('')
    || '<div class="grid-empty">Nothing matches that search.</div>';

  $('ral-grid').querySelectorAll('.sw').forEach(btn => {
    btn.addEventListener('click', () => {
      applyColor(state.activeGroup, ralByCode(btn.dataset.code));
      renderGrid();
    });
  });
}

function applyColor(group, ral) {
  if (!ral) return;
  viewer.setGroupColor(group, ral.hex);
  updateSelectedSwatch(group, ral.hex);
}

function updateSelectedSwatch(group, hex) {
  const ral = ralByHex(hex);
  const prefix = group === 'body' ? 'body' : 'acc';
  $(`${prefix}-sw`).style.background = hex;
  $(`${prefix}-code`).textContent = ral ? ral.n : '—';
  $(`${prefix}-name`).textContent = ral ? ral.name : 'Custom';
}

// ── Viewport controls ────────────────────────────────────────────────────────
function setRotate(on) {
  viewer.setAutoRotate(on);
  const btn = $('rotate-btn');
  btn.classList.toggle('on', on);
  btn.textContent = on ? '❙❙' : '▶';
  btn.setAttribute('aria-label', on ? 'Pause rotation' : 'Resume rotation');
}

// The light rig sits at the angle that flatters the machine best; it is not
// something a visitor should have to think about.
const LIGHT_ANGLE_PCT = 40;

function bindViewportControls() {
  $('rotate-btn').addEventListener('click', () => setRotate(!viewer.controls.autoRotate));
  viewer.setLightAngle(LIGHT_ANGLE_PCT * 3.6);

  const hsBtn = $('hotspot-btn');
  hsBtn.addEventListener('click', () => {
    const on = !hotspots.visible;
    hotspots.setVisible(on);
    hsBtn.classList.toggle('on', on);
    hsBtn.setAttribute('aria-pressed', String(on));
  });

  // controls.reset() restores the state saved right after the model was framed.
  $('reset-btn').addEventListener('click', () => {
    viewer.controls.reset();
    viewer.invalidate();
  });
}

// ── Offer modal (unchanged lead pipeline) ────────────────────────────────────
const OFFER_STATUSES = [
  { key: 'new_business', label: 'New business' },
  { key: 'upgrading', label: 'Upgrading my roastery' },
  { key: 'start_shop', label: 'Start roasting in my shop' },
  { key: 'hobby', label: 'Hobby roaster' },
  { key: 'other', label: 'Other' },
];
const OFFER_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/15301489/42oe3d4/';
let offerStatus = null;

const CALLING_CODES = {
  '1':'US/CA','7':'RU','20':'EG','27':'ZA','30':'GR','31':'NL','32':'BE','33':'FR','34':'ES',
  '36':'HU','39':'IT','40':'RO','41':'CH','43':'AT','44':'UK','45':'DK','46':'SE','47':'NO',
  '48':'PL','49':'DE','51':'PE','52':'MX','54':'AR','55':'BR','56':'CL','57':'CO','58':'VE',
  '60':'MY','61':'AU','62':'ID','63':'PH','64':'NZ','65':'SG','66':'TH','81':'JP','82':'KR',
  '84':'VN','86':'CN','90':'TR','91':'IN','92':'PK','93':'AF','94':'LK','95':'MM','98':'IR',
  '212':'MA','213':'DZ','216':'TN','218':'LY','221':'SN','225':'CI','234':'NG','250':'RW',
  '254':'KE','255':'TZ','256':'UG','351':'PT','352':'LU','353':'IE','354':'IS','355':'AL',
  '356':'MT','357':'CY','358':'FI','359':'BG','370':'LT','371':'LV','372':'EE','373':'MD',
  '374':'AM','375':'BY','376':'AD','377':'MC','380':'UA','381':'RS','382':'ME','385':'HR',
  '386':'SI','387':'BA','389':'MK','420':'CZ','421':'SK','971':'AE','972':'IL','973':'BH',
  '974':'QA','994':'AZ','995':'GE','996':'KG','998':'UZ',
};

const cookieValue = name => {
  const m = document.cookie.match(`(^|;)\\s*${name}=([^;]+)`);
  return m ? decodeURIComponent(m[2]) : '';
};

function phoneCountry(phone) {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (!digits) return 'Unknown';
  for (let len = 3; len >= 1; len--) {
    const code = CALLING_CODES[digits.slice(0, len)];
    if (code) return code;
  }
  return 'Unknown';
}

function attribution() {
  const utm = {};
  const cookieUtm = cookieValue('_deco_utmz');
  if (cookieUtm) {
    const [source, medium, term, campaign] = cookieUtm.split('|');
    Object.assign(utm, {
      utm_source: source || '', utm_medium: medium || '',
      utm_term: term || '', utm_campaign: campaign || '',
    });
  }
  ['utm_source', 'utm_medium', 'utm_term', 'utm_campaign'].forEach(k => {
    if (params.get(k)) utm[k] = params.get(k);
  });
  return {
    utm,
    gclid: params.get('gclid') || '',
    ga_clientid: cookieValue('_ga'),
    ym_clientid: cookieValue('_ym_uid'),
    page: location.href,
    referrer: document.referrer || cookieValue('_deco_utm_referrer'),
  };
}

function renderStatusChips() {
  const wrap = $('tdf-statusChips');
  wrap.innerHTML = OFFER_STATUSES.map(s => `
    <button type="button" class="tdf-chip${offerStatus === s.key ? ' tdf-sel' : ''}"
            data-key="${s.key}"><span>${s.label}</span><span class="tdf-radio"></span></button>`).join('');
  wrap.querySelectorAll('.tdf-chip').forEach(chip => {
    chip.addEventListener('click', () => { offerStatus = chip.dataset.key; renderStatusChips(); });
  });
}

function currentConfig() {
  const body = ralByHex(viewer.getGroupColor('body'));
  const accent = ralByHex(viewer.getGroupColor('accent'));
  return {
    model: MODELS[state.model].label,
    scene: SCENES[state.scene].label,
    bodyColor: body ? `${body.n} (${body.hex})` : 'default',
    accentColor: accent ? `${accent.n} (${accent.hex})` : 'default',
  };
}

function bindOfferModal() {
  const overlay = $('offer-overlay');
  const form = $('tdf-form');
  const submit = $('tdf-submitBtn');

  renderStatusChips();

  $('offer-btn').addEventListener('click', () => overlay.classList.add('open'));
  $('modal-close').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const emailEl = $('tdf-fEmail');
    const phoneEl = $('tdf-fPhone');
    emailEl.classList.remove('tdf-error');
    phoneEl.classList.remove('tdf-error');

    const okEmail = emailEl.checkValidity();
    const okPhone = phoneEl.value.trim().length > 0;
    if (!okEmail) emailEl.classList.add('tdf-error');
    if (!okPhone) phoneEl.classList.add('tdf-error');
    if (!okEmail || !okPhone) {
      $('tdf-formError').textContent = 'Please add a valid email and a phone number.';
      return;
    }
    $('tdf-formError').textContent = '';

    const attr = attribution();
    const config = currentConfig();
    const statusLabel = OFFER_STATUSES.find(s => s.key === offerStatus)?.label || '';

    fetch(OFFER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        name: $('tdf-fName').value.trim(),
        email: emailEl.value.trim(),
        phone: phoneEl.value.trim(),
        message: $('tdf-fMessage').value.trim(),
        current_status: statusLabel,
        intent: 'configurator_offer',
        formId: 'configurator-get-offer',
        button_text: submit.textContent.trim(),
        phone_country: phoneCountry(phoneEl.value),
        source: 'site',
        roaster_model: config.model,
        body_color: config.bodyColor,
        accent_color: config.accentColor,
        scene: config.scene,
        config,
        utm_source: attr.utm.utm_source || '',
        utm_medium: attr.utm.utm_medium || '',
        utm_campaign: attr.utm.utm_campaign || '',
        utm_term: attr.utm.utm_term || '',
        gclid: attr.gclid,
        ga_clientid: attr.ga_clientid,
        ym_clientid: attr.ym_clientid,
        page: attr.page,
        referrer: attr.referrer,
      }),
    }).catch(() => {});

    submit.disabled = true;
    $('tdf-card').innerHTML =
      '<div class="tdf-form-ok">Thanks! We will get back to you within 24 hours.</div>';
  });
}

// ── Boot ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.model-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.model !== state.model) loadModel(btn.dataset.model);
  });
});
$('model-dropdown').addEventListener('change', e => {
  if (e.target.value !== state.model) loadModel(e.target.value);
});
$('ral-search').addEventListener('input', e => {
  state.search = e.target.value;
  renderGrid();
});

buildSceneSwitch();
buildGroupTabs();
buildFilters();
buildPresets();
bindViewportControls();
bindOfferModal();
$('scene-hint').textContent = SCENES[state.scene].hint;

await viewer.applyScene(state.scene);
await loadModel(state.model);
renderGrid();
