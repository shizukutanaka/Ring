/**
 * Phase 111: Cross-Platform Identity Verification
 *
 * Competitive Differentiation:
 * - vs Truecaller: Unified identity across ALL platforms
 * - vs Hiya: Social graph verification, not just database lookup
 * - vs RoboKiller: Cross-platform reputation follows callers
 *
 * Key Features:
 * - Unified identity across phone, WhatsApp, Telegram, etc.
 * - Social graph analysis for trust scoring
 * - Cross-platform spam reputation sharing
 * - Decentralized identity verification (Phase 67 blockchain)
 * - Multi-factor identity confidence scoring
 *
 * Research Sources:
 * - Decentralized Identity Foundation (DIF) standards
 * - W3C Verifiable Credentials (2024)
 * - Self-Sovereign Identity (SSI) patterns
 * - Graph-based trust algorithms (PageRank, TrustRank)
 * - Meta Business Messaging API
 * - Telegram Bot API
 *
 * @module Phase111_Cross_Platform_Identity
 * @version 1.0.0
 * @since December 2025
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface UnifiedIdentity {
  identityId: string;
  primaryPhone: string;
  linkedIdentifiers: LinkedIdentifier[];
  displayName?: string;
  verifiedName?: string;
  organizationName?: string;
  profilePicture?: string;
  reputationScore: ReputationScore;
  trustLevel: TrustLevel;
  verificationStatus: VerificationStatus;
  socialGraph: SocialGraphNode;
  lastSeen: number;
  createdAt: number;
  updatedAt: number;
}

export interface LinkedIdentifier {
  platform: Platform;
  identifier: string;
  username?: string;
  displayName?: string;
  verified: boolean;
  linkedAt: number;
  lastActive: number;
  platformReputation?: number;
}

export type Platform =
  | 'phone'
  | 'whatsapp'
  | 'telegram'
  | 'signal'
  | 'viber'
  | 'line'
  | 'wechat'
  | 'facebook_messenger'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'email';

export interface ReputationScore {
  overall: number; // 0-100
  components: {
    phoneReputation: number;
    socialReputation: number;
    businessReputation: number;
    communityVotes: number;
    verificationBonus: number;
  };
  confidence: number; // 0-1
  lastUpdated: number;
  history: ReputationHistoryEntry[];
}

export interface ReputationHistoryEntry {
  timestamp: number;
  score: number;
  event: string;
  delta: number;
}

export type TrustLevel = 'untrusted' | 'low' | 'medium' | 'high' | 'verified' | 'business_verified';

export interface VerificationStatus {
  isVerified: boolean;
  verificationLevel: 'none' | 'email' | 'phone' | 'id_document' | 'business' | 'government';
  verificationMethod?: string;
  verifiedAt?: number;
  expiresAt?: number;
  verifierOrganization?: string;
}

export interface SocialGraphNode {
  identityId: string;
  connections: SocialConnection[];
  clusterMembership: string[];
  pageRank: number;
  trustRank: number;
  betweennessCentrality: number;
  isHub: boolean;
}

export interface SocialConnection {
  targetIdentityId: string;
  relationshipType: 'contact' | 'mutual_contact' | 'business_contact' | 'blocked' | 'reported';
  strength: number; // 0-1
  bidirectional: boolean;
  lastInteraction: number;
  interactionCount: number;
}

export interface PlatformConnection {
  platform: Platform;
  isConnected: boolean;
  lastSync: number;
  contactsImported: number;
  spamReportsShared: number;
}

export interface CrossPlatformSpamReport {
  reportId: string;
  reporterIdentityId: string;
  targetIdentityId: string;
  targetPhone: string;
  platforms: Platform[];
  spamType: string;
  evidence: SpamEvidence[];
  verifiedByBlockchain: boolean;
  blockchainProof?: string;
  reportedAt: number;
  communityVotes: { up: number; down: number };
}

export interface SpamEvidence {
  type: 'screenshot' | 'audio' | 'transcript' | 'metadata' | 'pattern';
  hash: string;
  platform: Platform;
  timestamp: number;
}

export interface IdentityLookupResult {
  identity: UnifiedIdentity | null;
  matchConfidence: number;
  sources: IdentitySource[];
  warnings: IdentityWarning[];
  recommendations: IdentityRecommendation[];
}

export interface IdentitySource {
  platform: Platform;
  dataType: string;
  confidence: number;
  lastUpdated: number;
}

export interface IdentityWarning {
  type: 'spam_history' | 'impersonation_risk' | 'new_identity' | 'reputation_drop' | 'unverified';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface IdentityRecommendation {
  action: 'allow' | 'screen' | 'block' | 'verify';
  reason: string;
  confidence: number;
}

// ============================================================================
// Identity Graph Engine
// ============================================================================

/**
 * Identity Graph Engine
 *
 * Builds and maintains social graph for identity verification.
 * Uses graph algorithms for trust propagation:
 * - PageRank for influence scoring
 * - TrustRank for spam-resistance
 * - Community detection for cluster analysis
 *
 * Research: Google PageRank, Stanford TrustRank, Louvain algorithm
 */
