// ==============================
// Constants for thermodynamic calculations
// ==============================
const CP_WATER = 4.18; // kJ/kg·K
const CP_EXHAUST = 1.15; // kJ/kg·K
const R_EXHAUST = 0.287; // kJ/kg·K
const AMBIENT_PRESSURE = 1.01325; // bar
const EXHAUST_PRESSURE = 1.05; // bar

let combinedChart;

// ==============================
// Chart.js Setup
// ==============================
function initCharts() {
  const ctx = document.getElementById('combinedChart').getContext('2d');

  combinedChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Energy Efficiency vs Load',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: true,
          yAxisID: 'y',
          xAxisID: 'x-load'
        },
        {
          label: 'Exergy Efficiency vs Load',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: true,
          yAxisID: 'y',
          xAxisID: 'x-load'
        },
        {
          label: 'Energy Efficiency vs CR',
          data: [],
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.6)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: true,
          borderDash: [5, 5],
          yAxisID: 'y',
          xAxisID: 'x-cr'
        },
        {
          label: 'Exergy Efficiency vs CR',
          data: [],
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.6)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: true,
          borderDash: [5, 5],
          yAxisID: 'y',
          xAxisID: 'x-cr'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: 'Efficiency Analysis: Load & Compression Ratio Effects',
          font: { size: 18, weight: 'bold' },
          padding: { top: 10, bottom: 20 }
        },
        legend: {
          display: true,
          position: 'top',
          labels: { 
            padding: 20, 
            font: { size: 13 },
            boxWidth: 40,
            boxHeight: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 14 },
          bodyFont: { size: 13 },
          padding: 12,
          callbacks: {
            title: function(context) {
              const dataset = context[0].dataset;
              const value = context[0].parsed.x;
              if (dataset.xAxisID === 'x-load') {
                return `Load: ${value} kg`;
              } else {
                return `CR: ${value}`;
              }
            },
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
            }
          }
        }
      },
      scales: {
        'x-load': {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Load (kg)',
            color: '#3b82f6',
            font: { size: 16, weight: 'bold' }
          },
          grid: { 
            color: 'rgba(59, 130, 246, 0.1)',
            lineWidth: 1
          },
          ticks: { 
            color: '#3b82f6',
            font: { size: 13 },
            padding: 8
          }
        },
        'x-cr': {
          type: 'linear',
          position: 'top',
          title: {
            display: true,
            text: 'Compression Ratio',
            color: '#f97316',
            font: { size: 16, weight: 'bold' }
          },
          grid: { display: false },
          ticks: { 
            color: '#f97316',
            font: { size: 13 },
            padding: 8
          }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Efficiency (%)',
            font: { size: 16, weight: 'bold' }
          },
          grid: { 
            color: 'rgba(0, 0, 0, 0.05)',
            lineWidth: 1
          },
          ticks: {
            font: { size: 13 },
            padding: 8
          }
        }
      }
    }
  });
}

// ==============================
// Update Charts
// ==============================
function updateCharts(results, brakeLoad) {
  const cr = parseFloat(document.getElementById('compressionRatio').value) || 16;

  // Add new data points without clearing old ones
  combinedChart.data.datasets[0].data.push({ x: brakeLoad, y: results.etaE });
  combinedChart.data.datasets[1].data.push({ x: brakeLoad, y: results.etaEx });
  combinedChart.data.datasets[2].data.push({ x: cr, y: results.etaE });
  combinedChart.data.datasets[3].data.push({ x: cr, y: results.etaEx });

  // Sort data points by x value for proper line drawing
  combinedChart.data.datasets.forEach(dataset => {
    dataset.data.sort((a, b) => a.x - b.x);
  });

  combinedChart.update();
}

// ==============================
// Clear Chart Data
// ==============================
function clearChartData() {
  if (combinedChart) {
    combinedChart.data.datasets.forEach(dataset => {
      dataset.data = [];
    });
    combinedChart.update();
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