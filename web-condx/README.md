# CondX Web Version

A standalone HTML/JavaScript implementation of the CondX ionospheric HF radio wave propagation model.

## Quick Start

Simply open `index.html` in your web browser:

```bash
open index.html
```

Or serve with a simple HTTP server:

```bash
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## Features

- Pure client-side JavaScript - no server required
- Interactive visualizations with Plotly.js
- 1D and 2D ionospheric models
- Real-time physics calculations

## Files

- `index.html` - Main HTML page with styling
- `physics.js` - Physics model (Chapman layers, ray tracing)
- `visualizations.js` - Plotly.js charts
- `main.js` - Event handlers and application logic

JavaScript port of the CondX ionospheric propagation model.
