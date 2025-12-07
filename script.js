// ==============================
// Constants for thermodynamic calculations
// ==============================
const CP_WATER = 4.18; // kJ/kg·K
const CP_EXHAUST = 1.15; // kJ/kg·K
const R_EXHAUST = 0.287; // kJ/kg·K
const AMBIENT_PRESSURE = 1.01325; // bar
const EXHAUST_PRESSURE = 1.05; // bar
const GAMMA = 1.35; // Specific heat ratio for air

let energyLoadChart, exergyLoadChart, energyCRChart, exergyCRChart;

// Fuel colors for comparison
const fuelColors = {
  'diesel': { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.6)' },
  'biodiesel20': { border: '#10b981', bg: 'rgba(16, 185, 129, 0.6)' },
  'biodiesel100': { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.6)' },
  'custom': { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.6)' }
};

const fuelNames = {
  'diesel': 'Diesel (B0)',
  'biodiesel20': 'Biodiesel B20',
  'biodiesel100': 'Biodiesel B100',
  'custom': 'Custom Fuel'
};

// Fuel properties database - affects both energy and exergy efficiency
const fuelProperties = {
  'diesel': {
    lhv: 42.5,          // MJ/kg
    density: 830,       // kg/m³
    viscosity: 2.5,     // cSt
    cetane: 50,         // Cetane number
    flashPoint: 55,     // °C
    hcRatio: 1.8,
    ocRatio: 0.0,
    scRatio: 0.0,
    combustionEfficiency: 1.0,  // Base efficiency multiplier
    ignitionQuality: 1.0        // Affects combustion quality
  },
  'biodiesel20': {
    lhv: 41.8,          // Slightly lower than diesel
    density: 845,       // Slightly higher density
    viscosity: 2.8,     // Slightly higher viscosity
    cetane: 52,         // Better cetane number
    flashPoint: 65,     // Higher flash point
    hcRatio: 1.78,
    ocRatio: 0.04,
    scRatio: 0.0,
    combustionEfficiency: 0.98,  // Slightly lower due to oxygen content
    ignitionQuality: 1.02        // Better ignition due to higher cetane
  },
  'biodiesel100': {
    lhv: 37.5,          // Significantly lower than diesel
    density: 880,       // Higher density
    viscosity: 4.5,     // Much higher viscosity
    cetane: 55,         // Even better cetane number
    flashPoint: 130,    // Much higher flash point
    hcRatio: 1.76,
    ocRatio: 0.11,
    scRatio: 0.0,
    combustionEfficiency: 0.95,  // Lower due to higher oxygen, viscosity
    ignitionQuality: 1.05        // Best ignition quality
  },
  'custom': {
    lhv: 42.5,
    density: 830,
    viscosity: 2.5,
    cetane: 50,
    flashPoint: 55,
    hcRatio: 1.8,
    ocRatio: 0.0,
    scRatio: 0.0,
    combustionEfficiency: 1.0,
    ignitionQuality: 1.0
  }
};

// ==============================
// Update fuel properties in UI
// ==============================
function updateFuelProperties() {
  const fuelType = document.getElementById('fuelType').value;
  const customGroup = document.getElementById('customFuelGroup');
  
  if (fuelType === 'custom') {
    customGroup.style.display = 'block';
  } else {
    customGroup.style.display = 'none';
    const props = fuelProperties[fuelType];
    document.getElementById('lhv').value = props.lhv;
  }
}

// ==============================
// Get fuel-specific efficiency factor
// ==============================
function getFuelEfficiencyFactor(fuelType) {
  const props = fuelProperties[fuelType] || fuelProperties['diesel'];
  
  // Combustion efficiency factor (based on fuel properties)
  const combustionFactor = props.combustionEfficiency;
  
  // Ignition quality factor (cetane number effect)
  const ignitionFactor = props.ignitionQuality;
  
  // Viscosity penalty (higher viscosity = poorer atomization)
  const viscosityPenalty = 1.0 - ((props.viscosity - 2.5) * 0.01);
  
  // Combined fuel efficiency factor
  return combustionFactor * ignitionFactor * Math.max(0.9, viscosityPenalty);
}

// ==============================
// Calculate ideal Otto cycle efficiency
// ==============================
function calculateIdealEfficiency(compressionRatio) {
  // η_ideal = 1 - (1/r^(γ-1))
  return (1 - Math.pow(compressionRatio, 1 - GAMMA)) * 100;
}

