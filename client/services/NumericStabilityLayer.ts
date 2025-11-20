/**
 * Numeric Stability Layer - Safe Mathematical Operations
 *
 * Addresses CRITICAL defects:
 * - C1: Floating-point errors
 * - C2: Boundary condition handling
 * - Plus: NaN/Infinity handling, precision management, safe operations
 */

/**
 * Safe numeric operations with overflow/underflow protection
 */
export class SafeNumericOps {
  // Machine epsilon for floating-point comparisons
  private static readonly EPSILON = 1e-10;
  private static readonly MAX_SAFE_INTEGER = 2 ** 53 - 1;
  private static readonly MIN_SAFE_INTEGER = -(2 ** 53 - 1);
  private static readonly ZERO_THRESHOLD = 1e-15;

  /**
   * Safe division with zero-check
   */
  static safeDivide(
    numerator: number,
    denominator: number,
    fallback: number = 0
  ): number {
    // Validate inputs
    if (!Number.isFinite(numerator)) {
      console.warn(`Invalid numerator in division: ${numerator}`);
      return fallback;
    }

    if (!Number.isFinite(denominator)) {
      console.warn(`Invalid denominator in division: ${denominator}`);
      return fallback;
    }

    // Check for zero denominator
    if (Math.abs(denominator) < this.ZERO_THRESHOLD) {
      console.warn(`Division by zero or near-zero: ${denominator}`);
      return fallback;
    }

    const result = numerator / denominator;

    // Check result validity
    if (!Number.isFinite(result)) {
      console.warn(`Division resulted in non-finite value: ${result}`);
      return fallback;
    }

    return result;
  }

