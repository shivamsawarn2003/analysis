// ==============================
// Constants
// ==============================
var CP_WATER         = 4.18;
var CP_EXHAUST       = 1.15;
var R_EXHAUST        = 0.287;
var AMBIENT_PRESSURE = 1.01325;
var EXHAUST_PRESSURE = 1.05;
var GAMMA            = 1.35;

// Chart instances
var energyLoadChart, exergyLoadChart, energyCRChart, exergyCRChart;
var noxCRChart, noxLoadChart;

// ==============================
// Color pools
// ==============================
var CUSTOM_COLOR_POOL = [
  { border: '#8b5cf6', bg: 'rgba(139,92,246,0.18)', dash: [6,3]  },
  { border: '#ef4444', bg: 'rgba(239,68,68,0.18)',  dash: [8,4]  },
  { border: '#06b6d4', bg: 'rgba(6,182,212,0.18)',  dash: []     },
  { border: '#ec4899', bg: 'rgba(236,72,153,0.18)', dash: [4,4]  },
  { border: '#84cc16', bg: 'rgba(132,204,22,0.18)', dash: [10,4] },
  { border: '#f97316', bg: 'rgba(249,115,22,0.18)', dash: [5,3]  },
  { border: '#14b8a6', bg: 'rgba(20,184,166,0.18)', dash: [7,3]  },
  { border: '#a855f7', bg: 'rgba(168,85,247,0.18)', dash: [3,3]  },
  { border: '#64748b', bg: 'rgba(100,116,139,0.18)',dash: [9,3]  },
  { border: '#dc2626', bg: 'rgba(220,38,38,0.18)',  dash: [6,6]  },
];

var BUILTIN_COLORS = {
  diesel:       { border: '#3b82f6', bg: 'rgba(59,130,246,0.18)',  dash: []     },
  biodiesel20:  { border: '#10b981', bg: 'rgba(16,185,129,0.18)',  dash: [6,3]  },
  biodiesel100: { border: '#f59e0b', bg: 'rgba(245,158,11,0.18)',  dash: [10,4] },
};

var BUILTIN_NAMES = {
  diesel:       'Diesel (B0)',
  biodiesel20:  'Biodiesel B20',
  biodiesel100: 'Biodiesel B100',
};

// ==============================
// Built-in fuel properties
// ==============================
var BUILTIN_FUELS = {
  diesel: {
    lhv: 42.5, density: 830, viscosity: 2.5, cetane: 50, flashPoint: 55,
    hcRatio: 1.8, ocRatio: 0.0, scRatio: 0.0,
    combustionEfficiency: 1.0, ignitionQuality: 1.0
  },
  biodiesel20: {
    lhv: 41.8, density: 845, viscosity: 2.8, cetane: 52, flashPoint: 65,
    hcRatio: 1.78, ocRatio: 0.04, scRatio: 0.0,
    combustionEfficiency: 0.98, ignitionQuality: 1.02
  },
  biodiesel100: {
    lhv: 37.5, density: 880, viscosity: 4.5, cetane: 55, flashPoint: 130,
    hcRatio: 1.76, ocRatio: 0.11, scRatio: 0.0,
    combustionEfficiency: 0.95, ignitionQuality: 1.05
  }
};

// ==============================
// Custom Fuel Store
// ==============================
var customFuels      = {};
var customCounter    = 0;
var editingFuelId    = null;
var dynCustomColorIdx = 0;
var noxCustomColorIdx = 0;
var dynDynamicColors  = {};
var noxDynamicColors  = {};

function buildCustomProps(rec) {
  var combEff = Math.max(0.85, 1.0 - Math.max(0, (rec.viscosity - 2.5) * 0.008));
  var ignQual = Math.max(0.90, Math.min(1.15, 1.0 + (rec.cetane - 50) * 0.004));
  return {
    lhv: rec.lhv, density: rec.density, viscosity: rec.viscosity,
    cetane: rec.cetane, flashPoint: rec.flashPoint,
    hcRatio: rec.hcRatio, ocRatio: rec.ocRatio, scRatio: rec.scRatio,
    combustionEfficiency: combEff, ignitionQuality: ignQual
  };
}

function getFuelProperties(fuelType) {
  if (BUILTIN_FUELS[fuelType]) return BUILTIN_FUELS[fuelType];
  if (customFuels[fuelType])   return buildCustomProps(customFuels[fuelType]);
  return BUILTIN_FUELS.diesel;
}

function getFuelColor(fuelType) {
  if (BUILTIN_COLORS[fuelType]) return BUILTIN_COLORS[fuelType];
  if (customFuels[fuelType])    return CUSTOM_COLOR_POOL[customFuels[fuelType].colorIndex % CUSTOM_COLOR_POOL.length];
  if (!dynDynamicColors[fuelType]) {
    dynDynamicColors[fuelType] = CUSTOM_COLOR_POOL[dynCustomColorIdx % CUSTOM_COLOR_POOL.length];
    dynCustomColorIdx++;
  }
  return dynDynamicColors[fuelType];
}

function getNoxColor(fuelType) {
  if (BUILTIN_COLORS[fuelType]) return BUILTIN_COLORS[fuelType];
  if (customFuels[fuelType])    return CUSTOM_COLOR_POOL[customFuels[fuelType].colorIndex % CUSTOM_COLOR_POOL.length];
  if (!noxDynamicColors[fuelType]) {
    noxDynamicColors[fuelType] = CUSTOM_COLOR_POOL[noxCustomColorIdx % CUSTOM_COLOR_POOL.length];
    noxCustomColorIdx++;
  }
  return noxDynamicColors[fuelType];
}

function getFuelDisplayName(fuelType) {
  if (BUILTIN_NAMES[fuelType]) return BUILTIN_NAMES[fuelType];
  if (customFuels[fuelType])   return customFuels[fuelType].name;
  return fuelType;
}