// ==============================
// Compression ratio correction factor for brake thermal efficiency
// ==============================
function getCRCorrectionFactor(compressionRatio) {
  // Higher CR improves thermal efficiency
  // Using a baseline of CR=16, each unit increase improves efficiency by ~1.5%
  const baselineCR = 16;
  const crEffect = 0.015; // 1.5% improvement per unit CR increase
  return 1 + crEffect * (compressionRatio - baselineCR);
}

// ==============================
// Chart.js Setup - 4 Separate Charts
// ==============================
function initCharts() {
  const ctx1 = document.getElementById('energyLoadChart').getContext('2d');
  const ctx2 = document.getElementById('exergyLoadChart').getContext('2d');
  const ctx3 = document.getElementById('energyCRChart').getContext('2d');
  const ctx4 = document.getElementById('exergyCRChart').getContext('2d');

  // Common chart options
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { 
          padding: 15, 
          font: { size: 12 },
          boxWidth: 30,
          boxHeight: 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 10,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += context.parsed.y.toFixed(2) + '%';
            return label;
          }
        }
      }
    }
  };

  // Chart 1: Energy Efficiency vs Load
  energyLoadChart = new Chart(ctx1, {
    type: 'line',
    data: { datasets: [] },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: {
          display: true,
          text: 'Energy Efficiency vs Brake Load',
          font: { size: 16, weight: 'bold' },
          padding: { top: 10, bottom: 15 }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Brake Load (kg)', font: { size: 14, weight: 'bold' } },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        },
        y: {
          type: 'linear',
          title: { display: true, text: 'Energy Efficiency (%)', font: { size: 14, weight: 'bold' } },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        }
      }
    }
  });

  // Chart 2: Exergy Efficiency vs Load
  exergyLoadChart = new Chart(ctx2, {
    type: 'line',
    data: { datasets: [] },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: {
          display: true,
          text: 'Exergy Efficiency vs Brake Load',
          font: { size: 16, weight: 'bold' },
          padding: { top: 10, bottom: 15 }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Brake Load (kg)', font: { size: 14, weight: 'bold' } },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        },
        y: {
          type: 'linear',
          title: { display: true, text: 'Exergy Efficiency (%)', font: { size: 14, weight: 'bold' } },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        }
      }
    }
  });

  // Chart 3: Energy Efficiency vs CR
  energyCRChart = new Chart(ctx3, {
    type: 'line',
    data: { datasets: [] },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: {
          display: true,
          text: 'Energy Efficiency vs Compression Ratio',
          font: { size: 16, weight: 'bold' },
          padding: { top: 10, bottom: 15 }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Compression Ratio', font: { size: 14, weight: 'bold' } },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        },
        y: {
          type: 'linear',
          title: { display: true, text: 'Energy Efficiency (%)', font: { size: 14, weight: 'bold' } },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        }
      }
    }
  });

  // Chart 4: Exergy Efficiency vs CR
  exergyCRChart = new Chart(ctx4, {
    type: 'line',
    data: { datasets: [] },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: {
          display: true,
          text: 'Exergy Efficiency vs Compression Ratio',
          font: { size: 16, weight: 'bold' },
          padding: { top: 10, bottom: 15 }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Compression Ratio', font: { size: 14, weight: 'bold' } },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        },
        y: {
          type: 'linear',
          title: { display: true, text: 'Exergy Efficiency (%)', font: { size: 14, weight: 'bold' } },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        }
      }
    }
  });
}

// ==============================
// Update Charts with Fuel Comparison
// ==============================
function updateCharts(results, brakeLoad, fuelType) {
  const cr = parseFloat(document.getElementById('compressionRatio').value) || 16;
  
  const color = fuelColors[fuelType] || fuelColors['custom'];
  const fuelName = fuelNames[fuelType] || 'Custom Fuel';

  // Function to find or create dataset for fuel type
  function getOrCreateDataset(chart, fuelType, fuelName, color) {
    let dataset = chart.data.datasets.find(ds => ds.fuelType === fuelType);
    if (!dataset) {
      dataset = {
        label: fuelName,
        fuelType: fuelType,
        data: [],
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: color.border,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.3,
        fill: false
      };
      chart.data.datasets.push(dataset);
    }
    return dataset;
  }

  // Update Chart 1: Energy Efficiency vs Load
  const ds1 = getOrCreateDataset(energyLoadChart, fuelType, fuelName, color);
  ds1.data.push({ x: brakeLoad, y: results.etaE });
  ds1.data.sort((a, b) => a.x - b.x);
  energyLoadChart.update();

  // Update Chart 2: Exergy Efficiency vs Load
  const ds2 = getOrCreateDataset(exergyLoadChart, fuelType, fuelName, color);
  ds2.data.push({ x: brakeLoad, y: results.etaEx });
  ds2.data.sort((a, b) => a.x - b.x);
  exergyLoadChart.update();

  // Update Chart 3: Energy Efficiency vs CR
  const ds3 = getOrCreateDataset(energyCRChart, fuelType, fuelName, color);
  ds3.data.push({ x: cr, y: results.etaE });
  ds3.data.sort((a, b) => a.x - b.x);
  energyCRChart.update();

  // Update Chart 4: Exergy Efficiency vs CR
  const ds4 = getOrCreateDataset(exergyCRChart, fuelType, fuelName, color);
  ds4.data.push({ x: cr, y: results.etaEx });
  ds4.data.sort((a, b) => a.x - b.x);
  exergyCRChart.update();
}