export class IdentityGraphEngine {
  private identities: Map<string, UnifiedIdentity>;
  private phoneIndex: Map<string, string>; // phone -> identityId
  private platformIndex: Map<string, Map<string, string>>; // platform -> identifier -> identityId

  constructor() {
    this.identities = new Map();
    this.phoneIndex = new Map();
    this.platformIndex = new Map();

    // Initialize platform indices
    const platforms: Platform[] = [
      'phone', 'whatsapp', 'telegram', 'signal', 'viber',
      'line', 'wechat', 'facebook_messenger', 'email'
    ];
    for (const platform of platforms) {
      this.platformIndex.set(platform, new Map());
    }
  }

  /**
   * Create or update unified identity
   */
  upsertIdentity(identity: Partial<UnifiedIdentity> & { primaryPhone: string }): UnifiedIdentity {
    const existingId = this.phoneIndex.get(this.normalizePhone(identity.primaryPhone));

    if (existingId) {
      const existing = this.identities.get(existingId)!;
      const updated: UnifiedIdentity = {
        ...existing,
        ...identity,
        identityId: existingId,
        updatedAt: Date.now()
      };
      this.identities.set(existingId, updated);
      return updated;
    }

    // Create new identity
    const newIdentity: UnifiedIdentity = {
      identityId: this.generateIdentityId(),
      primaryPhone: identity.primaryPhone,
      linkedIdentifiers: identity.linkedIdentifiers || [],
      displayName: identity.displayName,
      reputationScore: identity.reputationScore || this.createDefaultReputation(),
      trustLevel: identity.trustLevel || 'untrusted',
      verificationStatus: identity.verificationStatus || {
        isVerified: false,
        verificationLevel: 'none'
      },
      socialGraph: identity.socialGraph || this.createDefaultSocialGraph(),
      lastSeen: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.identities.set(newIdentity.identityId, newIdentity);
    this.phoneIndex.set(this.normalizePhone(identity.primaryPhone), newIdentity.identityId);

    // Index linked identifiers
    for (const linked of newIdentity.linkedIdentifiers) {
      this.indexLinkedIdentifier(newIdentity.identityId, linked);
    }

    return newIdentity;
  }

  /**
   * Link new identifier to existing identity
   */
  linkIdentifier(identityId: string, linked: LinkedIdentifier): boolean {
    const identity = this.identities.get(identityId);
    if (!identity) return false;

    // Check if already linked
    const existing = identity.linkedIdentifiers.find(
      l => l.platform === linked.platform && l.identifier === linked.identifier
    );

    if (existing) {
      // Update existing
      Object.assign(existing, linked);
    } else {
      identity.linkedIdentifiers.push(linked);
    }

    this.indexLinkedIdentifier(identityId, linked);
    identity.updatedAt = Date.now();

    return true;
  }

  private indexLinkedIdentifier(identityId: string, linked: LinkedIdentifier): void {
    const platformMap = this.platformIndex.get(linked.platform);
    if (platformMap) {
      platformMap.set(linked.identifier, identityId);
    }
  }

  /**
   * Look up identity by phone number
   */
  lookupByPhone(phoneNumber: string): UnifiedIdentity | null {
    const normalized = this.normalizePhone(phoneNumber);
    const identityId = this.phoneIndex.get(normalized);
    return identityId ? this.identities.get(identityId) || null : null;
  }

  /**
   * Look up identity by platform identifier
   */
  lookupByPlatform(platform: Platform, identifier: string): UnifiedIdentity | null {
    const platformMap = this.platformIndex.get(platform);
    if (!platformMap) return null;

    const identityId = platformMap.get(identifier);
    return identityId ? this.identities.get(identityId) || null : null;
  }

  /**
   * Add social connection between identities
   */
  addConnection(
    fromIdentityId: string,
    toIdentityId: string,
    connection: Omit<SocialConnection, 'targetIdentityId'>
  ): void {
    const fromIdentity = this.identities.get(fromIdentityId);
    const toIdentity = this.identities.get(toIdentityId);

    if (!fromIdentity || !toIdentity) return;

    // Add forward connection
    fromIdentity.socialGraph.connections.push({
      ...connection,
      targetIdentityId: toIdentityId
    });

    // Add reverse connection if bidirectional
    if (connection.bidirectional) {
      toIdentity.socialGraph.connections.push({
        ...connection,
        targetIdentityId: fromIdentityId
      });
    }

    // Recalculate graph metrics
    this.recalculateGraphMetrics(fromIdentityId);
    this.recalculateGraphMetrics(toIdentityId);
  }

  /**
   * Calculate PageRank for identity influence
   */
  calculatePageRank(iterations: number = 20, dampingFactor: number = 0.85): void {
    const n = this.identities.size;
    if (n === 0) return;

    // Initialize ranks
    const ranks = new Map<string, number>();
    for (const id of this.identities.keys()) {
      ranks.set(id, 1 / n);
    }

    // Iterate
    for (let i = 0; i < iterations; i++) {
      const newRanks = new Map<string, number>();

      for (const [id, identity] of this.identities) {
        let rank = (1 - dampingFactor) / n;

        // Sum contributions from incoming connections
        for (const [otherId, otherIdentity] of this.identities) {
          if (otherId === id) continue;

          const outgoing = otherIdentity.socialGraph.connections.filter(
            c => c.targetIdentityId === id && c.relationshipType !== 'blocked'
          );

          if (outgoing.length > 0) {
            const otherRank = ranks.get(otherId) || 0;
            const otherOutDegree = otherIdentity.socialGraph.connections.length || 1;
            rank += dampingFactor * (otherRank / otherOutDegree);
          }
        }

        newRanks.set(id, rank);
      }

      // Update ranks
      for (const [id, rank] of newRanks) {
        ranks.set(id, rank);
      }
    }

    // Apply to identities
    for (const [id, rank] of ranks) {
      const identity = this.identities.get(id);
      if (identity) {
        identity.socialGraph.pageRank = rank;
      }
    }
  }

  /**
   * Calculate TrustRank (anti-spam PageRank variant)
   */
  calculateTrustRank(trustedSeeds: string[], iterations: number = 20): void {
    const n = this.identities.size;
    if (n === 0) return;

    // Initialize trust scores
    const trust = new Map<string, number>();
    const seedScore = 1 / trustedSeeds.length;

    for (const id of this.identities.keys()) {
      trust.set(id, trustedSeeds.includes(id) ? seedScore : 0);
    }

    const dampingFactor = 0.85;

    // Iterate
    for (let i = 0; i < iterations; i++) {
      const newTrust = new Map<string, number>();

      for (const [id, identity] of this.identities) {
        let trustScore = trustedSeeds.includes(id)
          ? (1 - dampingFactor) * seedScore
          : 0;

        // Propagate trust from connected identities
        for (const conn of identity.socialGraph.connections) {
          if (conn.relationshipType === 'blocked' || conn.relationshipType === 'reported') {
            continue;
          }

          const sourceTrust = trust.get(conn.targetIdentityId) || 0;
          const sourceIdentity = this.identities.get(conn.targetIdentityId);

          if (sourceIdentity) {
            const outDegree = sourceIdentity.socialGraph.connections.filter(
              c => c.relationshipType !== 'blocked'
            ).length || 1;

            trustScore += dampingFactor * (sourceTrust / outDegree) * conn.strength;
          }
        }

        newTrust.set(id, trustScore);
      }

      // Update trust
      for (const [id, t] of newTrust) {
        trust.set(id, t);
      }
    }

    // Apply to identities
    for (const [id, t] of trust) {
      const identity = this.identities.get(id);
      if (identity) {
        identity.socialGraph.trustRank = t;
      }
    }
  }

  private recalculateGraphMetrics(identityId: string): void {
    const identity = this.identities.get(identityId);
    if (!identity) return;

    // Calculate betweenness centrality (simplified)
    const connections = identity.socialGraph.connections;
    const uniqueConnections = new Set(connections.map(c => c.targetIdentityId));

    // Simple centrality based on unique connections
    identity.socialGraph.betweennessCentrality = uniqueConnections.size / this.identities.size;

    // Determine if hub (many connections)
    identity.socialGraph.isHub = connections.length > 50;
  }

  private createDefaultReputation(): ReputationScore {
    return {
      overall: 50,
      components: {
        phoneReputation: 50,
        socialReputation: 50,
        businessReputation: 50,
        communityVotes: 0,
        verificationBonus: 0
      },
      confidence: 0.1,
      lastUpdated: Date.now(),
      history: []
    };
  }

  private createDefaultSocialGraph(): SocialGraphNode {
    return {
      identityId: '',
      connections: [],
      clusterMembership: [],
      pageRank: 0,
      trustRank: 0,
      betweennessCentrality: 0,
      isHub: false
    };
  }

  private generateIdentityId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  getIdentityCount(): number {
    return this.identities.size;
  }

  getAllIdentities(): UnifiedIdentity[] {
    return Array.from(this.identities.values());
  }
}

// ============================================================================
// Reputation Aggregator
// ============================================================================

/**
 * Reputation Aggregator
 *
 * Combines reputation signals from multiple sources:
 * - Phone call history
 * - Social platform activity
 * - Business verification status
 * - Community votes and reports
 *
 * Research: eBay feedback system, Uber ratings, Trust algorithms
 */
export class ReputationAggregator {
  private readonly DECAY_HALF_LIFE_DAYS = 90;
  private readonly MAX_HISTORY_ENTRIES = 100;

