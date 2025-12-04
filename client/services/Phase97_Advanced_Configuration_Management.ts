/**
 * Phase 97: Advanced Configuration Management
 * Ring WebRTC Platform - Spam Call Elimination System
 *
 * Enterprise-grade configuration management with feature flags,
 * dynamic configuration, secret management, and validation.
 *
 * Research Sources:
 * - LaunchDarkly Feature Flags Best Practices
 * - Spring Cloud Config Dynamic Updates
 * - HashiCorp Vault vs AWS Secrets Manager (2025)
 * - Zod TypeScript Schema Validation
 * - The Twelve-Factor App Configuration
 * - dotenvx (2024-2025)
 *
 * @version 1.0.0
 * @phase 97
 * @date December 2025
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type FeatureFlagValue = boolean | string | number | object;

interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  defaultValue: FeatureFlagValue;
  enabled: boolean;
  variations: FeatureFlagVariation[];
  targetingRules: TargetingRule[];
  rolloutPercentage: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
}

interface FeatureFlagVariation {
  id: string;
  name: string;
  value: FeatureFlagValue;
  weight?: number;
}

interface TargetingRule {
  id: string;
  name: string;
  conditions: TargetingCondition[];
  variationId: string;
  priority: number;
}

interface TargetingCondition {
  attribute: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn' | 'greaterThan' | 'lessThan';
  value: string | number | string[];
}

interface UserContext {
  userId: string;
  email?: string;
  groups?: string[];
  attributes?: Record<string, string | number | boolean>;
}

interface ConfigValue {
  key: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'json' | 'secret';
  source: 'default' | 'environment' | 'file' | 'remote' | 'secret_manager';
  environment?: string;
  version?: string;
  lastUpdated: Date;
  encrypted: boolean;
}

interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    default?: unknown;
    description?: string;
    enum?: unknown[];
    min?: number;
    max?: number;
    pattern?: string;
    secret?: boolean;
  };
}

interface SecretConfig {
  provider: 'vault' | 'aws_secrets_manager' | 'env' | 'encrypted_file';
  endpoint?: string;
  namespace?: string;
  rotationInterval?: number;
  cacheTTL: number;
}

interface Secret {
  key: string;
  value: string;
  version: string;
  createdAt: Date;
  expiresAt?: Date;
  rotationEnabled: boolean;
}

interface ConfigChangeEvent {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
  timestamp: Date;
  changedBy?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
  expected?: string;
}

interface ValidationWarning {
  path: string;
  message: string;
}

// ============================================================================
// FEATURE FLAG SERVICE
// ============================================================================

/**
 * Feature Flag Service (LaunchDarkly-style)
 *
 * Features:
 * - Boolean, string, number, JSON flags
 * - Percentage rollouts
 * - User targeting rules
 * - A/B testing support
 * - Flag lifecycle management
 *
 * Research: LaunchDarkly, Statsig, Unleash
 */