// ==============================
// Main dropdown onChange
// ==============================
function updateFuelProperties() {
  var sel   = document.getElementById('fuelType');
  var props = getFuelProperties(sel.value);
  if (props) document.getElementById('lhv').value = props.lhv;
}

// ==============================
// MODAL — open / close
// ==============================
function openCustomFuelModal() {
  document.getElementById('customFuelModal').style.display = 'flex';
  prepareNewFuelForm();
  renderSavedFuelsList();
}
function closeCustomFuelModal() {
  document.getElementById('customFuelModal').style.display = 'none';
  editingFuelId = null;
}
function handleModalOverlayClick(e) {
  if (e.target === document.getElementById('customFuelModal')) closeCustomFuelModal();
}

function prepareNewFuelForm() {
  editingFuelId = null;
  document.getElementById('modalFormTitle').textContent         = 'New Custom Fuel';
  document.getElementById('customFuelName').value               = '';
  document.getElementById('hcRatio').value                      = '1.8';
  document.getElementById('ocRatio').value                      = '0.0';
  document.getElementById('scRatio').value                      = '0.0';
  document.getElementById('fuelDensity').value                  = '830';
  document.getElementById('fuelViscosity').value                = '2.5';
  document.getElementById('cetaneNumber').value                 = '50';
  document.getElementById('customLHV').value                    = '42.5';
  document.getElementById('flashPoint').value                   = '55';
  document.getElementById('modalDeleteBtn').style.display       = 'none';
  document.getElementById('modalNewBtn').style.display          = 'none';
  document.getElementById('customFuelName').focus();
}

function editCustomFuel(id) {
  if (!customFuels[id]) return;
  editingFuelId = id;
  var r = customFuels[id];
  document.getElementById('modalFormTitle').textContent         = 'Edit: ' + r.name;
  document.getElementById('customFuelName').value               = r.name;
  document.getElementById('hcRatio').value                      = r.hcRatio;
  document.getElementById('ocRatio').value                      = r.ocRatio;
  document.getElementById('scRatio').value                      = r.scRatio;
  document.getElementById('fuelDensity').value                  = r.density;
  document.getElementById('fuelViscosity').value                = r.viscosity;
  document.getElementById('cetaneNumber').value                 = r.cetane;
  document.getElementById('customLHV').value                    = r.lhv;
  document.getElementById('flashPoint').value                   = r.flashPoint;
  document.getElementById('modalDeleteBtn').style.display       = 'inline-block';
  document.getElementById('modalNewBtn').style.display          = 'inline-block';
  document.getElementById('customFuelName').focus();
}

function saveCustomFuel() {
  var name = document.getElementById('customFuelName').value.trim();
  if (!name) { alert('Please enter a fuel name before saving.'); document.getElementById('customFuelName').focus(); return; }
  var record = {
    name:       name,
    hcRatio:    parseFloat(document.getElementById('hcRatio').value)      || 1.8,
    ocRatio:    parseFloat(document.getElementById('ocRatio').value)      || 0.0,
    scRatio:    parseFloat(document.getElementById('scRatio').value)      || 0.0,
    density:    parseFloat(document.getElementById('fuelDensity').value)  || 830,
    viscosity:  parseFloat(document.getElementById('fuelViscosity').value) || 2.5,
    cetane:     parseFloat(document.getElementById('cetaneNumber').value)  || 50,
    lhv:        parseFloat(document.getElementById('customLHV').value)    || 42.5,
    flashPoint: parseFloat(document.getElementById('flashPoint').value)   || 55,
  };
  if (editingFuelId) {
    record.colorIndex = customFuels[editingFuelId].colorIndex;
    customFuels[editingFuelId] = record;
    var opt = document.querySelector('#fuelType option[value="' + editingFuelId + '"]');
    if (opt) opt.textContent = record.name;
    if (document.getElementById('fuelType').value === editingFuelId) document.getElementById('lhv').value = record.lhv;
    syncAllFuelDropdowns();
    showModalToast('Fuel updated!');
  } else {
    var id = 'custom_' + (++customCounter);
    record.colorIndex = (customCounter - 1) % CUSTOM_COLOR_POOL.length;
    customFuels[id] = record;
    addFuelOptionToAll(id, record.name);
    document.getElementById('fuelType').value = id;
    document.getElementById('lhv').value = record.lhv;
    showModalToast('Fuel created and selected!');
  }
  renderSavedFuelsList();
  prepareNewFuelForm();
}

function deleteCustomFuel() {
  if (!editingFuelId) return;
  var name = customFuels[editingFuelId] ? customFuels[editingFuelId].name : 'this fuel';
  if (!confirm('Delete "' + name + '"? This cannot be undone.')) return;
  ['fuelType','eff-fuel','nox-fuel'].forEach(function(selId) {
    var opt = document.querySelector('#' + selId + ' option[value="' + editingFuelId + '"]');
    if (opt) opt.remove();
  });
  var sel = document.getElementById('fuelType');
  if (sel.value === editingFuelId) { sel.value = 'diesel'; document.getElementById('lhv').value = BUILTIN_FUELS.diesel.lhv; }
  delete customFuels[editingFuelId];
  editingFuelId = null;
  renderSavedFuelsList();
  prepareNewFuelForm();
}

function addFuelOptionToAll(id, name) {
  ['fuelType','eff-fuel','nox-fuel'].forEach(function(selId) {
    var sel = document.getElementById(selId);
    if (!sel) return;
    if (sel.querySelector('option[value="' + id + '"]')) return;
    var opt = document.createElement('option');
    opt.value = id; opt.textContent = name;
    sel.appendChild(opt);
  });
}

function syncAllFuelDropdowns() {
  Object.keys(customFuels).forEach(function(id) {
    addFuelOptionToAll(id, customFuels[id].name);
    ['fuelType','eff-fuel','nox-fuel'].forEach(function(selId) {
      var opt = document.querySelector('#' + selId + ' option[value="' + id + '"]');
      if (opt) opt.textContent = customFuels[id].name;
    });
  });
}

