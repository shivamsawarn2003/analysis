// ==============================
// Constants for thermodynamic calculations
// ==============================
const CP_WATER = 4.18; // kJ/kg·K
const CP_EXHAUST = 1.15; // kJ/kg·K
const R_EXHAUST = 0.287; // kJ/kg·K
const AMBIENT_PRESSURE = 1.01325; // bar
const EXHAUST_PRESSURE = 1.05; // bar

let effEnergyChart, effExergyChart;
let crEnergyChart, crExergyChart;

// ==============================
// Chart.js Setup
// ==============================
function initCharts() {
  // Load-based charts
  const energyCtx = document.getElementById('energyChart').getContext('2d');
  const exergyCtx = document.getElementById('exergyChart').getContext('2d');

  effEnergyChart = new Chart(energyCtx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Energy Efficiency (%)', data: [], borderColor: '#3b82f6', borderWidth: 2, fill: false }] },
    options: { responsive: true, scales: { x: { title: { display: true, text: 'Load (kg)' } }, y: { title: { display: true, text: 'Energy Efficiency (%)' } } } }
  });

  effExergyChart = new Chart(exergyCtx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Exergy Efficiency (%)', data: [], borderColor: '#10b981', borderWidth: 2, fill: false }] },
    options: { responsive: true, scales: { x: { title: { display: true, text: 'Load (kg)' } }, y: { title: { display: true, text: 'Exergy Efficiency (%)' } } } }
  });

  // Compression Ratio charts
  const crEnergyCtx = document.getElementById('crEnergyChart').getContext('2d');
  const crExergyCtx = document.getElementById('crExergyChart').getContext('2d');

  crEnergyChart = new Chart(crEnergyCtx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Energy Efficiency (%)', data: [], borderColor: '#f97316', borderWidth: 2, fill: false }] },
    options: { responsive: true, scales: { x: { title: { display: true, text: 'Compression Ratio' } }, y: { title: { display: true, text: 'Energy Efficiency (%)' } } } }
  });

  crExergyChart = new Chart(crExergyCtx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Exergy Efficiency (%)', data: [], borderColor: '#8b5cf6', borderWidth: 2, fill: false }] },
    options: { responsive: true, scales: { x: { title: { display: true, text: 'Compression Ratio' } }, y: { title: { display: true, text: 'Exergy Efficiency (%)' } } } }
  });
}

// ==============================
// Update Charts
// ==============================
function updateCharts(results, brakeLoad) {
  const cr = parseFloat(document.getElementById('compressionRatio').value) || 16;

  // Load-based charts
  effEnergyChart.data.labels.push(brakeLoad);
  effEnergyChart.data.datasets[0].data.push(results.etaE);
  effEnergyChart.update();

  effExergyChart.data.labels.push(brakeLoad);
  effExergyChart.data.datasets[0].data.push(results.etaEx);
  effExergyChart.update();

  // Compression Ratio charts
  crEnergyChart.data.labels.push(cr);
  crEnergyChart.data.datasets[0].data.push(results.etaE);
  crEnergyChart.update();

  crExergyChart.data.labels.push(cr);
  crExergyChart.data.datasets[0].data.push(results.etaEx);
  crExergyChart.update();
}

// ==============================
// Tabs
// ==============================
function showTab(tabName) {
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => content.classList.remove('active'));

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => tab.classList.remove('active'));

  document.getElementById(tabName + '-tab').classList.add('active');
  event.target.classList.add('active');
}

// ==============================
// Fuel exergy factor
// ==============================
function toggleCustomFuelInputs() {
  const fuelType = document.getElementById('fuelType').value;
  const customGroup = document.getElementById('customFuelGroup');
  customGroup.style.display = (fuelType === 'custom') ? 'block' : 'none';
}

function getChemicalExergyFactor() {
  const fuelType = document.getElementById('fuelType').value;
  let hcRatio, ocRatio, scRatio;

  switch (fuelType) {
    case 'diesel': hcRatio = 1.8; ocRatio = 0.0; scRatio = 0.0; break;
    case 'biodiesel20': hcRatio = 1.78; ocRatio = 0.04; scRatio = 0.0; break;
    case 'custom':
      hcRatio = parseFloat(document.getElementById('hcRatio').value) || 0;
      ocRatio = parseFloat(document.getElementById('ocRatio').value) || 0;
      scRatio = parseFloat(document.getElementById('scRatio').value) || 0;
      break;
    default: hcRatio = 1.8; ocRatio = 0.0; scRatio = 0.0;
  }

  return 1.0374 + 0.0159 * hcRatio + 0.0567 * ocRatio +
         0.5985 * scRatio * (1 - 0.1737 * hcRatio);
}

