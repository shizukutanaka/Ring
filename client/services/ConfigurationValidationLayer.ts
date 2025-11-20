/**
 * Configuration Validation Layer - HIGH Tier
 *
 * Addresses HIGH priority defects:
 * - F1: Circular threshold detection (low > high)
 * - F2: Logical consistency checking
 *
 * Ensures configuration sanity and prevents impossible states
 */

/**
 * Threshold consistency validator
 */
export class ThresholdValidator {
  /**
   * Validate threshold hierarchy
   */
  static validateHierarchy(
    thresholds: Record<string, number>,
    expectedOrder: string[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check that expected order is maintained
    for (let i = 0; i < expectedOrder.length - 1; i++) {
      const current = expectedOrder[i];
      const next = expectedOrder[i + 1];

      const currentValue = thresholds[current];
      const nextValue = thresholds[next];

      if (!Number.isFinite(currentValue) || !Number.isFinite(nextValue)) {
        errors.push(
          `Non-finite threshold value: ${current}=${currentValue}, ${next}=${nextValue}`
        );
        continue;
      }

      if (currentValue >= nextValue) {
        errors.push(
          `Threshold hierarchy violation: ${current} (${currentValue}) >= ${next} (${nextValue}). ` +
          `Expected: ${current} < ${next}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate range thresholds
   */
  static validateRangeThresholds(
    ranges: Record<
      string,
      { min: number; max: number; description: string }
    >
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [name, range] of Object.entries(ranges)) {
      // Check finite values
      if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) {
        errors.push(
          `Non-finite range for ${name}: min=${range.min}, max=${range.max}`
        );
        continue;
      }

      // Check min < max
      if (range.min >= range.max) {
        errors.push(
          `Invalid range for ${name}: min (${range.min}) >= max (${range.max})`
        );
      }

      // Check for reasonable span
      const span = range.max - range.min;
      if (span === 0) {
        errors.push(`Zero-width range for ${name}: [${range.min}, ${range.max}]`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Detect circular threshold relationships
   */
  static detectCircularRelationships(
    config: Record<string, any>
  ): { hasCircular: boolean; description: string } {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (key: string): boolean => {
      visited.add(key);
      recursionStack.add(key);

      const value = config[key];

      if (typeof value === 'object' && value !== null) {
        for (const nestedKey of Object.keys(value)) {
          const nestedValue = value[nestedKey];

          // Check if nested value references another config key
          if (typeof nestedValue === 'string' && config[nestedValue]) {
            if (!visited.has(nestedValue)) {
              if (detectCycle(nestedValue)) {
                return true;
              }
            } else if (recursionStack.has(nestedValue)) {
              return true;
            }
          }
        }
      }

      recursionStack.delete(key);
      return false;
    };

    for (const key of Object.keys(config)) {
      if (!visited.has(key)) {
        if (detectCycle(key)) {
          return {
            hasCircular: true,
            description: `Circular configuration dependency detected at ${key}`
          };
        }
      }
    }

    return {
      hasCircular: false,
      description: 'No circular dependencies found'
    };
  }
}

/**
 * Configuration logical consistency checker
 */
export class ConfigurationConsistencyChecker {
  /**
   * Check codec compatibility constraints
   */
  static checkCodecConstraints(config: {
    codecs: string[];
    preferredCodec: string;
    fallbackCodec: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(config.codecs) || config.codecs.length === 0) {
      errors.push('Codec list is empty');
    }

    if (config.preferredCodec && !config.codecs.includes(config.preferredCodec)) {
      errors.push(
        `Preferred codec '${config.preferredCodec}' not in supported codecs: ${config.codecs.join(', ')}`
      );
    }

    if (config.fallbackCodec && !config.codecs.includes(config.fallbackCodec)) {
      errors.push(
        `Fallback codec '${config.fallbackCodec}' not in supported codecs: ${config.codecs.join(', ')}`
      );
    }

    if (config.preferredCodec === config.fallbackCodec) {
      errors.push('Preferred and fallback codecs cannot be the same');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check quality tier consistency
   */
  static checkQualityTiers(config: {
    tiers: Array<{
      name: string;
      minBitrate: number;
      maxBitrate: number;
      resolution: string;
    }>;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(config.tiers) || config.tiers.length === 0) {
      errors.push('Quality tiers array is empty');
      return { valid: false, errors };
    }

    // Check each tier
    for (let i = 0; i < config.tiers.length; i++) {
      const tier = config.tiers[i];

      if (!tier.name) {
        errors.push(`Tier ${i} missing name`);
      }

      if (!Number.isFinite(tier.minBitrate) || !Number.isFinite(tier.maxBitrate)) {
        errors.push(
          `Tier '${tier.name}' has non-finite bitrate: min=${tier.minBitrate}, max=${tier.maxBitrate}`
        );
      }

      if (tier.minBitrate > tier.maxBitrate) {
        errors.push(
          `Tier '${tier.name}': minBitrate (${tier.minBitrate}) > maxBitrate (${tier.maxBitrate})`
        );
      }

      if (!tier.resolution) {
        errors.push(`Tier '${tier.name}' missing resolution`);
      }
    }

    // Check tier ordering
    for (let i = 0; i < config.tiers.length - 1; i++) {
      const current = config.tiers[i];
      const next = config.tiers[i + 1];

      // Bitrate ranges shouldn't overlap inappropriately
      if (current.maxBitrate > next.minBitrate) {
        errors.push(
          `Tier overlap: '${current.name}' maxBitrate (${current.maxBitrate}) > ` +
          `'${next.name}' minBitrate (${next.minBitrate})`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check parameter interdependencies
   */
  static checkInterdependencies(config: {
    bitrate: number;
    framerate: number;
    resolution: string;
    cpu: number;
  }): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Parse resolution
    const resMatch = config.resolution.match(/(\d+)x(\d+)/);
    if (!resMatch) {
      return { valid: false, warnings: ['Invalid resolution format'] };
    }

    const width = parseInt(resMatch[1]);
    const height = parseInt(resMatch[2]);
    const pixels = width * height;

    // Check bitrate for resolution (rough estimates)
    const minBitrateForResolution = {
      320: 200,      // 160x120
      480: 400,      // 320x240
      720: 1000,     // 640x480
      1080: 2500,    // 1280x720
      2160: 5000     // 1920x1080
    };

    const resCategory = Math.min(
      ...Object.keys(minBitrateForResolution)
        .map(Number)
        .filter((k) => k <= height)
    );

    const minBitrate = minBitrateForResolution[resCategory as any] || 200;

    if (config.bitrate < minBitrate * 0.5) {
      warnings.push(
        `Very low bitrate (${config.bitrate}) for resolution ${config.resolution} ` +
        `(recommended minimum: ${minBitrate})`
      );
    }

    // Check CPU for framerate/resolution
    if (config.cpu > 80 && config.framerate >= 30 && height >= 720) {
      warnings.push(
        `High CPU usage (${config.cpu}%) with 30+ fps and 720p+ resolution. ` +
        `Consider reducing framerate or resolution.`
      );
    }

    // Check framerate sanity
    const pixelsPerSecond = pixels * config.framerate;
    if (pixelsPerSecond > 248_832_000) {
      // 4K@30fps
      warnings.push(
        `High pixel throughput (${(pixelsPerSecond / 1_000_000).toFixed(1)}M px/s). ` +
        `May exceed encoding capacity.`
      );
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Check constraint satisfaction
   */
  static checkConstraintSatisfaction(
    values: Record<string, number>,
    constraints: Record<string, {
      min?: number;
      max?: number;
      range?: [number, number];
      exclusive?: number;
      lessThan?: string;  // references another value
      greaterThan?: string; // references another value
    }>
  ): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    for (const [key, constraint] of Object.entries(constraints)) {
      const value = values[key];

      if (constraint.min !== undefined && value < constraint.min) {
        violations.push(
          `${key} (${value}) is below minimum (${constraint.min})`
        );
      }

      if (constraint.max !== undefined && value > constraint.max) {
        violations.push(
          `${key} (${value}) exceeds maximum (${constraint.max})`
        );
      }

      if (constraint.range && (value < constraint.range[0] || value > constraint.range[1])) {
        violations.push(
          `${key} (${value}) is outside range [${constraint.range[0]}, ${constraint.range[1]}]`
        );
      }

      if (constraint.exclusive !== undefined && value === constraint.exclusive) {
        violations.push(`${key} cannot be ${constraint.exclusive}`);
      }

      if (constraint.lessThan) {
        const referenceValue = values[constraint.lessThan];
        if (value >= referenceValue) {
          violations.push(
            `${key} (${value}) must be less than ${constraint.lessThan} (${referenceValue})`
          );
        }
      }

      if (constraint.greaterThan) {
        const referenceValue = values[constraint.greaterThan];
        if (value <= referenceValue) {
          violations.push(
            `${key} (${value}) must be greater than ${constraint.greaterThan} (${referenceValue})`
          );
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }
}

/**
 * Configuration state machine validator
 */
export class ConfigurationStateMachineValidator {
  private validTransitions: Map<string, Set<string>> = new Map();

  /**
   * Define valid state transitions
   */
  defineTransition(fromState: string, toState: string): void {
    if (!this.validTransitions.has(fromState)) {
      this.validTransitions.set(fromState, new Set());
    }
    this.validTransitions.get(fromState)!.add(toState);
  }

  /**
   * Validate transition
   */
  isValidTransition(fromState: string, toState: string): boolean {
    const validStates = this.validTransitions.get(fromState);
    return validStates ? validStates.has(toState) : false;
  }

  /**
   * Validate state sequence
   */
  validateSequence(states: string[]): { valid: boolean; error?: string } {
    for (let i = 0; i < states.length - 1; i++) {
      if (!this.isValidTransition(states[i], states[i + 1])) {
        return {
          valid: false,
          error: `Invalid transition from '${states[i]}' to '${states[i + 1]}'`
        };
      }
    }
    return { valid: true };
  }

  /**
   * Get valid next states
   */
  getValidNextStates(currentState: string): string[] {
    const states = this.validTransitions.get(currentState);
    return states ? Array.from(states) : [];
  }
}

/**
 * Configuration validation manager
 */
export class ConfigurationValidationManager {
  private thresholdValidator = ThresholdValidator;
  private consistencyChecker = ConfigurationConsistencyChecker;
  private validationHistory: Array<{
    timestamp: number;
    configKey: string;
    result: any;
  }> = [];
  private maxHistory = 100;

  /**
   * Validate complete configuration
   */
  validateConfiguration(config: any): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for circular dependencies
    const circularCheck = ThresholdValidator.detectCircularRelationships(config);
    if (circularCheck.hasCircular) {
      errors.push(circularCheck.description);
    }

    // Validate thresholds if present
    if (config.thresholds) {
      const thresholdCheck = this.validateThresholds(config.thresholds);
      errors.push(...thresholdCheck.errors);
    }

    // Validate codec configuration
    if (config.codecs) {
      const codecCheck = this.consistencyChecker.checkCodecConstraints({
        codecs: config.codecs,
        preferredCodec: config.preferredCodec,
        fallbackCodec: config.fallbackCodec
      });
      errors.push(...codecCheck.errors);
    }

    // Validate quality tiers
    if (config.qualityTiers) {
      const tierCheck = this.consistencyChecker.checkQualityTiers({
        tiers: config.qualityTiers
      });
      errors.push(...tierCheck.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateThresholds(thresholds: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (thresholds.packetLoss) {
      const check = ThresholdValidator.validateRangeThresholds({
        packetLoss: {
          min: thresholds.packetLoss.low || 0,
          max: thresholds.packetLoss.critical || 100,
          description: 'Packet loss'
        }
      });
      errors.push(...check.errors);
    }

    if (thresholds.bitrate) {
      const check = ThresholdValidator.validateRangeThresholds({
        bitrate: {
          min: thresholds.bitrate.min || 100,
          max: thresholds.bitrate.max || 50000,
          description: 'Bitrate'
        }
      });
      errors.push(...check.errors);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Record validation result
   */
  recordValidation(configKey: string, result: any): void {
    this.validationHistory.push({
      timestamp: Date.now(),
      configKey,
      result
    });

    if (this.validationHistory.length > this.maxHistory) {
      this.validationHistory.shift();
    }
  }

  /**
   * Get validation history
   */
  getValidationHistory(configKey?: string) {
    if (configKey) {
      return this.validationHistory.filter((h) => h.configKey === configKey);
    }
    return [...this.validationHistory];
  }

  /**
   * Create state machine validator
   */
  createStateMachineValidator(): ConfigurationStateMachineValidator {
    return new ConfigurationStateMachineValidator();
  }
}

export {
  ThresholdValidator,
  ConfigurationConsistencyChecker,
  ConfigurationStateMachineValidator,
  ConfigurationValidationManager
};