function renderSavedFuelsList() {
  var container  = document.getElementById('savedFuelsContainer');
  var noMsg      = document.getElementById('noFuelsMsg');
  var countBadge = document.getElementById('savedFuelCount');
  var ids        = Object.keys(customFuels);
  var currentSel = document.getElementById('fuelType').value;
  countBadge.textContent = ids.length;
  if (ids.length === 0) { container.innerHTML = ''; container.appendChild(noMsg); noMsg.style.display = 'block'; return; }
  noMsg.style.display = 'none'; container.innerHTML = '';
  ids.forEach(function(id) {
    var r = customFuels[id];
    var color = CUSTOM_COLOR_POOL[r.colorIndex % CUSTOM_COLOR_POOL.length];
    var isSel = (currentSel === id), isEdit = (editingFuelId === id);
    var card = document.createElement('div');
    card.className = 'fuel-card' + (isSel ? ' fuel-card--active' : '') + (isEdit ? ' fuel-card--editing' : '');
    card.innerHTML =
      '<div class="fuel-card-strip" style="background:' + color.border + '"></div>' +
      '<div class="fuel-card-body">' +
        '<div class="fuel-card-name">' + escapeHtml(r.name) + '</div>' +
        '<div class="fuel-card-meta">LHV <b>' + r.lhv + '</b> MJ/kg &nbsp;|&nbsp; CN <b>' + r.cetane + '</b> &nbsp;|&nbsp; H/C <b>' + r.hcRatio + '</b> &nbsp;|&nbsp; O/C <b>' + r.ocRatio + '</b></div>' +
        '<div class="fuel-card-meta">&#961; <b>' + r.density + '</b> kg/m&#179; &nbsp;|&nbsp; &#957; <b>' + r.viscosity + '</b> cSt &nbsp;|&nbsp; FP <b>' + r.flashPoint + '</b> &#176;C</div>' +
      '</div>' +
      '<div class="fuel-card-btns">' +
        (isSel ? '<span class="badge-selected">&#10004; Selected</span>' : '<button class="btn-card-select" onclick="selectFuelFromModal(\'' + id + '\')">Select</button>') +
        '<button class="btn-card-edit' + (isEdit ? ' btn-card-edit--active' : '') + '" onclick="editCustomFuel(\'' + id + '\')">&#9999; Edit</button>' +
      '</div>';
    container.appendChild(card);
  });
}

function selectFuelFromModal(id) {
  if (!customFuels[id]) return;
  document.getElementById('fuelType').value = id;
  document.getElementById('lhv').value = customFuels[id].lhv;
  renderSavedFuelsList();
}

function showModalToast(msg) {
  var toast = document.getElementById('modalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'modalToast'; toast.className = 'modal-toast';
    document.getElementById('modalFormActions').appendChild(toast);
  }
  toast.textContent = msg; toast.style.display = 'block'; toast.style.opacity = '1';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { toast.style.display = 'none'; }, 400);
  }, 2200);
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ==============================
// Fuel efficiency helpers
// ==============================
function getFuelEfficiencyFactor(fuelType) {
  var p = getFuelProperties(fuelType);
  var viscPenalty = Math.max(0.9, 1.0 - (p.viscosity - 2.5) * 0.01);
  return p.combustionEfficiency * p.ignitionQuality * viscPenalty;
}
function calculateIdealEfficiency(cr) { return (1 - Math.pow(cr, 1 - GAMMA)) * 100; }
function getCRCorrectionFactor(cr) { return 1 + 0.015 * (cr - 16); }
function getChemicalExergyFactor() {
  var fuelType = document.getElementById('fuelType').value;
  var p = getFuelProperties(fuelType);
  return 1.0374 + 0.0159*p.hcRatio + 0.0567*p.ocRatio + 0.5985*p.scRatio*(1 - 0.1737*p.hcRatio);
}

// ==============================
// Smart axis formatter (handles 12, 271, 118627, etc.)
// ==============================
function formatAxisValue(value) {
  if (value === null || value === undefined || isNaN(value)) return '';
  var abs = Math.abs(value);
  if (abs >= 1e9) return parseFloat((value/1e9).toPrecision(3)) + 'B';
  if (abs >= 1e6) return parseFloat((value/1e6).toPrecision(3)) + 'M';
  if (abs >= 1e3) return parseFloat((value/1e3).toPrecision(3)) + 'k';
  if (abs >= 1)   return parseFloat(value.toPrecision(4)) + '';
  if (abs >= 0.01)return parseFloat(value.toPrecision(3)) + '';
  return value.toExponential(2);
}

function getYAxisConfig(allValues) {
  if (!allValues || allValues.length === 0) return { min: undefined, max: undefined };
  var min = Math.min.apply(null, allValues);
  var max = Math.max.apply(null, allValues);
  if (min === max) { var pad = Math.abs(min)*0.5 || 5; min -= pad; max += pad; }
  var range = max - min;
  return { min: Math.max(0, min - range*0.1), max: max + range*0.1 };
}

function computeStepSize(yConfig) {
  var range = (yConfig.max || 0) - (yConfig.min || 0);
  if (!range || range <= 0) return undefined;
  var mag = Math.pow(10, Math.floor(Math.log10(range)));
  return Math.ceil((range / 7) / mag) * mag || undefined;
}

