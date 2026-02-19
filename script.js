// ==============================
// Constants
// ==============================
const CP_WATER        = 4.18;
const CP_EXHAUST      = 1.15;
const R_EXHAUST       = 0.287;
const AMBIENT_PRESSURE = 1.01325;
const EXHAUST_PRESSURE = 1.05;
const GAMMA           = 1.35;

let energyLoadChart, exergyLoadChart, energyCRChart, exergyCRChart;

// ==============================
// Color pools
// ==============================
const CUSTOM_COLOR_POOL = [
  { border: '#8b5cf6', bg: 'rgba(139,92,246,0.55)' },
  { border: '#ef4444', bg: 'rgba(239,68,68,0.55)' },
  { border: '#06b6d4', bg: 'rgba(6,182,212,0.55)' },
  { border: '#ec4899', bg: 'rgba(236,72,153,0.55)' },
  { border: '#84cc16', bg: 'rgba(132,204,22,0.55)' },
  { border: '#f97316', bg: 'rgba(249,115,22,0.55)' },
  { border: '#14b8a6', bg: 'rgba(20,184,166,0.55)' },
  { border: '#a855f7', bg: 'rgba(168,85,247,0.55)' },
  { border: '#64748b', bg: 'rgba(100,116,139,0.55)' },
  { border: '#dc2626', bg: 'rgba(220,38,38,0.55)' },
];

const BUILTIN_COLORS = {
  diesel:       { border: '#3b82f6', bg: 'rgba(59,130,246,0.55)' },
  biodiesel20:  { border: '#10b981', bg: 'rgba(16,185,129,0.55)' },
  biodiesel100: { border: '#f59e0b', bg: 'rgba(245,158,11,0.55)' },
};

const BUILTIN_NAMES = {
  diesel:       'Diesel (B0)',
  biodiesel20:  'Biodiesel B20',
  biodiesel100: 'Biodiesel B100',
};