export class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private evaluationCache: Map<string, { value: FeatureFlagValue; timestamp: number }> = new Map();
  private readonly cacheTTL = 60000; // 1 minute
  private changeListeners: Array<(flag: FeatureFlag, oldValue: FeatureFlagValue, newValue: FeatureFlagValue) => void> = [];

  /**
   * Register a feature flag
   */
  registerFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): void {
    const fullFlag: FeatureFlag = {
      ...flag,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.flags.set(flag.key, fullFlag);
  }

  /**
   * Evaluate flag for user (LaunchDarkly-style)
   */
  evaluate(flagKey: string, user: UserContext, defaultValue?: FeatureFlagValue): FeatureFlagValue {
    const flag = this.flags.get(flagKey);

    if (!flag || flag.archived) {
      return defaultValue ?? false;
    }

    if (!flag.enabled) {
      return flag.defaultValue;
    }

    // Check cache
    const cacheKey = `${flagKey}:${user.userId}`;
    const cached = this.evaluationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.value;
    }

    // Evaluate targeting rules (sorted by priority)
    const sortedRules = [...flag.targetingRules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (this.evaluateRule(rule, user)) {
        const variation = flag.variations.find(v => v.id === rule.variationId);
        if (variation) {
          this.cacheResult(cacheKey, variation.value);
          return variation.value;
        }
      }
    }

    // Percentage rollout
    if (flag.rolloutPercentage < 100) {
      const bucket = this.getBucket(user.userId, flagKey);
      if (bucket >= flag.rolloutPercentage) {
        this.cacheResult(cacheKey, flag.defaultValue);
        return flag.defaultValue;
      }
    }

    // Weighted variation selection
    if (flag.variations.length > 0) {
      const selectedVariation = this.selectWeightedVariation(flag.variations, user.userId, flagKey);
      this.cacheResult(cacheKey, selectedVariation.value);
      return selectedVariation.value;
    }

    this.cacheResult(cacheKey, flag.defaultValue);
    return flag.defaultValue;
  }

  /**
   * Boolean flag evaluation shorthand
   */
  isEnabled(flagKey: string, user: UserContext): boolean {
    const value = this.evaluate(flagKey, user);
    return Boolean(value);
  }

  /**
   * Evaluate targeting rule
   */
  private evaluateRule(rule: TargetingRule, user: UserContext): boolean {
    return rule.conditions.every(condition => this.evaluateCondition(condition, user));
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: TargetingCondition, user: UserContext): boolean {
    let attributeValue: unknown;

    // Get attribute value from user
    switch (condition.attribute) {
      case 'userId':
        attributeValue = user.userId;
        break;
      case 'email':
        attributeValue = user.email;
        break;
      case 'groups':
        attributeValue = user.groups;
        break;
      default:
        attributeValue = user.attributes?.[condition.attribute];
    }

    if (attributeValue === undefined) {
      return false;
    }

    // Evaluate operator
    switch (condition.operator) {
      case 'equals':
        return attributeValue === condition.value;
      case 'notEquals':
        return attributeValue !== condition.value;
      case 'contains':
        return String(attributeValue).includes(String(condition.value));
      case 'startsWith':
        return String(attributeValue).startsWith(String(condition.value));
      case 'endsWith':
        return String(attributeValue).endsWith(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(attributeValue);
      case 'notIn':
        return Array.isArray(condition.value) && !condition.value.includes(attributeValue);
      case 'greaterThan':
        return Number(attributeValue) > Number(condition.value);
      case 'lessThan':
        return Number(attributeValue) < Number(condition.value);
      default:
        return false;
    }
  }

  /**
   * Get bucket for percentage rollout (consistent hashing)
   */
  private getBucket(userId: string, flagKey: string): number {
    const hash = this.hashString(`${userId}:${flagKey}`);
    return hash % 100;
  }

  /**
   * Select weighted variation
   */
  private selectWeightedVariation(
    variations: FeatureFlagVariation[],
    userId: string,
    flagKey: string
  ): FeatureFlagVariation {
    const totalWeight = variations.reduce((sum, v) => sum + (v.weight || 1), 0);
    const hash = this.hashString(`${userId}:${flagKey}:variation`);
    let point = hash % totalWeight;

    for (const variation of variations) {
      point -= variation.weight || 1;
      if (point < 0) {
        return variation;
      }
    }

    return variations[0];
  }

  /**
   * Simple string hash
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Cache evaluation result
   */
  private cacheResult(key: string, value: FeatureFlagValue): void {
    this.evaluationCache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Update flag
   */
  updateFlag(flagKey: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) return false;

    const oldValue = flag.defaultValue;
    Object.assign(flag, updates, { updatedAt: new Date() });

    // Clear cache for this flag
    for (const [key] of this.evaluationCache) {
      if (key.startsWith(`${flagKey}:`)) {
        this.evaluationCache.delete(key);
      }
    }

    // Notify listeners
    if (updates.defaultValue !== undefined && oldValue !== updates.defaultValue) {
      for (const listener of this.changeListeners) {
        listener(flag, oldValue, updates.defaultValue);
      }
    }

    return true;
  }

  /**
   * Toggle flag enabled state
   */
  toggleFlag(flagKey: string): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) return false;

    return this.updateFlag(flagKey, { enabled: !flag.enabled });
  }

  /**
   * Archive flag
   */
  archiveFlag(flagKey: string): boolean {
    return this.updateFlag(flagKey, { archived: true });
  }

  /**
   * Set rollout percentage
   */
  setRolloutPercentage(flagKey: string, percentage: number): boolean {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
    return this.updateFlag(flagKey, { rolloutPercentage: percentage });
  }

  /**
   * Add targeting rule
   */
  addTargetingRule(flagKey: string, rule: Omit<TargetingRule, 'id'>): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) return false;

    const newRule: TargetingRule = {
      ...rule,
      id: `rule_${Date.now()}`
    };

    return this.updateFlag(flagKey, {
      targetingRules: [...flag.targetingRules, newRule]
    });
  }

  /**
   * Listen for flag changes
   */
  onChange(listener: (flag: FeatureFlag, oldValue: FeatureFlagValue, newValue: FeatureFlagValue) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Get all flags
   */
  getAllFlags(includeArchived: boolean = false): FeatureFlag[] {
    return Array.from(this.flags.values())
      .filter(f => includeArchived || !f.archived);
  }

  /**
   * Get flag by key
   */
  getFlag(flagKey: string): FeatureFlag | undefined {
    return this.flags.get(flagKey);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.evaluationCache.clear();
  }
}