// ==============================
// Generic legend renderer
// ==============================
function renderLegend(elId, datasets) {
  var el = document.getElementById(elId);
  if (!el) return;
  if (!datasets || datasets.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = datasets.map(function(ds) {
    var style = (ds.borderDash && ds.borderDash.length)
      ? 'display:inline-block;width:22px;height:3px;border-top:2.5px dashed ' + ds.borderColor + ';'
      : 'display:inline-block;width:22px;height:3px;background:' + ds.borderColor + ';border-radius:2px;';
    return '<span style="display:flex;align-items:center;gap:6px;font-size:0.82rem;color:#475569;">' +
      '<span style="' + style + '"></span>' + escapeHtml(ds.label) + '</span>';
  }).join('');
}

// ==============================
// Make a standard line chart
// ==============================
function makeLineChart(ctxId, xLabel, yLabel, tickFormatter, usePercent) {
  return new Chart(document.getElementById(ctxId).getContext('2d'), {
    type: 'line',
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.9)',
          titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 12,
          callbacks: {
            label: function(ctx) {
              var unit = ctx.dataset.unit || '';
              var val  = usePercent ? ctx.parsed.y.toFixed(2) + '%' : formatAxisValue(ctx.parsed.y) + (unit ? ' ' + unit : '');
              return (ctx.dataset.label || '') + ': ' + val;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: xLabel, font: { size: 13, weight: 'bold' }, color: '#475569' },
          grid: { color: 'rgba(0,0,0,0.08)' },
          ticks: { color: '#475569', font: { size: 11 } }
        },
        y: {
          type: 'linear',
          title: { display: true, text: yLabel, font: { size: 13, weight: 'bold' }, color: '#475569' },
          grid: { color: 'rgba(0,0,0,0.08)' },
          ticks: {
            color: '#475569', font: { size: 11 },
            maxTicksLimit: 8,
            callback: tickFormatter || function(v) { return v; }
          }
        }
      }
    }
  });
}

// ==============================
// Init all six charts
// ==============================
function initCharts() {
  var effTick = function(v) { return v.toFixed(1) + '%'; };
  var noxTick = function(v) { return formatAxisValue(v); };

  energyLoadChart = makeLineChart('energyLoadChart', 'Brake Load (kg)',   'Energy Efficiency (%)',  effTick, true);
  exergyLoadChart = makeLineChart('exergyLoadChart', 'Brake Load (kg)',   'Exergy Efficiency (%)',  effTick, true);
  energyCRChart   = makeLineChart('energyCRChart',   'Compression Ratio', 'Energy Efficiency (%)',  effTick, true);
  exergyCRChart   = makeLineChart('exergyCRChart',   'Compression Ratio', 'Exergy Efficiency (%)',  effTick, true);
  noxCRChart      = makeLineChart('noxCRChart',      'Compression Ratio', 'NOx Emission',           noxTick, false);
  noxLoadChart    = makeLineChart('noxLoadChart',    'Brake Load (kg)',   'NOx Emission',           noxTick, false);
}

// ==============================
// Build a dataset object
// ==============================
function buildDataset(fuelKey, fuelLabel, points, color, unit) {
  return {
    label:               fuelLabel,
    fuelKey:             fuelKey,
    unit:                unit || '',
    data:                points.slice().sort(function(a,b){ return a.x - b.x; }),
    borderColor:         color.border,
    backgroundColor:     color.bg,
    borderDash:          color.dash || [],
    borderWidth:         2.5,
    pointRadius:         5,
    pointHoverRadius:    8,
    pointBackgroundColor: color.border,
    pointBorderColor:    '#fff',
    pointBorderWidth:    2,
    tension:             0.3,
    fill:                false
  };
}

// ==============================
// Update a chart's y-axis range & label
// ==============================
function applyYAxisConfig(chart, allValues, labelText) {
  var yConfig  = getYAxisConfig(allValues);
  var stepSize = computeStepSize(yConfig);
  chart.options.scales.y.min              = yConfig.min;
  chart.options.scales.y.max              = yConfig.max;
  chart.options.scales.y.title.text       = labelText;
  chart.options.scales.y.ticks.stepSize   = stepSize;
}

// ==============================
// EFFICIENCY CHARTS DATA
// ==============================
var effData = []; // { fuelKey, fuelLabel, cr, load, etaE, etaEx }

function addEffPoint() {
  var fuelSel   = document.getElementById('eff-fuel');
  var fuelKey   = fuelSel.value;
  var fuelLabel = fuelSel.options[fuelSel.selectedIndex].text;
  var cr        = parseFloat(document.getElementById('eff-cr').value);
  var load      = parseFloat(document.getElementById('eff-load').value);
  var etaE      = parseFloat(document.getElementById('eff-energy').value);
  var etaEx     = parseFloat(document.getElementById('eff-exergy').value);

  if (isNaN(cr)   || cr < 1)     { alert('Please enter a valid Compression Ratio.'); return; }
  if (isNaN(load) || load < 0)   { alert('Please enter a valid Brake Load.'); return; }
  if (isNaN(etaE) && isNaN(etaEx)) { alert('Please enter at least one efficiency value (Energy or Exergy).'); return; }

  effData.push({ fuelKey: fuelKey, fuelLabel: fuelLabel, cr: cr, load: load,
    etaE: isNaN(etaE) ? null : etaE, etaEx: isNaN(etaEx) ? null : etaEx });
  renderEffTable();
  rebuildEffCharts();
}

function removeEffPoint(idx) {
  effData.splice(idx, 1);
  renderEffTable();
  rebuildEffCharts();
}

function clearEffData() {
  effData = [];
  renderEffTable();
  rebuildEffCharts();
}