// ==============================
// Built-in fuel properties
// ==============================
const BUILTIN_FUELS = {
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
// key  = 'custom_N'  (N = 1,2,3…)
// Each record: { name, lhv, density, viscosity, cetane, flashPoint,
//               hcRatio, ocRatio, scRatio, colorIndex }
// ==============================
let customFuels   = {};   // all saved custom fuels
let customCounter = 0;    // monotonically increasing ID counter
let editingFuelId = null; // null = creating new; string = editing existing

// ----------------------------------------------------------------
// Derive thermo props from a saved custom fuel record
// ----------------------------------------------------------------
function buildCustomProps(rec) {
  const combEff = Math.max(0.85, 1.0 - Math.max(0, (rec.viscosity - 2.5) * 0.008));
  const ignQual = Math.max(0.90, Math.min(1.15, 1.0 + (rec.cetane - 50) * 0.004));
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
  return CUSTOM_COLOR_POOL[0];
}

function getFuelDisplayName(fuelType) {
  if (BUILTIN_NAMES[fuelType]) return BUILTIN_NAMES[fuelType];
  if (customFuels[fuelType])   return customFuels[fuelType].name;
  return 'Unknown Fuel';
}

// ==============================
// Main dropdown onChange
// ==============================
function updateFuelProperties() {
  const sel   = document.getElementById('fuelType');
  const props = getFuelProperties(sel.value);
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
  if (e.target === document.getElementById('customFuelModal')) {
    closeCustomFuelModal();
  }
}

// ==============================
// Prepare the form for a NEW fuel
// ==============================
function prepareNewFuelForm() {
  editingFuelId = null;
  document.getElementById('modalFormTitle').textContent         = '➕ New Custom Fuel';
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

// ==============================
// Load an existing fuel into the form for editing
// ==============================
function editCustomFuel(id) {
  if (!customFuels[id]) return;
  editingFuelId = id;
  const r = customFuels[id];
  document.getElementById('modalFormTitle').textContent         = '✏️ Edit: ' + r.name;
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

// ==============================
// Save (create or update) a custom fuel
// ==============================
function saveCustomFuel() {
  const name = document.getElementById('customFuelName').value.trim();
  if (!name) {
    alert('Please enter a fuel name before saving.');
    document.getElementById('customFuelName').focus();
    return;
  }

  const record = {
    name,
    hcRatio:    parseFloat(document.getElementById('hcRatio').value)     || 1.8,
    ocRatio:    parseFloat(document.getElementById('ocRatio').value)     || 0.0,
    scRatio:    parseFloat(document.getElementById('scRatio').value)     || 0.0,
    density:    parseFloat(document.getElementById('fuelDensity').value) || 830,
    viscosity:  parseFloat(document.getElementById('fuelViscosity').value)|| 2.5,
    cetane:     parseFloat(document.getElementById('cetaneNumber').value) || 50,
    lhv:        parseFloat(document.getElementById('customLHV').value)   || 42.5,
    flashPoint: parseFloat(document.getElementById('flashPoint').value)  || 55,
  };

  if (editingFuelId) {
    // ---- UPDATE existing ----
    record.colorIndex = customFuels[editingFuelId].colorIndex;
    customFuels[editingFuelId] = record;
    // Update its label in the dropdown
    const opt = document.querySelector('#fuelType option[value="' + editingFuelId + '"]');
    if (opt) opt.textContent = record.name;
    // If it's currently active, sync the LHV input
    if (document.getElementById('fuelType').value === editingFuelId) {
      document.getElementById('lhv').value = record.lhv;
    }
    showModalToast('✅ Fuel updated!');
  } else {
    // ---- CREATE new ----
    const id = 'custom_' + (++customCounter);
    record.colorIndex = (customCounter - 1) % CUSTOM_COLOR_POOL.length;
    customFuels[id] = record;
    // Add <option> to the main dropdown
    addFuelOption(id, record.name);
    // Auto-select the new fuel
    document.getElementById('fuelType').value = id;
    document.getElementById('lhv').value = record.lhv;
    showModalToast('✅ Fuel created and selected!');
  }

  renderSavedFuelsList();
  prepareNewFuelForm(); // Reset form ready for another entry
}

// ==============================
// Delete a custom fuel
// ==============================
function deleteCustomFuel() {
  if (!editingFuelId) return;
  const name = customFuels[editingFuelId] ? customFuels[editingFuelId].name : 'this fuel';
  if (!confirm('Delete "' + name + '"? This cannot be undone.')) return;

  // Remove from dropdown
  const opt = document.querySelector('#fuelType option[value="' + editingFuelId + '"]');
  if (opt) opt.remove();

  // If it was currently selected, fall back to diesel
  const sel = document.getElementById('fuelType');
  if (sel.value === editingFuelId) {
    sel.value = 'diesel';
    document.getElementById('lhv').value = BUILTIN_FUELS.diesel.lhv;
  }

  delete customFuels[editingFuelId];
  editingFuelId = null;
  renderSavedFuelsList();
  prepareNewFuelForm();
}

// ==============================
// Add an <option> to the main dropdown
// ==============================
function addFuelOption(id, name) {
  const sel = document.getElementById('fuelType');
  const opt = document.createElement('option');
  opt.value       = id;
  opt.textContent = name;
  sel.appendChild(opt);
}

// ==============================
// Render the saved-fuels cards inside the modal
// ==============================
function renderSavedFuelsList() {
  const container  = document.getElementById('savedFuelsContainer');
  const noMsg      = document.getElementById('noFuelsMsg');
  const countBadge = document.getElementById('savedFuelCount');
  const ids        = Object.keys(customFuels);
  const currentSel = document.getElementById('fuelType').value;

  countBadge.textContent = ids.length;

  if (ids.length === 0) {
    container.innerHTML = '';
    container.appendChild(noMsg);
    noMsg.style.display = 'block';
    return;
  }

  noMsg.style.display = 'none';
  container.innerHTML = '';

  ids.forEach(function(id) {
    const r       = customFuels[id];
    const color   = CUSTOM_COLOR_POOL[r.colorIndex % CUSTOM_COLOR_POOL.length];
    const isSel   = (currentSel === id);
    const isEdit  = (editingFuelId === id);

    const card = document.createElement('div');
    card.className = 'fuel-card' + (isSel ? ' fuel-card--active' : '') + (isEdit ? ' fuel-card--editing' : '');

    card.innerHTML =
      '<div class="fuel-card-strip" style="background:' + color.border + '"></div>' +
      '<div class="fuel-card-body">' +
        '<div class="fuel-card-name">' + escapeHtml(r.name) + '</div>' +
        '<div class="fuel-card-meta">' +
          'LHV <b>' + r.lhv + '</b> MJ/kg &nbsp;|&nbsp; ' +
          'CN <b>' + r.cetane + '</b> &nbsp;|&nbsp; ' +
          'H/C <b>' + r.hcRatio + '</b> &nbsp;|&nbsp; ' +
          'O/C <b>' + r.ocRatio + '</b>' +
        '</div>' +
        '<div class="fuel-card-meta">' +
          'ρ <b>' + r.density + '</b> kg/m³ &nbsp;|&nbsp; ' +
          'ν <b>' + r.viscosity + '</b> cSt &nbsp;|&nbsp; ' +
          'FP <b>' + r.flashPoint + '</b> °C' +
        '</div>' +
      '</div>' +
      '<div class="fuel-card-btns">' +
        (isSel
          ? '<span class="badge-selected">✔ Selected</span>'
          : '<button class="btn-card-select" onclick="selectFuelFromModal(\'' + id + '\')">Select</button>') +
        '<button class="btn-card-edit' + (isEdit ? ' btn-card-edit--active' : '') + '" onclick="editCustomFuel(\'' + id + '\')">✏️ Edit</button>' +
      '</div>';

    container.appendChild(card);
  });
}

// ==============================
// Select a fuel from inside the modal (without closing it)
// ==============================
function selectFuelFromModal(id) {
  if (!customFuels[id]) return;
  document.getElementById('fuelType').value = id;
  document.getElementById('lhv').value      = customFuels[id].lhv;
  renderSavedFuelsList(); // refresh badges
}

// ==============================
// Small in-modal toast notification
// ==============================
function showModalToast(msg) {
  var toast = document.getElementById('modalToast');
  if (!toast) {
    toast            = document.createElement('div');
    toast.id         = 'modalToast';
    toast.className  = 'modal-toast';
    document.getElementById('modalFormActions').appendChild(toast);
  }
  toast.textContent  = msg;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { toast.style.display = 'none'; }, 400);
  }, 2200);
}

