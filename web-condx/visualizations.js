// visualizations.js - Plotly.js visualization functions for CondX web version

/**
 * Plot electron density profile by layer
 * Shows individual D, E, F1, F2 layers plus total density
 * 
 * @param {number} foF2 - Critical frequency in MHz
 * @param {string} containerId - DOM element ID for plot
 */
function plotElectronDensity(foF2, containerId = 'density-plot') {
    // Generate altitude array
    const z = [];
    for (let altitude = 0; altitude <= 600; altitude += 1) {
        z.push(altitude);
    }
    
    // Use the same logic as makeIonosphereForFoF2 to ensure consistency
    // F2 layer parameters
    const f_F2_Hz = foF2 * 1e6;
    const Ne_F2_peak = Math.pow(f_F2_Hz / 8.98, 2);
    
    // F2 peak altitude (hmF2): follows ionospheric climatology
    // Nighttime: hmF2 is HIGHER (260-350 km), especially when foF2 is low
    // Daytime: hmF2 is LOWER (250-300 km), especially when foF2 is high
    let h_F2;
    if (foF2 < 4.5) {
        // Nighttime: F1 absent, F2 peak is HIGHER due to diffusion/winds
        h_F2 = 260.0 + (4.5 - foF2) * 36.0;  // 260 km at foF2=4.5, 350 km at foF2=2.0
        h_F2 = Math.max(260.0, Math.min(350.0, h_F2));
    } else if (foF2 < 7.0) {
        // Transition period
        const transition_factor = (foF2 - 4.5) / 2.5;
        h_F2 = 300.0 - transition_factor * 20.0;  // 300 km at foF2=4.5, 280 km at foF2=7.0
    } else {
        // Daytime: F2 peak is LOWER due to photoionization
        h_F2 = 300.0 - (foF2 - 7.0) * 2.0;  // 300 km at foF2=7.0, ~274 km at foF2=20.0
        h_F2 = Math.max(250.0, Math.min(300.0, h_F2));
    }
    
    // D layer strength
    let D_factor;
    if (foF2 < 5.0) {
        D_factor = 0.0;
    } else if (foF2 < 8.0) {
        D_factor = (foF2 - 5.0) / 3.0;
    } else {
        D_factor = 1.0;
    }
    const Ne_D_peak = 1.5e9 * D_factor;
    
    // F1 layer strength (daytime only - absent at night)
    let F1_factor;
    if (foF2 < 4.5) {
        F1_factor = 0.0;  // Night: F1 layer absent (recombines, F2 becomes single F layer)
    } else if (foF2 < 7.0) {
        F1_factor = (foF2 - 4.5) / 2.5;
    } else {
        F1_factor = 1.0;
    }
    const Ne_F1_peak = 6e11 * F1_factor;  // Doubled from 3e11 to 6e11
    
    // E layer strength
    const E_factor = 0.5 + 0.5 * Math.min(1.0, foF2 / 12.0);
    const Ne_E_peak = 8e10 * E_factor;
    
    // F2 scale height: broader at night
    let F2_scale_height = 55.0;
    if (foF2 < 4.5) {
        F2_scale_height = 70.0;  // Broader profile at night
    } else if (foF2 < 7.0) {
        const transition_factor = (foF2 - 4.5) / 2.5;
        F2_scale_height = 70.0 - transition_factor * 15.0;
    }
    
    // Generate layer profiles
    const Ne_D = chapmanLayer(z, Ne_D_peak, 75.0, 8.0);
    const Ne_E = chapmanLayer(z, Ne_E_peak, 110.0, 15.0);
    const Ne_F1 = chapmanLayer(z, Ne_F1_peak, 190.0, 30.0);
    const Ne_F2 = chapmanLayer(z, Ne_F2_peak, h_F2, F2_scale_height);
    
    // Total density
    const Ne_total = z.map((_, i) => Ne_D[i] + Ne_E[i] + Ne_F1[i] + Ne_F2[i]);
    
    // Convert to units of 10⁹ electrons/m³ for better readability
    const Ne_D_scaled = Ne_D.map(n => n / 1e9);
    const Ne_E_scaled = Ne_E.map(n => n / 1e9);
    const Ne_F1_scaled = Ne_F1.map(n => n / 1e9);
    const Ne_F2_scaled = Ne_F2.map(n => n / 1e9);
    const Ne_total_scaled = Ne_total.map(n => n / 1e9);
    
    // Build traces array - conditionally include F1 only when present
    const traces = [
        {
            x: Ne_D_scaled,
            y: z,
            name: 'D layer',
            type: 'scatter',
            mode: 'lines',
            line: {color: 'blue', width: 2}
        },
        {
            x: Ne_E_scaled,
            y: z,
            name: 'E layer',
            type: 'scatter',
            mode: 'lines',
            line: {color: 'orange', width: 2}
        }
    ];
    
    // Only add F1 trace if F1_factor > 0 (F1 layer is present)
    if (F1_factor > 0) {
        traces.push({
            x: Ne_F1_scaled,
            y: z,
            name: 'F1 layer',
            type: 'scatter',
            mode: 'lines',
            line: {color: 'green', width: 2}
        });
    }
    
    traces.push(
        {
            x: Ne_F2_scaled,
            y: z,
            name: 'F2 layer',
            type: 'scatter',
            mode: 'lines',
            line: {color: 'red', width: 2}
        },
        {
            x: Ne_total_scaled,
            y: z,
            name: 'Total',
            type: 'scatter',
            mode: 'lines',
            line: {color: 'black', width: 3, dash: 'dash'}
        }
    );
    
    // Find maximum density for axis range
    const max_density = Math.max(...Ne_total_scaled);
    const axis_max = Math.ceil(max_density * 1.1);  // Add 10% padding
    
    const layout = {
        title: 'Electron Density Profile',
        xaxis: {
            title: 'Electron Density (× 10⁹ electrons/m³)',
            range: [0, axis_max]
        },
        yaxis: {
            title: 'Altitude (km)',
            range: [0, 600]
        },
        showlegend: true,
        hovermode: 'closest'
    };
    
    Plotly.newPlot(containerId, traces, layout, {responsive: true});
}