  /**
   * Safe addition with overflow check
   */
  static safeAdd(a: number, b: number): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error(`Invalid operands for addition: ${a}, ${b}`);
    }

    // Check for potential overflow
    if (a > 0 && b > this.MAX_SAFE_INTEGER - a) {
      console.warn(`Addition overflow: ${a} + ${b}`);
      return this.MAX_SAFE_INTEGER;
    }

    if (a < 0 && b < this.MIN_SAFE_INTEGER - a) {
      console.warn(`Addition underflow: ${a} + ${b}`);
      return this.MIN_SAFE_INTEGER;
    }

    return a + b;
  }

  /**
   * Safe subtraction
   */
  static safeSubtract(a: number, b: number): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error(`Invalid operands for subtraction: ${a}, ${b}`);
    }

    // Check for potential underflow/overflow
    if (a > 0 && -b < this.MIN_SAFE_INTEGER - a) {
      console.warn(`Subtraction underflow: ${a} - ${b}`);
      return this.MIN_SAFE_INTEGER;
    }

    if (a < 0 && -b > this.MAX_SAFE_INTEGER - a) {
      console.warn(`Subtraction overflow: ${a} - ${b}`);
      return this.MAX_SAFE_INTEGER;
    }

    return a - b;
  }

  /**
   * Safe multiplication
   */
  static safeMultiply(a: number, b: number, fallback: number = 0): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      console.warn(`Invalid operands for multiplication: ${a}, ${b}`);
      return fallback;
    }

    // Check for overflow
    if (
      a !== 0 &&
      b !== 0 &&
      Math.abs(a) > this.MAX_SAFE_INTEGER / Math.abs(b)
    ) {
      console.warn(`Multiplication overflow: ${a} * ${b}`);
      return a > 0 === b > 0 ? this.MAX_SAFE_INTEGER : this.MIN_SAFE_INTEGER;
    }

    return a * b;
  }

  /**
   * Safe power operation
   */
  static safePower(base: number, exponent: number, fallback: number = 1): number {
    if (!Number.isFinite(base) || !Number.isFinite(exponent)) {
      console.warn(`Invalid operands for power: base=${base}, exponent=${exponent}`);
      return fallback;
    }

    if (exponent < -100 || exponent > 100) {
      console.warn(`Exponent out of safe range: ${exponent}`);
      return fallback;
    }

    try {
      const result = Math.pow(base, exponent);
      if (!Number.isFinite(result)) {
        console.warn(`Power resulted in non-finite: ${base}^${exponent}`);
        return fallback;
      }
      return result;
    } catch (error) {
      console.warn(`Error in power operation: ${error}`);
      return fallback;
    }
  }

  /**
   * Safe square root
   */
  static safeSqrt(value: number, fallback: number = 0): number {
    if (!Number.isFinite(value)) {
      console.warn(`Invalid value for sqrt: ${value}`);
      return fallback;
    }

    if (value < 0) {
      console.warn(`Negative value for sqrt: ${value}`);
      return fallback;
    }

    return Math.sqrt(value);
  }

  /**
   * Safe logarithm
   */
  static safeLog(value: number, base: number = Math.E, fallback: number = 0): number {
    if (!Number.isFinite(value) || !Number.isFinite(base)) {
      console.warn(`Invalid value for log: value=${value}, base=${base}`);
      return fallback;
    }

    if (value <= 0) {
      console.warn(`Non-positive value for log: ${value}`);
      return fallback;
    }

    if (base <= 0 || base === 1) {
      console.warn(`Invalid base for log: ${base}`);
      return fallback;
    }

    try {
      const result = Math.log(value) / Math.log(base);
      if (!Number.isFinite(result)) {
        console.warn(`Log resulted in non-finite: log(${value}, ${base})`);
        return fallback;
      }
      return result;
    } catch (error) {
      console.warn(`Error in log operation: ${error}`);
      return fallback;
    }
  }

  /**
   * Clamp value to range
   */
  static clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid value for clamping: ${value}`);
    }

    if (min > max) {
      throw new Error(`Invalid range: min=${min} > max=${max}`);
    }

    return Math.max(min, Math.min(max, value));
  }

  /**
   * Linear interpolation
   */
  static lerp(a: number, b: number, t: number): number {
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(t)) {
      throw new Error(`Invalid parameters for lerp: a=${a}, b=${b}, t=${t}`);
    }

    t = this.clamp(t, 0, 1);
    return a + (b - a) * t;
  }

  /**
   * Safe average calculation
   */
  static safeAverage(values: number[]): number {
    if (!Array.isArray(values) || values.length === 0) {
      return 0;
    }

    // Validate all values are finite
    const validValues = values.filter((v) => Number.isFinite(v));
    if (validValues.length === 0) {
      console.warn('No valid values for average');
      return 0;
    }

    // Use Kahan summation for better precision
    let sum = 0;
    let compensation = 0;

    for (const value of validValues) {
      const temp = value - compensation;
      const newSum = sum + temp;
      compensation = newSum - sum - temp;
      sum = newSum;
    }

    return sum / validValues.length;
  }

  /**
   * Safe weighted average
   */
  static safeWeightedAverage(
    values: number[],
    weights: number[]
  ): number {
    if (values.length !== weights.length) {
      throw new Error('Values and weights must have same length');
    }

    if (values.length === 0) {
      return 0;
    }

    // Validate inputs
    const validPairs = values
      .map((v, i) => ({ value: v, weight: weights[i] }))
      .filter((p) => Number.isFinite(p.value) && Number.isFinite(p.weight) && p.weight > 0);

    if (validPairs.length === 0) {
      console.warn('No valid value-weight pairs');
      return 0;
    }

    const totalWeight = validPairs.reduce((sum, p) => sum + p.weight, 0);
    if (totalWeight === 0) {
      console.warn('Total weight is zero');
      return 0;
    }

    const weightedSum = validPairs.reduce(
      (sum, p) => sum + p.value * p.weight,
      0
    );

    return this.safeDivide(weightedSum, totalWeight, 0);
  }

  /**
   * Exponential moving average
   */
  static exponentialMovingAverage(
    previous: number,
    current: number,
    alpha: number
  ): number {
    if (!Number.isFinite(previous) || !Number.isFinite(current)) {
      return current;
    }

    alpha = this.clamp(alpha, 0, 1);
    return previous * (1 - alpha) + current * alpha;
  }

  /**
   * Safe comparison with epsilon
   */
  static approximatelyEqual(a: number, b: number, epsilon: number = this.EPSILON): boolean {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return false;
    }

    return Math.abs(a - b) <= epsilon;
  }

  /**
   * Check if number is in safe integer range
   */
  static isSafeInteger(value: number): boolean {
    return Number.isSafeInteger(value);
  }

  /**
   * Safely convert to percentage
   */
  static toPercentage(value: number, min: number = 0, max: number = 100): number {
    if (!Number.isFinite(value)) {
      return 50; // Return neutral value
    }

    return this.clamp(value, min, max);
  }

  /**
   * Convert percentage to value in range
   */
  static fromPercentage(percentage: number, min: number, max: number): number {
    if (!Number.isFinite(percentage)) {
      return (min + max) / 2;
    }

    percentage = this.clamp(percentage, 0, 100);
    return min + ((max - min) * percentage) / 100;
  }

  /**
   * Calculate percentage change
   */
  static percentageChange(oldValue: number, newValue: number): number {
    if (!Number.isFinite(oldValue) || !Number.isFinite(newValue)) {
      return 0;
    }

    if (oldValue === 0) {
      return newValue === 0 ? 0 : 100;
    }

    return this.safeDivide(newValue - oldValue, oldValue, 0) * 100;
  }

  /**
   * Coalesce finite value from multiple options
   */
  static coalesceFinite(...values: number[]): number {
    for (const value of values) {
      if (Number.isFinite(value)) {
        return value;
      }
    }
    return 0;
  }
}

/**
 * Boundary condition validator
 */
export class BoundaryValidator {
  /**
   * Validate value is within bounds
   */
  static validateInRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): { valid: boolean; error?: string } {
    if (!Number.isFinite(value)) {
      return { valid: false, error: `${fieldName} must be a finite number, got: ${value}` };
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { valid: false, error: `Invalid bounds for ${fieldName}` };
    }

    if (min > max) {
      return { valid: false, error: `Invalid range for ${fieldName}: min > max` };
    }

    if (value < min || value > max) {
      return {
        valid: false,
        error: `${fieldName} ${value} outside range [${min}, ${max}]`
      };
    }

    return { valid: true };
  }

  /**
   * Validate value is positive
   */
  static validatePositive(value: number, fieldName: string): { valid: boolean; error?: string } {
    if (!Number.isFinite(value)) {
      return { valid: false, error: `${fieldName} must be finite, got: ${value}` };
    }

    if (value <= 0) {
      return { valid: false, error: `${fieldName} must be positive, got: ${value}` };
    }

    return { valid: true };
  }

  /**
   * Validate value is non-negative
   */
  static validateNonNegative(value: number, fieldName: string): { valid: boolean; error?: string } {
    if (!Number.isFinite(value)) {
      return { valid: false, error: `${fieldName} must be finite, got: ${value}` };
    }

    if (value < 0) {
      return { valid: false, error: `${fieldName} must be non-negative, got: ${value}` };
    }

    return { valid: true };
  }

  /**
   * Validate value is integer
   */
  static validateInteger(value: number, fieldName: string): { valid: boolean; error?: string } {
    if (!Number.isInteger(value)) {
      return { valid: false, error: `${fieldName} must be an integer, got: ${value}` };
    }

    return { valid: true };
  }

  /**
   * Validate percentage (0-100)
   */
  static validatePercentage(value: number, fieldName: string): { valid: boolean; error?: string } {
    if (!Number.isFinite(value)) {
      return { valid: false, error: `${fieldName} must be finite, got: ${value}` };
    }

    if (value < 0 || value > 100) {
      return { valid: false, error: `${fieldName} must be 0-100%, got: ${value}%` };
    }

    return { valid: true };
  }

  /**
   * Batch validate multiple constraints
   */
  static validateMultiple(
    values: Record<string, number>,
    constraints: Record<string, { min?: number; max?: number; positive?: boolean; integer?: boolean }>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [fieldName, value] of Object.entries(values)) {
      const constraint = constraints[fieldName];
      if (!constraint) continue;

      if (constraint.min !== undefined || constraint.max !== undefined) {
        const min = constraint.min ?? -Infinity;
        const max = constraint.max ?? Infinity;
        const result = this.validateInRange(value, min, max, fieldName);
        if (!result.valid) errors.push(result.error!);
      }

      if (constraint.positive) {
        const result = this.validatePositive(value, fieldName);
        if (!result.valid) errors.push(result.error!);
      }

      if (constraint.integer) {
        const result = this.validateInteger(value, fieldName);
        if (!result.valid) errors.push(result.error!);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Numeric stability manager
 */
export class NumericStabilityManager {
  static ops = SafeNumericOps;
  static validator = BoundaryValidator;

  /**
   * Create a safe numeric context
   */
  static createSafeContext() {
    return {
      add: (a: number, b: number) => SafeNumericOps.safeAdd(a, b),
      subtract: (a: number, b: number) => SafeNumericOps.safeSubtract(a, b),
      multiply: (a: number, b: number) => SafeNumericOps.safeMultiply(a, b),
      divide: (a: number, b: number, fallback: number = 0) =>
        SafeNumericOps.safeDivide(a, b, fallback),
      clamp: (v: number, min: number, max: number) =>
        SafeNumericOps.clamp(v, min, max),
      average: (values: number[]) => SafeNumericOps.safeAverage(values),
      isFinite: (value: number) => Number.isFinite(value),
      validate: (value: number, min: number, max: number, name: string) =>
        BoundaryValidator.validateInRange(value, min, max, name)
    };
  }

  /**
   * Get diagnostics
   */
  static getDiagnostics() {
    return {
      maxSafeInteger: SafeNumericOps['MAX_SAFE_INTEGER'],
      minSafeInteger: SafeNumericOps['MIN_SAFE_INTEGER'],
      epsilon: SafeNumericOps['EPSILON'],
      zeroThreshold: SafeNumericOps['ZERO_THRESHOLD']
    };
  }
}

export {
  SafeNumericOps,
  BoundaryValidator,
  NumericStabilityManager
};