// Called from Calculator tab "Add to Efficiency Charts"
function sendResultsToCharts() {
  var etaEEl  = document.getElementById('energyEfficiency');
  var etaExEl = document.getElementById('exergyEfficiency');
  var etaE    = parseFloat(etaEEl  ? etaEEl.textContent  : '');
  var etaEx   = parseFloat(etaExEl ? etaExEl.textContent : '');
  if (isNaN(etaE) && isNaN(etaEx)) { alert('Please run a calculation first.'); return; }

  var fuelSel   = document.getElementById('fuelType');
  var fuelKey   = fuelSel.value;
  var fuelLabel = getFuelDisplayName(fuelKey);
  var cr        = parseFloat(document.getElementById('compressionRatio').value) || 16;
  var load      = parseFloat(document.getElementById('brakeLoad').value)        || 0;

  // Also pre-fill the Efficiency Charts form for convenience
  var effFuelSel = document.getElementById('eff-fuel');
  if (effFuelSel) effFuelSel.value = fuelKey;
  var effCREl = document.getElementById('eff-cr');
  if (effCREl) effCREl.value = cr;
  var effLoadEl = document.getElementById('eff-load');
  if (effLoadEl) effLoadEl.value = load;
  var effEnergyEl = document.getElementById('eff-energy');
  if (effEnergyEl) effEnergyEl.value = isNaN(etaE) ? '' : etaE.toFixed(2);
  var effExergyEl = document.getElementById('eff-exergy');
  if (effExergyEl) effExergyEl.value = isNaN(etaEx) ? '' : etaEx.toFixed(2);

  effData.push({ fuelKey: fuelKey, fuelLabel: fuelLabel, cr: cr, load: load,
    etaE: isNaN(etaE) ? null : etaE, etaEx: isNaN(etaEx) ? null : etaEx });
  renderEffTable();
  rebuildEffCharts();

  // Switch to charts tab
  showTab('charts', null);
  document.querySelectorAll('.tab').forEach(function(t) {
    t.classList.toggle('active', t.textContent.trim() === 'Efficiency Charts');
  });
}

function renderEffTable() {
  var wrap  = document.getElementById('eff-table-wrap');
  var tbody = document.getElementById('eff-tbody');
  if (effData.length === 0) { wrap.style.display = 'none'; tbody.innerHTML = ''; return; }
  wrap.style.display = 'block';
  tbody.innerHTML = effData.map(function(d, i) {
    var c = getFuelColor(d.fuelKey);
    return '<tr>' +
      '<td><span class="dyn-fuel-dot" style="background:' + c.border + '"></span>' + escapeHtml(d.fuelLabel) + '</td>' +
      '<td>' + d.cr.toFixed(1) + '</td>' +
      '<td>' + d.load.toFixed(1) + '</td>' +
      '<td>' + (d.etaE  !== null ? d.etaE.toFixed(2)  + '%' : '<span style="color:#94a3b8">—</span>') + '</td>' +
      '<td>' + (d.etaEx !== null ? d.etaEx.toFixed(2) + '%' : '<span style="color:#94a3b8">—</span>') + '</td>' +
      '<td><button class="dyn-del-btn" onclick="removeEffPoint(' + i + ')" title="Remove">&#10005;</button></td>' +
    '</tr>';
  }).join('');
}

function rebuildEffCharts() {
  if (!energyLoadChart) return;

  // Group by fuelKey
  var byFuel = {};
  effData.forEach(function(d) {
    if (!byFuel[d.fuelKey]) byFuel[d.fuelKey] = { label: d.fuelLabel, energyLoad: [], exergyLoad: [], energyCR: [], exergyCR: [] };
    if (d.etaE  !== null) { byFuel[d.fuelKey].energyLoad.push({ x: d.load, y: d.etaE  }); byFuel[d.fuelKey].energyCR.push({ x: d.cr, y: d.etaE  }); }
    if (d.etaEx !== null) { byFuel[d.fuelKey].exergyLoad.push({ x: d.load, y: d.etaEx }); byFuel[d.fuelKey].exergyCR.push({ x: d.cr, y: d.etaEx }); }
  });

  var keys = Object.keys(byFuel);

  function makeDS(fuelKey, ptsKey) {
    var f = byFuel[fuelKey];
    return buildDataset(fuelKey, f.label, f[ptsKey], getFuelColor(fuelKey), '%');
  }

  var elDS = keys.map(function(k) { return makeDS(k, 'energyLoad'); }).filter(function(d) { return d.data.length > 0; });
  var xlDS = keys.map(function(k) { return makeDS(k, 'exergyLoad'); }).filter(function(d) { return d.data.length > 0; });
  var ecDS = keys.map(function(k) { return makeDS(k, 'energyCR');   }).filter(function(d) { return d.data.length > 0; });
  var xcDS = keys.map(function(k) { return makeDS(k, 'exergyCR');   }).filter(function(d) { return d.data.length > 0; });

  energyLoadChart.data.datasets = elDS;
  exergyLoadChart.data.datasets = xlDS;
  energyCRChart.data.datasets   = ecDS;
  exergyCRChart.data.datasets   = xcDS;

  // Y-axis for efficiency charts — keep in 0-100 range but auto-scale to data
  var allEnergyVals = effData.filter(function(d) { return d.etaE  !== null; }).map(function(d) { return d.etaE;  });
  var allExergyVals = effData.filter(function(d) { return d.etaEx !== null; }).map(function(d) { return d.etaEx; });

  applyYAxisConfig(energyLoadChart, allEnergyVals, 'Energy Efficiency (%)');
  applyYAxisConfig(exergyLoadChart, allExergyVals, 'Exergy Efficiency (%)');
  applyYAxisConfig(energyCRChart,   allEnergyVals, 'Energy Efficiency (%)');
  applyYAxisConfig(exergyCRChart,   allExergyVals, 'Exergy Efficiency (%)');

  energyLoadChart.update(); exergyLoadChart.update(); energyCRChart.update(); exergyCRChart.update();

  renderLegend('eff-energy-load-legend', elDS);
  renderLegend('eff-exergy-load-legend', xlDS);
  renderLegend('eff-energy-cr-legend',   ecDS);
  renderLegend('eff-exergy-cr-legend',   xcDS);
}

// ==============================
// NOx CHARTS DATA
// ==============================
var noxData = []; // { fuelKey, fuelLabel, cr, load, nox, unit }

function getNoxUnit() {
  var unitSel = document.getElementById('nox-unit').value;
  if (unitSel === 'custom') return (document.getElementById('nox-custom-unit-label').value.trim() || 'custom');
  return unitSel;
}