  /**
   * Calculate combined reputation score
   */
  calculateReputation(
    identity: UnifiedIdentity,
    signals: {
      phoneSpamReports: number;
      phoneCallsAnswered: number;
      socialFollowers: number;
      socialVerified: boolean;
      businessVerified: boolean;
      communityUpvotes: number;
      communityDownvotes: number;
      ageInDays: number;
    }
  ): ReputationScore {
    const components = {
      phoneReputation: this.calculatePhoneReputation(signals),
      socialReputation: this.calculateSocialReputation(signals),
      businessReputation: this.calculateBusinessReputation(signals),
      communityVotes: this.calculateCommunityScore(signals),
      verificationBonus: this.calculateVerificationBonus(identity)
    };

    // Weighted combination
    const weights = {
      phoneReputation: 0.35,
      socialReputation: 0.25,
      businessReputation: 0.15,
      communityVotes: 0.15,
      verificationBonus: 0.10
    };

    let overall = 0;
    for (const [key, weight] of Object.entries(weights)) {
      overall += components[key as keyof typeof components] * weight;
    }

    // Apply time decay to old scores
    const decayFactor = this.calculateDecayFactor(signals.ageInDays);
    const confidence = Math.min(1, signals.ageInDays / 30) * decayFactor;

    // Add to history
    const history: ReputationHistoryEntry[] = [
      ...identity.reputationScore.history.slice(-this.MAX_HISTORY_ENTRIES + 1),
      {
        timestamp: Date.now(),
        score: overall,
        event: 'recalculation',
        delta: overall - identity.reputationScore.overall
      }
    ];

    return {
      overall: Math.round(overall * 100) / 100,
      components,
      confidence,
      lastUpdated: Date.now(),
      history
    };
  }

