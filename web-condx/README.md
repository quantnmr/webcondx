# CondX - HF Radio Wave Propagation

Interactive web application for modeling High Frequency (HF) radio wave propagation through Earth's ionosphere.

## Live Demo

Visit the live site at: [https://quantnmr.github.io/condx/](https://quantnmr.github.io/condx/)

## Features

- **1D Ionospheric Model**: Vertical propagation modeling with interactive controls
- **2D Ionospheric Model**: Horizontal gradient modeling (day/night terminator effects)
- **Real-time Visualization**: Interactive ray path and signal loss analysis
- **Physics-based**: Uses Chapman layer model with Appleton-Hartree refractive index

## Local Development

Simply open `index.html` in a web browser, or use a local web server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx http-server -p 8000
```

Then visit `http://localhost:8000`

## Files

- `index.html` - Main HTML structure
- `style.css` - Styling
- `physics.js` - Ionospheric physics calculations
- `visualizations.js` - Plotly.js visualization functions
- `main.js` - Application logic and event handlers

## License

See parent repository for license information.
