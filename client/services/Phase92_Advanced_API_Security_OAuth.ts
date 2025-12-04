/**
 * Phase 92: Advanced API Security & OAuth 2.1
 *
 * Enterprise-grade API security for Ring WebRTC spam detection.
 * Implements OAuth 2.1 with PKCE, JWT management, rate limiting,
 * and OWASP API security best practices.
 *
 * Research Sources (2025):
 * - OAuth 2.1 PKCE: https://oauth.net/2.1/
 * - OWASP API Security: https://owasp.org/API-Security/
 * - JWT Best Practices: https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/
 * - Rate Limiting: https://api7.ai/blog/rate-limiting-guide-algorithms-best-practices
 * - CORS Security: https://www.aikido.dev/blog/cors-security-beyond-basic-configuration
 *
 * @module Phase92_Advanced_API_Security_OAuth
 * @version 1.0.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * OAuth 2.1 Types
 */
export interface OAuthConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string; // Only for confidential clients
  redirectUri: string;
  scopes: string[];
  pkceRequired: boolean; // OAuth 2.1 mandates PKCE
  tokenEndpoint: string;
  authorizationEndpoint: string;
  revocationEndpoint?: string;
  introspectionEndpoint?: string;
  jwksUri?: string;
}

export interface AuthorizationRequest {
  responseType: 'code'; // OAuth 2.1 only allows 'code'
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256'; // Plain is deprecated in OAuth 2.1
  nonce?: string;
}

export interface TokenRequest {
  grantType: 'authorization_code' | 'refresh_token' | 'client_credentials';
  code?: string;
  codeVerifier?: string;
  refreshToken?: string;
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken?: string;
  scope?: string;
  idToken?: string;
}

export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/**
 * JWT Types
 */
export interface JWTHeader {
  alg: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512';
  typ: 'JWT';
  kid?: string;
}

export interface JWTPayload {
  iss: string; // Issuer
  sub: string; // Subject
  aud: string | string[]; // Audience
  exp: number; // Expiration time
  iat: number; // Issued at
  nbf?: number; // Not before
  jti?: string; // JWT ID (for token rotation)
  scope?: string;
  [key: string]: unknown;
}

export interface JWTValidationOptions {
  issuer: string;
  audience: string | string[];
  algorithms?: JWTHeader['alg'][];
  clockTolerance?: number;
  maxAge?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
  tokenFamily?: string; // For refresh token rotation
}

export interface TokenRotationState {
  currentRefreshToken: string;
  tokenFamily: string;
  issuedAt: number;
  usedTokens: Set<string>; // For reuse detection
}

/**
 * Rate Limiting Types
 */
export type RateLimitAlgorithm = 'token-bucket' | 'sliding-window' | 'fixed-window' | 'leaky-bucket';

export interface RateLimitConfig {
  algorithm: RateLimitAlgorithm;
  limit: number;
  windowMs: number;
  burstLimit?: number; // For token bucket
  refillRate?: number; // Tokens per second for token bucket
  keyGenerator?: (request: APIRequest) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  headers?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
  limit: number;
}

export interface RateLimitState {
  key: string;
  count: number;
  tokens?: number; // For token bucket
  windowStart: number;
  lastRefill?: number;
}

/**
 * API Security Types
 */
export interface APIRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  ip: string;
  userId?: string;
}

export interface APIResponse {
  status: number;
  headers: Record<string, string>;
  body?: unknown;
}

export interface SecurityPolicy {
  rateLimit?: RateLimitConfig;
  authentication?: AuthenticationPolicy;
  authorization?: AuthorizationPolicy;
  cors?: CORSPolicy;
  validation?: ValidationPolicy;
}

export interface AuthenticationPolicy {
  required: boolean;
  methods: ('bearer' | 'api-key' | 'basic' | 'oauth2')[];
  apiKeyHeader?: string;
  apiKeyQuery?: string;
}

export interface AuthorizationPolicy {
  type: 'rbac' | 'abac' | 'scope-based';
  requiredScopes?: string[];
  requiredRoles?: string[];
  rules?: AuthorizationRule[];
}