  private calculatePhoneReputation(signals: {
    phoneSpamReports: number;
    phoneCallsAnswered: number;
  }): number {
    // Start at 50, adjust based on reports vs answered
    let score = 50;

    // Penalize spam reports heavily
    score -= Math.min(40, signals.phoneSpamReports * 5);

    // Reward answered calls
    score += Math.min(30, signals.phoneCallsAnswered * 0.5);

    return Math.max(0, Math.min(100, score));
  }

  private calculateSocialReputation(signals: {
    socialFollowers: number;
    socialVerified: boolean;
  }): number {
    let score = 40;

    // Follower count (logarithmic)
    score += Math.min(30, Math.log10(signals.socialFollowers + 1) * 10);

    // Verification bonus
    if (signals.socialVerified) {
      score += 20;
    }

    return Math.min(100, score);
  }

  private calculateBusinessReputation(signals: {
    businessVerified: boolean;
  }): number {
    return signals.businessVerified ? 80 : 50;
  }

  private calculateCommunityScore(signals: {
    communityUpvotes: number;
    communityDownvotes: number;
  }): number {
    const total = signals.communityUpvotes + signals.communityDownvotes;
    if (total === 0) return 50;

    // Wilson score interval for binomial proportion
    const pos = signals.communityUpvotes;
    const n = total;
    const z = 1.96; // 95% confidence

    const phat = pos / n;
    const score = (phat + z * z / (2 * n) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * n)) / n)) /
      (1 + z * z / n);

    return score * 100;
  }

  private calculateVerificationBonus(identity: UnifiedIdentity): number {
    switch (identity.verificationStatus.verificationLevel) {
      case 'government': return 100;
      case 'business': return 80;
      case 'id_document': return 60;
      case 'phone': return 40;
      case 'email': return 20;
      default: return 0;
    }
  }

  private calculateDecayFactor(ageInDays: number): number {
    // Exponential decay
    return Math.pow(0.5, ageInDays / this.DECAY_HALF_LIFE_DAYS);
  }

  /**
   * Determine trust level from reputation score
   */
  determineTrustLevel(reputation: ReputationScore): TrustLevel {
    if (reputation.components.verificationBonus >= 80) return 'business_verified';
    if (reputation.components.verificationBonus >= 40) return 'verified';
    if (reputation.overall >= 75) return 'high';
    if (reputation.overall >= 50) return 'medium';
    if (reputation.overall >= 25) return 'low';
    return 'untrusted';
  }
}