// ==============================
// Animations & Updates
// ==============================
function animateResultUpdate(elementId) {
  const element = document.getElementById(elementId);
  element.classList.add('updated');
  setTimeout(() => element.classList.remove('updated'), 500);
}

function updateResults(results) {
  document.getElementById('torqueResult').textContent = results.Torque.toFixed(2);
  document.getElementById('inputEnergy').textContent = results.Ein.toFixed(3);
  document.getElementById('brakePower').textContent = results.EbpKW.toFixed(3);
  document.getElementById('coolingWaterEnergy').textContent = results.Ecw.toFixed(3);
  document.getElementById('exhaustGasEnergy').textContent = results.Eeg.toFixed(3);
  document.getElementById('unaccountedEnergy').textContent = results.Eunaccounted.toFixed(3);
  document.getElementById('energyEfficiency').textContent = results.etaE.toFixed(2);

  document.getElementById('inputExergy').textContent = results.ExIn.toFixed(3);
  document.getElementById('shaftExergy').textContent = results.ExShaft.toFixed(3);
  document.getElementById('coolingWaterExergy').textContent = results.ExCw.toFixed(3);
  document.getElementById('exhaustGasExergy').textContent = results.ExEg.toFixed(3);
  document.getElementById('exergyDestruction').textContent = results.ExD.toFixed(3);
  document.getElementById('exergyEfficiency').textContent = results.etaEx.toFixed(2);

  document.getElementById('sustainabilityIndex').textContent = results.SI.toFixed(3);
  document.getElementById('exergyPerformanceCoeff').textContent = results.EPC.toFixed(3);

  const ids = [
    'torqueResult','inputEnergy','brakePower','coolingWaterEnergy','exhaustGasEnergy',
    'unaccountedEnergy','energyEfficiency','inputExergy','shaftExergy',
    'coolingWaterExergy','exhaustGasExergy','exergyDestruction',
    'exergyEfficiency','sustainabilityIndex','exergyPerformanceCoeff'
  ];
  ids.forEach((id,i)=>setTimeout(()=>animateResultUpdate(id), i*50));
}

// ==============================
// Input validation
// ==============================
function validateInputs() {
  const inputs = ['fuelMassFlow','lhv','engineSpeed','airMassFlow','waterMassFlow','waterTempIn','waterTempOut','exhaustTemp','ambientTemp','brakeLoad','armLength','compressionRatio'];
  for (let id of inputs) {
    const v = parseFloat(document.getElementById(id).value);
    if (isNaN(v) || v < 0) {
      alert(`Invalid value for ${id}`);
      return false;
    }
  }
  const T1 = parseFloat(document.getElementById('waterTempIn').value);
  const T2 = parseFloat(document.getElementById('waterTempOut').value);
  const T5 = parseFloat(document.getElementById('exhaustTemp').value);
  const Ta = parseFloat(document.getElementById('ambientTemp').value);
  if (T2 <= T1) { alert('Water outlet must be higher than inlet'); return false; }
  if (T5 <= Ta) { alert('Exhaust temp must be higher than ambient'); return false; }
  return true;
}

// ==============================
// Main Calculation
// ==============================
function calculateAll() {
  if (!validateInputs()) return;

  const calculateBtn = document.querySelector('.calculate-btn');
  calculateBtn.classList.add('loading');
  calculateBtn.textContent = 'Calculating...';

  const mf = parseFloat(document.getElementById('fuelMassFlow').value) || 0;
  const lhv = parseFloat(document.getElementById('lhv').value) || 0;
  const N = parseFloat(document.getElementById('engineSpeed').value) || 0;
  const ma = parseFloat(document.getElementById('airMassFlow').value) || 0;
  const mw = parseFloat(document.getElementById('waterMassFlow').value) || 0;
  const T1 = parseFloat(document.getElementById('waterTempIn').value) || 0;
  const T2 = parseFloat(document.getElementById('waterTempOut').value) || 0;
  const T5 = parseFloat(document.getElementById('exhaustTemp').value) || 0;
  const Ta = parseFloat(document.getElementById('ambientTemp').value) || 0;

  const brakeLoad = parseFloat(document.getElementById('brakeLoad').value) || 0; // kg
  const armLength = parseFloat(document.getElementById('armLength').value) || 0.5; // m
  const W = brakeLoad * 9.81; // N
  const T = W * armLength;    // Nm

  const T1K = T1+273.15, T2K = T2+273.15, T5K = T5+273.15, TaK = Ta+273.15;

  const Ein = mf * lhv * 1000; // kW
  const Ebp = (2 * Math.PI * N * T) / 60; // W
  const EbpKW = Ebp / 1000; // kW

  const Ecw = mw * CP_WATER * (T2 - T1);
  const Eeg = (ma + mf) * CP_EXHAUST * (T5 - Ta);
  const Eunaccounted = Ein - (EbpKW + Ecw + Eeg);
  const etaE = (EbpKW / Ein) * 100;

  const exChem = getChemicalExergyFactor();
  const ExIn = mf * lhv * 1000 * exChem;
  const ExShaft = EbpKW;
  const ExCw = Ecw + (mw * CP_WATER * TaK * Math.log(T1K / T2K));
  const ExEg = Eeg + ((ma+mf) * TaK * (CP_EXHAUST * Math.log(TaK / T5K)) - (R_EXHAUST * Math.log(AMBIENT_PRESSURE/EXHAUST_PRESSURE)));
  const ExD = ExIn - (ExShaft + ExCw + ExEg);
  const etaEx = (ExShaft/ExIn)*100;
  const SI = 1/(1-(ExShaft/ExIn));
  const EPC = ExShaft/ExD;

  const results = { Torque:T, Ein,EbpKW,Ecw,Eeg,Eunaccounted,etaE,ExIn,ExShaft,ExCw,ExEg,ExD,etaEx,SI,EPC };

  setTimeout(()=>{
    updateResults(results);
    updateCharts(results, brakeLoad);
    calculateBtn.classList.remove('loading');
    calculateBtn.textContent = 'Calculate';
  },500);
}

