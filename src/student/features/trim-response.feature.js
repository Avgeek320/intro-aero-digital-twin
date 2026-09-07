import {
  calculateTrimResponse,
  calculateCm
} from '../physics/trim-response.js';

/**
 * Validates availability of Stage 3 capability dependency.
 * @param {object} capabilityMap
 */
function requireStage3(capabilityMap) {
  const source = capabilityMap?.['loads.pitch.component-sum'];
  if (!source || !(source.version >= 1)) {
    throw new TypeError('Stage 3 loads.pitch.component-sum capability v1 is required.');
  }
  return source;
}

/**
 * Formats physics output into Section 4 display results.
 */
function buildResults(output) {
  const { cmAlpha, trimAngleDeg, deltaCm, isTrimmed, tendency } = output;

  return [
    {
      label: 'Pitching-moment coefficient Cm(alpha)',
      value: cmAlpha,
      unit: '',
      precision: 6,
      emphasis: true
    },
    {
      label: 'Trim angle of attack',
      value: trimAngleDeg === null ? 'not available' : trimAngleDeg,
      unit: trimAngleDeg === null ? '' : 'deg',
      precision: 4,
      emphasis: false
    },
    {
      label: 'Disturbance moment change delta_Cm',
      value: deltaCm,
      unit: '',
      precision: 6,
      emphasis: false
    },
    {
      label: 'Trim status',
      value: isTrimmed ? 'trimmed' : 'not trimmed',
      unit: '',
      precision: 0,
      emphasis: false
    },
    {
      label: 'Disturbance tendency',
      value: tendency,
      unit: '',
      precision: 0,
      emphasis: false
    }
  ];
}

/**
 * Builds flat runtime values map for providesCapabilities.
 */
function buildRuntimeValues(output) {
  const { cmAlpha, trimAngleDeg, deltaCm, isTrimmed, tendency } = output;

  return {
    cmAlpha,
    trimAngleDeg: trimAngleDeg === null ? 'not available' : trimAngleDeg,
    deltaCm,
    isTrimmed,
    tendency
  };
}

/**
 * Builds Section 9 verification case results using pure physics calculations.
 */
function buildVerificationCases() {
  // Case 9.1 Numerical Case
  const numAircraft = {
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0
  };
  const numOut = calculateTrimResponse(numAircraft);
  const numPassed =
    Math.abs(numOut.cmAlpha - 6.688e-5) <= 1e-6 &&
    numOut.trimAngleDeg !== null &&
    Math.abs(numOut.trimAngleDeg - 2.864789) <= 1e-4 &&
    Math.abs(numOut.deltaCm - -0.0279253) <= 1e-6 &&
    !numOut.isTrimmed &&
    numOut.tendency === 'restoring';

  // Case 9.2 Behavioral Case
  const behAircraft = {
    cm0: 0.04,
    cmAlphaPerRad: 0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0
  };
  const behOut = calculateTrimResponse(behAircraft);
  const behPassed =
    Math.abs(behOut.deltaCm - 0.0279253) <= 1e-6 &&
    behOut.tendency === 'destabilizing' &&
    behOut.trimAngleDeg !== null &&
    Math.abs(behOut.trimAngleDeg - -2.864789) <= 1e-4;

  // Case 9.3 Boundary / Sanity Case
  const bndAircraft = {
    cm0: 0.04,
    cmAlphaPerRad: 0.0,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0
  };
  const bndOut = calculateTrimResponse(bndAircraft);
  const bndPassed =
    bndOut.trimAngleDeg === null &&
    Math.abs(bndOut.deltaCm) <= 1e-12 &&
    bndOut.tendency === 'neutral' &&
    !bndOut.isTrimmed;

  return [
    { label: 'Numerical case', passed: numPassed },
    { label: 'Behavioral case', passed: behPassed },
    { label: 'Boundary or sanity case', passed: bndPassed }
  ];
}

/**
 * Constructs engineering decision text and status reflecting Sections 1 and 12.
 */