// ============================================================================
// Platform Connector
// ============================================================================

/**
 * Platform Connector
 *
 * Connects to external platforms for identity verification:
 * - WhatsApp Business API
 * - Telegram Bot API
 * - Facebook Graph API
 * - LinkedIn API
 *
 * All connections are opt-in and privacy-preserving.
 */
export class PlatformConnector {
  private connections: Map<Platform, PlatformConnection>;
  private apiKeys: Map<Platform, string>;

  constructor() {
    this.connections = new Map();
    this.apiKeys = new Map();

    // Initialize connection states
    const platforms: Platform[] = ['whatsapp', 'telegram', 'facebook_messenger', 'linkedin'];
    for (const platform of platforms) {
      this.connections.set(platform, {
        platform,
        isConnected: false,
        lastSync: 0,
        contactsImported: 0,
        spamReportsShared: 0
      });
    }
  }

  /**
   * Configure platform API key
   */
  configureApi(platform: Platform, apiKey: string): void {
    this.apiKeys.set(platform, apiKey);
  }

  /**
   * Connect to platform
   */
  async connect(platform: Platform, authToken: string): Promise<boolean> {
    const connection = this.connections.get(platform);
    if (!connection) return false;

    // Simulate platform authentication
    // In production, would use actual platform APIs
    await new Promise(resolve => setTimeout(resolve, 100));

    connection.isConnected = true;
    connection.lastSync = Date.now();

    return true;
  }

  /**
   * Import contacts from platform
   */
  async importContacts(platform: Platform): Promise<LinkedIdentifier[]> {
    const connection = this.connections.get(platform);
    if (!connection?.isConnected) return [];

    // Simulate contact import
    // In production, would use platform APIs
    const mockContacts: LinkedIdentifier[] = [
      {
        platform,
        identifier: `user_${Math.random().toString(36).substr(2, 8)}`,
        username: `user_${platform}`,
        displayName: 'Sample Contact',
        verified: Math.random() > 0.5,
        linkedAt: Date.now(),
        lastActive: Date.now() - Math.random() * 86400000
      }
    ];

    connection.contactsImported += mockContacts.length;
    connection.lastSync = Date.now();

    return mockContacts;
  }

