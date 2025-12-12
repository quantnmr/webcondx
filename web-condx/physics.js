// physics.js - Ionospheric propagation physics model for CondX web version

// Physical constants
const R_E = 6371.0;  // Earth radius in km
const c = 3.0e8;     // Speed of light in m/s

/**
 * Chapman layer function - models electron density profile for a single ionospheric layer
 * Based on solar radiation absorption physics
 * 
 * @param {number[]} z - Altitude array in km
 * @param {number} N_peak - Peak electron density in electrons/m³
 * @param {number} z_peak - Peak altitude in km
 * @param {number} H - Scale height in km
 * @returns {number[]} Electron density at each altitude
 */
function chapmanLayer(z, N_peak, z_peak, H) {
    return z.map(altitude => {
        const reduced_z = (altitude - z_peak) / H;
        const exponent = 1.0 - reduced_z - Math.exp(-reduced_z);
        return N_peak * Math.exp(exponent);
    });
}

/**
 * Chapman layer function for a single altitude point (optimized)
 * 
 * @param {number} z - Altitude in km
 * @param {number} N_peak - Peak electron density in electrons/m³
 * @param {number} z_peak - Peak altitude in km
 * @param {number} H - Scale height in km
 * @returns {number} Electron density at altitude z
 */
function chapmanLayerSingle(z, N_peak, z_peak, H) {
    const reduced_z = (z - z_peak) / H;
    const exponent = 1.0 - reduced_z - Math.exp(-reduced_z);
    return N_peak * Math.exp(exponent);
}

/**
 * Create four-layer ionosphere model based on foF2 parameter
 * D layer (~75 km): High absorption, affects lower HF
 * E layer (~110 km): Regular daytime layer
 * F1 layer (~190 km): Daytime only
 * F2 layer (~300 km): Most important for HF, peak varies with foF2
 * 
 * @param {number[]} z - Altitude array in km
 * @param {number} foF2 - Critical frequency of F2 layer in MHz
 * @returns {number[]} Total electron density at each altitude
 */