/**
 * Plot plasma frequency profile
 * 
 * @param {number} foF2 - Critical frequency in MHz
 * @param {string} containerId - DOM element ID for plot
 */
function plotPlasmaFrequency(foF2, containerId = 'plasma-plot') {
    const z = [];
    for (let altitude = 0; altitude <= 600; altitude += 1) {
        z.push(altitude);
    }
    
    const Ne = makeIonosphereForFoF2(z, foF2);
    const fp = Ne.map(n => plasmaFrequencyFromNe(n) / 1e6);  // Convert to MHz
    
    const trace = {
        x: fp,
        y: z,
        type: 'scatter',
        mode: 'lines',
        line: {color: 'purple', width: 2},
        name: 'Plasma Frequency'
    };
    
    // Add foF2 reference line
    const foF2_line = {
        x: [foF2, foF2],
        y: [0, 600],
        type: 'scatter',
        mode: 'lines',
        line: {color: 'red', width: 2, dash: 'dash'},
        name: `foF2 = ${foF2.toFixed(1)} MHz`
    };
    
    const layout = {
        title: 'Plasma Frequency Profile',
        xaxis: {
            title: 'Frequency (MHz)',
            range: [0, Math.max(foF2 * 1.2, 15)]
        },
        yaxis: {
            title: 'Altitude (km)',
            range: [0, 600]
        },
        showlegend: true
    };
    
    Plotly.newPlot(containerId, [trace, foF2_line], layout, {responsive: true});
}

/**
 * Plot ray paths for multiple frequencies (1D model)
 * 
 * @param {number} foF2 - Critical frequency in MHz
 * @param {number} elevation - Launch elevation angle in degrees
 * @param {string} containerId - DOM element ID for plot
 */
