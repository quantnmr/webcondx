// main.js - Main application logic and event handlers for CondX web version

// State management
let currentState = {
    foF2_1d: 12.0,
    elevation_1d: 30,
    season_1d: 'equinox',  // 'winter', 'equinox', 'summer'
    foF2_tx_2d: 15.0,
    foF2_dist_2d: 4.0,
    tilt_distance: 3000,
    elevation_2d: 30,
    season_2d: 'equinox'  // 'winter', 'equinox', 'summer'
};

/**
 * Initialize the application
 */
function init() {
    console.log('CondX Web Version - Initializing...');
    
    // Set initial slider values
    document.getElementById('foF2-slider').value = currentState.foF2_1d;
    document.getElementById('elevation-slider').value = currentState.elevation_1d;
    document.getElementById('season-1d-selector').value = currentState.season_1d;
    document.getElementById('foF2-tx-slider').value = currentState.foF2_tx_2d;
    document.getElementById('foF2-dist-slider').value = currentState.foF2_dist_2d;
    document.getElementById('tilt-distance-slider').value = currentState.tilt_distance;
    document.getElementById('elevation-2d-slider').value = currentState.elevation_2d;
    document.getElementById('season-2d-selector').value = currentState.season_2d;
    
    // Update displays
    updateSliderDisplays();
    
    // Add event listeners - use 'change' instead of 'input' to only update on mouse release
    // This improves performance, especially for the computationally intensive 2D model
    document.getElementById('foF2-slider').addEventListener('change', handle1DUpdate);
    document.getElementById('elevation-slider').addEventListener('change', handle1DUpdate);
    document.getElementById('season-1d-selector').addEventListener('change', handle1DUpdate);
    document.getElementById('foF2-tx-slider').addEventListener('change', handle2DUpdate);
    document.getElementById('foF2-dist-slider').addEventListener('change', handle2DUpdate);
    document.getElementById('tilt-distance-slider').addEventListener('change', handle2DUpdate);
    document.getElementById('elevation-2d-slider').addEventListener('change', handle2DUpdate);
    document.getElementById('season-2d-selector').addEventListener('change', handle2DUpdate);
    
    // Also update the value displays in real-time as user drags (but don't recalculate)
    document.getElementById('foF2-slider').addEventListener('input', updateSliderDisplays);
    document.getElementById('elevation-slider').addEventListener('input', updateSliderDisplays);
    document.getElementById('foF2-tx-slider').addEventListener('input', updateSliderDisplays);
    document.getElementById('foF2-dist-slider').addEventListener('input', updateSliderDisplays);
    document.getElementById('tilt-distance-slider').addEventListener('input', updateSliderDisplays);
    document.getElementById('elevation-2d-slider').addEventListener('input', updateSliderDisplays);
    
    // Initial render
    update1DVisualizations();
    update2DVisualizations();
    
    console.log('CondX initialized successfully!');
}

/**
 * Update slider value displays
 * Reads directly from slider values to show live updates while dragging
 */
function updateSliderDisplays() {
    // Read current slider values (may be different from currentState if user is dragging)
    const foF2_1d = parseFloat(document.getElementById('foF2-slider').value);
    const elevation_1d = parseInt(document.getElementById('elevation-slider').value);
    const season_1d = document.getElementById('season-1d-selector').value;
    const foF2_tx_2d = parseFloat(document.getElementById('foF2-tx-slider').value);
    const foF2_dist_2d = parseFloat(document.getElementById('foF2-dist-slider').value);
    const tilt_distance = parseInt(document.getElementById('tilt-distance-slider').value);
    const elevation_2d = parseInt(document.getElementById('elevation-2d-slider').value);
    const season_2d = document.getElementById('season-2d-selector').value;
    
    // Season name mapping (used for both 1D and 2D)
    const seasonNames = {
        'winter': 'Winter',
        'equinox': 'Equinox',
        'summer': 'Summer'
    };
    
    // 1D sliders
    document.getElementById('foF2-value').textContent = foF2_1d.toFixed(1) + ' MHz';
    document.getElementById('elevation-value').textContent = elevation_1d + '°';
    document.getElementById('season-1d-value').textContent = seasonNames[season_1d] || 'Equinox';
    
    // Day/night indicator
    const indicator = document.getElementById('condition-indicator');
    if (foF2_1d < 5) {
        indicator.innerHTML = '<span style="color: blue;">🌙 Night conditions</span> (D-layer absent, F2 high altitude)';
        indicator.className = 'condition-indicator condition-night';
    } else if (foF2_1d < 10) {
        indicator.innerHTML = '<span style="color: orange;">🌅 Dawn/Dusk transition</span> (D-layer building, intermediate conditions)';
        indicator.className = 'condition-indicator condition-transition';
    } else {
        indicator.innerHTML = '<span style="color: goldenrod;">☀️ Daytime conditions</span> (D-layer present, F2 low altitude)';
        indicator.className = 'condition-indicator condition-day';
    }
    
    // 2D sliders
    document.getElementById('foF2-tx-value').textContent = foF2_tx_2d.toFixed(1) + ' MHz';
    document.getElementById('foF2-dist-value').textContent = foF2_dist_2d.toFixed(1) + ' MHz';
    document.getElementById('tilt-distance-value').textContent = tilt_distance + ' km';
    document.getElementById('elevation-2d-value').textContent = elevation_2d + '°';
    document.getElementById('season-2d-value').textContent = seasonNames[season_2d] || 'Equinox';
    
    // Gradient display
    const gradient = ((foF2_dist_2d - foF2_tx_2d) / tilt_distance).toFixed(4);
    const gradientTextEl = document.querySelector('.gradient-text');
    if (gradientTextEl) {
        gradientTextEl.innerHTML = `<strong>Gradient:</strong> ${foF2_tx_2d.toFixed(1)} → ${foF2_dist_2d.toFixed(1)} MHz over ${tilt_distance} km (${gradient} MHz/km)`;
    }
}