// ==============================
// Utility Functions
// ==============================
function resetInputs() {
  document.getElementById('fuelMassFlow').value='0.0008';
  document.getElementById('lhv').value='42.5';
  document.getElementById('engineSpeed').value='1500';
  document.getElementById('airMassFlow').value='0.02';
  document.getElementById('waterMassFlow').value='0.15';
  document.getElementById('waterTempIn').value='25';
  document.getElementById('waterTempOut').value='65';
  document.getElementById('exhaustTemp').value='450';
  document.getElementById('ambientTemp').value='25';
  document.getElementById('brakeLoad').value='10';
  document.getElementById('armLength').value='0.5';
  document.getElementById('compressionRatio').value='16';
  document.getElementById('fuelType').value='diesel';
  toggleCustomFuelInputs();
}

function exportResults() {
  const results = {
    'Torque (Nm)': document.getElementById('torqueResult').textContent,
    'Input Energy (kW)': document.getElementById('inputEnergy').textContent,
    'Brake Power (kW)': document.getElementById('brakePower').textContent,
    'Cooling Water Energy (kW)': document.getElementById('coolingWaterEnergy').textContent,
    'Exhaust Gas Energy (kW)': document.getElementById('exhaustGasEnergy').textContent,
    'Unaccounted Energy (kW)': document.getElementById('unaccountedEnergy').textContent,
    'Energy Efficiency (%)': document.getElementById('energyEfficiency').textContent,
    'Input Exergy (kW)': document.getElementById('inputExergy').textContent,
    'Shaft Exergy (kW)': document.getElementById('shaftExergy').textContent,
    'Cooling Water Exergy Loss (kW)': document.getElementById('coolingWaterExergy').textContent,
    'Exhaust Gas Exergy Loss (kW)': document.getElementById('exhaustGasExergy').textContent,
    'Exergy Destruction (kW)': document.getElementById('exergyDestruction').textContent,
    'Exergy Efficiency (%)': document.getElementById('exergyEfficiency').textContent,
    'Sustainability Index': document.getElementById('sustainabilityIndex').textContent,
    'Exergy Performance Coefficient': document.getElementById('exergyPerformanceCoeff').textContent
  };

  let csv = 'Parameter,Value\n';
  Object.entries(results).forEach(([k,v])=>csv += `${k},${v}\n`);

  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='energy_exergy_results.csv';
  a.click(); URL.revokeObjectURL(url);
}

function printResults(){ window.print(); }

// ==============================
// Event Listeners
// ==============================
document.addEventListener('DOMContentLoaded',()=>{
  initCharts();
  document.getElementById('fuelType').addEventListener('change', toggleCustomFuelInputs);

  const numericInputs = document.querySelectorAll('input[type="number"]');
  numericInputs.forEach(input=>{
    input.addEventListener('input',function(){ this.value=this.value.replace(/[^0-9.-]/g,''); });
   
  });

  document.querySelector('.calculate-btn').addEventListener('click', calculateAll);
  document.querySelector('.reset-btn').addEventListener('click', resetInputs);
  document.querySelector('.export-btn').addEventListener('click', exportResults);
  document.querySelector('.print-btn').addEventListener('click', printResults);

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab=>{
    tab.addEventListener('click', (event)=>{
      showTab(tab.dataset.tab);
    });
  });
});