// ============================================================================
// DYNAMIC CONFIG SERVICE
// ============================================================================

/**
 * Dynamic Configuration Service (Spring Cloud Config-style)
 *
 * Features:
 * - Hot reload without restart
 * - Multiple config sources (env, file, remote)
 * - Environment-specific configs
 * - Change notification
 * - Refresh scope
 *
 * Research: Spring Cloud Config, Consul, etcd
 */
export class DynamicConfigService {
  private config: Map<string, ConfigValue> = new Map();
  private sources: Map<string, () => Promise<Record<string, unknown>>> = new Map();
  private changeListeners: Array<(event: ConfigChangeEvent) => void> = [];
  private refreshInterval: number | null = null;
  private environment: string;

  constructor(environment: string = 'development') {
    this.environment = environment;
  }

  /**
   * Load configuration from all sources
   */
  async load(): Promise<void> {
    // Load from environment variables first
    this.loadFromEnvironment();

    // Load from registered sources
    for (const [sourceName, loader] of this.sources) {
      try {
        const values = await loader();
        for (const [key, value] of Object.entries(values)) {
          this.setInternal(key, value, sourceName);
        }
      } catch (error) {
        console.error(`Failed to load config from source: ${sourceName}`, error);
      }
    }
  }

  /**
   * Load from environment variables
   */
  private loadFromEnvironment(): void {
    // In browser environment, this would be different
    // For Node.js, would use process.env
    const envPrefix = 'RING_';

    // Simulated env vars for demonstration
    const simulatedEnv: Record<string, string> = {
      RING_SERVICE_NAME: 'ring-spam-detection',
      RING_LOG_LEVEL: 'info',
      RING_MAX_CONNECTIONS: '100',
      RING_FEATURE_NEW_UI: 'true'
    };

    for (const [key, value] of Object.entries(simulatedEnv)) {
      if (key.startsWith(envPrefix)) {
        const configKey = key.substring(envPrefix.length).toLowerCase().replace(/_/g, '.');
        this.setInternal(configKey, this.parseValue(value), 'environment');
      }
    }
  }

  /**
   * Parse string value to appropriate type
   */
  private parseValue(value: string): unknown {
    // Boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Number
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

    // JSON
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  }

  /**
   * Set config value internally
   */
  private setInternal(key: string, value: unknown, source: string): void {
    const oldValue = this.config.get(key);

    this.config.set(key, {
      key,
      value,
      type: this.inferType(value),
      source: source as ConfigValue['source'],
      environment: this.environment,
      lastUpdated: new Date(),
      encrypted: false
    });

    // Notify if changed
    if (oldValue && oldValue.value !== value) {
      this.notifyChange({
        key,
        oldValue: oldValue.value,
        newValue: value,
        source,
        timestamp: new Date()
      });
    }
  }

  /**
   * Infer type from value
   */
  private inferType(value: unknown): ConfigValue['type'] {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'json';
  }

  /**
   * Get config value
   */
  get<T>(key: string, defaultValue?: T): T {
    const config = this.config.get(key);
    return (config?.value as T) ?? (defaultValue as T);
  }

  /**
   * Get string value
   */
  getString(key: string, defaultValue: string = ''): string {
    return String(this.get(key, defaultValue));
  }

  /**
   * Get number value
   */
  getNumber(key: string, defaultValue: number = 0): number {
    const value = this.get(key, defaultValue);
    return typeof value === 'number' ? value : Number(value);
  }