function addNoxPoint() {
  var fuelSel   = document.getElementById('nox-fuel');
  var fuelKey   = fuelSel.value;
  var fuelLabel = fuelSel.options[fuelSel.selectedIndex].text;
  var cr        = parseFloat(document.getElementById('nox-cr').value);
  var load      = parseFloat(document.getElementById('nox-load').value);
  var nox       = parseFloat(document.getElementById('nox-value').value);
  var unit      = getNoxUnit();

  if (isNaN(cr)   || cr < 1)  { alert('Please enter a valid Compression Ratio.'); return; }
  if (isNaN(load) || load < 0) { alert('Please enter a valid Brake Load.'); return; }
  if (isNaN(nox)  || nox < 0)  { alert('Please enter a valid NOx emission value.'); return; }

  noxData.push({ fuelKey: fuelKey, fuelLabel: fuelLabel, cr: cr, load: load, nox: nox, unit: unit });
  renderNoxTable();
  rebuildNoxCharts();
}

function removeNoxPoint(idx) {
  noxData.splice(idx, 1);
  renderNoxTable();
  rebuildNoxCharts();
}

function clearNoxData() {
  noxData = [];
  renderNoxTable();
  rebuildNoxCharts();
}

function renderNoxTable() {
  var wrap  = document.getElementById('nox-table-wrap');
  var tbody = document.getElementById('nox-tbody');
  if (noxData.length === 0) { wrap.style.display = 'none'; tbody.innerHTML = ''; return; }
  wrap.style.display = 'block';
  tbody.innerHTML = noxData.map(function(d, i) {
    var c = getNoxColor(d.fuelKey);
    return '<tr>' +
      '<td><span class="nox-fuel-dot" style="background:' + c.border + '"></span>' + escapeHtml(d.fuelLabel) + '</td>' +
      '<td>' + d.cr.toFixed(1) + '</td>' +
      '<td>' + d.load.toFixed(1) + '</td>' +
      '<td><b>' + formatAxisValue(d.nox) + '</b></td>' +
      '<td>' + escapeHtml(d.unit) + '</td>' +
      '<td><button class="nox-del-btn" onclick="removeNoxPoint(' + i + ')" title="Remove">&#10005;</button></td>' +
    '</tr>';
  }).join('');
}

function rebuildNoxCharts() {
  if (!noxCRChart || !noxLoadChart) return;

  var byFuel = {};
  noxData.forEach(function(d) {
    if (!byFuel[d.fuelKey]) byFuel[d.fuelKey] = { label: d.fuelLabel, unit: d.unit, crPts: [], loadPts: [] };
    byFuel[d.fuelKey].crPts.push({ x: d.cr,   y: d.nox });
    byFuel[d.fuelKey].loadPts.push({ x: d.load, y: d.nox });
  });

  var allNox = noxData.map(function(d) { return d.nox; });
  var yConfig  = getYAxisConfig(allNox);
  var stepSize = computeStepSize(yConfig);

  var units = noxData.map(function(d) { return d.unit; }).filter(function(v,i,a) { return a.indexOf(v) === i; });
  var yLabel = units.length === 1 ? 'NOx Emission (' + units[0] + ')' : 'NOx Emission';

  function buildNoxDS(fuelKey, ptsKey) {
    var f = byFuel[fuelKey];
    return buildDataset(fuelKey, f.label, f[ptsKey], getNoxColor(fuelKey), f.unit);
  }

  var crDS   = Object.keys(byFuel).map(function(k) { return buildNoxDS(k, 'crPts');   });
  var loadDS = Object.keys(byFuel).map(function(k) { return buildNoxDS(k, 'loadPts'); });

  noxCRChart.data.datasets   = crDS;
  noxLoadChart.data.datasets = loadDS;

  [noxCRChart, noxLoadChart].forEach(function(chart) {
    chart.options.scales.y.min                = yConfig.min;
    chart.options.scales.y.max                = yConfig.max;
    chart.options.scales.y.title.text         = yLabel;
    chart.options.scales.y.ticks.stepSize     = stepSize;
    chart.update();
  });

  renderLegend('nox-cr-legend',   crDS);
  renderLegend('nox-load-legend', loadDS);
}

// ==============================
// Tabs
// ==============================
function showTab(tabName, evt) {
  document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById(tabName + '-tab').classList.add('active');
  if (evt && evt.target) evt.target.classList.add('active');
}

// ==============================
// Calculator — results display
// ==============================
function animateResultUpdate(id) {
  var el = document.getElementById(id);
  if (el) { el.classList.add('updated'); setTimeout(function() { el.classList.remove('updated'); }, 500); }
}