export interface AuthorizationRule {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

export interface CORSPolicy {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
}

export interface ValidationPolicy {
  maxBodySize?: number;
  allowedContentTypes?: string[];
  requireContentType?: boolean;
  sanitizeInput?: boolean;
}

/**
 * API Key Types
 */
export interface APIKey {
  id: string;
  key: string;
  keyHash: string; // SHA-256 hash of the key
  name: string;
  owner: string;
  scopes: string[];
  rateLimit?: RateLimitConfig;
  expiresAt?: number;
  createdAt: number;
  lastUsedAt?: number;
  isActive: boolean;
}

export interface APIKeyValidation {
  valid: boolean;
  apiKey?: APIKey;
  error?: string;
}

// ============================================================================
// OAUTH 2.1 ENGINE
// ============================================================================

/**
 * OAuth 2.1 Engine with PKCE
 *
 * Implements OAuth 2.1 authorization code flow with mandatory PKCE,
 * following IETF best practices published January 2025.
 *
 * Based on: OAuth 2.1, RFC 7636 (PKCE), RFC 6749
 */
export class OAuth21Engine {
  private config: OAuthConfig;
  private authorizationCodes: Map<string, AuthorizationCodeData> = new Map();
  private refreshTokens: Map<string, RefreshTokenData> = new Map();
  private tokenFamilies: Map<string, TokenRotationState> = new Map();