  /**
   * Get boolean value
   */
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    return Boolean(this.get(key, defaultValue));
  }

  /**
   * Get object value
   */
  getObject<T>(key: string, defaultValue?: T): T | undefined {
    return this.get<T>(key, defaultValue);
  }

  /**
   * Set config value
   */
  set(key: string, value: unknown): void {
    this.setInternal(key, value, 'remote');
  }

  /**
   * Register config source
   */
  registerSource(name: string, loader: () => Promise<Record<string, unknown>>): void {
    this.sources.set(name, loader);
  }

  /**
   * Refresh configuration (Spring @RefreshScope equivalent)
   */
  async refresh(): Promise<string[]> {
    const changedKeys: string[] = [];
    const oldValues = new Map(this.config);

    await this.load();

    // Find changed keys
    for (const [key, newConfig] of this.config) {
      const oldConfig = oldValues.get(key);
      if (!oldConfig || oldConfig.value !== newConfig.value) {
        changedKeys.push(key);
      }
    }

    return changedKeys;
  }

  /**
   * Start auto-refresh
   */
  startAutoRefresh(intervalMs: number = 30000): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(async () => {
      await this.refresh();
    }, intervalMs) as unknown as number;
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Listen for config changes
   */
  onChange(listener: (event: ConfigChangeEvent) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Notify change listeners
   */
  private notifyChange(event: ConfigChangeEvent): void {
    for (const listener of this.changeListeners) {
      listener(event);
    }
  }

  /**
   * Get all config values
   */
  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, config] of this.config) {
      result[key] = config.value;
    }
    return result;
  }

  /**
   * Get config by prefix
   */
  getByPrefix(prefix: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, config] of this.config) {
      if (key.startsWith(prefix)) {
        result[key] = config.value;
      }
    }
    return result;
  }

  /**
   * Export config
   */
  export(): ConfigValue[] {
    return Array.from(this.config.values());
  }
}

// ============================================================================
// SECRET MANAGER
// ============================================================================

/**
 * Secret Manager (Vault/AWS Secrets Manager-style)
 *
 * Features:
 * - Secure secret storage
 * - Automatic rotation
 * - Version management
 * - Cache with TTL
 * - Multiple providers
 *
 * Research: HashiCorp Vault, AWS Secrets Manager
 */
export class SecretManager {
  private config: SecretConfig;
  private cache: Map<string, { secret: Secret; cachedAt: number }> = new Map();
  private secrets: Map<string, Secret> = new Map(); // In-memory store for demo
  private rotationCallbacks: Map<string, () => Promise<string>> = new Map();

  constructor(config: Partial<SecretConfig> = {}) {
    this.config = {
      provider: config.provider || 'env',
      endpoint: config.endpoint,
      namespace: config.namespace || 'ring',
      rotationInterval: config.rotationInterval || 86400000, // 24 hours
      cacheTTL: config.cacheTTL || 300000 // 5 minutes
    };
  }

