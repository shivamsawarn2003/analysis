// Constants for thermodynamic calculations
const CP_WATER = 4.18; // kJ/kg·K - Specific heat of water
const CP_EXHAUST = 1.15; // kJ/kg·K - Specific heat of exhaust gas
const R_EXHAUST = 0.287; // kJ/kg·K - Gas constant for exhaust
const AMBIENT_PRESSURE = 1.01325; // bar - Standard atmospheric pressure
const EXHAUST_PRESSURE = 1.05; // bar - Typical exhaust pressure

/**
 * Show/hide tab content based on user selection
 * @param {string} tabName - Name of the tab to show
 */
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Show selected tab content
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Add active class to clicked tab
    event.target.classList.add('active');
}

/**
 * Toggle visibility of custom fuel input fields
 */
function toggleCustomFuelInputs() {
    const fuelType = document.getElementById('fuelType').value;
    const customGroup = document.getElementById('customFuelGroup');
    
    if (fuelType === 'custom') {
        customGroup.style.display = 'block';
    } else {
        customGroup.style.display = 'none';
    }
}

/**
 * Calculate chemical exergy factor based on fuel composition
 * Uses Equation 18 from Appendix 5
 * @returns {number} Chemical exergy factor
 */
function getChemicalExergyFactor() {
    const fuelType = document.getElementById('fuelType').value;
    let hcRatio, ocRatio, scRatio;
    
    // Set fuel composition ratios based on fuel type
    switch (fuelType) {
        case 'diesel':
            hcRatio = 1.8;   // Typical H/C ratio for diesel
            ocRatio = 0.0;   // No oxygen in pure diesel
            scRatio = 0.0;   // Negligible sulfur content
            break;
        case 'biodiesel20':
            hcRatio = 1.78;  // Slightly lower H/C for biodiesel blend
            ocRatio = 0.04;  // Small oxygen content from biodiesel
            scRatio = 0.0;   // No sulfur in biodiesel
            break;
        case 'custom':
            hcRatio = parseFloat(document.getElementById('hcRatio').value) || 0;
            ocRatio = parseFloat(document.getElementById('ocRatio').value) || 0;
            scRatio = parseFloat(document.getElementById('scRatio').value) || 0;
            break;
        default:
            hcRatio = 1.8;
            ocRatio = 0.0;
            scRatio = 0.0;
    }
    
    // Chemical exergy factor calculation (Equation 18)
    const exChem = 1.0374 + 0.0159 * hcRatio + 0.0567 * ocRatio + 
                  0.5985 * scRatio * (1 - 0.1737 * hcRatio);
    
    return exChem;
}

/**
 * Animate result value updates
 * @param {string} elementId - ID of the result element to animate
 */
function animateResultUpdate(elementId) {
    const element = document.getElementById(elementId);
    element.classList.add('updated');
    
    setTimeout(() => {
        element.classList.remove('updated');
    }, 500);
}

/**
 * Update all result displays with calculated values
 * @param {Object} results - Object containing all calculated results
 */
function updateResults(results) {
    // Energy results
    document.getElementById('inputEnergy').textContent = results.Ein.toFixed(3);
    document.getElementById('brakePower').textContent = results.EbpKW.toFixed(3);
    document.getElementById('coolingWaterEnergy').textContent = results.Ecw.toFixed(3);
    document.getElementById('exhaustGasEnergy').textContent = results.Eeg.toFixed(3);
    document.getElementById('unaccountedEnergy').textContent = results.Eunaccounted.toFixed(3);
    document.getElementById('energyEfficiency').textContent = results.etaE.toFixed(2);
    
    // Exergy results
    document.getElementById('inputExergy').textContent = results.ExIn.toFixed(3);
    document.getElementById('shaftExergy').textContent = results.ExShaft.toFixed(3);
    document.getElementById('coolingWaterExergy').textContent = results.ExCw.toFixed(3);
    document.getElementById('exhaustGasExergy').textContent = results.ExEg.toFixed(3);
    document.getElementById('exergyDestruction').textContent = results.ExD.toFixed(3);
    document.getElementById('exergyEfficiency').textContent = results.etaEx.toFixed(2);
    
    // Sustainability metrics
    document.getElementById('sustainabilityIndex').textContent = results.SI.toFixed(3);
    document.getElementById('exergyPerformanceCoeff').textContent = results.EPC.toFixed(3);
    
    // Animate all result updates
    const resultIds = [
        'inputEnergy', 'brakePower', 'coolingWaterEnergy', 'exhaustGasEnergy', 
        'unaccountedEnergy', 'energyEfficiency', 'inputExergy', 'shaftExergy',
        'coolingWaterExergy', 'exhaustGasExergy', 'exergyDestruction', 
        'exergyEfficiency', 'sustainabilityIndex', 'exergyPerformanceCoeff'
    ];
    
    resultIds.forEach((id, index) => {
        setTimeout(() => animateResultUpdate(id), index * 50);
    });
}