// XSS-safe
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ==============================
// Fuel efficiency helpers
// ==============================
function getFuelEfficiencyFactor(fuelType) {
  const p = getFuelProperties(fuelType);
  const viscPenalty = Math.max(0.9, 1.0 - (p.viscosity - 2.5) * 0.01);
  return p.combustionEfficiency * p.ignitionQuality * viscPenalty;
}

function calculateIdealEfficiency(cr) {
  return (1 - Math.pow(cr, 1 - GAMMA)) * 100;
}

function getCRCorrectionFactor(cr) {
  return 1 + 0.015 * (cr - 16);
}

function getChemicalExergyFactor() {
  const fuelType = document.getElementById('fuelType').value;
  const p        = getFuelProperties(fuelType);
  return 1.0374 + 0.0159 * p.hcRatio + 0.0567 * p.ocRatio +
         0.5985 * p.scRatio * (1 - 0.1737 * p.hcRatio);
}

// ==============================
// Chart.js — 4 charts
// ==============================
function initCharts() {
  function makeChart(ctxId, titleText, xLabel, yLabel) {
    return new Chart(document.getElementById(ctxId).getContext('2d'), {
      type: 'line',
      data: { datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: {
            display: true, position: 'top',
            labels: { padding: 15, font: { size: 12 }, boxWidth: 30, boxHeight: 12 }
          },
          title: {
            display: true, text: titleText,
            font: { size: 16, weight: 'bold' },
            padding: { top: 10, bottom: 15 }
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10,
            callbacks: {
              label: function(ctx) {
                return (ctx.dataset.label || '') + ': ' + ctx.parsed.y.toFixed(2) + '%';
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: xLabel, font: { size: 14, weight: 'bold' } },
            grid: { color: 'rgba(0,0,0,0.1)' }
          },
          y: {
            type: 'linear',
            title: { display: true, text: yLabel, font: { size: 14, weight: 'bold' } },
            grid: { color: 'rgba(0,0,0,0.1)' }
          }
        }
      }
    });
  }

  energyLoadChart  = makeChart('energyLoadChart',  'Energy Efficiency vs Brake Load',        'Brake Load (kg)',   'Energy Efficiency (%)');
  exergyLoadChart  = makeChart('exergyLoadChart',  'Exergy Efficiency vs Brake Load',        'Brake Load (kg)',   'Exergy Efficiency (%)');
  energyCRChart    = makeChart('energyCRChart',    'Energy Efficiency vs Compression Ratio', 'Compression Ratio', 'Energy Efficiency (%)');
  exergyCRChart    = makeChart('exergyCRChart',    'Exergy Efficiency vs Compression Ratio', 'Compression Ratio', 'Exergy Efficiency (%)');
}

