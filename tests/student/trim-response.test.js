import { describe, it, expect } from 'vitest';
import {
  degToRad,
  radToDeg,
  calculateCm,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  checkTrimStatus,
  classifyDisturbanceTendency,
  calculateTrimResponse
} from '../../src/student/physics/trim-response.js';

describe('Stage 4 Pure Physics Tests - trim-response.js', () => {
  it('converts degrees to radians and back correctly', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 8);
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 8);
  });

  it('Section 9.1 Numerical Case: Reference Calculation', () => {
    const aircraft = {
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    };

    const res = calculateTrimResponse(aircraft);

    // Cm(2.86 deg) = 0.04 + (-0.8 * 2.86 * pi / 180) = 0.00006688
    expect(res.cmAlpha).toBeCloseTo(6.688e-5, 6);

    // Trim angle = -0.04 / -0.8 = 0.05 rad -> 2.864789 deg
    expect(res.trimAngleDeg).not.toBeNull();
    expect(res.trimAngleDeg).toBeCloseTo(2.864789, 4);

    // delta_Cm = -0.8 * (2.0 * pi / 180) = -0.0279253
    expect(res.deltaCm).toBeCloseTo(-0.0279253, 6);

    // |Cm| = 6.688e-5 > 1e-6 -> not trimmed
    expect(res.isTrimmed).toBe(false);

    // delta_alpha * delta_Cm < 0 -> restoring
    expect(res.tendency).toBe('restoring');
  });

  it('Section 9.2 Behavioral Case: Positive Slope (Destabilizing)', () => {
    const aircraft = {
      cm0: 0.04,
      cmAlphaPerRad: 0.8,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    };

    const res = calculateTrimResponse(aircraft);

    expect(res.deltaCm).toBeCloseTo(0.0279253, 6);
    expect(res.tendency).toBe('destabilizing');
    expect(res.trimAngleDeg).toBeCloseTo(-2.864789, 4);
  });

  it('Section 9.3 Boundary Case: Zero Slope (Unavailable Trim)', () => {
    const aircraft = {
      cm0: 0.04,
      cmAlphaPerRad: 0.0,
      angleOfAttackDeg: 2.86,
      disturbanceAlphaDeg: 2.0
    };

    const res = calculateTrimResponse(aircraft);

    expect(res.trimAngleDeg).toBeNull();
    expect(res.deltaCm).toBeCloseTo(0.0, 8);
    expect(res.tendency).toBe('neutral');
    expect(res.isTrimmed).toBe(false);
  });

  it('handles trimmed state boundary (|Cm| <= 1e-6)', () => {
    // Exact trim angle for Cm0 = 0.04, Cm_alpha = -0.8 is ~2.8647889756 deg
    const trimmedAircraft = {
      cm0: 0.04,
      cmAlphaPerRad: -0.8,
      angleOfAttackDeg: (0.05 * 180) / Math.PI,
      disturbanceAlphaDeg: 1.0
    };

    const res = calculateTrimResponse(trimmedAircraft);
    expect(res.isTrimmed).toBe(true);
  });

  it('throws TypeError on invalid numeric inputs', () => {
    expect(() => {
      calculateTrimResponse({
        cm0: '0.04',
        cmAlphaPerRad: -0.8,
        angleOfAttackDeg: 2.86,
        disturbanceAlphaDeg: 2.0
      });
    }).toThrow(TypeError);

    expect(() => {
      calculateTrimResponse({
        cm0: 0.04,
        cmAlphaPerRad: NaN,
        angleOfAttackDeg: 2.86,
        disturbanceAlphaDeg: 2.0
      });
    }).toThrow(TypeError);
  });
});