  /**
   * Get secret value
   */
  async getSecret(key: string): Promise<string> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.cachedAt < this.config.cacheTTL) {
      return cached.secret.value;
    }

    // Fetch from provider
    const secret = await this.fetchSecret(key);
    if (!secret) {
      throw new Error(`Secret not found: ${key}`);
    }

    // Update cache
    this.cache.set(key, { secret, cachedAt: Date.now() });

    return secret.value;
  }

  /**
   * Fetch secret from provider
   */
  private async fetchSecret(key: string): Promise<Secret | null> {
    switch (this.config.provider) {
      case 'vault':
        return this.fetchFromVault(key);
      case 'aws_secrets_manager':
        return this.fetchFromAWS(key);
      case 'env':
        return this.fetchFromEnv(key);
      case 'encrypted_file':
        return this.fetchFromEncryptedFile(key);
      default:
        return this.secrets.get(key) || null;
    }
  }

  /**
   * Fetch from HashiCorp Vault (simulated)
   */
  private async fetchFromVault(key: string): Promise<Secret | null> {
    // In production, would use vault API
    // curl -H "X-Vault-Token: ${VAULT_TOKEN}" ${VAULT_ADDR}/v1/secret/data/${key}
    return this.secrets.get(key) || null;
  }

  /**
   * Fetch from AWS Secrets Manager (simulated)
   */
  private async fetchFromAWS(key: string): Promise<Secret | null> {
    // In production, would use AWS SDK
    // aws secretsmanager get-secret-value --secret-id ${key}
    return this.secrets.get(key) || null;
  }

  /**
   * Fetch from environment variable
   */
  private async fetchFromEnv(key: string): Promise<Secret | null> {
    // Simulated environment
    const envKey = `SECRET_${key.toUpperCase().replace(/\./g, '_')}`;
    const value = this.getEnvValue(envKey);

    if (!value) return null;

    return {
      key,
      value,
      version: '1',
      createdAt: new Date(),
      rotationEnabled: false
    };
  }

  /**
   * Get environment value (simulated)
   */
  private getEnvValue(key: string): string | undefined {
    // Would use process.env in Node.js
    const simulatedSecrets: Record<string, string> = {
      SECRET_DATABASE_PASSWORD: 'super_secret_password_123',
      SECRET_API_KEY: 'sk_live_xxxxxxxxxxxx',
      SECRET_JWT_SECRET: 'jwt_secret_key_very_long_and_random'
    };
    return simulatedSecrets[key];
  }

  /**
   * Fetch from encrypted file (simulated)
   */
  private async fetchFromEncryptedFile(key: string): Promise<Secret | null> {
    // Would decrypt .env.enc using dotenvx or similar
    return this.secrets.get(key) || null;
  }

  /**
   * Store secret
   */
  async setSecret(key: string, value: string, options: { rotationEnabled?: boolean } = {}): Promise<void> {
    const secret: Secret = {
      key,
      value,
      version: String(Date.now()),
      createdAt: new Date(),
      rotationEnabled: options.rotationEnabled || false
    };

    this.secrets.set(key, secret);
    this.cache.delete(key);
  }

  /**
   * Rotate secret
   */
  async rotateSecret(key: string): Promise<string> {
    const callback = this.rotationCallbacks.get(key);
    if (!callback) {
      throw new Error(`No rotation callback registered for: ${key}`);
    }

    const newValue = await callback();
    await this.setSecret(key, newValue, { rotationEnabled: true });

    return newValue;
  }

  /**
   * Register rotation callback
   */
  registerRotation(key: string, callback: () => Promise<string>): void {
    this.rotationCallbacks.set(key, callback);
  }

  /**
   * Start automatic rotation
   */
  startAutoRotation(): void {
    setInterval(async () => {
      for (const [key, secret] of this.secrets) {
        if (secret.rotationEnabled && this.rotationCallbacks.has(key)) {
          try {
            await this.rotateSecret(key);
            console.log(`Rotated secret: ${key}`);
          } catch (error) {
            console.error(`Failed to rotate secret: ${key}`, error);
          }
        }
      }
    }, this.config.rotationInterval);
  }

  /**
   * Delete secret
   */
  async deleteSecret(key: string): Promise<boolean> {
    this.cache.delete(key);
    return this.secrets.delete(key);
  }

  /**
   * List secret keys
   */
  listSecrets(): string[] {
    return Array.from(this.secrets.keys());
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================================================
// CONFIG VALIDATOR
// ============================================================================

/**
 * Configuration Validator (Zod-style)
 *
 * Features:
 * - Schema-based validation
 * - Type coercion
 * - Custom validators
 * - Detailed error messages
 *
 * Research: Zod, Joi, JSON Schema
 */
export class ConfigValidator {
  private schema: ConfigSchema;

  constructor(schema: ConfigSchema) {
    this.schema = schema;
  }

  /**
   * Validate configuration object
   */
  validate(config: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields
    for (const [key, definition] of Object.entries(this.schema)) {
      const value = this.getNestedValue(config, key);

      // Required check
      if (definition.required && (value === undefined || value === null)) {
        errors.push({
          path: key,
          message: `Required field is missing`,
          expected: definition.type
        });
        continue;
      }

      // Skip validation if not present and not required
      if (value === undefined || value === null) {
        if (definition.default !== undefined) {
          warnings.push({
            path: key,
            message: `Using default value: ${definition.default}`
          });
        }
        continue;
      }

      // Type validation
      const typeError = this.validateType(key, value, definition);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      // Constraint validation
      const constraintErrors = this.validateConstraints(key, value, definition);
      errors.push(...constraintErrors);
    }

    // Check for unknown fields
    for (const key of Object.keys(config)) {
      if (!this.schema[key] && !this.isNestedKey(key)) {
        warnings.push({
          path: key,
          message: 'Unknown configuration key'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate with type coercion
   */
  validateAndCoerce(config: Record<string, unknown>): {
    result: ValidationResult;
    coerced: Record<string, unknown>;
  } {
    const coerced: Record<string, unknown> = { ...config };

    // Apply defaults
    for (const [key, definition] of Object.entries(this.schema)) {
      if (coerced[key] === undefined && definition.default !== undefined) {
        coerced[key] = definition.default;
      }
    }

    // Coerce types
    for (const [key, value] of Object.entries(coerced)) {
      const definition = this.schema[key];
      if (definition && value !== undefined) {
        coerced[key] = this.coerceType(value, definition.type);
      }
    }

    const result = this.validate(coerced);

    return { result, coerced };
  }

  /**
   * Validate type
   */
  private validateType(key: string, value: unknown, definition: ConfigSchema[string]): ValidationError | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (definition.type === 'object' && actualType !== 'object') {
      return {
        path: key,
        message: `Expected object but got ${actualType}`,
        value,
        expected: 'object'
      };
    }

    if (definition.type === 'array' && !Array.isArray(value)) {
      return {
        path: key,
        message: `Expected array but got ${actualType}`,
        value,
        expected: 'array'
      };
    }

    if (['string', 'number', 'boolean'].includes(definition.type) && actualType !== definition.type) {
      return {
        path: key,
        message: `Expected ${definition.type} but got ${actualType}`,
        value,
        expected: definition.type
      };
    }

    return null;
  }

  /**
   * Validate constraints
   */
  private validateConstraints(key: string, value: unknown, definition: ConfigSchema[string]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Enum validation
    if (definition.enum && !definition.enum.includes(value)) {
      errors.push({
        path: key,
        message: `Value must be one of: ${definition.enum.join(', ')}`,
        value,
        expected: `enum(${definition.enum.join(', ')})`
      });
    }

    // Number constraints
    if (definition.type === 'number' && typeof value === 'number') {
      if (definition.min !== undefined && value < definition.min) {
        errors.push({
          path: key,
          message: `Value must be >= ${definition.min}`,
          value,
          expected: `>= ${definition.min}`
        });
      }
      if (definition.max !== undefined && value > definition.max) {
        errors.push({
          path: key,
          message: `Value must be <= ${definition.max}`,
          value,
          expected: `<= ${definition.max}`
        });
      }
    }

    // String pattern
    if (definition.type === 'string' && definition.pattern && typeof value === 'string') {
      const regex = new RegExp(definition.pattern);
      if (!regex.test(value)) {
        errors.push({
          path: key,
          message: `Value does not match pattern: ${definition.pattern}`,
          value,
          expected: `pattern(${definition.pattern})`
        });
      }
    }

    return errors;
  }

  /**
   * Coerce type
   */
  private coerceType(value: unknown, targetType: string): unknown {
    if (value === undefined || value === null) return value;

    switch (targetType) {
      case 'string':
        return String(value);
      case 'number':
        const num = Number(value);
        return isNaN(num) ? value : num;
      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return Boolean(value);
      default:
        return value;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Check if key is nested (contains dot)
   */
  private isNestedKey(key: string): boolean {
    // Check if this key is part of a nested path in schema
    for (const schemaKey of Object.keys(this.schema)) {
      if (schemaKey.startsWith(`${key}.`)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get schema
   */
  getSchema(): ConfigSchema {
    return { ...this.schema };
  }

  /**
   * Generate TypeScript interface from schema
   */
  generateTypeScript(): string {
    const lines: string[] = ['interface Config {'];

    for (const [key, def] of Object.entries(this.schema)) {
      const optional = def.required ? '' : '?';
      let tsType: string;

      switch (def.type) {
        case 'string':
          tsType = def.enum ? def.enum.map(v => `'${v}'`).join(' | ') : 'string';
          break;
        case 'number':
          tsType = 'number';
          break;
        case 'boolean':
          tsType = 'boolean';
          break;
        case 'array':
          tsType = 'unknown[]';
          break;
        case 'object':
          tsType = 'Record<string, unknown>';
          break;
        default:
          tsType = 'unknown';
      }

      const comment = def.description ? `  /** ${def.description} */\n` : '';
      lines.push(`${comment}  ${key}${optional}: ${tsType};`);
    }

    lines.push('}');
    return lines.join('\n');
  }
}

// ============================================================================
// ENVIRONMENT CONFIG
// ============================================================================

/**
 * Environment Configuration (12-Factor App style)
 *
 * Features:
 * - Environment-specific configs
 * - Config profiles (dev, staging, prod)
 * - Override hierarchy
 * - Validation per environment
 *
 * Research: 12-Factor App, dotenv, dotenvx
 */
export class EnvironmentConfig {
  private environment: string;
  private configs: Map<string, Record<string, unknown>> = new Map();
  private activeConfig: Record<string, unknown> = {};

  constructor(environment?: string) {
    this.environment = environment || this.detectEnvironment();
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): string {
    // Would check process.env.NODE_ENV in Node.js
    // For browser, check URL or meta tags
    return 'development';
  }

  /**
   * Register environment config
   */
  registerEnvironment(env: string, config: Record<string, unknown>): void {
    this.configs.set(env, config);
  }

  /**
   * Load configuration for current environment
   */
  load(): Record<string, unknown> {
    // Start with default config
    const defaultConfig = this.configs.get('default') || {};

    // Merge environment-specific config
    const envConfig = this.configs.get(this.environment) || {};

    // Merge with priority: default < env-specific < env vars
    this.activeConfig = this.deepMerge(defaultConfig, envConfig);

    return this.activeConfig;
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.deepMerge(
          (result[key] as Record<string, unknown>) || {},
          value as Record<string, unknown>
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get value
   */
  get<T>(key: string, defaultValue?: T): T {
    const keys = key.split('.');
    let value: unknown = this.activeConfig;

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k];
      } else {
        return defaultValue as T;
      }
    }

    return (value as T) ?? (defaultValue as T);
  }

  /**
   * Get current environment
   */
  getEnvironment(): string {
    return this.environment;
  }

  /**
   * Check if production
   */
  isProduction(): boolean {
    return this.environment === 'production' || this.environment === 'prod';
  }

  /**
   * Check if development
   */
  isDevelopment(): boolean {
    return this.environment === 'development' || this.environment === 'dev';
  }

  /**
   * Get all config
   */
  getAll(): Record<string, unknown> {
    return { ...this.activeConfig };
  }
}

// ============================================================================
// INTEGRATED CONFIG PLATFORM
// ============================================================================

/**
 * Integrated Configuration Management Platform for Ring
 */
export class IntegratedConfigPlatform {
  private featureFlags: FeatureFlagService;
  private dynamicConfig: DynamicConfigService;
  private secretManager: SecretManager;
  private validator: ConfigValidator;
  private envConfig: EnvironmentConfig;

  constructor(environment: string = 'development') {
    this.featureFlags = new FeatureFlagService();
    this.dynamicConfig = new DynamicConfigService(environment);
    this.secretManager = new SecretManager({ provider: 'env' });
    this.envConfig = new EnvironmentConfig(environment);

    // Initialize validator with Ring schema
    this.validator = new ConfigValidator({
      'service.name': { type: 'string', required: true, description: 'Service name' },
      'service.port': { type: 'number', required: true, min: 1, max: 65535 },
      'log.level': { type: 'string', required: false, enum: ['trace', 'debug', 'info', 'warn', 'error'], default: 'info' },
      'database.host': { type: 'string', required: true },
      'database.port': { type: 'number', required: true, default: 5432 },
      'database.maxConnections': { type: 'number', required: false, min: 1, max: 1000, default: 100 },
      'cache.enabled': { type: 'boolean', required: false, default: true },
      'cache.ttl': { type: 'number', required: false, min: 0, default: 300000 },
      'spam.threshold': { type: 'number', required: true, min: 0, max: 1 },
      'spam.blacklistEnabled': { type: 'boolean', required: false, default: true }
    });

    this.initializeDefaultFlags();
    this.initializeDefaultConfig();
  }

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags(): void {
    this.featureFlags.registerFlag({
      key: 'new_spam_algorithm',
      name: 'New Spam Detection Algorithm',
      description: 'Enable the ML-based spam detection',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      variations: [
        { id: 'off', name: 'Off', value: false, weight: 50 },
        { id: 'on', name: 'On', value: true, weight: 50 }
      ],
      targetingRules: [],
      rolloutPercentage: 10,
      tags: ['spam', 'ml'],
      archived: false
    });

    this.featureFlags.registerFlag({
      key: 'enhanced_ui',
      name: 'Enhanced UI',
      description: 'New user interface design',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      variations: [
        { id: 'off', name: 'Off', value: false },
        { id: 'on', name: 'On', value: true }
      ],
      targetingRules: [
        {
          id: 'beta_users',
          name: 'Beta Users',
          conditions: [{ attribute: 'groups', operator: 'contains', value: 'beta' }],
          variationId: 'on',
          priority: 1
        }
      ],
      rolloutPercentage: 100,
      tags: ['ui'],
      archived: false
    });
  }

  /**
   * Initialize default configuration
   */
  private initializeDefaultConfig(): void {
    this.envConfig.registerEnvironment('default', {
      service: { name: 'ring-spam-detection', port: 3000 },
      log: { level: 'info' },
      database: { host: 'localhost', port: 5432, maxConnections: 50 },
      cache: { enabled: true, ttl: 300000 },
      spam: { threshold: 0.7, blacklistEnabled: true }
    });

    this.envConfig.registerEnvironment('production', {
      log: { level: 'warn' },
      database: { host: 'db.ring.internal', maxConnections: 200 },
      spam: { threshold: 0.8 }
    });

    this.envConfig.registerEnvironment('development', {
      log: { level: 'debug' },
      database: { host: 'localhost', maxConnections: 10 }
    });
  }

  /**
   * Initialize platform
   */
  async initialize(): Promise<ValidationResult> {
    // Load environment config
    const config = this.envConfig.load();

    // Load dynamic config
    await this.dynamicConfig.load();

    // Validate configuration
    return this.validator.validate(config);
  }

  /**
   * Check feature flag
   */
  isFeatureEnabled(flagKey: string, user: UserContext): boolean {
    return this.featureFlags.isEnabled(flagKey, user);
  }

  /**
   * Get configuration value
   */
  getConfig<T>(key: string, defaultValue?: T): T {
    // Check dynamic config first, then env config
    const dynamicValue = this.dynamicConfig.get<T>(key);
    if (dynamicValue !== undefined) {
      return dynamicValue;
    }
    return this.envConfig.get(key, defaultValue);
  }

  /**
   * Get secret
   */
  async getSecret(key: string): Promise<string> {
    return this.secretManager.getSecret(key);
  }

  /**
   * Update feature flag
   */
  updateFeatureFlag(flagKey: string, updates: Partial<FeatureFlag>): boolean {
    return this.featureFlags.updateFlag(flagKey, updates);
  }

  /**
   * Set rollout percentage
   */
  setFeatureRollout(flagKey: string, percentage: number): boolean {
    return this.featureFlags.setRolloutPercentage(flagKey, percentage);
  }

  /**
   * Get platform status
   */
  getStatus(): {
    environment: string;
    featureFlags: { total: number; enabled: number };
    configKeys: number;
    validation: ValidationResult;
  } {
    const flags = this.featureFlags.getAllFlags();
    const config = this.envConfig.getAll();
    const validation = this.validator.validate(config);

    return {
      environment: this.envConfig.getEnvironment(),
      featureFlags: {
        total: flags.length,
        enabled: flags.filter(f => f.enabled).length
      },
      configKeys: Object.keys(config).length,
      validation
    };
  }

  /**
   * Export configuration
   */
  exportConfig(): {
    environment: string;
    config: Record<string, unknown>;
    featureFlags: FeatureFlag[];
  } {
    return {
      environment: this.envConfig.getEnvironment(),
      config: this.envConfig.getAll(),
      featureFlags: this.featureFlags.getAllFlags()
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  FeatureFlag,
  FeatureFlagVariation,
  TargetingRule,
  TargetingCondition,
  UserContext,
  ConfigValue,
  ConfigSchema,
  SecretConfig,
  Secret,
  ConfigChangeEvent,
  ValidationResult,
  ValidationError,
  ValidationWarning
};
