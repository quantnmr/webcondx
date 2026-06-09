# CondX Web Version - Setup Guide

## ✅ Project Complete!

Your standalone HTML/JavaScript version of CondX is ready to use!

## Files Created

```
web-condx/
├── index.html              (13 KB) - Main HTML page with styling
├── physics.js              (20 KB) - Complete physics model
├── visualizations.js       (14 KB) - Plotly.js visualizations
├── main.js                 (5.4 KB) - Event handlers & app logic
├── README.md               (771 B) - Quick start guide
├── FILES_SUMMARY.md        (2.8 KB) - Technical documentation
└── SETUP.md                (this file) - Setup instructions
```

## How to Run

### Option 1: Open Directly (Simplest)

```bash
cd /Users/scott/Writing/condx/web-condx
open index.html
```

The page will load Plotly.js from CDN, so you need an internet connection.

### Option 2: Local Web Server (Recommended)

```bash
cd /Users/scott/Writing/condx/web-condx
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

### Option 3: Share via GitHub Pages

1. Create a new GitHub repo
2. Upload all files from web-condx/
3. Enable GitHub Pages in repo settings
4. Your tool will be live at https://yourusername.github.io/repo-name/

For this project, the live site is: https://quantnmr.github.io/webcondx/

## Features

### Part 1: 1D Ionospheric Model
- ✅ Electron density visualization (4 layers: D, E, F1, F2)
- ✅ Plasma frequency profile
- ✅ Interactive ray path tracing for 10 HF frequencies
- ✅ Signal absorption loss visualization with color-coding
- ✅ Day/night condition indicator

### Part 2: 2D Model with Tilts
- ✅ Ionospheric gradient modeling (day/night terminator)
- ✅ Side view: Ray paths through tilted ionosphere
- ✅ Top view: Azimuth deflection (off-great-circle propagation)
- ✅ Absorption loss with horizontal gradients

## Physics Implementation

All calculations run in JavaScript in the browser:
- Chapman layer electron density profiles
- Four-layer ionosphere (D, E, F1, F2) with realistic parameters
- Appleton-Hartree refractive index equation
- Sen-Wyller absorption formula
- Spherical ray tracing with Snell's law
- 2D horizontal gradients for ionospheric tilts

## Browser Requirements

Works in all modern browsers:
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari

Requires JavaScript enabled and internet connection (for Plotly.js CDN).

## Comparison to Python Version

| Feature | Python/Marimo | Web Version |
|---------|---------------|-------------|
| Physics Model | ✅ Complete | ✅ Complete (ported) |
| 1D Visualizations | ✅ Altair charts | ✅ Plotly charts |
| 2D Tilts Model | ✅ Working | ✅ Working |
| Interactive Sliders | ✅ marimo UI | ✅ HTML5 range inputs |
| Installation Required | ✅ Python + packages | ❌ None (just a browser!) |
| Share-ability | ⚠️ Needs Python | ✅ Just send files/URL |

## Next Steps

1. **Test it out**: Open index.html and try adjusting the sliders
2. **Verify physics**: Compare results with Python version
3. **Share it**: Put it on GitHub Pages or send the files to colleagues
4. **Customize**: Edit CSS in index.html to match your branding

## Troubleshooting

**Plots don't show:**
- Check browser console for errors (F12 or Cmd+Option+I)
- Ensure internet connection (Plotly.js loads from CDN)
- Try a different browser

**Physics seems wrong:**
- Compare specific foF2/elevation values with Python version
- Check browser console for JavaScript errors
- Report issues with specific parameters that don't match

**Sliders don't respond:**
- Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)
- Check that all JavaScript files loaded properly

## Questions?

The web version is a faithful port of your Python notebook. All the same physics, just running in JavaScript instead of Python!

Enjoy exploring ionospheric propagation! 📡🌍
