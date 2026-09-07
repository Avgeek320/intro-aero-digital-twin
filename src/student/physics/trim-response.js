/**
 * Stage 4 Physics Module: Live Cm-Alpha Relationship and Trim
 *
 * Topic: Pitching moment trim and static stability analysis under linear quasi-static assumptions.
 *
 * Sign Convention:
 * - Positive pitching moment (Cm > 0) is nose-up.
 * - Positive angle of attack (alpha > 0) is nose-up.
 *
 * Inputs & Units:
 * - cm0: Zero-angle pitching-moment coefficient (dimensionless)
 * - cmAlphaPerRad: Pitching-moment coefficient slope (1/rad)
 * - angleOfAttackDeg: Selected angle of attack (deg)
 * - disturbanceAlphaDeg: Small angle-of-attack disturbance (deg)
 *
 * Outputs & Units:
 * - cmAlpha: Pitching-moment coefficient at selected angle (dimensionless)
 * - trimAngleDeg: Trim angle of attack in degrees, or null if no unique trim angle exists
 * - deltaCm: Disturbance moment-coefficient change (dimensionless)
 * - isTrimmed: Boolean flag indicating if |Cm(alpha)| <= 1e-6
 * - tendency: Disturbance response tendency ("restoring", "destabilizing", or "neutral")
 */

/**
 * Converts degrees to radians.
 * @param {number} deg Angle in degrees
 * @returns {number} Angle in radians
 */
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 * @param {number} rad Angle in radians
 * @returns {number} Angle in degrees
 */
export function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Validates inputs for numeric type and non-NaN values.
 * @param {object} inputs Aircraft input fields
 */
function validateInputs({ cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg }) {
  const values = [cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg];
  for (const v of values) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new TypeError('All inputs must be finite numbers.');
    }
  }
}

/**
 * Calculates pitching-moment coefficient at a given angle of attack (in degrees).
 * Cm(alpha) = Cm0 + Cm_alpha * alpha_rad
 *
 * @param {number} cm0
 * @param {number} cmAlphaPerRad
 * @param {number} angleOfAttackDeg
 * @returns {number} Cm(alpha)
 */
export function calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  const alphaRad = degToRad(angleOfAttackDeg);
  return cm0 + cmAlphaPerRad * alphaRad;
}

/**
 * Calculates trim angle of attack in degrees.
 * alpha_trim_rad = -Cm0 / Cm_alpha
 * Returns null if Cm_alpha is zero.
 *
 * @param {number} cm0
 * @param {number} cmAlphaPerRad
 * @returns {number|null} Trim angle in degrees or null
 */
export function calculateTrimAngleDeg(cm0, cmAlphaPerRad) {
  if (Math.abs(cmAlphaPerRad) < 1e-12) {
    return null;
  }
  const alphaTrimRad = -cm0 / cmAlphaPerRad;
  return radToDeg(alphaTrimRad);
}

/**
 * Calculates pitching-moment coefficient change due to angle of attack disturbance.
 * delta_Cm = Cm_alpha * delta_alpha_rad
 *
 * @param {number} cmAlphaPerRad
 * @param {number} disturbanceAlphaDeg
 * @returns {number} delta_Cm
 */
export function calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg) {
  const deltaAlphaRad = degToRad(disturbanceAlphaDeg);
  return cmAlphaPerRad * deltaAlphaRad;
}

/**
 * Determines whether the selected condition is trimmed based on tolerance.
 * |Cm(alpha)| <= 1e-6
 *
 * @param {number} cmAlpha
 * @returns {boolean}
 */
export function checkTrimStatus(cmAlpha) {
  return Math.abs(cmAlpha) <= 1e-6;
}

/**
 * Classifies disturbance response tendency based on sign of (delta_alpha_rad * delta_Cm).
 * - negative: restoring
 * - positive: destabilizing
 * - zero: neutral
 *
 * @param {number} disturbanceAlphaDeg
 * @param {number} deltaCm
 * @returns {string} "restoring" | "destabilizing" | "neutral"
 */
export function classifyDisturbanceTendency(disturbanceAlphaDeg, deltaCm) {
  const deltaAlphaRad = degToRad(disturbanceAlphaDeg);
  const prod = deltaAlphaRad * deltaCm;

  if (prod < -1e-12) {
    return 'restoring';
  }
  if (prod > 1e-12) {
    return 'destabilizing';
  }
  return 'neutral';
}

/**
 * Main pure physics calculator function for Stage 4.
 *
 * @param {object} aircraft Canonical aircraft input object
 * @returns {object} Derived trim and stability physics outputs
 */
export function calculateTrimResponse(aircraft) {
  validateInputs(aircraft);

  const { cm0, cmAlphaPerRad, angleOfAttackDeg, disturbanceAlphaDeg } = aircraft;

  const cmAlpha = calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg);
  const trimAngleDeg = calculateTrimAngleDeg(cm0, cmAlphaPerRad);
  const deltaCm = calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg);
  const isTrimmed = checkTrimStatus(cmAlpha);
  const tendency = classifyDisturbanceTendency(disturbanceAlphaDeg, deltaCm);

  return {
    cmAlpha,
    trimAngleDeg,
    deltaCm,
    isTrimmed,
    tendency
  };
}