function plotRayPaths1D(foF2, elevation, containerId = 'ray-plot-1d') {
    const frequencies = [1.8, 3.5, 5.3, 7.0, 10.1, 14.0, 18.068, 21.0, 24.89, 28.0];
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
                    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
    
    const ionosphere_func = (z) => {
        const z_arr = [z];
        return makeIonosphereForFoF2(z_arr, foF2)[0];
    };
    
    const traces = [];
    let max_distance = 0;
    
    frequencies.forEach((freq, i) => {
        const result = traceRaySphericalWithPath(freq, elevation, ionosphere_func);
        
        // Truncate ray path at 400 km - stop plotting when altitude exceeds 400 km
        const truncated_distances = [];
        const truncated_altitudes = [];
        for (let j = 0; j < result.altitudes.length; j++) {
            if (result.altitudes[j] <= 400) {
                truncated_distances.push(result.distances[j]);
                truncated_altitudes.push(result.altitudes[j]);
            } else {
                break;  // Stop at first point above 400 km
            }
        }
        
        // Find the maximum distance for rays that return (only count those below 400 km)
        if (result.status === 'returns' && truncated_distances.length > 0) {
            const ray_max = Math.max(...truncated_distances.filter(d => d !== null));
            max_distance = Math.max(max_distance, ray_max);
        }
        
        traces.push({
            x: truncated_distances,
            y: truncated_altitudes,
            type: 'scatter',
            mode: 'lines',
            name: `${freq.toFixed(1)} MHz (${result.status})`,
            line: {color: colors[i], width: 2}
        });
    });
    
    // Auto-adjust x-axis: use max return distance + 10% padding, or default to 5000 if no returns
    const x_max = max_distance > 0 ? Math.ceil(max_distance * 1.1) : 5000;
    
    const layout = {
        title: `Ray Paths (foF2=${foF2} MHz, Elevation=${elevation}°)`,
        xaxis: {
            title: 'Distance (km)',
            range: [0, x_max]
        },
        yaxis: {
            title: 'Altitude (km)',
            range: [0, 400]  // Limit to 400 km - rays above this escape
        },
        showlegend: true,
        hovermode: 'closest'
    };
    
    Plotly.newPlot(containerId, traces, layout, {responsive: true});
}

/**
 * Plot signal loss for multiple frequencies (1D model)
 * 
 * @param {number} foF2 - Critical frequency in MHz
 * @param {number} elevation - Launch elevation angle in degrees
 * @param {string} containerId - DOM element ID for plot
 */