function makeIonosphereForFoF2(z, foF2) {
    // F2 layer parameters vary with foF2
    // Formula: fp (Hz) = 8.98 × sqrt(Ne) where Ne is in electrons/m³
    // So: Ne = (fp / 8.98)^2
    const f_F2_Hz = foF2 * 1e6;
    const Ne_F2_peak = Math.pow(f_F2_Hz / 8.98, 2);
    
    // F2 peak altitude (hmF2): follows ionospheric climatology
    // Nighttime: hmF2 is typically HIGHER (260-350 km), especially when foF2 is low
    //   - No photoionization, maintained by diffusion and winds which push plasma higher
    // Daytime: hmF2 is typically LOWER (250-300 km), especially when foF2 is high
    //   - Strong photoionization produces plasma closer to peak of Chapman function
    let h_F2;
    if (foF2 < 4.5) {
        // Nighttime: F1 absent, F2 peak is HIGHER due to diffusion/winds
        // Lower foF2 → higher peak (more time for diffusion to raise plasma)
        // Range: 260-350 km (higher than daytime)
        h_F2 = 260.0 + (4.5 - foF2) * 36.0;  // 260 km at foF2=4.5, 350 km at foF2=2.0
        h_F2 = Math.max(260.0, Math.min(350.0, h_F2));  // Clamp to realistic nighttime range
    } else if (foF2 < 7.0) {
        // Transition period: F1 emerging, hmF2 transitioning from high (night) to lower (day)
        // Interpolate between nighttime (~300 km) and daytime (~280 km)
        const transition_factor = (foF2 - 4.5) / 2.5;
        h_F2 = 300.0 - transition_factor * 20.0;  // 300 km at foF2=4.5, 280 km at foF2=7.0
    } else {
        // Daytime: F1 and F2 separate, F2 peak is LOWER due to photoionization
        // Higher foF2 → slightly lower peak (stronger production near peak)
        // Range: 250-300 km (lower than nighttime)
        h_F2 = 300.0 - (foF2 - 7.0) * 2.0;  // 300 km at foF2=7.0, ~274 km at foF2=20.0
        h_F2 = Math.max(250.0, Math.min(300.0, h_F2));  // Clamp to realistic daytime range
    }
    
    // D layer strength (present during day, absent at night)
    // Matches Python: D_factor = 0.0 if foF2 < 5.0, linear transition 5.0-8.0, 1.0 if >= 8.0
    let D_factor;
    if (foF2 < 5.0) {
        D_factor = 0.0;  // Night: no D layer
    } else if (foF2 < 8.0) {
        D_factor = (foF2 - 5.0) / 3.0;  // Dawn/dusk transition
    } else {
        D_factor = 1.0;  // Day: full D layer
    }
    const Ne_D_peak = 1.5e9 * D_factor;
    
    // F1 layer strength (daytime only)
    // At night (foF2 < 4.5): F1 recombines away quickly (low lifetime)
    // F1 disappears almost entirely, leaving only the broadened F2 (now called "F layer")
    // This is the physical process: F1 recombines, F2 descends and broadens
    let F1_factor;
    if (foF2 < 4.5) {
        F1_factor = 0.0;  // Night: F1 layer absent (recombines, F2 becomes single F layer)
    } else if (foF2 < 7.0) {
        F1_factor = (foF2 - 4.5) / 2.5;  // Transition: F1 gradually appears
    } else {
        F1_factor = 1.0;  // Day: full F1 layer present
    }
    const Ne_F1_peak = 6e11 * F1_factor;  // Doubled from 3e11 to 6e11
    
    // E layer strength (stronger during day)
    // Matches Python: E_factor = 0.5 + 0.5 * min(1.0, foF2 / 12.0)
    const E_factor = 0.5 + 0.5 * Math.min(1.0, foF2 / 12.0);
    const Ne_E_peak = 8e10 * E_factor;
    
    // Build each layer
    const Ne_D = chapmanLayer(z, Ne_D_peak, 75.0, 8.0);
    const Ne_E = chapmanLayer(z, Ne_E_peak, 110.0, 15.0);
    const Ne_F1 = chapmanLayer(z, Ne_F1_peak, 190.0, 30.0);
    
    // F2 layer: at night, this represents the single broadened F layer
    // Use a broader scale height at night to reflect the broadening effect
    // Nighttime F layer is broader due to recombination and diffusion
    let F2_scale_height = 55.0;  // Default daytime scale height
    if (foF2 < 4.5) {
        // Nighttime: F layer is broader (increased scale height)
        // This reflects the smoother, less peaked profile after F1 recombination
        F2_scale_height = 70.0;  // Broader profile at night
    } else if (foF2 < 7.0) {
        // Transition: gradually narrow from nighttime to daytime
        const transition_factor = (foF2 - 4.5) / 2.5;
        F2_scale_height = 70.0 - transition_factor * 15.0;  // 70 km at foF2=4.5, 55 km at foF2=7.0
    }
    
    const Ne_F2 = chapmanLayer(z, Ne_F2_peak, h_F2, F2_scale_height);
    
    // Sum all layers
    // At night (foF2 < 4.5): Ne_F1 = 0, so only D, E, and F2 (the single F layer) contribute
    return z.map((_, i) => Ne_D[i] + Ne_E[i] + Ne_F1[i] + Ne_F2[i]);
}

/**
 * Create 2D ionosphere with horizontal foF2 gradient (tilts)
 * Models day/night terminator or other horizontal density variations
 * 
 * @param {number[]} z - Altitude array in km
 * @param {number} x - Horizontal distance in km
 * @param {number} foF2_at_tx - foF2 at transmitter (0 km)
 * @param {number} foF2_at_distance - foF2 at reference distance
 * @param {number} tilt_distance - Reference distance for gradient in km
 * @returns {number[]} Electron density at position (x, z)
 */
function makeTiltedIonosphere2D(z, x, foF2_at_tx, foF2_at_distance, tilt_distance) {
    // Linear interpolation of foF2 with distance
    const foF2_local = foF2_at_tx + (foF2_at_distance - foF2_at_tx) * (x / tilt_distance);
    
    // Clamp to reasonable range
    const foF2_clamped = Math.max(2.0, Math.min(25.0, foF2_local));
    
    // Build ionosphere at this location
    return makeIonosphereForFoF2(z, foF2_clamped);
}

/**
 * Calculate electron density for a single point at given foF2 (optimized)
 * This is much faster than building the full array when you only need one value
 * 
 * @param {number} z - Altitude in km
 * @param {number} foF2 - Critical frequency of F2 layer in MHz
 * @returns {number} Electron density at altitude z
 */