/**
 * Handle 1D model updates
 */
function handle1DUpdate() {
    currentState.foF2_1d = parseFloat(document.getElementById('foF2-slider').value);
    currentState.elevation_1d = parseInt(document.getElementById('elevation-slider').value);
    currentState.season_1d = document.getElementById('season-1d-selector').value;
    
    updateSliderDisplays();
    update1DVisualizations();
}

/**
 * Handle 2D model updates
 */
function handle2DUpdate() {
    currentState.foF2_tx_2d = parseFloat(document.getElementById('foF2-tx-slider').value);
    currentState.foF2_dist_2d = parseFloat(document.getElementById('foF2-dist-slider').value);
    currentState.tilt_distance = parseInt(document.getElementById('tilt-distance-slider').value);
    currentState.elevation_2d = parseInt(document.getElementById('elevation-2d-slider').value);
    currentState.season_2d = document.getElementById('season-2d-selector').value;
    
    updateSliderDisplays();
    
    // Show calculating indicator inline with gradient text
    const calculatingIndicator = document.getElementById('calculating-2d');
    if (calculatingIndicator) {
        calculatingIndicator.style.display = 'inline-block';
    }
    
    // Use setTimeout to allow the UI to update before starting calculations
    setTimeout(() => {
        update2DVisualizations();
        // Hide calculating indicator after calculations complete
        calculatingIndicator.style.display = 'none';
    }, 10);
}

/**
 * Update all 1D visualizations
 */
function update1DVisualizations() {
    console.log(`Updating 1D visualizations: foF2=${currentState.foF2_1d} MHz, elevation=${currentState.elevation_1d}°, season=${currentState.season_1d}`);
    
    plotElectronDensity(currentState.foF2_1d, 'density-chart', currentState.season_1d);
    plotPlasmaFrequency(currentState.foF2_1d, 'plasma-chart', currentState.season_1d);
    plotRayPaths1D(currentState.foF2_1d, currentState.elevation_1d, 'raypath-chart', currentState.season_1d);
    plotSignalLoss1D(currentState.foF2_1d, currentState.elevation_1d, 'absorption-chart', currentState.season_1d);
}

/**
 * Update all 2D visualizations
 */
function update2DVisualizations() {
    console.log(`Updating 2D visualizations: foF2 ${currentState.foF2_tx_2d}→${currentState.foF2_dist_2d} MHz over ${currentState.tilt_distance} km, elevation=${currentState.elevation_2d}°, season=${currentState.season_2d}`);
    
    plot2DTilts(
        currentState.foF2_tx_2d,
        currentState.foF2_dist_2d,
        currentState.tilt_distance,
        currentState.elevation_2d,
        currentState.season_2d,
        'tilt-side-chart',
        'tilt-top-chart'
    );
    
    plot2DAbsorption(
        currentState.foF2_tx_2d,
        currentState.foF2_dist_2d,
        currentState.tilt_distance,
        currentState.elevation_2d,
        currentState.season_2d,
        'absorption-2d-chart'
    );
}

/**
 * Toggle accordion content visibility
 */
function toggleAccordion() {
    const content = document.getElementById('accordion-content');
    const icon = document.getElementById('accordion-icon');
    
    if (content.classList.contains('active')) {
        content.classList.remove('active');
        icon.textContent = '▼';
    } else {
        content.classList.add('active');
        icon.textContent = '▲';
    }
}

/**
 * Switch between tabs
 */
function switchTab(tabId, buttonElement) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabId);
    selectedTab.classList.add('active');
    selectedTab.style.display = 'block';
    
    // Activate corresponding button
    buttonElement.classList.add('active');
    
    // Trigger Plotly resize for charts in the newly visible tab
    // This ensures charts fill the width correctly after being hidden
    setTimeout(() => {
        if (typeof Plotly !== 'undefined') {
            // Resize all charts in the selected tab
            const chartIds = tabId === 'tab-1d' 
                ? ['density-chart', 'plasma-chart', 'raypath-chart', 'absorption-chart']
                : ['tilt-side-chart', 'tilt-top-chart', 'absorption-2d-chart'];
            
            chartIds.forEach(chartId => {
                const chartElement = document.getElementById(chartId);
                if (chartElement) {
                    // Get the actual available width from the parent container
                    const parentContainer = chartElement.closest('.chart-container') || chartElement.parentElement;
                    const containerWidth = parentContainer ? parentContainer.offsetWidth - 30 : null; // Subtract padding
                    
                    if (containerWidth && containerWidth > 0) {
                        // Use relayout to set explicit width, then resize
                        Plotly.relayout(chartElement, {width: containerWidth});
                    }
                    // Always call resize to trigger Plotly's internal resize logic
                    Plotly.Plots.resize(chartElement);
                }
            });
        }
    }, 250);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