function plotSignalLoss1D(foF2, elevation, containerId = 'absorption-chart') {
    const frequencies = [1.8, 3.5, 5.3, 7.0, 10.1, 14.0, 18.068, 21.0, 24.89, 28.0];
    
    const ionosphere_func = (z) => {
        const z_arr = [z];
        return makeIonosphereForFoF2(z_arr, foF2)[0];
    };
    
    const path_traces = [];
    const loss_data = [];
    let max_distance = 0;
    
    frequencies.forEach((freq, i) => {
        const result = traceRayWithAbsorption(freq, elevation, ionosphere_func);
        const loss = result.total_loss_dB;
        
        loss_data.push({freq, loss, status: result.status});
        
        // Truncate ray path at 400 km - stop plotting when altitude exceeds 400 km
        const truncated_distances = [];
        const truncated_altitudes = [];
        for (let j = 0; j < result.altitudes.length; j++) {
            if (result.altitudes[j] <= 400) {
                truncated_distances.push(result.distances[j]);
                truncated_altitudes.push(result.altitudes[j]);
            } else {
                break;  // Stop at first point above 400 km
            }
        }
        
        // Find the maximum distance for rays that return (only count those below 400 km)
        if (result.status === 'returns' && truncated_distances.length > 0) {
            const ray_max = Math.max(...truncated_distances.filter(d => d !== null));
            max_distance = Math.max(max_distance, ray_max);
        }
        
        // Color-code by loss
        let color;
        if (loss < 10) color = 'green';
        else if (loss < 30) color = 'orange';
        else if (loss < 60) color = 'red';
        else color = 'darkred';
        
        path_traces.push({
            x: truncated_distances,
            y: truncated_altitudes,
            type: 'scatter',
            mode: 'lines',
            name: `${freq.toFixed(1)} MHz (${loss.toFixed(1)} dB)`,
            line: {color: color, width: 2},
            xaxis: 'x',
            yaxis: 'y'
        });
    });
    
    // Bar chart trace - filter out escaped rays, only show returns/stops
    const bar_data = loss_data.filter(d => d.status !== 'escapes');
    const frequency_labels = bar_data.map(d => `${d.freq.toFixed(1)} MHz`);
    
    // Calculate max loss for y-axis range with padding for text labels
    const max_loss = bar_data.length > 0 ? Math.max(...bar_data.map(d => d.loss)) : 50;
    const y_max = Math.ceil(max_loss * 1.25);  // Add 25% padding for text labels above bars
    
    const bar_trace = {
        x: frequency_labels,
        y: bar_data.map(d => d.loss),
        type: 'bar',
        text: bar_data.map(d => `${d.loss.toFixed(1)} dB`),
        textposition: 'outside',
        marker: {
            color: bar_data.map(d => {
                if (d.loss < 10) return 'green';
                if (d.loss < 30) return 'orange';
                if (d.loss < 60) return 'red';
                return 'darkred';
            })
        },
        xaxis: 'x2',
        yaxis: 'y2'
    };
    
    const all_traces = [...path_traces, bar_trace];
    
    // Auto-adjust x-axis: use max return distance + 10% padding, or default to 5000 if no returns
    const x_max = max_distance > 0 ? Math.ceil(max_distance * 1.1) : 5000;
    
    const layout = {
        title: 'Signal Loss Analysis',
        grid: {
            rows: 2,
            columns: 1,
            pattern: 'independent'
        },
        xaxis: {
            title: 'Distance (km)',
            range: [0, x_max],
            domain: [0, 1]
        },
        yaxis: {
            title: 'Altitude (km)',
            range: [0, 400],  // Limit to 400 km - rays above this escape
            domain: [0.375, 1]  // Ray path gets ~500px (62.5% of 800px container) to match first plot height
        },
        xaxis2: {
            title: 'Frequency (MHz)',
            type: 'category',  // Categorical axis for evenly spaced bars
            domain: [0, 1]
        },
        yaxis2: {
            title: 'Total Loss (dB)',
            range: [0, y_max],  // Auto-adjust with padding for text labels
            domain: [0, 0.30]  // Bar chart gets ~240px (30% of 800px), leaving 7.5% gap (60px) between plots
        },
        showlegend: true
    };
    
    Plotly.newPlot(containerId, all_traces, layout, {responsive: true, autosize: true});
}

/**
 * Plot 2D ionospheric tilts (side view + top view)
 * 
 * @param {number} foF2_tx - foF2 at transmitter in MHz
 * @param {number} foF2_dist - foF2 at reference distance in MHz
 * @param {number} tilt_distance - Reference distance in km
 * @param {number} elevation - Launch elevation angle in degrees
 * @param {string} sideContainerId - DOM element ID for side view
 * @param {string} topContainerId - DOM element ID for top view
 */