function updateCharts(results, brakeLoad, fuelType) {
  var cr    = parseFloat(document.getElementById('compressionRatio').value) || 16;
  var color = getFuelColor(fuelType);
  var name  = getFuelDisplayName(fuelType);

  function getOrCreate(chart) {
    var ds = chart.data.datasets.find(function(d) { return d.fuelType === fuelType; });
    if (!ds) {
      ds = {
        label: name, fuelType: fuelType,
        data: [],
        borderColor: color.border, backgroundColor: color.bg,
        borderWidth: 3, pointRadius: 5, pointHoverRadius: 7,
        pointBackgroundColor: color.border, pointBorderColor: '#fff', pointBorderWidth: 2,
        tension: 0.3, fill: false
      };
      chart.data.datasets.push(ds);
    }
    return ds;
  }

  var d1 = getOrCreate(energyLoadChart);
  d1.data.push({ x: brakeLoad, y: results.etaE });
  d1.data.sort(function(a,b){ return a.x - b.x; });
  energyLoadChart.update();

  var d2 = getOrCreate(exergyLoadChart);
  d2.data.push({ x: brakeLoad, y: results.etaEx });
  d2.data.sort(function(a,b){ return a.x - b.x; });
  exergyLoadChart.update();

  var d3 = getOrCreate(energyCRChart);
  d3.data.push({ x: cr, y: results.etaE });
  d3.data.sort(function(a,b){ return a.x - b.x; });
  energyCRChart.update();

  var d4 = getOrCreate(exergyCRChart);
  d4.data.push({ x: cr, y: results.etaEx });
  d4.data.sort(function(a,b){ return a.x - b.x; });
  exergyCRChart.update();
}

function clearChartData() {
  [energyLoadChart, exergyLoadChart, energyCRChart, exergyCRChart].forEach(function(c) {
    if (c) { c.data.datasets = []; c.update(); }
  });
}

// ==============================
// Tabs
// ==============================
function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById(tabName + '-tab').classList.add('active');
  event.target.classList.add('active');
}

// ==============================
// Results display
// ==============================
function animateResultUpdate(id) {
  var el = document.getElementById(id);
  if (el) {
    el.classList.add('updated');
    setTimeout(function() { el.classList.remove('updated'); }, 500);
  }
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
  ids.forEach(function(id, i) { setTimeout(function() { animateResultUpdate(id); }, i * 50); });
}