// ==============================
// Clear Chart Data
// ==============================
function clearChartData() {
  if (energyLoadChart) {
    energyLoadChart.data.datasets = [];
    energyLoadChart.update();
  }
  if (exergyLoadChart) {
    exergyLoadChart.data.datasets = [];
    exergyLoadChart.update();
  }
  if (energyCRChart) {
    energyCRChart.data.datasets = [];
    energyCRChart.update();
  }
  if (exergyCRChart) {
    exergyCRChart.data.datasets = [];
    exergyCRChart.update();
  }
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

  if (fuelType === 'custom') {
    hcRatio = parseFloat(document.getElementById('hcRatio').value) || 0;
    ocRatio = parseFloat(document.getElementById('ocRatio').value) || 0;
    scRatio = parseFloat(document.getElementById('scRatio').value) || 0;
  } else {
    const props = fuelProperties[fuelType];
    hcRatio = props.hcRatio;
    ocRatio = props.ocRatio;
    scRatio = props.scRatio;
  }

  return 1.0374 + 0.0159 * hcRatio + 0.0567 * ocRatio +
         0.5985 * scRatio * (1 - 0.1737 * hcRatio);
}

// ==============================
// Animations & Updates
// ==============================
function animateResultUpdate(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.add('updated');
    setTimeout(() => element.classList.remove('updated'), 500);
  }
}