/**
 * Validate input parameters before calculation
 * @returns {boolean} True if all inputs are valid
 */
function validateInputs() {
    const inputs = [
        'fuelMassFlow', 'lhv', 'engineSpeed', 'torque', 
        'airMassFlow', 'waterMassFlow', 'waterTempIn', 
        'waterTempOut', 'exhaustTemp', 'ambientTemp'
    ];
    
    for (let inputId of inputs) {
        const value = parseFloat(document.getElementById(inputId).value);
        if (isNaN(value) || value < 0) {
            alert(`Please enter a valid positive value for ${inputId.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
            return false;
        }
    }
    
    // Additional validation checks
    const waterTempIn = parseFloat(document.getElementById('waterTempIn').value);
    const waterTempOut = parseFloat(document.getElementById('waterTempOut').value);
    const exhaustTemp = parseFloat(document.getElementById('exhaustTemp').value);
    const ambientTemp = parseFloat(document.getElementById('ambientTemp').value);
    
    if (waterTempOut <= waterTempIn) {
        alert('Water outlet temperature must be higher than inlet temperature');
        return false;
    }
    
    if (exhaustTemp <= ambientTemp) {
        alert('Exhaust temperature must be higher than ambient temperature');
        return false;
    }
    
    return true;
}

/**
 * Main calculation function - performs all energy, exergy, and sustainability calculations
 * Implements all equations from Appendix 5
 */
function calculateAll() {
    try {
        // Validate inputs first
        if (!validateInputs()) {
            return;
        }
        
        // Show loading state
        const calculateBtn = document.querySelector('.calculate-btn');
        calculateBtn.classList.add('loading');
        calculateBtn.textContent = 'Calculating...';
        
        // Get input values from form
        const mf = parseFloat(document.getElementById('fuelMassFlow').value) || 0;      // kg/s
        const lhv = parseFloat(document.getElementById('lhv').value) || 0;             // MJ/kg
        const N = parseFloat(document.getElementById('engineSpeed').value) || 0;       // rpm
        const T = parseFloat(document.getElementById('torque').value) || 0;            // Nm
        const ma = parseFloat(document.getElementById('airMassFlow').value) || 0;      // kg/s
        const mw = parseFloat(document.getElementById('waterMassFlow').value) || 0;    // kg/s
        const T1 = parseFloat(document.getElementById('waterTempIn').value) || 0;      // °C
        const T2 = parseFloat(document.getElementById('waterTempOut').value) || 0;     // °C
        const T5 = parseFloat(document.getElementById('exhaustTemp').value) || 0;      // °C
        const Ta = parseFloat(document.getElementById('ambientTemp').value) || 0;      // °C
        
        // Convert temperatures to Kelvin for thermodynamic calculations
        const T1K = T1 + 273.15;
        const T2K = T2 + 273.15;
        const T5K = T5 + 273.15;
        const TaK = Ta + 273.15;
        
        // ===========================================
        // ENERGY CALCULATIONS (Equations 8-15)
        // ===========================================
        
        // Input energy (Equation 10): E_in = m_f × LHV_f
        const Ein = mf * lhv * 1000; // Convert MJ to kJ, then to kW (since mass flow is per second)
        
        // Brake power (Equation 11): E_BP = (2π × N × T) / 60,000
        const Ebp = (2 * Math.PI * N * T) / 60; // Result in Watts
        const EbpKW = Ebp / 1000; // Convert to kW
        
        // Cooling water energy (Equation 12): E_cw = m_w × Cp_w × (T2 - T1)
        const Ecw = mw * CP_WATER * (T2 - T1); // kW
        
        // Exhaust gas energy (Equation 13): E_eg = (m_a + m_f) × Cp_eg × (T5 - Ta)
        const Eeg = (ma + mf) * CP_EXHAUST * (T5 - Ta); // kW
        
        // Unaccounted energy (Equation 14): E_unaccounted = E_in - (E_BP + E_cw + E_eg)
        const Eunaccounted = Ein - (EbpKW + Ecw + Eeg); // kW
        
        // Energy efficiency (Equation 15): η_E = E_BP / E_in
        const etaE = (EbpKW / Ein) * 100; // Convert to percentage
        
        // ===========================================
        // EXERGY CALCULATIONS (Equations 16-25)
        // ===========================================
        
        // Get chemical exergy factor for the selected fuel
        const exChem = getChemicalExergyFactor();
        
        // Input exergy (Equation 17): Ex_in = m_f × LHV_fuel × Ex_chem
        const ExIn = mf * lhv * 1000 * exChem; // kW
        
        // Shaft exergy (Equation 19): Ex_shaft = E_BP
        const ExShaft = EbpKW; // kW
        
        // Cooling water exergy loss (Equation 20): 
        // Ex_cw = E_cw + {m_w × Cp_w × Ta × ln(T1/T2)}
        const ExCw = Ecw + (mw * CP_WATER * TaK * Math.log(T1K / T2K)); // kW
        
        // Exhaust gas exergy loss (Equation 21):
        // Ex_eg = E_eg + [(m_a + m_f) × Ta × (Cp_eg × ln(Ta/T5)) - R_eg × ln(Pa/P_eg)]
        const ExEg = Eeg + ((ma + mf) * TaK * (CP_EXHAUST * Math.log(TaK / T5K)) - 
                    (R_EXHAUST * Math.log(AMBIENT_PRESSURE / EXHAUST_PRESSURE))); // kW
        
        // Exergy destruction (Equation 22): Ex_d = Ex_in - (Ex_shaft + Ex_cw + Ex_eg)
        const ExD = ExIn - (ExShaft + ExCw + ExEg); // kW
        
        // Exergy efficiency (Equation 23): η_Ex = Ex_shaft / Ex_in
        const etaEx = (ExShaft / ExIn) * 100; // Convert to percentage
        
        // ===========================================
        // SUSTAINABILITY METRICS (Equations 24-25)
        // ===========================================
        
        // Sustainability index (Equation 24): SI = 1 / (1 - Ex_shaft/Ex_in)
        const exergyRatio = ExShaft / ExIn;
        const SI = 1 / (1 - exergyRatio);
        
        // Exergy performance coefficient (Equation 25): EPC = Ex_shaft / Ex_d
        const EPC = ExShaft / ExD;
        
        // Create results object
        const results = {
            Ein, EbpKW, Ecw, Eeg, Eunaccounted, etaE,
            ExIn, ExShaft, ExCw, ExEg, ExD, etaEx,
            SI, EPC
        };
        
        // Update the display with calculated results
        setTimeout(() => {
            updateResults(results);
            
            // Remove loading state
            calculateBtn.classList.remove('loading');
            calculateBtn.textContent = 'Calculate';
            
            // Log results for debugging (can be removed in production)
            console.log('Calculation Results:', results);
            
        }, 500); // Small delay for better user experience
        
    } catch (error) {
        // Handle calculation errors
        alert('Error in calculations. Please check your input values and try again.');
        console.error('Calculation error:', error);
        
        // Remove loading state
        const calculateBtn = document.querySelector('.calculate-btn');
        calculateBtn.classList.remove('loading');
        calculateBtn.textContent = 'Calculate';
    }
}

/**
 * Reset all input fields to default values
 */
function resetInputs() {
    document.getElementById('fuelMassFlow').value = '0.0008';
    document.getElementById('lhv').value = '42.5';
    document.getElementById('engineSpeed').value = '1500';
    document.getElementById('torque').value = '20';
    document.getElementById('airMassFlow').value = '0.02';
    document.getElementById('waterMassFlow').value = '0.15';
    document.getElementById('waterTempIn').value = '25';
    document.getElementById('waterTempOut').value = '65';
    document.getElementById('exhaustTemp').value = '450';
    document.getElementById('ambientTemp').value = '25';
    document.getElementById('fuelType').value = 'diesel';
    toggleCustomFuelInputs();
}

/**
 * Export results to CSV format
 */
function exportResults() {
    // Get all result values
    const results = {
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
    
    // Create CSV content
    let csvContent = 'Parameter,Value\n';
    Object.entries(results).forEach(([key, value]) => {
        csvContent += `"${key}","${value}"\n`;
    });
    
    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'energy_exergy_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Print current results
 */
function printResults() {
    window.print();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for fuel type selection
    document.getElementById('fuelType').addEventListener('change', toggleCustomFuelInputs);
    
    // Add input validation on change
    const numericInputs = document.querySelectorAll('input[type="number"]');
    numericInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Remove any invalid characters
            this.value = this.value.replace(/[^0-9.-]/g, '');
        });
        
        // Auto-calculate on input change (with debouncing)
        let timeout;
        input.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(calculateAll, 1000); // Calculate after 1 second of no input
        });
    });
    
    // Initialize with default calculation
    calculateAll();
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl+Enter or Cmd+Enter to calculate
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        calculateAll();
    }
    
    // Ctrl+R or Cmd+R to reset (prevent page refresh)
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        resetInputs();
        calculateAll();
    }
    
    // Ctrl+P or Cmd+P for print
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        printResults();
    }
});

// Global functions for button clicks
window.showTab = showTab;
window.calculateAll = calculateAll;
window.resetInputs = resetInputs;
window.exportResults = exportResults;
window.printResults = printResults;