function buildDecision(output) {
  const { isTrimmed, tendency } = output;
  const question = 'Is the selected condition trimmed and statically stable against disturbances?';

  let status = 'neutral';
  let statusText = '';

  if (isTrimmed) {
    if (tendency === 'restoring') {
      status = 'pass';
      statusText = 'The selected condition is trimmed with a statically restoring moment tendency.';
    } else if (tendency === 'destabilizing') {
      status = 'caution';
      statusText = 'The selected condition is trimmed, but exhibits a statically destabilizing tendency.';
    } else {
      status = 'neutral';
      statusText = 'The selected condition is trimmed, but exhibits neutral disturbance stability.';
    }
  } else {
    if (tendency === 'restoring') {
      status = 'caution';
      statusText = 'The selected condition is not trimmed, although a restoring moment tendency exists.';
    } else if (tendency === 'destabilizing') {
      status = 'caution';
      statusText = 'The selected condition is not trimmed and exhibits a destabilizing disturbance response.';
    } else {
      status = 'neutral';
      statusText = 'The selected condition is not trimmed and has a neutral disturbance tendency.';
    }
  }

  const scopeText = ' This feature evaluates linear quasi-static pitch trim and static disturbance tendencies. It cannot establish dynamic stability, damping, handling qualities, or real-world controllability.';

  return {
    question,
    interpretation: `${statusText}${scopeText}`,
    status
  };
}

/**
 * Builds Section 10 Cm-alpha plot over -10 deg to +10 deg range.
 */
function buildCmAlphaPlot(aircraft) {
  const points = [];
  const startDeg = -10;
  const endDeg = 10;
  const stepDeg = 1;

  for (let deg = startDeg; deg <= endDeg; deg += stepDeg) {
    const cm = calculateCm(aircraft.cm0, aircraft.cmAlphaPerRad, deg);
    points.push({ x: deg, y: cm });
  }

  // Ensure current selected angle is included if within range
  const currentAoA = aircraft.angleOfAttackDeg;
  if (currentAoA >= -10 && currentAoA <= 10) {
    if (!points.some((p) => Math.abs(p.x - currentAoA) < 1e-6)) {
      const currentCm = calculateCm(aircraft.cm0, aircraft.cmAlphaPerRad, currentAoA);
      points.push({ x: currentAoA, y: currentCm });
      points.sort((a, b) => a.x - b.x);
    }
  }

  return {
    id: 'cm-alpha',
    title: 'Cm–alpha relationship',
    xLabel: 'Angle of attack (deg)',
    yLabel: 'Pitching-moment coefficient, Cm',
    currentX: aircraft.angleOfAttackDeg,
    series: [{ label: 'Cm(alpha)', points }],
    regions: [],
    referenceLines: [{ axis: 'y', value: 0, label: 'Cm = 0' }]
  };
}

export const feature = {
  contractVersion: 4,
  id: 'trim-response',
  title: 'Live Cm–alpha relationship and trim',
  category: 'Stability · Student feature',
  learningMode: 'concept',
  topicId: 'stability',
  inputKeys: ['cm0', 'cmAlphaPerRad', 'angleOfAttackDeg', 'disturbanceAlphaDeg'],
  requiresCapabilities: [{ id: 'loads.pitch.component-sum', version: 1 }],
  providesCapabilities: [{ id: 'stability.pitch.cm-alpha', version: 1 }],
  simulation: {
    display: 'analysis-only',
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {}
  },
  description:
    'Evaluates simplified linear pitching-moment trim status and small angle-of-attack disturbance response tendencies.',
  assumptions: [
    'Linear Cm-alpha relationship over investigated angle range',
    'Quasi-static model representing small disturbance behavior',
    'Cm0 and Cm_alpha represent identical aircraft configuration',
    'Positive nose-up pitching moment and angle-of-attack convention'
  ],
  validityLimits: [
    'Invalid near stall, large angles of attack, or nonlinear aerodynamics',
    'Does not calculate dynamic time response, damping, or handling qualities',
    'Restoring tendency does not guarantee real-world controllability or safety',
    'Trim angle is meaningful only where the linear model remains valid'
  ],
  analyze(aircraft, capabilityMap) {
    requireStage3(capabilityMap);
    const output = calculateTrimResponse(aircraft);
    return {
      results: buildResults(output),
      verificationCases: buildVerificationCases(),
      decision: buildDecision(output),
      plots: [buildCmAlphaPlot(aircraft)],
      scene: null
    };
  }
};

export const model = {
  kind: 'derived',
  evaluate(runtimeContext) {
    requireStage3(runtimeContext.capabilities);
    const output = calculateTrimResponse(runtimeContext.aircraft);
    return { values: buildRuntimeValues(output) };
  }
};