function updateResults(results) {
  const fuelType = document.getElementById('fuelType').value;
  const cr = parseFloat(document.getElementById('compressionRatio').value) || 16;
  const cetane = fuelProperties[fuelType]?.cetane || 50;
  
  document.getElementById('currentFuelType').textContent = fuelNames[fuelType] || 'Custom Fuel';
  document.getElementById('currentCR').textContent = cr.toFixed(1);
  document.getElementById('idealEfficiency').textContent = results.idealEff.toFixed(2);
  document.getElementById('currentCetane').textContent = cetane.toFixed(1);
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
    'currentFuelType','currentCR','idealEfficiency','currentCetane','torqueResult','inputEnergy','brakePower','coolingWaterEnergy','exhaustGasEnergy',
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
  const cr = parseFloat(document.getElementById('compressionRatio').value) || 16;

  const brakeLoad = parseFloat(document.getElementById('brakeLoad').value) || 0;
  const armLength = parseFloat(document.getElementById('armLength').value) || 0.5;
  const W = brakeLoad * 9.81;
  const T = W * armLength;

  const T1K = T1+273.15, T2K = T2+273.15, T5K = T5+273.15, TaK = Ta+273.15;

  const Ein = mf * lhv * 1000;
  const Ebp = (2 * Math.PI * N * T) / 60;
  const EbpKW = Ebp / 1000;

  const Ecw = mw * CP_WATER * (T2 - T1);
  const Eeg = (ma + mf) * CP_EXHAUST * (T5 - Ta);
  const Eunaccounted = Ein - (EbpKW + Ecw + Eeg);
  
  // Calculate ideal efficiency
  const idealEff = calculateIdealEfficiency(cr);
  
  // Get fuel type and apply fuel-specific efficiency factor
  const fuelType = document.getElementById('fuelType').value;
  const fuelEffFactor = getFuelEfficiencyFactor(fuelType);
  
  // Apply CR correction to brake thermal efficiency
  const crFactor = getCRCorrectionFactor(cr);
  
  // Energy efficiency with both CR and fuel type corrections
  const etaE = (EbpKW / Ein) * 100 * crFactor * fuelEffFactor;

  const exChem = getChemicalExergyFactor();
  const ExIn = mf * lhv * 1000 * exChem;
  const ExShaft = EbpKW;
  const ExCw = Ecw + (mw * CP_WATER * TaK * Math.log(T1K / T2K));
  const ExEg = Eeg + ((ma+mf) * TaK * (CP_EXHAUST * Math.log(TaK / T5K)) - (R_EXHAUST * Math.log(AMBIENT_PRESSURE/EXHAUST_PRESSURE)));
  const ExD = ExIn - (ExShaft + ExCw + ExEg);
  
  // Exergy efficiency also benefits from CR and fuel type
  const etaEx = (ExShaft/ExIn)*100 * crFactor * fuelEffFactor;
  const SI = 1/(1-(ExShaft/ExIn));
  const EPC = ExShaft/ExD;

  const results = { 
    Torque:T, 
    Ein,
    EbpKW,
    Ecw,
    Eeg,
    Eunaccounted,
    idealEff,
    etaE,
    ExIn,
    ExShaft,
    ExCw,
    ExEg,
    ExD,
    etaEx,
    SI,
    EPC 
  };

  setTimeout(()=>{
    updateResults(results);
    updateCharts(results, brakeLoad, fuelType);
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

// ==============================
// PCS FUNCTIONS
// ==============================
const PCS = {
  deg2rad: d => d * Math.PI / 180,
  
  cylinderVolume(thetaDeg, bore, stroke, conrod, Vclear) {
    const r = stroke / 2;
    const theta = this.deg2rad(thetaDeg);
    const term = r * Math.sin(theta);
    const under = Math.max(1e-12, conrod * conrod - term * term);
    const x = r * (1 - Math.cos(theta)) + conrod - Math.sqrt(under);
    return Vclear + (Math.PI / 4) * bore * bore * x;
  },
  
  wiebe(theta, soc, dur, a, m) {
    if (theta < soc) return 0;
    let x = (theta - soc) / dur;
    if (x >= 1) return 1;
    return 1 - Math.exp(-a * Math.pow(x, m + 1));
  }
};

let pcsChartP = null;
let pcsChartQ = null;

function initPCSCharts() {
  const ctxP = document.getElementById('pcs_chartP').getContext('2d');
  const ctxQ = document.getElementById('pcs_chartQ').getContext('2d');

  // Pressure chart
  pcsChartP = new Chart(ctxP, {
    type: 'line',
    data: { 
      labels: [], 
      datasets: [{ 
        label: 'Cylinder Pressure (bar)', 
        data: [], 
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2, 
        tension: 0.15, 
        pointRadius: 0,
        fill: true
      }] 
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: true, position: 'top' },
        title: {
          display: false
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Crank Angle (deg)', font: { size: 13, weight: 'bold' } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        },
        y: { 
          title: { display: true, text: 'Pressure (bar)', font: { size: 13, weight: 'bold' } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        }
      }
    }
  });

  // Heat release chart
  pcsChartQ = new Chart(ctxQ, {
    type: 'line',
    data: { 
      labels: [], 
      datasets: [{ 
        label: 'Heat Release Rate (kJ/deg)', 
        data: [], 
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2, 
        tension: 0.15, 
        pointRadius: 0,
        fill: true
      }] 
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: true, position: 'top' },
        title: {
          display: false
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Crank Angle (deg)', font: { size: 13, weight: 'bold' } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        },
        y: { 
          title: { display: true, text: 'Heat Release Rate (kJ/deg)', font: { size: 13, weight: 'bold' } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        }
      }
    }
  });
}

function runPCSSimulation() {
  // Read inputs
  const bore = parseFloat(document.getElementById('pcs_bore').value) || 0.08;
  const stroke = parseFloat(document.getElementById('pcs_stroke').value) || 0.09;
  const conrod = parseFloat(document.getElementById('pcs_conrod').value) || 0.15;
  const CR = parseFloat(document.getElementById('pcs_cr').value) || 17;
  const gamma = parseFloat(document.getElementById('pcs_gamma').value) || 1.35;
  const soc = parseFloat(document.getElementById('pcs_soc').value) || 355;
  const dur = parseFloat(document.getElementById('pcs_dur').value) || 40;
  const a = parseFloat(document.getElementById('pcs_a').value) || 5;
  const m = parseFloat(document.getElementById('pcs_m').value) || 2;
  const fuel_g = parseFloat(document.getElementById('pcs_fuel').value) || 0.015;
  const LHV = parseFloat(document.getElementById('pcs_lhv').value) || 43000;
  const p0 = parseFloat(document.getElementById('pcs_initp').value) || 101325;

  // Derived geometry
  const V_swept = Math.PI/4 * bore*bore * stroke;
  const V_clear = V_swept / (CR - 1);
  const V_max = V_clear + V_swept;

  // Theta grid - 0° to 720° (complete 4-stroke cycle)
  // 0-180°: Intake, 180-360°: Compression, 360-540°: Power, 540-720°: Exhaust
  const thetaStart = 0, thetaEnd = 720, dtheta = 0.5;
  const theta = [];
  const V = [];
  const xb = [];
  
  for(let t = thetaStart; t <= thetaEnd; t += dtheta) {
    theta.push(t);
    // Adjust cylinder volume calculation: TDC at 0° and 360°
    const adjustedAngle = ((t + 180) % 360) - 180;
    V.push(PCS.cylinderVolume(adjustedAngle, bore, stroke, conrod, V_clear));
    xb.push(PCS.wiebe(t, soc, dur, a, m));
  }

  const mass_kg = fuel_g / 1000;
  const Q_in = mass_kg * LHV * 1000; // J

  // Prepare arrays
  const P = new Array(theta.length).fill(0);
  const Qdot = new Array(theta.length).fill(0);
  
  // Initial conditions at start
  P[0] = p0;

  // Compression and combustion simulation
  for (let i=0; i<theta.length-1; i++) {
    const currentAngle = theta[i];
    
    // Heat release from Wiebe function
    const dxb = xb[i+1] - xb[i];
    const dQ = dxb * Q_in;
    Qdot[i] = dQ;

    const dV = V[i+1] - V[i];
    
    // Different phases of 4-stroke cycle
    if (currentAngle >= 0 && currentAngle < 180) {
      // Intake stroke - constant low pressure
      P[i+1] = p0;
    } else if (currentAngle >= 180 && currentAngle < 360) {
      // Compression stroke - isentropic compression
      const dp = ((gamma - 1) / V[i]) * dQ - (gamma * P[i] / V[i]) * dV;
      P[i+1] = Math.max(P[i] + dp, p0 * 0.5);
    } else if (currentAngle >= 360 && currentAngle < 540) {
      // Power stroke - combustion and expansion
      const dp = ((gamma - 1) / V[i]) * dQ - (gamma * P[i] / V[i]) * dV;
      P[i+1] = Math.max(P[i] + dp, p0 * 0.5);
    } else {
      // Exhaust stroke - constant low pressure
      P[i+1] = p0 * 1.05; // Slightly elevated for exhaust
    }
  }

  // Indicated work (area under P-V curve for power stroke)
  let W_J = 0;
  for (let i=0; i<theta.length-1; i++) {
    if (theta[i] >= 180 && theta[i] < 540) {
      W_J += 0.5*(P[i] + P[i+1]) * (V[i+1] - V[i]);
    }
  }
  const W_kJ = W_J / 1000;

  // Thermal efficiency
  const eta_th = (Q_in > 0) ? (W_J / Q_in) : 0;

  // Find peak pressure for display
  const P_max = Math.max(...P);
  const P_max_bar = P_max / 1e5;
  const peakIndex = P.indexOf(P_max);
  const peakAngle = theta[peakIndex];

  // Update charts
  if (pcsChartP && pcsChartQ) {
    pcsChartP.data.labels = theta.slice();
    pcsChartP.data.datasets[0].data = P.map(p => (p/1e5));
    
    // Update chart title with peak pressure
    pcsChartP.options.plugins.title = {
      display: true,
      text: `Peak Pressure: ${P_max_bar.toFixed(1)} bar at ${peakAngle.toFixed(0)}° CA`,
      font: { size: 12, weight: 'normal' },
      color: '#666'
    };
    
    pcsChartP.update();

    pcsChartQ.data.labels = theta.slice();
    pcsChartQ.data.datasets[0].data = Qdot.map(q => (q/1000));
    pcsChartQ.update();
  }

  // Update numeric outputs
  document.getElementById('pcs_W').textContent = W_kJ.toFixed(4);
  document.getElementById('pcs_eta').textContent = (eta_th*100).toFixed(3);
}

// ==============================
// Event Listeners
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  document.getElementById('fuelType').addEventListener('change', toggleCustomFuelInputs);

  const numericInputs = document.querySelectorAll('input[type="number"]');
  numericInputs.forEach(input => {
    input.addEventListener('input', function() { 
      this.value = this.value.replace(/[^0-9.-]/g,''); 
    });
  });

  document.querySelector('.calculate-btn').addEventListener('click', calculateAll);

  // Initialize PCS charts if elements exist
  if (document.getElementById('pcs_chartP') && document.getElementById('pcs_chartQ')) {
    initPCSCharts();
  }

  // PCS run button
  const pcsRunBtn = document.getElementById('pcs_run');
  if (pcsRunBtn) {
    pcsRunBtn.addEventListener('click', runPCSSimulation);
  }
});