  /**
   * Verify identity on platform
   */
  async verifyOnPlatform(
    platform: Platform,
    identifier: string
  ): Promise<{
    verified: boolean;
    displayName?: string;
    profilePicture?: string;
    followers?: number;
    isBusinessAccount?: boolean;
  }> {
    const connection = this.connections.get(platform);
    if (!connection?.isConnected) {
      return { verified: false };
    }

    // Simulate platform verification
    // In production, would call actual platform APIs
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      verified: true,
      displayName: `User on ${platform}`,
      followers: Math.floor(Math.random() * 10000),
      isBusinessAccount: Math.random() > 0.7
    };
  }

  /**
   * Share spam report to platform
   */
  async shareSpamReport(
    platform: Platform,
    report: CrossPlatformSpamReport
  ): Promise<boolean> {
    const connection = this.connections.get(platform);
    if (!connection?.isConnected) return false;

    // Simulate spam report sharing
    await new Promise(resolve => setTimeout(resolve, 50));

    connection.spamReportsShared++;
    return true;
  }

  getConnectionStatus(platform: Platform): PlatformConnection | undefined {
    return this.connections.get(platform);
  }

  getAllConnections(): PlatformConnection[] {
    return Array.from(this.connections.values());
  }
}

// ============================================================================
// Identity Verification Service
// ============================================================================

/**
 * Identity Verification Service
 *
 * Multi-factor identity verification combining:
 * - Phone verification (SMS/call)
 * - Email verification
 * - Social platform verification
 * - Document verification (optional)
 * - Blockchain attestation (Phase 67)
 */
export class IdentityVerificationService {
  private pendingVerifications: Map<string, {
    identityId: string;
    method: string;
    code: string;
    expiresAt: number;
    attempts: number;
  }>;

  constructor() {
    this.pendingVerifications = new Map();
  }