function updateResults(results) {
  var fuelType = document.getElementById('fuelType').value;
  var cr       = parseFloat(document.getElementById('compressionRatio').value) || 16;
  var props    = getFuelProperties(fuelType);

  document.getElementById('currentFuelType').textContent        = getFuelDisplayName(fuelType);
  document.getElementById('currentCR').textContent              = cr.toFixed(1);
  document.getElementById('idealEfficiency').textContent        = results.idealEff.toFixed(2);
  document.getElementById('currentCetane').textContent          = props.cetane.toFixed(1);
  document.getElementById('torqueResult').textContent           = results.Torque.toFixed(2);
  document.getElementById('inputEnergy').textContent            = results.Ein.toFixed(3);
  document.getElementById('brakePower').textContent             = results.EbpKW.toFixed(3);
  document.getElementById('coolingWaterEnergy').textContent     = results.Ecw.toFixed(3);
  document.getElementById('exhaustGasEnergy').textContent       = results.Eeg.toFixed(3);
  document.getElementById('unaccountedEnergy').textContent      = results.Eunaccounted.toFixed(3);
  document.getElementById('energyEfficiency').textContent       = results.etaE.toFixed(2);
  document.getElementById('inputExergy').textContent            = results.ExIn.toFixed(3);
  document.getElementById('shaftExergy').textContent            = results.ExShaft.toFixed(3);
  document.getElementById('coolingWaterExergy').textContent     = results.ExCw.toFixed(3);
  document.getElementById('exhaustGasExergy').textContent       = results.ExEg.toFixed(3);
  document.getElementById('exergyDestruction').textContent      = results.ExD.toFixed(3);
  document.getElementById('exergyEfficiency').textContent       = results.etaEx.toFixed(2);
  document.getElementById('sustainabilityIndex').textContent    = results.SI.toFixed(3);
  document.getElementById('exergyPerformanceCoeff').textContent = results.EPC.toFixed(3);

  var ids = ['currentFuelType','currentCR','idealEfficiency','currentCetane','torqueResult',
    'inputEnergy','brakePower','coolingWaterEnergy','exhaustGasEnergy','unaccountedEnergy',
    'energyEfficiency','inputExergy','shaftExergy','coolingWaterExergy','exhaustGasExergy',
    'exergyDestruction','exergyEfficiency','sustainabilityIndex','exergyPerformanceCoeff'];
  ids.forEach(function(id, i) { setTimeout(function() { animateResultUpdate(id); }, i*50); });
}

function validateInputs() {
  var ids = ['fuelMassFlow','lhv','engineSpeed','airMassFlow','waterMassFlow',
             'waterTempIn','waterTempOut','exhaustTemp','ambientTemp','brakeLoad','armLength','compressionRatio'];
  for (var i = 0; i < ids.length; i++) {
    var v = parseFloat(document.getElementById(ids[i]).value);
    if (isNaN(v) || v < 0) { alert('Invalid value for: ' + ids[i]); return false; }
  }
  var T1 = parseFloat(document.getElementById('waterTempIn').value);
  var T2 = parseFloat(document.getElementById('waterTempOut').value);
  var T5 = parseFloat(document.getElementById('exhaustTemp').value);
  var Ta = parseFloat(document.getElementById('ambientTemp').value);
  if (T2 <= T1) { alert('Water outlet temperature must be higher than inlet.'); return false; }
  if (T5 <= Ta) { alert('Exhaust gas temperature must be higher than ambient.'); return false; }
  return true;
}

function calculateAll() {
  if (!validateInputs()) return;
  var btn = document.getElementById('calc-btn');
  btn.classList.add('loading'); btn.textContent = 'Calculating...';

  var mf  = parseFloat(document.getElementById('fuelMassFlow').value)   || 0;
  var lhv = parseFloat(document.getElementById('lhv').value)            || 0;
  var N   = parseFloat(document.getElementById('engineSpeed').value)    || 0;
  var ma  = parseFloat(document.getElementById('airMassFlow').value)    || 0;
  var mw  = parseFloat(document.getElementById('waterMassFlow').value)  || 0;
  var T1  = parseFloat(document.getElementById('waterTempIn').value)    || 0;
  var T2  = parseFloat(document.getElementById('waterTempOut').value)   || 0;
  var T5  = parseFloat(document.getElementById('exhaustTemp').value)    || 0;
  var Ta  = parseFloat(document.getElementById('ambientTemp').value)    || 0;
  var cr  = parseFloat(document.getElementById('compressionRatio').value) || 16;
  var bl  = parseFloat(document.getElementById('brakeLoad').value)      || 0;
  var arm = parseFloat(document.getElementById('armLength').value)      || 0.5;

  var Torque = bl * 9.81 * arm;
  var T1K = T1+273.15, T2K = T2+273.15, T5K = T5+273.15, TaK = Ta+273.15;

  var Ein          = mf * lhv * 1000;
  var EbpKW        = (2*Math.PI*N*Torque)/(60*1000);
  var Ecw          = mw * CP_WATER * (T2 - T1);
  var Eeg          = (ma+mf) * CP_EXHAUST * (T5 - Ta);
  var Eunaccounted = Ein - (EbpKW + Ecw + Eeg);
  var idealEff     = calculateIdealEfficiency(cr);
  var fuelType     = document.getElementById('fuelType').value;
  var fuelFactor   = getFuelEfficiencyFactor(fuelType);
  var crFactor     = getCRCorrectionFactor(cr);
  var etaE         = (EbpKW/Ein)*100*crFactor*fuelFactor;
  var exChem       = getChemicalExergyFactor();
  var ExIn         = mf * lhv * 1000 * exChem;
  var ExShaft      = EbpKW;
  var ExCw         = Ecw + (mw*CP_WATER*TaK*Math.log(T1K/T2K));
  var ExEg         = Eeg + ((ma+mf)*TaK*(CP_EXHAUST*Math.log(TaK/T5K)) - R_EXHAUST*Math.log(AMBIENT_PRESSURE/EXHAUST_PRESSURE));
  var ExD          = ExIn - (ExShaft + ExCw + ExEg);
  var etaEx        = (ExShaft/ExIn)*100;
  var SI           = 1/(1 - ExShaft/ExIn);
  var EPC          = ExShaft/ExD;

  var results = { Torque, Ein, EbpKW, Ecw, Eeg, Eunaccounted, idealEff,
    etaE, ExIn, ExShaft, ExCw, ExEg, ExD, etaEx, SI, EPC };

  setTimeout(function() {
    updateResults(results);
    btn.classList.remove('loading'); btn.textContent = 'Calculate';
  }, 400);
}

// ==============================
// PCS Simulation
// ==============================
var PCS = {
  deg2rad: function(d) { return d*Math.PI/180; },
  cylinderVolume: function(tDeg, bore, stroke, conrod, Vc) {
    var r = stroke/2, th = this.deg2rad(tDeg), t = r*Math.sin(th);
    var x = r*(1-Math.cos(th)) + conrod - Math.sqrt(Math.max(1e-12, conrod*conrod - t*t));
    return Vc + (Math.PI/4)*bore*bore*x;
  },
  wiebe: function(theta, soc, dur, a, m) {
    if (theta < soc) return 0;
    var x = (theta-soc)/dur;
    return x >= 1 ? 1 : 1 - Math.exp(-a*Math.pow(x, m+1));
  }
};

