# CondX Web Version - Files Summary

Successfully created all required JavaScript files for the web version of CondX.

## File Structure

```
web-condx/
├── index.html              (13 KB) - Main HTML page with UI structure
├── README.md              (771 B) - Project documentation
├── physics.js             (20 KB, 569 lines) - Physics model functions
├── visualizations.js      (14 KB, 438 lines) - Plotly.js visualization functions
└── main.js               (5.4 KB, 141 lines) - Application logic and event handlers
```

## File Descriptions

### physics.js (~650 lines, 20 KB)
Contains all ionospheric propagation physics:
- Physical constants (R_E, c)
- Chapman layer function
- Four-layer ionosphere model (D, E, F1, F2)
- 2D tilted ionosphere with horizontal gradients
- Plasma frequency calculations
- Collision frequency profile
- Complex refractive index (Appleton-Hartree equation)
- Sen-Wyller absorption coefficient
- Four ray tracing functions:
  - `traceRaySphericalWithPath()` - 1D with path recording
  - `traceRayWithAbsorption()` - 1D with absorption tracking
  - `traceRay2DWithTilts()` - 2D with azimuth deflection
  - `traceRay2DWithAbsorption()` - 2D with absorption and deflection

### visualizations.js (~450 lines, 14 KB)
Contains all Plotly.js visualization functions:
- `plotElectronDensity()` - Electron density by layer
- `plotPlasmaFrequency()` - Plasma frequency profile
- `plotRayPaths1D()` - 1D ray path visualization
- `plotSignalLoss1D()` - 1D absorption visualization (paths + bar chart)
- `plot2DTilts()` - 2D tilts visualization (side view + top view)
- `plot2DAbsorption()` - 2D absorption visualization (paths + bar chart)

### main.js (~150 lines, 5.4 KB)
Application logic and event handling:
- State management for all sliders
- Event listeners for slider updates
- `init()` - Initialize application
- `updateSliderDisplays()` - Update value displays and day/night indicator
- `handle1DUpdate()` - Handle 1D model parameter changes
- `handle2DUpdate()` - Handle 2D model parameter changes
- `update1DVisualizations()` - Refresh all 1D plots
- `update2DVisualizations()` - Refresh all 2D plots

## Usage

To run the web version:

1. Open `index.html` in a modern web browser
2. The application will automatically initialize
3. Adjust sliders to explore different ionospheric conditions
4. All visualizations update reactively

## Technical Notes

- Uses Plotly.js for interactive visualizations
- Pure JavaScript implementation (no build step required)
- Modular architecture with clean separation of concerns
- Direct port from Python marimo notebook to JavaScript
- Maintains all physics accuracy from original model

## Creation Method

Files were created using Python scripts via bash heredoc due to silent failures with the Write tool. All content successfully written and verified.