function plot2DTilts(foF2_tx, foF2_dist, tilt_distance, elevation, 
                     sideContainerId = 'tilt-side-view', topContainerId = 'tilt-top-view') {
    const frequencies = [1.8, 3.5, 5.3, 7.0, 10.1, 14.0, 18.068, 21.0, 24.89, 28.0];
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
                    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
    
    const side_traces = [];
    const top_traces = [];
    let max_distance = 0;
    
    frequencies.forEach((freq, i) => {
        const result = traceRay2DWithTilts(freq, elevation, foF2_tx, foF2_dist, tilt_distance);
        
        // Truncate ray path at 400 km - stop plotting when altitude exceeds 400 km
        const truncated_distances = [];
        const truncated_altitudes = [];
        const truncated_azimuths = [];
        for (let j = 0; j < result.altitudes.length; j++) {
            if (result.altitudes[j] <= 400) {
                truncated_distances.push(result.distances[j]);
                truncated_altitudes.push(result.altitudes[j]);
                truncated_azimuths.push(result.azimuths[j]);
            } else {
                break;  // Stop at first point above 400 km
            }
        }
        
        // Find the maximum distance for rays that return (only count those below 400 km)
        if (result.status === 'returns' && truncated_distances.length > 0) {
            const ray_max = Math.max(...truncated_distances.filter(d => d !== null));
            max_distance = Math.max(max_distance, ray_max);
        }
        
        side_traces.push({
            x: truncated_distances,
            y: truncated_altitudes,
            type: 'scatter',
            mode: 'lines',
            name: `${freq.toFixed(1)} MHz (${result.status})`,
            line: {color: colors[i], width: 2}
        });
        
        top_traces.push({
            x: truncated_distances,
            y: truncated_azimuths,
            type: 'scatter',
            mode: 'lines',
            name: `${freq.toFixed(1)} MHz`,
            line: {color: colors[i], width: 2}
        });
    });
    
    // Auto-adjust x-axis: use max return distance + 10% padding, or default to 8000 if no returns
    const x_max = max_distance > 0 ? Math.ceil(max_distance * 1.1) : 8000;
    
    // Add zero reference line to top view
    const zero_line = {
        x: [0, x_max],
        y: [0, 0],
        type: 'scatter',
        mode: 'lines',
        line: {color: 'gray', width: 1, dash: 'dash'},
        name: 'Great Circle',
        showlegend: false
    };
    top_traces.push(zero_line);
    
    // Get container width for explicit sizing
    const sideContainer = document.getElementById(sideContainerId);
    const topContainer = document.getElementById(topContainerId);
    const sideWidth = sideContainer ? sideContainer.offsetWidth || sideContainer.parentElement.offsetWidth : null;
    const topWidth = topContainer ? topContainer.offsetWidth || topContainer.parentElement.offsetWidth : null;
    
    const side_layout = {
        title: `2D Ray Paths (foF2: ${foF2_tx}→${foF2_dist} MHz over ${tilt_distance} km)`,
        xaxis: {title: 'Distance (km)', range: [0, x_max]},
        yaxis: {title: 'Altitude (km)', range: [0, 400]},  // Limit to 400 km - rays above this escape
        showlegend: true,
        autosize: true,
        width: sideWidth || undefined
    };
    
    const top_layout = {
        title: 'Azimuth Deflection (Off-Great-Circle Propagation)',
        xaxis: {title: 'Distance (km)', range: [0, x_max]},
        yaxis: {title: 'Azimuth Deflection (degrees)'},
        showlegend: true,
        autosize: true,
        width: topWidth || undefined
    };
    
    Plotly.newPlot(sideContainerId, side_traces, side_layout, {responsive: true, autosize: true});
    Plotly.newPlot(topContainerId, top_traces, top_layout, {responsive: true, autosize: true});
    
    // Force resize after plot creation if containers are visible
    setTimeout(() => {
        if (sideContainer && sideContainer.offsetParent !== null) {
            Plotly.Plots.resize(sideContainer);
        }
        if (topContainer && topContainer.offsetParent !== null) {
            Plotly.Plots.resize(topContainer);
        }
    }, 100);
}

/**
 * Plot 2D absorption with tilts
 * 
 * @param {number} foF2_tx - foF2 at transmitter in MHz
 * @param {number} foF2_dist - foF2 at reference distance in MHz
 * @param {number} tilt_distance - Reference distance in km
 * @param {number} elevation - Launch elevation angle in degrees
 * @param {string} containerId - DOM element ID for plot
 */