var pcsChartP = null, pcsChartQ = null;

function initPCSCharts() {
  function makeOpts(yLabel) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' } },
      scales: {
        x: { title: { display: true, text: 'Crank Angle (deg)', font: { size: 13, weight: 'bold' } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { title: { display: true, text: yLabel, font: { size: 13, weight: 'bold' } }, grid: { color: 'rgba(0,0,0,0.05)' } }
      }
    };
  }
  pcsChartP = new Chart(document.getElementById('pcs_chartP').getContext('2d'), {
    type: 'line', data: { labels: [], datasets: [{ label: 'Cylinder Pressure (bar)', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 2, tension: 0.15, pointRadius: 0, fill: true }] },
    options: makeOpts('Pressure (bar)')
  });
  pcsChartQ = new Chart(document.getElementById('pcs_chartQ').getContext('2d'), {
    type: 'line', data: { labels: [], datasets: [{ label: 'Heat Release Rate (kJ/deg)', data: [], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 2, tension: 0.15, pointRadius: 0, fill: true }] },
    options: makeOpts('Heat Release Rate (kJ/deg)')
  });
}

function runPCSSimulation() {
  var bore   = parseFloat(document.getElementById('pcs_bore').value)   || 0.08;
  var stroke = parseFloat(document.getElementById('pcs_stroke').value) || 0.09;
  var conrod = parseFloat(document.getElementById('pcs_conrod').value) || 0.15;
  var CR     = parseFloat(document.getElementById('pcs_cr').value)     || 17;
  var gamma  = parseFloat(document.getElementById('pcs_gamma').value)  || 1.35;
  var soc    = parseFloat(document.getElementById('pcs_soc').value)    || 355;
  var dur    = parseFloat(document.getElementById('pcs_dur').value)    || 40;
  var a      = parseFloat(document.getElementById('pcs_a').value)      || 5;
  var m      = parseFloat(document.getElementById('pcs_m').value)      || 2;
  var fuel_g = parseFloat(document.getElementById('pcs_fuel').value)   || 0.015;
  var LHV    = parseFloat(document.getElementById('pcs_lhv').value)    || 43000;
  var p0     = parseFloat(document.getElementById('pcs_initp').value)  || 101325;

  var Vswept = Math.PI/4*bore*bore*stroke, Vc = Vswept/(CR-1);
  var theta=[], V=[], xb=[];
  for (var t=0; t<=720; t+=0.5) {
    theta.push(t);
    V.push(PCS.cylinderVolume(((t+180)%360)-180, bore, stroke, conrod, Vc));
    xb.push(PCS.wiebe(t, soc, dur, a, m));
  }
  var Q_in = (fuel_g/1000)*LHV*1000, P = new Array(theta.length).fill(0), Qdot = new Array(theta.length).fill(0);
  P[0] = p0;
  for (var i=0; i<theta.length-1; i++) {
    var dQ = (xb[i+1]-xb[i])*Q_in; Qdot[i] = dQ;
    var dV = V[i+1]-V[i];
    if      (theta[i]>=0   && theta[i]<180) P[i+1] = p0;
    else if (theta[i]>=180 && theta[i]<540) P[i+1] = Math.max(P[i]+((gamma-1)/V[i])*dQ-(gamma*P[i]/V[i])*dV, p0*0.5);
    else                                     P[i+1] = p0*1.05;
  }
  var W_J=0;
  for (var j=0; j<theta.length-1; j++) if (theta[j]>=180&&theta[j]<540) W_J+=0.5*(P[j]+P[j+1])*(V[j+1]-V[j]);
  var Pmax=Math.max.apply(null,P), peakAngle=theta[P.indexOf(Pmax)];
  if (pcsChartP && pcsChartQ) {
    pcsChartP.data.labels = theta.slice();
    pcsChartP.data.datasets[0].data = P.map(function(p){return p/1e5;});
    pcsChartP.options.plugins.title = { display:true, text:'Peak: '+(Pmax/1e5).toFixed(1)+' bar @ '+peakAngle.toFixed(0)+'° CA', font:{size:12}, color:'#666' };
    pcsChartP.update();
    pcsChartQ.data.labels = theta.slice();
    pcsChartQ.data.datasets[0].data = Qdot.map(function(q){return q/1000;});
    pcsChartQ.update();
  }
  document.getElementById('pcs_W').textContent   = (W_J/1000).toFixed(4);
  document.getElementById('pcs_eta').textContent = (Q_in>0?(W_J/Q_in)*100:0).toFixed(3);
}

// ==============================
// DOMContentLoaded
// ==============================
document.addEventListener('DOMContentLoaded', function() {
  initCharts();

  document.getElementById('fuelType').addEventListener('change', updateFuelProperties);

  // NOx unit toggle
  var noxUnitSel = document.getElementById('nox-unit');
  if (noxUnitSel) {
    noxUnitSel.addEventListener('change', function() {
      var cg = document.getElementById('nox-custom-unit-group');
      var lb = document.getElementById('nox-value-label');
      if (this.value === 'custom') { cg.style.display='block'; lb.textContent='NOx Emission (custom unit)'; }
      else { cg.style.display='none'; lb.textContent='NOx Emission ('+this.value+')'; }
    });
  }

  if (document.getElementById('pcs_chartP') && document.getElementById('pcs_chartQ')) initPCSCharts();
  var pcsRunBtn = document.getElementById('pcs_run');
  if (pcsRunBtn) pcsRunBtn.addEventListener('click', runPCSSimulation);

  document.addEventListener('keydown', function(e) { if (e.key==='Escape') closeCustomFuelModal(); });
});