  /**
   * Initiate phone verification
   */
  async initiatePhoneVerification(identityId: string, phoneNumber: string): Promise<{
    verificationId: string;
    expiresIn: number;
  }> {
    const code = this.generateVerificationCode();
    const verificationId = `pv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    this.pendingVerifications.set(verificationId, {
      identityId,
      method: 'phone',
      code,
      expiresAt: Date.now() + 600000, // 10 minutes
      attempts: 0
    });

    // In production, would send SMS via Twilio/AWS SNS
    console.log(`[Demo] Verification code for ${phoneNumber}: ${code}`);

    return {
      verificationId,
      expiresIn: 600
    };
  }

  /**
   * Verify code
   */
  verifyCode(verificationId: string, code: string): {
    success: boolean;
    error?: string;
  } {
    const pending = this.pendingVerifications.get(verificationId);

    if (!pending) {
      return { success: false, error: 'Verification not found' };
    }

    if (Date.now() > pending.expiresAt) {
      this.pendingVerifications.delete(verificationId);
      return { success: false, error: 'Verification expired' };
    }

    pending.attempts++;

    if (pending.attempts > 5) {
      this.pendingVerifications.delete(verificationId);
      return { success: false, error: 'Too many attempts' };
    }

    if (pending.code !== code) {
      return { success: false, error: 'Invalid code' };
    }

    this.pendingVerifications.delete(verificationId);
    return { success: true };
  }

  /**
   * Verify via social platform OAuth
   */
  async verifySocialPlatform(
    identityId: string,
    platform: Platform,
    oauthToken: string
  ): Promise<{
    success: boolean;
    linkedIdentifier?: LinkedIdentifier;
  }> {
    // Simulate OAuth verification
    // In production, would validate token with platform
    await new Promise(resolve => setTimeout(resolve, 100));

    const linkedIdentifier: LinkedIdentifier = {
      platform,
      identifier: `oauth_${Math.random().toString(36).substr(2, 12)}`,
      username: `verified_user_${platform}`,
      displayName: `Verified ${platform} User`,
      verified: true,
      linkedAt: Date.now(),
      lastActive: Date.now()
    };

    return {
      success: true,
      linkedIdentifier
    };
  }

  /**
   * Get verification status for identity
   */
  calculateVerificationStatus(identity: UnifiedIdentity): VerificationStatus {
    const verifiedPlatforms = identity.linkedIdentifiers.filter(l => l.verified);

    if (verifiedPlatforms.some(l => l.platform === 'linkedin' && l.verified)) {
      return {
        isVerified: true,
        verificationLevel: 'business',
        verificationMethod: 'LinkedIn Business Verification',
        verifiedAt: Date.now()
      };
    }

    if (verifiedPlatforms.length >= 2) {
      return {
        isVerified: true,
        verificationLevel: 'phone',
        verificationMethod: 'Multi-platform verification',
        verifiedAt: Date.now()
      };
    }

    if (verifiedPlatforms.length === 1) {
      return {
        isVerified: true,
        verificationLevel: 'email',
        verificationMethod: `${verifiedPlatforms[0].platform} verification`,
        verifiedAt: Date.now()
      };
    }

    return {
      isVerified: false,
      verificationLevel: 'none'
    };
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

// ============================================================================
// Cross-Platform Identity Service (Main Integration)
// ============================================================================

/**
 * Cross-Platform Identity Service
 *
 * Main integration service combining:
 * - Identity graph management
 * - Reputation aggregation
 * - Platform connections
 * - Verification workflows
 * - Spam report sharing
 */
export class CrossPlatformIdentityService {
  private graphEngine: IdentityGraphEngine;
  private reputationAggregator: ReputationAggregator;
  private platformConnector: PlatformConnector;
  private verificationService: IdentityVerificationService;
  private spamReports: Map<string, CrossPlatformSpamReport>;

  constructor() {
    this.graphEngine = new IdentityGraphEngine();
    this.reputationAggregator = new ReputationAggregator();
    this.platformConnector = new PlatformConnector();
    this.verificationService = new IdentityVerificationService();
    this.spamReports = new Map();
  }

  /**
   * Look up unified identity for phone number
   */
  async lookupIdentity(phoneNumber: string): Promise<IdentityLookupResult> {
    const identity = this.graphEngine.lookupByPhone(phoneNumber);

    if (!identity) {
      return {
        identity: null,
        matchConfidence: 0,
        sources: [],
        warnings: [{
          type: 'new_identity',
          severity: 'low',
          message: 'No identity found for this number'
        }],
        recommendations: [{
          action: 'screen',
          reason: 'Unknown caller - recommend screening',
          confidence: 0.8
        }]
      };
    }

    // Gather warnings
    const warnings: IdentityWarning[] = [];

    if (identity.reputationScore.overall < 30) {
      warnings.push({
        type: 'spam_history',
        severity: 'high',
        message: 'This identity has low reputation due to spam reports'
      });
    }

    if (!identity.verificationStatus.isVerified) {
      warnings.push({
        type: 'unverified',
        severity: 'medium',
        message: 'Identity has not been verified'
      });
    }

    // Determine recommendation
    const recommendations: IdentityRecommendation[] = [];

    if (identity.trustLevel === 'verified' || identity.trustLevel === 'business_verified') {
      recommendations.push({
        action: 'allow',
        reason: 'Verified identity with high trust',
        confidence: 0.95
      });
    } else if (identity.reputationScore.overall >= 70) {
      recommendations.push({
        action: 'allow',
        reason: 'High reputation score',
        confidence: 0.8
      });
    } else if (identity.reputationScore.overall < 30) {
      recommendations.push({
        action: 'block',
        reason: 'Low reputation - likely spam',
        confidence: 0.85
      });
    } else {
      recommendations.push({
        action: 'screen',
        reason: 'Medium reputation - recommend screening',
        confidence: 0.7
      });
    }

    return {
      identity,
      matchConfidence: identity.reputationScore.confidence,
      sources: identity.linkedIdentifiers.map(l => ({
        platform: l.platform,
        dataType: 'linked_account',
        confidence: l.verified ? 0.9 : 0.5,
        lastUpdated: l.lastActive
      })),
      warnings,
      recommendations
    };
  }

  /**
   * Register new identity
   */
  registerIdentity(
    phoneNumber: string,
    options: {
      displayName?: string;
      linkedPlatforms?: { platform: Platform; identifier: string }[];
    } = {}
  ): UnifiedIdentity {
    const linkedIdentifiers: LinkedIdentifier[] = (options.linkedPlatforms || []).map(l => ({
      platform: l.platform,
      identifier: l.identifier,
      verified: false,
      linkedAt: Date.now(),
      lastActive: Date.now()
    }));

    return this.graphEngine.upsertIdentity({
      primaryPhone: phoneNumber,
      displayName: options.displayName,
      linkedIdentifiers
    });
  }

  /**
   * Submit cross-platform spam report
   */
  async submitSpamReport(
    reporterPhone: string,
    targetPhone: string,
    spamType: string,
    platforms: Platform[],
    evidence: SpamEvidence[]
  ): Promise<CrossPlatformSpamReport> {
    const reporterIdentity = this.graphEngine.lookupByPhone(reporterPhone);
    let targetIdentity = this.graphEngine.lookupByPhone(targetPhone);

    if (!targetIdentity) {
      targetIdentity = this.registerIdentity(targetPhone);
    }

    const report: CrossPlatformSpamReport = {
      reportId: `spam_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      reporterIdentityId: reporterIdentity?.identityId || 'anonymous',
      targetIdentityId: targetIdentity.identityId,
      targetPhone,
      platforms,
      spamType,
      evidence,
      verifiedByBlockchain: false,
      reportedAt: Date.now(),
      communityVotes: { up: 1, down: 0 }
    };