function plot2DAbsorption(foF2_tx, foF2_dist, tilt_distance, elevation,
                          containerId = 'absorption-2d-chart') {
    const frequencies = [1.8, 3.5, 5.3, 7.0, 10.1, 14.0, 18.068, 21.0, 24.89, 28.0];
    
    const path_traces = [];
    const loss_data = [];
    let max_distance = 0;
    
    frequencies.forEach((freq, i) => {
        const result = traceRay2DWithAbsorption(freq, elevation, foF2_tx, foF2_dist, tilt_distance);
        const loss = result.total_loss_dB;
        
        loss_data.push({freq, loss, status: result.status});
        
        // Truncate ray path at 400 km - stop plotting when altitude exceeds 400 km
        const truncated_distances = [];
        const truncated_altitudes = [];
        for (let j = 0; j < result.altitudes.length; j++) {
            if (result.altitudes[j] <= 400) {
                truncated_distances.push(result.distances[j]);
                truncated_altitudes.push(result.altitudes[j]);
            } else {
                break;  // Stop at first point above 400 km
            }
        }
        
        // Find the maximum distance for rays that return (only count those below 400 km)
        if (result.status === 'returns' && truncated_distances.length > 0) {
            const ray_max = Math.max(...truncated_distances.filter(d => d !== null));
            max_distance = Math.max(max_distance, ray_max);
        }
        
        let color;
        if (loss < 10) color = 'green';
        else if (loss < 30) color = 'orange';
        else if (loss < 60) color = 'red';
        else color = 'darkred';
        
        path_traces.push({
            x: truncated_distances,
            y: truncated_altitudes,
            type: 'scatter',
            mode: 'lines',
            name: `${freq.toFixed(1)} MHz (${loss.toFixed(1)} dB)`,
            line: {color: color, width: 2},
            xaxis: 'x',
            yaxis: 'y'
        });
    });
    
    // Bar chart trace - filter out escaped rays, only show returns/stops
    const bar_data = loss_data.filter(d => d.status !== 'escapes');
    const frequency_labels = bar_data.map(d => `${d.freq.toFixed(1)} MHz`);
    
    // Calculate max loss for y-axis range with padding for text labels
    const max_loss = bar_data.length > 0 ? Math.max(...bar_data.map(d => d.loss)) : 50;
    const y_max = Math.ceil(max_loss * 1.25);  // Add 25% padding for text labels above bars
    
    const bar_trace = {
        x: frequency_labels,
        y: bar_data.map(d => d.loss),
        type: 'bar',
        text: bar_data.map(d => `${d.loss.toFixed(1)} dB`),
        textposition: 'outside',
        marker: {
            color: bar_data.map(d => {
                if (d.loss < 10) return 'green';
                if (d.loss < 30) return 'orange';
                if (d.loss < 60) return 'red';
                return 'darkred';
            })
        },
        xaxis: 'x2',
        yaxis: 'y2'
    };
    
    const all_traces = [...path_traces, bar_trace];
    
    // Auto-adjust x-axis: use max return distance + 10% padding, or default to 8000 if no returns
    const x_max = max_distance > 0 ? Math.ceil(max_distance * 1.1) : 8000;
    
    // Get container width for explicit sizing
    const container = document.getElementById(containerId);
    const containerWidth = container ? (container.offsetWidth || container.parentElement.offsetWidth) : null;
    
    const layout = {
        title: '2D Signal Loss Analysis',
        grid: {
            rows: 2,
            columns: 1,
            pattern: 'independent'
        },
        xaxis: {
            title: 'Distance (km)',
            range: [0, x_max],
            domain: [0, 1]
        },
        yaxis: {
            title: 'Altitude (km)',
            range: [0, 400],  // Limit to 400 km - rays above this escape
            domain: [0.375, 1]  // Ray path gets ~500px (62.5% of 800px container) to match first plot height
        },
        xaxis2: {
            title: 'Frequency (MHz)',
            type: 'category',  // Categorical axis for evenly spaced bars
            domain: [0, 1]
        },
        yaxis2: {
            title: 'Total Loss (dB)',
            range: [0, y_max],  // Auto-adjust with padding for text labels
            domain: [0, 0.30]  // Bar chart gets ~240px (30% of 800px), leaving 7.5% gap (60px) between plots
        },
        showlegend: true,
        autosize: true,
        width: containerWidth || undefined
    };
    
    Plotly.newPlot(containerId, all_traces, layout, {responsive: true, autosize: true});
    
    // Force resize after plot creation if container is visible
    setTimeout(() => {
        if (container && container.offsetParent !== null) {
            Plotly.Plots.resize(container);
        }
    }, 100);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        plotElectronDensity,
        plotPlasmaFrequency,
        plotRayPaths1D,
        plotSignalLoss1D,
        plot2DTilts,
        plot2DAbsorption
    };
}
