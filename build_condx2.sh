#!/bin/bash
# Simple script to combine the files

# Start with condx.py header
head -n 14 condx.py > condx2.py

# Add first cell with basic imports (no model/plots)
cat >> condx2.py << 'CELL1'
@app.cell
def _():
    import marimo as mo
    import numpy as np
    import matplotlib.pyplot as plt
    import altair as alt
    import pandas as pd
    return alt, mo, np, pd, plt


CELL1

# Add model.py functions as a cell
echo "@app.cell" >> condx2.py
echo "def _(np):" >> condx2.py
echo "    # Physics model from model.py" >> condx2.py
sed 's/^/    /' model.py | grep -v '^    """' | grep -v '^    import' | grep -v '^    from' >> condx2.py
cat >> condx2.py << 'MODELRET'
    return (R_E, c, pi, chapman_layer, make_ionosphere_for_foF2, make_tilted_ionosphere_2D,
            plasma_frequency_Hz_from_Ne, collision_frequency_Hz, make_refractive_index_func,
            trace_ray_spherical_with_path, trace_ray_with_absorption,
            trace_ray_2D_with_tilts, trace_ray_2D_with_absorption)


MODELRET

# Add plots.py functions as a cell  
echo "@app.cell" >> condx2.py
echo "def _(alt, np, pd):" >> condx2.py
echo "    # Plotting functions from plots.py" >> condx2.py
sed 's/^/    /' plots.py | grep -v '^    """' | grep -v '^    import' | grep -v '^    from' >> condx2.py
cat >> condx2.py << 'PLOTSRET'
    return (LEGEND_STYLE, LAYER_COLORS, LOSS_COLORS, plot_electron_density,
            plot_2D_side_view, plot_2D_top_view, plot_2D_absorption)


PLOTSRET

# Add rest of condx.py cells (skip first two cells)
tail -n +29 condx.py | sed 's/import model//g; s/import plots//g; s/from model import.*//g; s/plots\.//g' >> condx2.py

echo "Created condx2.py"