function electronDensitySingle(z, foF2) {
    // F2 layer parameters
    const f_F2_Hz = foF2 * 1e6;
    const Ne_F2_peak = Math.pow(f_F2_Hz / 8.98, 2);
    
    // F2 peak altitude
    let h_F2;
    if (foF2 < 4.5) {
        h_F2 = 260.0 + (4.5 - foF2) * 36.0;
        h_F2 = Math.max(260.0, Math.min(350.0, h_F2));
    } else if (foF2 < 7.0) {
        const transition_factor = (foF2 - 4.5) / 2.5;
        h_F2 = 300.0 - transition_factor * 20.0;
    } else {
        h_F2 = 300.0 - (foF2 - 7.0) * 2.0;
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
    
    // F1 layer strength
    let F1_factor;
    if (foF2 < 4.5) {
        F1_factor = 0.0;
    } else if (foF2 < 7.0) {
        F1_factor = (foF2 - 4.5) / 2.5;
    } else {
        F1_factor = 1.0;
    }
    const Ne_F1_peak = 6e11 * F1_factor;
    
    // E layer strength
    const E_factor = 0.5 + 0.5 * Math.min(1.0, foF2 / 12.0);
    const Ne_E_peak = 8e10 * E_factor;
    
    // F2 scale height
    let F2_scale_height = 55.0;
    if (foF2 < 4.5) {
        F2_scale_height = 70.0;
    } else if (foF2 < 7.0) {
        const transition_factor = (foF2 - 4.5) / 2.5;
        F2_scale_height = 70.0 - transition_factor * 15.0;
    }
    
    // Calculate each layer at single point
    const Ne_D = chapmanLayerSingle(z, Ne_D_peak, 75.0, 8.0);
    const Ne_E = chapmanLayerSingle(z, Ne_E_peak, 110.0, 15.0);
    const Ne_F1 = chapmanLayerSingle(z, Ne_F1_peak, 190.0, 30.0);
    const Ne_F2 = chapmanLayerSingle(z, Ne_F2_peak, h_F2, F2_scale_height);
    
    return Ne_D + Ne_E + Ne_F1 + Ne_F2;
}

/**
 * Calculate electron density for a single point in 2D tilted ionosphere (optimized)
 * 
 * @param {number} z - Altitude in km
 * @param {number} x - Horizontal distance in km
 * @param {number} foF2_at_tx - foF2 at transmitter (0 km)
 * @param {number} foF2_at_distance - foF2 at reference distance
 * @param {number} tilt_distance - Reference distance for gradient in km
 * @returns {number} Electron density at position (z, x)
 */
function electronDensity2DSingle(z, x, foF2_at_tx, foF2_at_distance, tilt_distance) {
    // Linear interpolation of foF2 with distance
    const foF2_local = foF2_at_tx + (foF2_at_distance - foF2_at_tx) * (x / tilt_distance);
    
    // Clamp to reasonable range
    const foF2_clamped = Math.max(2.0, Math.min(25.0, foF2_local));
    
    // Calculate electron density at this single point
    return electronDensitySingle(z, foF2_clamped);
}

/**
 * Convert electron density to plasma frequency
 * 
 * @param {number} Ne - Electron density in electrons/m³
 * @returns {number} Plasma frequency in Hz
 */
function plasmaFrequencyFromNe(Ne) {
    const e = 1.602176634e-19;  // Elementary charge
    const m_e = 9.1093837015e-31;  // Electron mass
    const eps_0 = 8.8541878128e-12;  // Permittivity of free space
    
    return Math.sqrt(Ne * e * e / (eps_0 * m_e)) / (2.0 * Math.PI);
}

/**
 * Collision frequency profile for radio wave absorption
 * Based on atmospheric pressure and altitude
 * 
 * @param {number} z - Altitude in km
 * @returns {number} Collision frequency in Hz
 */
function collisionFrequency(z) {
    if (z < 90.0) {
        // D-layer region: high absorption
        return 3.5e5 * Math.exp(-(z - 70.0) / 8.0);
    } else if (z < 150.0) {
        // E/F region: moderate absorption
        return 1.0e5 * Math.exp(-(z - 90.0) / 20.0);
    } else {
        // High altitude: minimal absorption
        return 1.0e3;
    }
}

/**
 * Calculate complex refractive index using Appleton-Hartree equation
 * Includes both refraction (bending) and absorption effects
 * 
 * @param {number} Ne - Electron density in electrons/m³
 * @param {number} freq_Hz - Radio frequency in Hz
 * @param {number} nu - Collision frequency in Hz
 * @returns {Object} {real: Real part of n, imag: Imaginary part of n}
 */
function refractiveIndex(Ne, freq_Hz, nu) {
    const omega = 2.0 * Math.PI * freq_Hz;
    const omega_p = 2.0 * Math.PI * plasmaFrequencyFromNe(Ne);
    
    const X = Math.pow(omega_p / omega, 2);
    const Z = nu / omega;
    
    // Appleton-Hartree formula: n² = 1 - X/(1 - jZ)
    // n² = 1 - X(1 + jZ) / (1 + Z²)
    const denom = 1.0 + Z * Z;
    const n_sq_real = 1.0 - X / denom;
    const n_sq_imag = X * Z / denom;
    
    // n = sqrt(n²) - use complex square root
    const magnitude = Math.sqrt(Math.sqrt(n_sq_real * n_sq_real + n_sq_imag * n_sq_imag));
    const phase = Math.atan2(n_sq_imag, n_sq_real) / 2.0;
    
    return {
        real: magnitude * Math.cos(phase),
        imag: magnitude * Math.sin(phase)
    };
}

/**
 * Sen-Wyller absorption coefficient
 * Calculates signal attenuation in Nepers/km
 * 
 * @param {number} Ne - Electron density in electrons/m³
 * @param {number} freq_Hz - Radio frequency in Hz
 * @param {number} nu - Collision frequency in Hz
 * @returns {number} Absorption coefficient in Nepers/km
 */
function absorptionCoefficient(Ne, freq_Hz, nu) {
    const omega = 2.0 * Math.PI * freq_Hz;
    const n = refractiveIndex(Ne, freq_Hz, nu);
    
    // α = (ω/2c) × |Im(n²)| / Re(n)
    const n_sq_imag = 2.0 * n.real * n.imag;  // Im(n²) = 2 Re(n) Im(n)
    const alpha_per_m = (omega / (2.0 * c)) * Math.abs(n_sq_imag) / Math.max(n.real, 1e-10);
    
    // Convert m⁻¹ to km⁻¹
    return alpha_per_m * 1000.0;
}

/**
 * Trace ray through spherical ionosphere with path recording
 * Uses Snell's law in spherical coordinates
 * 
 * @param {number} freq_MHz - Radio frequency in MHz
 * @param {number} elevation_deg - Launch elevation angle in degrees
 * @param {Function} ionosphere_func - Function(z) returning electron density
 * @param {number} max_distance_km - Maximum propagation distance
 * @returns {Object} {distances: [], altitudes: [], status: 'returns'|'escapes'|'stops'}
 */
function traceRaySphericalWithPath(freq_MHz, elevation_deg, ionosphere_func, max_distance_km = 10000.0) {
    const freq_Hz = freq_MHz * 1e6;
    const psi_0 = elevation_deg * Math.PI / 180.0;  // Initial elevation angle
    
    // Initial conditions at Earth's surface
    let r = R_E;
    let theta = 0.0;
    
    // Ray parameter (conserved): b = n_0 * r * sin(psi_0)
    const z0 = 0.0;
    const Ne0 = ionosphere_func(z0);
    const nu0 = collisionFrequency(z0);
    const n0 = refractiveIndex(Ne0, freq_Hz, nu0).real;
    const b = n0 * r * Math.sin(psi_0);  // Ray parameter (conserved)
    
    // Storage for path
    const distances = [0.0];
    const altitudes = [0.0];
    
    // Ray direction tracking
    let going_up = true;
    
    const step_km = 5.0;  // Increased from 2.0 to 5.0 to match Python performance (2.5x fewer steps)
    const max_steps = Math.floor(max_distance_km / step_km);
    
    // Ray tracing loop
    for (let step = 0; step < max_steps; step++) {
        const z = r - R_E;
        
        // Check if returned to ground
        if (z < 0.0 && step > 10) {
            return {distances, altitudes, status: 'returns'};
        }
        
        // Get refractive index at current position
        const Ne = z >= 0 ? ionosphere_func(z) : 0;
        const nu = collisionFrequency(Math.max(0, z));
        const n_complex = refractiveIndex(Ne, freq_Hz, nu);
        const n_real = n_complex.real;
        const n_squared = {
            real: n_complex.real * n_complex.real - n_complex.imag * n_complex.imag,
            imag: 2 * n_complex.real * n_complex.imag
        };
        const n2_real = n_squared.real;
        
        // Check if ray is reflected (n² < 0 means total reflection)
        if (n2_real <= 0) {
            going_up = false;
        }
        
        // Calculate ray angle from ray parameter conservation
        // sin(psi) = b / (n * r)
        let sin_psi = b / (n_real * r);
        
        // Check if ray reflects (sin > 1) or escapes (too high)
        if (Math.abs(sin_psi) >= 1.0) {
            if (z > 600 && going_up) {
                return {distances, altitudes, status: 'escapes'};
            } else {
                // Reflection point - start coming back down
                going_up = false;
                sin_psi = Math.sign(sin_psi) * 0.999;
            }
        }
        
        if (z > 800 && going_up) {
            return {distances, altitudes, status: 'escapes'};
        }
        
        const cos_psi = Math.sqrt(1 - sin_psi * sin_psi);
        
        // Step along ray (with direction: up or down)
        const dr = step_km * cos_psi * (going_up ? 1 : -1);
        const d_theta = step_km * sin_psi / r;
        
        r += dr;
        theta += d_theta;
        
        distances.push(theta * R_E);
        altitudes.push(r - R_E);
        
        // Check for excessive distance
        if (theta * R_E > max_distance_km) {
            return {distances, altitudes, status: 'stops'};
        }
    }
    
    return {distances, altitudes, status: 'stops'};
}

/**
 * Trace ray with absorption tracking (1D ionosphere)
 * 
 * @param {number} freq_MHz - Radio frequency in MHz
 * @param {number} elevation_deg - Launch elevation angle in degrees
 * @param {Function} ionosphere_func - Function(z) returning electron density
 * @param {number} max_distance_km - Maximum propagation distance
 * @returns {Object} {distances: [], altitudes: [], total_loss_dB: number, status: string}
 */
function traceRayWithAbsorption(freq_MHz, elevation_deg, ionosphere_func, max_distance_km = 10000.0) {
    const freq_Hz = freq_MHz * 1e6;
    const omega = 2.0 * Math.PI * freq_Hz;
    const psi_0 = elevation_deg * Math.PI / 180.0;
    
    // Initial conditions
    let r = R_E;
    let theta = 0.0;
    let total_loss_nepers = 0.0;
    
    // Ray parameter (conserved)
    const z0 = 0.0;
    const Ne0 = ionosphere_func(z0);
    const nu0 = collisionFrequency(z0);
    const n0 = refractiveIndex(Ne0, freq_Hz, nu0).real;
    const b = n0 * r * Math.sin(psi_0);
    
    // Storage
    const distances = [0.0];
    const altitudes = [0.0];
    
    // Ray direction tracking
    let going_up = true;
    
    const step_km = 5.0;  // Increased from 2.0 to 5.0 to match Python performance (2.5x fewer steps)
    const max_steps = Math.floor(max_distance_km / step_km);
    
    for (let step = 0; step < max_steps; step++) {
        const z = r - R_E;
        
        if (z < 0.0 && step > 10) {
            const total_loss_dB = total_loss_nepers * 8.686;
            return {distances, altitudes, total_loss_dB, status: 'returns'};
        }
        
        // Get complex refractive index
        const Ne = z >= 0 ? ionosphere_func(z) : 0;
        const nu = collisionFrequency(Math.max(0, z));
        const n_complex = refractiveIndex(Ne, freq_Hz, nu);
        const n_real = n_complex.real;
        const n_squared = {
            real: n_complex.real * n_complex.real - n_complex.imag * n_complex.imag,
            imag: 2 * n_complex.real * n_complex.imag
        };
        const n2_real = n_squared.real;
        
        // Check if ray is reflected
        if (n2_real <= 0) {
            going_up = false;
        }
        
        // Calculate absorption coefficient (Sen-Wyller formula)
        const alpha = (omega / (2.0 * c)) * Math.abs(n_squared.imag) / Math.max(n_real, 1e-10);
        
        // Accumulate loss (in Nepers)
        const path_length_m = step_km * 1000.0;
        total_loss_nepers += alpha * path_length_m;
        
        // Ray geometry
        let sin_psi = b / (n_real * r);
        
        if (Math.abs(sin_psi) >= 1.0) {
            if (z > 600 && going_up) {
                const total_loss_dB = total_loss_nepers * 8.686;
                return {distances, altitudes, total_loss_dB, status: 'escapes'};
            } else {
                going_up = false;
                sin_psi = Math.sign(sin_psi) * 0.999;
            }
        }
        
        if (z > 800 && going_up) {
            const total_loss_dB = total_loss_nepers * 8.686;
            return {distances, altitudes, total_loss_dB, status: 'escapes'};
        }
        
        const cos_psi = Math.sqrt(1 - sin_psi * sin_psi);
        
        // Step along ray (with direction: up or down)
        const dr = step_km * cos_psi * (going_up ? 1 : -1);
        const d_theta = step_km * sin_psi / r;
        
        r += dr;
        theta += d_theta;
        
        distances.push(theta * R_E);
        altitudes.push(r - R_E);
        
        if (theta * R_E > max_distance_km) {
            const total_loss_dB = total_loss_nepers * 8.686;
            return {distances, altitudes, total_loss_dB, status: 'stops'};
        }
    }
    
    const total_loss_dB = total_loss_nepers * 8.686;
    return {distances, altitudes, total_loss_dB, status: 'stops'};
}

/**
 * Trace ray through 2D ionosphere with azimuth deflection tracking
 * 
 * @param {number} freq_MHz - Radio frequency in MHz
 * @param {number} elevation_deg - Launch elevation angle in degrees
 * @param {number} foF2_at_tx - foF2 at transmitter
 * @param {number} foF2_at_distance - foF2 at reference distance
 * @param {number} tilt_distance - Reference distance for gradient
 * @param {number} max_distance_km - Maximum propagation distance
 * @returns {Object} {distances: [], altitudes: [], azimuths: [], status: string}
 */
function traceRay2DWithTilts(freq_MHz, elevation_deg, foF2_at_tx, foF2_at_distance, tilt_distance, max_distance_km = 10000.0) {
    const freq_Hz = freq_MHz * 1e6;
    const psi_0 = elevation_deg * Math.PI / 180.0;
    
    // Initial conditions
    let r = R_E;
    let theta = 0.0;
    let x = 0.0;  // Horizontal distance
    let phi = 0.0;  // Azimuth angle (radians)
    
    // Helper function to get refractive index at (z, x) - optimized to calculate single point
    const getRefractiveIndex = (z, x_dist) => {
        let Ne = 0;
        if (z >= 0 && z <= 600) {
            // Use optimized single-point calculation instead of building full array
            Ne = electronDensity2DSingle(z, x_dist, foF2_at_tx, foF2_at_distance, tilt_distance);
        }
        const nu = collisionFrequency(Math.max(0, z));
        return refractiveIndex(Ne, freq_Hz, nu);
    };
    
    // Ray parameter (conserved)
    const n_0 = getRefractiveIndex(0.0, 0.0).real;
    const b = n_0 * r * Math.sin(psi_0);
    
    // Storage
    const distances = [0.0];
    const altitudes = [0.0];
    const azimuths = [0.0];
    
    // Ray direction tracking
    let going_up = true;
    
    const step_km = 5.0;  // Increased from 2.0 to 5.0 to match Python performance (2.5x fewer steps)
    const max_steps = Math.floor(max_distance_km / step_km);
    
    for (let step = 0; step < max_steps; step++) {
        const z = r - R_E;
        
        if (z < 0.0 && step > 10) {
            return {
                distances,
                altitudes,
                azimuths: azimuths.map(a => a * 180.0 / Math.PI),
                status: 'returns'
            };
        }
        
        // Get refractive index at current position
        const n_complex = getRefractiveIndex(z, x);
        const n_real = n_complex.real;
        const n_squared = {
            real: n_complex.real * n_complex.real - n_complex.imag * n_complex.imag,
            imag: 2 * n_complex.real * n_complex.imag
        };
        const n2_real = n_squared.real;
        
        // Check if ray is reflected
        if (n2_real <= 0) {
            going_up = false;
        }
        
        // Calculate horizontal gradient (dn/dx) for azimuth deflection
        const dx_sample = 1.0;  // km
        let dn_dx = 0.0;
        if (x > 0) {
            const n_plus = getRefractiveIndex(z, x + dx_sample);
            const n_minus = getRefractiveIndex(z, x - dx_sample);
            dn_dx = (n_plus.real - n_minus.real) / (2 * dx_sample);
        } else {
            const n_plus = getRefractiveIndex(z, x + dx_sample);
            dn_dx = (n_plus.real - n_real) / dx_sample;
        }
        
        // Ray angle from ray parameter
        let sin_psi = b / (n_real * r);
        
        if (Math.abs(sin_psi) >= 1.0) {
            if (z > 600 && going_up) {
                return {
                    distances,
                    altitudes,
                    azimuths: azimuths.map(a => a * 180.0 / Math.PI),
                    status: 'escapes'
                };
            } else {
                going_up = false;
                sin_psi = Math.sign(sin_psi) * 0.999;
            }
        }
        
        if (z > 800 && going_up) {
            return {
                distances,
                altitudes,
                azimuths: azimuths.map(a => a * 180.0 / Math.PI),
                status: 'escapes'
            };
        }
        
        const cos_psi = Math.sqrt(1 - sin_psi * sin_psi);
        
        // Azimuth deflection from horizontal gradient
        // dphi/ds = -(1/n) × (dn/dx) / sin(psi)
        let dphi = 0.0;
        if (Math.abs(sin_psi) > 0.1) {  // Avoid division by zero at high angles
            const dphi_ds = -(1.0 / n_real) * dn_dx / Math.abs(sin_psi);
            dphi = dphi_ds * step_km;
        }
        
        // Step along ray (using spherical geometry with direction tracking)
        const dr = step_km * cos_psi * (going_up ? 1 : -1);
        const d_theta = step_km * sin_psi / r;  // Angular distance along Earth's surface
        
        r += dr;
        theta += d_theta;
        x += Math.abs(d_theta * R_E);  // Horizontal coordinate follows spherical geometry
        phi += dphi;
        
        distances.push(theta * R_E);
        altitudes.push(r - R_E);
        azimuths.push(phi);
        
        if (x > max_distance_km) {
            return {
                distances,
                altitudes,
                azimuths: azimuths.map(a => a * 180.0 / Math.PI),
                status: 'stops'
            };
        }
    }
    
    return {
        distances,
        altitudes,
        azimuths: azimuths.map(a => a * 180.0 / Math.PI),
        status: 'stops'
    };
}

/**
 * Trace ray through 2D ionosphere with absorption AND azimuth deflection
 * 
 * @param {number} freq_MHz - Radio frequency in MHz
 * @param {number} elevation_deg - Launch elevation angle in degrees
 * @param {number} foF2_at_tx - foF2 at transmitter
 * @param {number} foF2_at_distance - foF2 at reference distance
 * @param {number} tilt_distance - Reference distance for gradient
 * @param {number} max_distance_km - Maximum propagation distance
 * @returns {Object} {distances: [], altitudes: [], azimuths: [], total_loss_dB: number, status: string}
 */
function traceRay2DWithAbsorption(freq_MHz, elevation_deg, foF2_at_tx, foF2_at_distance, tilt_distance, max_distance_km = 10000.0) {
    const freq_Hz = freq_MHz * 1e6;
    const omega = 2.0 * Math.PI * freq_Hz;
    const psi_0 = elevation_deg * Math.PI / 180.0;
    
    // Initial conditions
    let r = R_E;
    let theta = 0.0;
    let x = 0.0;  // Horizontal distance
    let phi = 0.0;  // Azimuth angle (radians)
    let total_loss_nepers = 0.0;
    
    // Helper function to get refractive index at (z, x) - optimized to calculate single point
    const getRefractiveIndex = (z, x_dist) => {
        let Ne = 0;
        if (z >= 0 && z <= 600) {
            // Use optimized single-point calculation instead of building full array
            Ne = electronDensity2DSingle(z, x_dist, foF2_at_tx, foF2_at_distance, tilt_distance);
        }
        const nu = collisionFrequency(Math.max(0, z));
        return refractiveIndex(Ne, freq_Hz, nu);
    };
    
    // Ray parameter (conserved)
    const n_0 = getRefractiveIndex(0.0, 0.0).real;
    const b = n_0 * r * Math.sin(psi_0);
    
    // Storage
    const distances = [0.0];
    const altitudes = [0.0];
    const azimuths = [0.0];
    
    // Ray direction tracking
    let going_up = true;
    
    const step_km = 5.0;  // Increased from 2.0 to 5.0 to match Python performance (2.5x fewer steps)
    const max_steps = Math.floor(max_distance_km / step_km);
    
    for (let step = 0; step < max_steps; step++) {
        const z = r - R_E;
        
        if (z < 0.0 && step > 10) {
            const total_loss_dB = total_loss_nepers * 8.686;
            return {
                distances,
                altitudes,
                azimuths: azimuths.map(a => a * 180.0 / Math.PI),
                total_loss_dB,
                status: 'returns'
            };
        }
        
        // Get complex refractive index at current position
        const n_complex = getRefractiveIndex(z, x);
        const n_real = n_complex.real;
        const n_squared = {
            real: n_complex.real * n_complex.real - n_complex.imag * n_complex.imag,
            imag: 2 * n_complex.real * n_complex.imag
        };
        const n2_real = n_squared.real;
        
        // Calculate absorption coefficient (Sen-Wyller formula)
        const alpha = (omega / (2.0 * c)) * Math.abs(n_squared.imag) / Math.max(n_real, 1e-10);
        
        // Accumulate loss (in Nepers)
        const path_length_m = step_km * 1000.0;
        total_loss_nepers += alpha * path_length_m;
        
        // Check if ray is reflected
        if (n2_real <= 0) {
            going_up = false;
        }
        
        // Calculate horizontal gradient (dn/dx) for azimuth deflection
        const dx_sample = 1.0;  // km
        let dn_dx = 0.0;
        if (x > 0) {
            const n_plus = getRefractiveIndex(z, x + dx_sample);
            const n_minus = getRefractiveIndex(z, x - dx_sample);
            dn_dx = (n_plus.real - n_minus.real) / (2 * dx_sample);
        } else {
            const n_plus = getRefractiveIndex(z, x + dx_sample);
            dn_dx = (n_plus.real - n_real) / dx_sample;
        }
        
        // Ray angle from ray parameter
        let sin_psi = b / (n_real * r);
        
        if (Math.abs(sin_psi) >= 1.0) {
            if (z > 600 && going_up) {
                const total_loss_dB = total_loss_nepers * 8.686;
                return {
                    distances,
                    altitudes,
                    azimuths: azimuths.map(a => a * 180.0 / Math.PI),
                    total_loss_dB,
                    status: 'escapes'
                };
            } else {
                going_up = false;
                sin_psi = Math.sign(sin_psi) * 0.999;
            }
        }
        
        if (z > 800 && going_up) {
            const total_loss_dB = total_loss_nepers * 8.686;
            return {
                distances,
                altitudes,
                azimuths: azimuths.map(a => a * 180.0 / Math.PI),
                total_loss_dB,
                status: 'escapes'
            };
        }
        
        const cos_psi = Math.sqrt(1 - sin_psi * sin_psi);
        
        // Azimuth deflection from horizontal gradient
        // dphi/ds = -(1/n) × (dn/dx) / sin(psi)
        let dphi = 0.0;
        if (Math.abs(sin_psi) > 0.1) {  // Avoid division by zero at high angles
            const dphi_ds = -(1.0 / n_real) * dn_dx / Math.abs(sin_psi);
            dphi = dphi_ds * step_km;
        }
        
        // Step along ray (using spherical geometry with direction tracking)
        const dr = step_km * cos_psi * (going_up ? 1 : -1);
        const d_theta = step_km * sin_psi / r;  // Angular distance along Earth's surface
        
        r += dr;
        theta += d_theta;
        x += Math.abs(d_theta * R_E);  // Horizontal coordinate follows spherical geometry
        phi += dphi;
        
        distances.push(theta * R_E);
        altitudes.push(r - R_E);
        azimuths.push(phi);
        
        if (x > max_distance_km) {
            const total_loss_dB = total_loss_nepers * 8.686;
            return {
                distances,
                altitudes,
                azimuths: azimuths.map(a => a * 180.0 / Math.PI),
                total_loss_dB,
                status: 'stops'
            };
        }
    }
    
    const total_loss_dB = total_loss_nepers * 8.686;
    return {
        distances,
        altitudes,
        azimuths: azimuths.map(a => a * 180.0 / Math.PI),
        total_loss_dB,
        status: 'stops'
    };
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        R_E,
        c,
        chapmanLayer,
        makeIonosphereForFoF2,
        makeTiltedIonosphere2D,
        plasmaFrequencyFromNe,
        collisionFrequency,
        refractiveIndex,
        absorptionCoefficient,
        traceRaySphericalWithPath,
        traceRayWithAbsorption,
        traceRay2DWithTilts,
        traceRay2DWithAbsorption
    };
}