    this.spamReports.set(report.reportId, report);

    // Update target's reputation
    this.updateReputationAfterReport(targetIdentity);

    // Share to connected platforms
    for (const platform of platforms) {
      if (this.platformConnector.getConnectionStatus(platform)?.isConnected) {
        await this.platformConnector.shareSpamReport(platform, report);
      }
    }

    return report;
  }

  private updateReputationAfterReport(identity: UnifiedIdentity): void {
    const reports = Array.from(this.spamReports.values()).filter(
      r => r.targetIdentityId === identity.identityId
    );

    const newReputation = this.reputationAggregator.calculateReputation(identity, {
      phoneSpamReports: reports.length,
      phoneCallsAnswered: 0,
      socialFollowers: 0,
      socialVerified: identity.linkedIdentifiers.some(l => l.verified),
      businessVerified: identity.trustLevel === 'business_verified',
      communityUpvotes: reports.reduce((sum, r) => sum + r.communityVotes.up, 0),
      communityDownvotes: reports.reduce((sum, r) => sum + r.communityVotes.down, 0),
      ageInDays: (Date.now() - identity.createdAt) / 86400000
    });

    identity.reputationScore = newReputation;
    identity.trustLevel = this.reputationAggregator.determineTrustLevel(newReputation);
  }

  /**
   * Connect to external platform
   */
  async connectPlatform(platform: Platform, authToken: string): Promise<boolean> {
    return this.platformConnector.connect(platform, authToken);
  }

  /**
   * Start phone verification
   */
  async startPhoneVerification(phoneNumber: string): Promise<{
    verificationId: string;
    expiresIn: number;
  }> {
    const identity = this.graphEngine.lookupByPhone(phoneNumber);
    if (!identity) {
      throw new Error('Identity not found');
    }

    return this.verificationService.initiatePhoneVerification(
      identity.identityId,
      phoneNumber
    );
  }

  /**
   * Complete phone verification
   */
  completePhoneVerification(verificationId: string, code: string): {
    success: boolean;
    error?: string;
  } {
    return this.verificationService.verifyCode(verificationId, code);
  }

  /**
   * Get platform connections status
   */
  getPlatformConnections(): PlatformConnection[] {
    return this.platformConnector.getAllConnections();
  }

  /**
   * Recalculate graph metrics (call periodically)
   */
  recalculateGraphMetrics(): void {
    // Get verified identities as trust seeds
    const trustedSeeds = this.graphEngine.getAllIdentities()
      .filter(i => i.trustLevel === 'verified' || i.trustLevel === 'business_verified')
      .map(i => i.identityId);

    this.graphEngine.calculatePageRank();
    this.graphEngine.calculateTrustRank(trustedSeeds);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalIdentities: number;
    verifiedIdentities: number;
    connectedPlatforms: number;
    spamReports: number;
  } {
    const identities = this.graphEngine.getAllIdentities();

    return {
      totalIdentities: identities.length,
      verifiedIdentities: identities.filter(i => i.verificationStatus.isVerified).length,
      connectedPlatforms: this.platformConnector.getAllConnections()
        .filter(c => c.isConnected).length,
      spamReports: this.spamReports.size
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default CrossPlatformIdentityService;