// ==============================
// Validation
// ==============================
function validateInputs() {
  var ids = ['fuelMassFlow','lhv','engineSpeed','airMassFlow','waterMassFlow',
             'waterTempIn','waterTempOut','exhaustTemp','ambientTemp',
             'brakeLoad','armLength','compressionRatio'];
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

// ==============================
// Main Calculation
// ==============================
function calculateAll() {
  if (!validateInputs()) return;

  var btn = document.querySelector('.calculate-btn');
  btn.classList.add('loading'); btn.textContent = 'Calculating…';

  var mf  = parseFloat(document.getElementById('fuelMassFlow').value) || 0;
  var lhv = parseFloat(document.getElementById('lhv').value) || 0;
  var N   = parseFloat(document.getElementById('engineSpeed').value) || 0;
  var ma  = parseFloat(document.getElementById('airMassFlow').value) || 0;
  var mw  = parseFloat(document.getElementById('waterMassFlow').value) || 0;
  var T1  = parseFloat(document.getElementById('waterTempIn').value) || 0;
  var T2  = parseFloat(document.getElementById('waterTempOut').value) || 0;
  var T5  = parseFloat(document.getElementById('exhaustTemp').value) || 0;
  var Ta  = parseFloat(document.getElementById('ambientTemp').value) || 0;
  var cr  = parseFloat(document.getElementById('compressionRatio').value) || 16;
  var bl  = parseFloat(document.getElementById('brakeLoad').value) || 0;
  var arm = parseFloat(document.getElementById('armLength').value) || 0.5;

  var Torque = bl * 9.81 * arm;
  var T1K = T1+273.15, T2K = T2+273.15, T5K = T5+273.15, TaK = Ta+273.15;

  var Ein          = mf * lhv * 1000;
  var EbpKW        = (2 * Math.PI * N * Torque) / (60 * 1000);
  var Ecw          = mw * CP_WATER * (T2 - T1);
  var Eeg          = (ma + mf) * CP_EXHAUST * (T5 - Ta);
  var Eunaccounted = Ein - (EbpKW + Ecw + Eeg);
  var idealEff     = calculateIdealEfficiency(cr);

  var fuelType   = document.getElementById('fuelType').value;
  var fuelFactor = getFuelEfficiencyFactor(fuelType);
  var crFactor   = getCRCorrectionFactor(cr);

  var etaE    = (EbpKW / Ein) * 100 * crFactor * fuelFactor;
  var exChem  = getChemicalExergyFactor();
  var ExIn    = mf * lhv * 1000 * exChem;
  var ExShaft = EbpKW;
  var ExCw    = Ecw + (mw * CP_WATER * TaK * Math.log(T1K / T2K));
  var ExEg    = Eeg + ((ma+mf) * TaK * (CP_EXHAUST * Math.log(TaK / T5K)) - R_EXHAUST * Math.log(AMBIENT_PRESSURE / EXHAUST_PRESSURE));
  var ExD     = ExIn - (ExShaft + ExCw + ExEg);
  var etaEx   = (ExShaft / ExIn) * 100 * crFactor * fuelFactor;
  var SI      = 1 / (1 - ExShaft / ExIn);
  var EPC     = ExShaft / ExD;

  var results = { Torque: Torque, Ein: Ein, EbpKW: EbpKW, Ecw: Ecw, Eeg: Eeg,
    Eunaccounted: Eunaccounted, idealEff: idealEff, etaE: etaE,
    ExIn: ExIn, ExShaft: ExShaft, ExCw: ExCw, ExEg: ExEg,
    ExD: ExD, etaEx: etaEx, SI: SI, EPC: EPC };

  setTimeout(function() {
    updateResults(results);
    updateCharts(results, bl, fuelType);
    btn.classList.remove('loading');
    btn.textContent = 'Calculate';
  }, 500);
}

// ==============================
// PCS Simulation
// ==============================
var PCS = {
  deg2rad: function(d) { return d * Math.PI / 180; },
  cylinderVolume: function(tDeg, bore, stroke, conrod, Vc) {
    var r = stroke / 2, th = this.deg2rad(tDeg);
    var t = r * Math.sin(th);
    var x = r*(1-Math.cos(th)) + conrod - Math.sqrt(Math.max(1e-12, conrod*conrod - t*t));
    return Vc + (Math.PI/4)*bore*bore*x;
  },
  wiebe: function(theta, soc, dur, a, m) {
    if (theta < soc) return 0;
    var x = (theta - soc) / dur;
    if (x >= 1) return 1;
    return 1 - Math.exp(-a * Math.pow(x, m+1));
  }
};

var pcsChartP = null, pcsChartQ = null;

function initPCSCharts() {
  function makeOpts(yLabel) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top' }, title: { display: false } },
      scales: {
        x: { title: { display: true, text: 'Crank Angle (deg)', font: { size: 13, weight: 'bold' } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { title: { display: true, text: yLabel,              font: { size: 13, weight: 'bold' } }, grid: { color: 'rgba(0,0,0,0.05)' } }
      }
    };
  }

  pcsChartP = new Chart(document.getElementById('pcs_chartP').getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Cylinder Pressure (bar)', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 2, tension: 0.15, pointRadius: 0, fill: true }] },
    options: makeOpts('Pressure (bar)')
  });

  pcsChartQ = new Chart(document.getElementById('pcs_chartQ').getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Heat Release Rate (kJ/deg)', data: [], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 2, tension: 0.15, pointRadius: 0, fill: true }] },
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

  var Vswept = Math.PI/4 * bore*bore * stroke;
  var Vc     = Vswept / (CR - 1);
  var theta = [], V = [], xb = [];
  for (var t = 0; t <= 720; t += 0.5) {
    theta.push(t);
    V.push(PCS.cylinderVolume(((t+180)%360)-180, bore, stroke, conrod, Vc));
    xb.push(PCS.wiebe(t, soc, dur, a, m));
  }

  var Q_in = (fuel_g/1000) * LHV * 1000;
  var P    = new Array(theta.length).fill(0);
  var Qdot = new Array(theta.length).fill(0);
  P[0] = p0;

  for (var i = 0; i < theta.length-1; i++) {
    var dQ = (xb[i+1] - xb[i]) * Q_in;
    Qdot[i] = dQ;
    var dV = V[i+1] - V[i];
    if (theta[i] >= 0 && theta[i] < 180) {
      P[i+1] = p0;
    } else if (theta[i] >= 180 && theta[i] < 540) {
      P[i+1] = Math.max(P[i] + ((gamma-1)/V[i])*dQ - (gamma*P[i]/V[i])*dV, p0*0.5);
    } else {
      P[i+1] = p0 * 1.05;
    }
  }

  var W_J = 0;
  for (var j = 0; j < theta.length-1; j++) {
    if (theta[j] >= 180 && theta[j] < 540) W_J += 0.5*(P[j]+P[j+1])*(V[j+1]-V[j]);
  }

  var Pmax = Math.max.apply(null, P);
  var peakAngle = theta[P.indexOf(Pmax)];

  if (pcsChartP && pcsChartQ) {
    pcsChartP.data.labels = theta.slice();
    pcsChartP.data.datasets[0].data = P.map(function(p) { return p/1e5; });
    pcsChartP.options.plugins.title = { display: true, text: 'Peak: ' + (Pmax/1e5).toFixed(1) + ' bar @ ' + peakAngle.toFixed(0) + '° CA', font: { size: 12 }, color: '#666' };
    pcsChartP.update();
    pcsChartQ.data.labels = theta.slice();
    pcsChartQ.data.datasets[0].data = Qdot.map(function(q) { return q/1000; });
    pcsChartQ.update();
  }

  document.getElementById('pcs_W').textContent   = (W_J/1000).toFixed(4);
  document.getElementById('pcs_eta').textContent = (Q_in > 0 ? (W_J/Q_in)*100 : 0).toFixed(3);
}

// ==============================
// DOMContentLoaded
// ==============================
document.addEventListener('DOMContentLoaded', function() {
  initCharts();

  document.getElementById('fuelType').addEventListener('change', updateFuelProperties);

  document.querySelectorAll('input[type="number"]').forEach(function(inp) {
    inp.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9.-]/g, '');
    });
  });

  document.querySelector('.calculate-btn').addEventListener('click', calculateAll);

  if (document.getElementById('pcs_chartP') && document.getElementById('pcs_chartQ')) {
    initPCSCharts();
  }
  var pcsRunBtn = document.getElementById('pcs_run');
  if (pcsRunBtn) pcsRunBtn.addEventListener('click', runPCSSimulation);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeCustomFuelModal();
  });
});