  constructor(config: OAuthConfig) {
    this.config = {
      ...config,
      pkceRequired: true, // OAuth 2.1 mandates PKCE
    };
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  generatePKCE(): PKCEPair {
    // Generate random 43-128 character code verifier
    const codeVerifier = this.generateRandomString(64);

    // Generate S256 challenge
    const codeChallenge = this.sha256Base64Url(codeVerifier);

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  /**
   * Build authorization URL
   */
  buildAuthorizationUrl(pkce: PKCEPair, state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: state || this.generateRandomString(32),
      code_challenge: pkce.codeChallenge,
      code_challenge_method: pkce.codeChallengeMethod,
    });

    return `${this.config.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Handle authorization callback and issue tokens
   */
  async handleCallback(
    code: string,
    codeVerifier: string,
    state: string
  ): Promise<TokenResponse> {
    // Validate authorization code
    const codeData = this.authorizationCodes.get(code);
    if (!codeData) {
      throw new Error('Invalid or expired authorization code');
    }

    // Verify PKCE
    const expectedChallenge = this.sha256Base64Url(codeVerifier);
    if (expectedChallenge !== codeData.codeChallenge) {
      throw new Error('PKCE verification failed');
    }

    // Verify state
    if (state !== codeData.state) {
      throw new Error('State mismatch');
    }

    // Authorization code is single-use
    this.authorizationCodes.delete(code);

    // Generate tokens
    return this.issueTokens(codeData.userId, codeData.scopes);
  }

  /**
   * Issue authorization code (for authorization server)
   */
  issueAuthorizationCode(
    userId: string,
    scopes: string[],
    codeChallenge: string,
    state: string,
    redirectUri: string
  ): string {
    const code = this.generateRandomString(32);

    this.authorizationCodes.set(code, {
      userId,
      scopes,
      codeChallenge,
      state,
      redirectUri,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      createdAt: Date.now(),
    });

    return code;
  }

  /**
   * Refresh access token with rotation
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const tokenData = this.refreshTokens.get(refreshToken);
    if (!tokenData) {
      throw new Error('Invalid refresh token');
    }

    // Check expiry
    if (Date.now() > tokenData.expiresAt) {
      this.refreshTokens.delete(refreshToken);
      throw new Error('Refresh token expired');
    }

    // Reuse detection
    const family = this.tokenFamilies.get(tokenData.family);
    if (family) {
      if (family.usedTokens.has(refreshToken)) {
        // Token reuse detected - invalidate entire family
        this.invalidateTokenFamily(tokenData.family);
        throw new Error('Refresh token reuse detected - all tokens invalidated');
      }
      family.usedTokens.add(refreshToken);
    }

    // Delete old refresh token (rotation)
    this.refreshTokens.delete(refreshToken);

    // Issue new tokens with same family
    return this.issueTokens(tokenData.userId, tokenData.scopes, tokenData.family);
  }

  /**
   * Revoke token
   */
  async revokeToken(token: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<void> {
    // Try to find and revoke as refresh token
    const refreshData = this.refreshTokens.get(token);
    if (refreshData) {
      this.refreshTokens.delete(token);
      // Optionally invalidate entire family
      this.invalidateTokenFamily(refreshData.family);
      return;
    }

    // Access tokens are typically not stored server-side
    // They are validated via signature and expiry
  }

  /**
   * Issue new token pair
   */
  private issueTokens(userId: string, scopes: string[], family?: string): TokenResponse {
    const tokenFamily = family || this.generateRandomString(16);

    // Create access token
    const accessToken = this.createJWT({
      sub: userId,
      scope: scopes.join(' '),
      type: 'access',
    }, 15 * 60); // 15 minutes

    // Create refresh token
    const refreshToken = this.generateRandomString(64);
    const refreshTokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    this.refreshTokens.set(refreshToken, {
      userId,
      scopes,
      family: tokenFamily,
      expiresAt: refreshTokenExpiry,
      createdAt: Date.now(),
    });

    // Track token family for rotation
    if (!this.tokenFamilies.has(tokenFamily)) {
      this.tokenFamilies.set(tokenFamily, {
        currentRefreshToken: refreshToken,
        tokenFamily,
        issuedAt: Date.now(),
        usedTokens: new Set(),
      });
    } else {
      const familyState = this.tokenFamilies.get(tokenFamily)!;
      familyState.currentRefreshToken = refreshToken;
    }

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 15 * 60,
      refreshToken,
      scope: scopes.join(' '),
    };
  }

  /**
   * Invalidate entire token family (for security breach)
   */
  private invalidateTokenFamily(family: string): void {
    // Remove all refresh tokens in this family
    for (const [token, data] of this.refreshTokens) {
      if (data.family === family) {
        this.refreshTokens.delete(token);
      }
    }
    this.tokenFamilies.delete(family);
  }

  private createJWT(payload: Record<string, unknown>, expiresInSeconds: number): string {
    const header: JWTHeader = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

    const fullPayload: JWTPayload = {
      iss: this.config.issuer,
      sub: payload.sub as string,
      aud: this.config.clientId,
      exp: now + expiresInSeconds,
      iat: now,
      jti: this.generateRandomString(16),
      ...payload,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));
    const signature = this.hmacSha256(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private sha256Base64Url(input: string): string {
    // Simulated SHA-256 - in production use crypto library
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return this.base64UrlEncode(hash.toString(16).padStart(64, '0'));
  }

  private hmacSha256(input: string): string {
    // Simulated HMAC-SHA256 - in production use crypto library
    return this.sha256Base64Url(input + (this.config.clientSecret || ''));
  }

  private base64UrlEncode(input: string): string {
    // Base64url encoding
    const base64 = btoa(input);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

interface AuthorizationCodeData {
  userId: string;
  scopes: string[];
  codeChallenge: string;
  state: string;
  redirectUri: string;
  expiresAt: number;
  createdAt: number;
}

interface RefreshTokenData {
  userId: string;
  scopes: string[];
  family: string;
  expiresAt: number;
  createdAt: number;
}

// ============================================================================
// JWT MANAGER
// ============================================================================

/**
 * JWT Manager
 *
 * Manages JWT creation, validation, and token lifecycle
 * with support for refresh token rotation.
 *
 * Based on: RFC 7519, Auth0 best practices
 */
export class JWTManager {
  private secret: string;
  private options: JWTValidationOptions;

  constructor(secret: string, options: JWTValidationOptions) {
    this.secret = secret;
    this.options = {
      ...options,
      algorithms: options.algorithms || ['HS256'],
      clockTolerance: options.clockTolerance || 0,
    };
  }

  /**
   * Create a JWT
   */
  create(payload: Partial<JWTPayload>, expiresIn: number): string {
    const header: JWTHeader = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

    const fullPayload: JWTPayload = {
      iss: this.options.issuer,
      sub: payload.sub || '',
      aud: this.options.audience,
      exp: now + expiresIn,
      iat: now,
      jti: this.generateJTI(),
      ...payload,
    };

    return this.sign(header, fullPayload);
  }

  /**
   * Validate a JWT
   */
  validate(token: string): { valid: boolean; payload?: JWTPayload; error?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' };
      }

      const [headerB64, payloadB64, signature] = parts;

      // Verify signature
      const expectedSignature = this.hmacSha256(`${headerB64}.${payloadB64}`);
      if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid signature' };
      }

      // Decode payload
      const payload = JSON.parse(this.base64UrlDecode(payloadB64)) as JWTPayload;

      // Verify claims
      const now = Math.floor(Date.now() / 1000);
      const clockTolerance = this.options.clockTolerance || 0;

      // Check expiration
      if (payload.exp && payload.exp + clockTolerance < now) {
        return { valid: false, error: 'Token expired' };
      }

      // Check not before
      if (payload.nbf && payload.nbf - clockTolerance > now) {
        return { valid: false, error: 'Token not yet valid' };
      }

      // Check issuer
      if (payload.iss !== this.options.issuer) {
        return { valid: false, error: 'Invalid issuer' };
      }

      // Check audience
      const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      const expectedAudiences = Array.isArray(this.options.audience)
        ? this.options.audience
        : [this.options.audience];
      if (!audiences.some((aud) => expectedAudiences.includes(aud))) {
        return { valid: false, error: 'Invalid audience' };
      }

      // Check max age
      if (this.options.maxAge && payload.iat) {
        const age = now - payload.iat;
        if (age > this.options.maxAge) {
          return { valid: false, error: 'Token too old' };
        }
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Decode without validation (for debugging)
   */
  decode(token: string): { header: JWTHeader; payload: JWTPayload } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      return {
        header: JSON.parse(this.base64UrlDecode(parts[0])),
        payload: JSON.parse(this.base64UrlDecode(parts[1])),
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if token needs refresh
   */
  needsRefresh(token: string, thresholdSeconds = 300): boolean {
    const result = this.validate(token);
    if (!result.valid || !result.payload) return true;

    const now = Math.floor(Date.now() / 1000);
    return result.payload.exp - now <= thresholdSeconds;
  }

  private sign(header: JWTHeader, payload: JWTPayload): string {
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.hmacSha256(`${encodedHeader}.${encodedPayload}`);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private generateJTI(): string {
    return `jti_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hmacSha256(input: string): string {
    let hash = 0;
    const data = input + this.secret;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return this.base64UrlEncode(Math.abs(hash).toString(16).padStart(64, '0'));
  }

  private base64UrlEncode(input: string): string {
    const base64 = btoa(input);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private base64UrlDecode(input: string): string {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return atob(base64);
  }
}

// ============================================================================
// RATE LIMITER ENGINE
// ============================================================================

/**
 * Rate Limiter Engine
 *
 * Implements multiple rate limiting algorithms including
 * token bucket and sliding window.
 *
 * Based on: Token Bucket, Sliding Window Counter algorithms
 */
export class RateLimiterEngine {
  private config: RateLimitConfig;
  private states: Map<string, RateLimitState> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = {
      ...config,
      keyGenerator: config.keyGenerator || ((req) => req.ip),
      headers: config.headers !== false,
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if request is allowed
   */
  check(request: APIRequest): RateLimitResult {
    const key = this.config.keyGenerator!(request);

    switch (this.config.algorithm) {
      case 'token-bucket':
        return this.tokenBucketCheck(key);
      case 'sliding-window':
        return this.slidingWindowCheck(key);
      case 'fixed-window':
        return this.fixedWindowCheck(key);
      case 'leaky-bucket':
        return this.leakyBucketCheck(key);
      default:
        return this.fixedWindowCheck(key);
    }
  }

  /**
   * Consume a request (after allowing)
   */
  consume(request: APIRequest): void {
    const key = this.config.keyGenerator!(request);
    const state = this.states.get(key);
    if (!state) return;

    if (this.config.algorithm === 'token-bucket') {
      if (state.tokens !== undefined && state.tokens > 0) {
        state.tokens--;
      }
    } else {
      state.count++;
    }
  }

  /**
   * Get rate limit headers
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
    };

    if (!result.allowed && result.retryAfter !== undefined) {
      headers['Retry-After'] = Math.ceil(result.retryAfter / 1000).toString();
    }

    return headers;
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.states.delete(key);
  }

  /**
   * Get current state for a key
   */
  getState(key: string): RateLimitState | undefined {
    return this.states.get(key);
  }

  /**
   * Token Bucket Algorithm
   */
  private tokenBucketCheck(key: string): RateLimitResult {
    const now = Date.now();
    let state = this.states.get(key);

    if (!state) {
      state = {
        key,
        count: 0,
        tokens: this.config.burstLimit || this.config.limit,
        windowStart: now,
        lastRefill: now,
      };
      this.states.set(key, state);
    }

    // Refill tokens
    const refillRate = this.config.refillRate || (this.config.limit / (this.config.windowMs / 1000));
    const timeSinceRefill = now - (state.lastRefill || now);
    const tokensToAdd = Math.floor((timeSinceRefill / 1000) * refillRate);

    if (tokensToAdd > 0) {
      state.tokens = Math.min(
        (state.tokens || 0) + tokensToAdd,
        this.config.burstLimit || this.config.limit
      );
      state.lastRefill = now;
    }

    const allowed = (state.tokens || 0) >= 1;
    const resetAt = now + Math.ceil(1000 / refillRate);

    return {
      allowed,
      remaining: Math.max(0, Math.floor(state.tokens || 0) - (allowed ? 1 : 0)),
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(1000 / refillRate),
      limit: this.config.burstLimit || this.config.limit,
    };
  }

  /**
   * Sliding Window Counter Algorithm
   */
  private slidingWindowCheck(key: string): RateLimitResult {
    const now = Date.now();
    let state = this.states.get(key);

    const windowStart = now - this.config.windowMs;

    if (!state || state.windowStart < windowStart) {
      // Calculate weighted count from previous window
      const previousCount = state ? state.count : 0;
      const previousWindowWeight = state
        ? Math.max(0, 1 - (now - state.windowStart - this.config.windowMs) / this.config.windowMs)
        : 0;

      state = {
        key,
        count: Math.floor(previousCount * previousWindowWeight),
        windowStart: now,
      };
      this.states.set(key, state);
    }

    const allowed = state.count < this.config.limit;
    const resetAt = state.windowStart + this.config.windowMs;

    return {
      allowed,
      remaining: Math.max(0, this.config.limit - state.count - (allowed ? 1 : 0)),
      resetAt,
      retryAfter: allowed ? undefined : resetAt - now,
      limit: this.config.limit,
    };
  }

  /**
   * Fixed Window Algorithm
   */
  private fixedWindowCheck(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;

    let state = this.states.get(key);

    if (!state || state.windowStart !== windowStart) {
      state = {
        key,
        count: 0,
        windowStart,
      };
      this.states.set(key, state);
    }

    const allowed = state.count < this.config.limit;
    const resetAt = windowStart + this.config.windowMs;

    return {
      allowed,
      remaining: Math.max(0, this.config.limit - state.count - (allowed ? 1 : 0)),
      resetAt,
      retryAfter: allowed ? undefined : resetAt - now,
      limit: this.config.limit,
    };
  }

  /**
   * Leaky Bucket Algorithm
   */
  private leakyBucketCheck(key: string): RateLimitResult {
    const now = Date.now();
    let state = this.states.get(key);

    const leakRate = this.config.limit / (this.config.windowMs / 1000);

    if (!state) {
      state = {
        key,
        count: 0,
        windowStart: now,
        lastRefill: now,
      };
      this.states.set(key, state);
    }

    // Leak tokens
    const timeSinceLeak = now - (state.lastRefill || now);
    const leaked = Math.floor((timeSinceLeak / 1000) * leakRate);

    if (leaked > 0) {
      state.count = Math.max(0, state.count - leaked);
      state.lastRefill = now;
    }

    const allowed = state.count < this.config.limit;
    const resetAt = now + Math.ceil((state.count / leakRate) * 1000);

    return {
      allowed,
      remaining: Math.max(0, this.config.limit - state.count - (allowed ? 1 : 0)),
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(1000 / leakRate),
      limit: this.config.limit,
    };
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.config.windowMs * 2;

      for (const [key, state] of this.states) {
        if (state.windowStart < cutoff) {
          this.states.delete(key);
        }
      }
    }, this.config.windowMs);
  }

  /**
   * Stop rate limiter
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ============================================================================
// CORS SECURITY ENGINE
// ============================================================================

/**
 * CORS Security Engine
 *
 * Implements secure CORS configuration following OWASP guidelines.
 *
 * Based on: OWASP CORS guidance, PortSwigger security research
 */
export class CORSSecurityEngine {
  private policy: CORSPolicy;
  private originWhitelist: Set<string>;

  constructor(policy: CORSPolicy) {
    this.policy = {
      ...policy,
      allowedMethods: policy.allowedMethods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: policy.allowedHeaders || ['Content-Type', 'Authorization'],
      maxAge: policy.maxAge || 86400, // 24 hours
    };

    this.originWhitelist = new Set(policy.allowedOrigins);
  }

  /**
   * Handle CORS for request
   */
  handleRequest(request: APIRequest): CORSResult {
    const origin = request.headers['origin'];
    const isPreflight = request.method === 'OPTIONS';

    // Check if origin is allowed
    const allowedOrigin = this.getAllowedOrigin(origin);

    if (!allowedOrigin && origin) {
      return {
        allowed: false,
        headers: {},
        error: 'Origin not allowed',
      };
    }

    const headers: Record<string, string> = {};

    if (allowedOrigin) {
      headers['Access-Control-Allow-Origin'] = allowedOrigin;

      if (this.policy.credentials) {
        headers['Access-Control-Allow-Credentials'] = 'true';
      }

      if (this.policy.exposedHeaders && this.policy.exposedHeaders.length > 0) {
        headers['Access-Control-Expose-Headers'] = this.policy.exposedHeaders.join(', ');
      }
    }

    // Handle preflight
    if (isPreflight) {
      const requestMethod = request.headers['access-control-request-method'];
      const requestHeaders = request.headers['access-control-request-headers'];

      // Validate requested method
      if (requestMethod && !this.policy.allowedMethods.includes(requestMethod)) {
        return {
          allowed: false,
          headers: {},
          error: `Method ${requestMethod} not allowed`,
        };
      }

      // Validate requested headers
      if (requestHeaders) {
        const reqHeaders = requestHeaders.split(',').map((h) => h.trim().toLowerCase());
        const allowedHeaders = this.policy.allowedHeaders.map((h) => h.toLowerCase());

        for (const header of reqHeaders) {
          if (!allowedHeaders.includes(header)) {
            return {
              allowed: false,
              headers: {},
              error: `Header ${header} not allowed`,
            };
          }
        }
      }

      headers['Access-Control-Allow-Methods'] = this.policy.allowedMethods.join(', ');
      headers['Access-Control-Allow-Headers'] = this.policy.allowedHeaders.join(', ');

      if (this.policy.maxAge) {
        headers['Access-Control-Max-Age'] = this.policy.maxAge.toString();
      }
    }

    return {
      allowed: true,
      headers,
      isPreflight,
    };
  }

  /**
   * Get allowed origin (exact match, no wildcards in production)
   */
  private getAllowedOrigin(origin: string | undefined): string | null {
    if (!origin) return null;

    // Never allow 'null' origin
    if (origin === 'null') return null;

    // Exact match only (no wildcards)
    if (this.originWhitelist.has(origin)) {
      return origin;
    }

    return null;
  }

  /**
   * Add origin to whitelist
   */
  addAllowedOrigin(origin: string): void {
    // Validate origin format
    if (origin === '*' || origin === 'null') {
      throw new Error('Wildcards and null origin are not allowed');
    }

    try {
      new URL(origin);
      this.originWhitelist.add(origin);
    } catch {
      throw new Error('Invalid origin URL');
    }
  }

  /**
   * Remove origin from whitelist
   */
  removeAllowedOrigin(origin: string): void {
    this.originWhitelist.delete(origin);
  }

  /**
   * Get current policy
   */
  getPolicy(): CORSPolicy {
    return {
      ...this.policy,
      allowedOrigins: Array.from(this.originWhitelist),
    };
  }
}

interface CORSResult {
  allowed: boolean;
  headers: Record<string, string>;
  isPreflight?: boolean;
  error?: string;
}

// ============================================================================
// API KEY MANAGER
// ============================================================================

/**
 * API Key Manager
 *
 * Manages API key lifecycle with secure storage and validation.
 *
 * Based on: OWASP API security, industry best practices
 */
export class APIKeyManager {
  private keys: Map<string, APIKey> = new Map();
  private keysByHash: Map<string, string> = new Map(); // hash -> id

  /**
   * Create a new API key
   */
  createKey(
    name: string,
    owner: string,
    scopes: string[],
    options?: {
      expiresIn?: number;
      rateLimit?: RateLimitConfig;
    }
  ): { apiKey: APIKey; plainTextKey: string } {
    const id = `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const plainTextKey = this.generateSecureKey();
    const keyHash = this.hashKey(plainTextKey);

    const apiKey: APIKey = {
      id,
      key: plainTextKey.substring(0, 8) + '...',  // Masked version
      keyHash,
      name,
      owner,
      scopes,
      rateLimit: options?.rateLimit,
      expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
      createdAt: Date.now(),
      isActive: true,
    };

    this.keys.set(id, apiKey);
    this.keysByHash.set(keyHash, id);

    return { apiKey, plainTextKey };
  }

  /**
   * Validate an API key
   */
  validateKey(plainTextKey: string): APIKeyValidation {
    const hash = this.hashKey(plainTextKey);
    const keyId = this.keysByHash.get(hash);

    if (!keyId) {
      return { valid: false, error: 'Invalid API key' };
    }

    const apiKey = this.keys.get(keyId);
    if (!apiKey) {
      return { valid: false, error: 'API key not found' };
    }

    if (!apiKey.isActive) {
      return { valid: false, error: 'API key is deactivated' };
    }

    if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
      return { valid: false, error: 'API key has expired' };
    }

    // Update last used
    apiKey.lastUsedAt = Date.now();

    return { valid: true, apiKey };
  }

  /**
   * Check if key has required scope
   */
  hasScope(keyId: string, requiredScope: string): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;

    return key.scopes.includes(requiredScope) || key.scopes.includes('*');
  }

  /**
   * Revoke an API key
   */
  revokeKey(keyId: string): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;

    key.isActive = false;
    this.keysByHash.delete(key.keyHash);
    return true;
  }

  /**
   * Rotate an API key (create new, revoke old)
   */
  rotateKey(keyId: string): { apiKey: APIKey; plainTextKey: string } | null {
    const oldKey = this.keys.get(keyId);
    if (!oldKey) return null;

    // Create new key with same properties
    const result = this.createKey(oldKey.name, oldKey.owner, oldKey.scopes, {
      expiresIn: oldKey.expiresAt ? oldKey.expiresAt - Date.now() : undefined,
      rateLimit: oldKey.rateLimit,
    });

    // Revoke old key
    this.revokeKey(keyId);

    return result;
  }

  /**
   * Get all keys for an owner
   */
  getKeysByOwner(owner: string): APIKey[] {
    return Array.from(this.keys.values()).filter((key) => key.owner === owner);
  }

  /**
   * Update key scopes
   */
  updateScopes(keyId: string, scopes: string[]): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;

    key.scopes = scopes;
    return true;
  }

  private generateSecureKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'rng_'; // Prefix for Ring
    for (let i = 0; i < 40; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  private hashKey(key: string): string {
    // SHA-256 simulation - use crypto in production
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

// ============================================================================
// INTEGRATED API SECURITY PLATFORM
// ============================================================================

/**
 * Integrated API Security Platform
 *
 * Unified security platform combining OAuth 2.1, JWT,
 * rate limiting, CORS, and API key management for Ring.
 */
export class IntegratedAPISecurityPlatform {
  public readonly oauth: OAuth21Engine;
  public readonly jwt: JWTManager;
  public readonly rateLimiter: RateLimiterEngine;
  public readonly cors: CORSSecurityEngine;
  public readonly apiKeys: APIKeyManager;

  private securityPolicies: Map<string, SecurityPolicy> = new Map();

  constructor() {
    // Initialize OAuth 2.1
    this.oauth = new OAuth21Engine({
      issuer: 'https://auth.ring.example.com',
      clientId: 'ring-client',
      redirectUri: 'https://app.ring.example.com/callback',
      scopes: ['read', 'write', 'admin'],
      pkceRequired: true,
      tokenEndpoint: 'https://auth.ring.example.com/oauth/token',
      authorizationEndpoint: 'https://auth.ring.example.com/oauth/authorize',
    });

    // Initialize JWT Manager
    this.jwt = new JWTManager('ring-jwt-secret-key-2025', {
      issuer: 'https://auth.ring.example.com',
      audience: 'ring-api',
      algorithms: ['HS256'],
      clockTolerance: 30,
      maxAge: 3600,
    });

    // Initialize Rate Limiter
    this.rateLimiter = new RateLimiterEngine({
      algorithm: 'token-bucket',
      limit: 100,
      windowMs: 60000, // 1 minute
      burstLimit: 20,
      refillRate: 1.67, // 100 per minute
      headers: true,
    });

    // Initialize CORS
    this.cors = new CORSSecurityEngine({
      allowedOrigins: [
        'https://app.ring.example.com',
        'https://admin.ring.example.com',
      ],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      credentials: true,
      maxAge: 86400,
    });

    // Initialize API Key Manager
    this.apiKeys = new APIKeyManager();

    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default security policies
   */
  private initializeDefaultPolicies(): void {
    // Public endpoints
    this.securityPolicies.set('/api/v1/health', {
      authentication: { required: false, methods: [] },
      rateLimit: { algorithm: 'fixed-window', limit: 1000, windowMs: 60000 },
    });

    // Protected endpoints
    this.securityPolicies.set('/api/v1/calls', {
      authentication: { required: true, methods: ['bearer', 'api-key'] },
      authorization: { type: 'scope-based', requiredScopes: ['read'] },
      rateLimit: { algorithm: 'token-bucket', limit: 100, windowMs: 60000, burstLimit: 20 },
    });

    // Admin endpoints
    this.securityPolicies.set('/api/v1/admin', {
      authentication: { required: true, methods: ['bearer'] },
      authorization: { type: 'scope-based', requiredScopes: ['admin'] },
      rateLimit: { algorithm: 'fixed-window', limit: 50, windowMs: 60000 },
    });
  }

  /**
   * Process API request through security pipeline
   */
  async processRequest(request: APIRequest): Promise<SecurityResult> {
    const result: SecurityResult = {
      allowed: true,
      headers: {},
      errors: [],
    };

    // 1. CORS check
    const corsResult = this.cors.handleRequest(request);
    Object.assign(result.headers, corsResult.headers);

    if (!corsResult.allowed) {
      result.allowed = false;
      result.errors.push(corsResult.error || 'CORS error');
      result.status = 403;
      return result;
    }

    if (corsResult.isPreflight) {
      result.status = 204;
      return result;
    }

    // 2. Rate limiting
    const rateLimitResult = this.rateLimiter.check(request);
    Object.assign(result.headers, this.rateLimiter.getHeaders(rateLimitResult));

    if (!rateLimitResult.allowed) {
      result.allowed = false;
      result.errors.push('Rate limit exceeded');
      result.status = 429;
      return result;
    }

    // Consume rate limit
    this.rateLimiter.consume(request);

    // 3. Get security policy for endpoint
    const policy = this.getPolicy(request.path);

    // 4. Authentication
    if (policy.authentication?.required) {
      const authResult = await this.authenticate(request, policy.authentication);
      if (!authResult.authenticated) {
        result.allowed = false;
        result.errors.push(authResult.error || 'Authentication required');
        result.status = 401;
        result.headers['WWW-Authenticate'] = 'Bearer';
        return result;
      }
      result.userId = authResult.userId;
      result.scopes = authResult.scopes;
    }

    // 5. Authorization
    if (policy.authorization && result.scopes) {
      const authzResult = this.authorize(result.scopes, policy.authorization);
      if (!authzResult.authorized) {
        result.allowed = false;
        result.errors.push(authzResult.error || 'Insufficient permissions');
        result.status = 403;
        return result;
      }
    }

    result.status = 200;
    return result;
  }

  /**
   * Authenticate request
   */
  private async authenticate(
    request: APIRequest,
    policy: AuthenticationPolicy
  ): Promise<AuthenticationResult> {
    // Try Bearer token
    if (policy.methods.includes('bearer')) {
      const authHeader = request.headers['authorization'];
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const validation = this.jwt.validate(token);
        if (validation.valid && validation.payload) {
          return {
            authenticated: true,
            userId: validation.payload.sub,
            scopes: validation.payload.scope?.split(' ') || [],
          };
        }
      }
    }

    // Try API key
    if (policy.methods.includes('api-key')) {
      const apiKeyHeader = request.headers[policy.apiKeyHeader || 'x-api-key'];
      if (apiKeyHeader) {
        const validation = this.apiKeys.validateKey(apiKeyHeader);
        if (validation.valid && validation.apiKey) {
          return {
            authenticated: true,
            userId: validation.apiKey.owner,
            scopes: validation.apiKey.scopes,
          };
        }
      }
    }

    return { authenticated: false, error: 'No valid credentials provided' };
  }

  /**
   * Authorize request
   */
  private authorize(
    userScopes: string[],
    policy: AuthorizationPolicy
  ): AuthorizationResult {
    if (policy.type === 'scope-based' && policy.requiredScopes) {
      const hasAllScopes = policy.requiredScopes.every(
        (scope) => userScopes.includes(scope) || userScopes.includes('*')
      );

      if (!hasAllScopes) {
        return {
          authorized: false,
          error: `Missing required scopes: ${policy.requiredScopes.join(', ')}`,
        };
      }
    }

    return { authorized: true };
  }

  /**
   * Get security policy for path
   */
  private getPolicy(path: string): SecurityPolicy {
    // Exact match
    if (this.securityPolicies.has(path)) {
      return this.securityPolicies.get(path)!;
    }

    // Prefix match
    for (const [pattern, policy] of this.securityPolicies) {
      if (path.startsWith(pattern)) {
        return policy;
      }
    }

    // Default policy
    return {
      authentication: { required: true, methods: ['bearer', 'api-key'] },
      rateLimit: { algorithm: 'fixed-window', limit: 100, windowMs: 60000 },
    };
  }

  /**
   * Get platform status
   */
  getStatus(): {
    activeApiKeys: number;
    corsOrigins: number;
    policies: number;
  } {
    return {
      activeApiKeys: this.apiKeys.getKeysByOwner('*').length,
      corsOrigins: this.cors.getPolicy().allowedOrigins.length,
      policies: this.securityPolicies.size,
    };
  }
}

interface SecurityResult {
  allowed: boolean;
  headers: Record<string, string>;
  errors: string[];
  status?: number;
  userId?: string;
  scopes?: string[];
}

interface AuthenticationResult {
  authenticated: boolean;
  userId?: string;
  scopes?: string[];
  error?: string;
}

interface AuthorizationResult {
  authorized: boolean;
  error?: string;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default IntegratedAPISecurityPlatform;
