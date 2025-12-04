/**
 * Phase 107: Real-Time Scam Intent Prediction Engine
 *
 * Competitive Differentiator: Predictive scam detection during live calls
 * Market Gap: Existing solutions detect known scams, not novel scam attempts
 *
 * Key Features:
 * - Linguistic pattern analysis (urgency, pressure, fear tactics)
 * - Caller behavior modeling (hesitation, script deviation)
 * - Real-time intent classification (legitimate, suspicious, scam)
 * - Explainable AI with specific warning indicators
 * - Psychological manipulation detection
 *
 * Research Sources:
 * - FBI IC3 2024 Report: $12.5B losses, top scam patterns
 * - FTC Consumer Sentinel: 5.4M fraud reports, manipulation tactics
 * - Stanford Persuasion Lab: Social engineering psychology
 * - MIT CSAIL: Conversational intent detection
 *
 * Dependencies: Phase 75, 101, 102, 103, 104, 106
 *
 * @author Ring Platform Team
 * @date December 2025
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface ScamIndicator {
  type: ScamIndicatorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  evidence: string;
  timestamp: number;
}

type ScamIndicatorType =
  // Urgency tactics
  | 'artificial_urgency'
  | 'limited_time_offer'
  | 'immediate_action_required'
  // Fear tactics
  | 'threat_of_arrest'
  | 'threat_of_account_closure'
  | 'legal_action_threat'
  | 'irs_impersonation'
  // Authority impersonation
  | 'government_impersonation'
  | 'bank_impersonation'
  | 'tech_support_impersonation'
  | 'utility_impersonation'
  // Information extraction
  | 'ssn_request'
  | 'bank_account_request'
  | 'credit_card_request'
  | 'password_request'
  | 'pin_request'
  | 'verification_code_request'
  // Payment manipulation
  | 'gift_card_payment'
  | 'wire_transfer_request'
  | 'cryptocurrency_payment'
  | 'untraceable_payment'
  // Psychological manipulation
  | 'isolation_attempt'
  | 'secrecy_demand'
  | 'trust_building_rush'
  | 'authority_assertion'
  // Behavioral red flags
  | 'script_reading'
  | 'caller_id_spoofing_mention'
  | 'callback_number_different'
  | 'refusal_to_provide_info';

interface CallerBehavior {
  hesitationFrequency: number; // 0-1
  responseLatency: number; // average ms
  scriptAdherence: number; // 0-1 (1 = very scripted)
  emotionalVariation: number; // 0-1 (0 = monotone)
  aggressionLevel: number; // 0-1
  persistenceLevel: number; // 0-1
  deflectionFrequency: number; // 0-1
  pressureTactics: number; // 0-1
}

interface ConversationContext {
  transcript: TranscriptEntry[];
  callerClaims: CallerClaim[];
  requestedInfo: RequestedInfoType[];
  mentionedOrganizations: string[];
  mentionedThreats: string[];
  paymentMethodsMentioned: string[];
  urgencyStatements: string[];
}

interface TranscriptEntry {
  speaker: 'caller' | 'user' | 'ai';
  text: string;
  timestamp: number;
  sentiment: number; // -1 to +1
  emotions: EmotionScores;
}

interface EmotionScores {
  anger: number;
  fear: number;
  urgency: number;
  confidence: number;
  frustration: number;
  sympathy: number;
}

interface CallerClaim {
  claim: string;
  type: 'identity' | 'organization' | 'situation' | 'threat' | 'offer';
  verifiable: boolean;
  verified?: boolean;
  timestamp: number;
}

type RequestedInfoType =
  | 'ssn'
  | 'bank_account'
  | 'credit_card'
  | 'debit_card'
  | 'password'
  | 'pin'
  | 'verification_code'
  | 'address'
  | 'dob'
  | 'mothers_maiden_name'
  | 'security_question';

interface ScamIntentResult {
  isScam: boolean;
  scamProbability: number; // 0-1
  intentCategory: IntentCategory;
  confidence: number;
  indicators: ScamIndicator[];
  warnings: Warning[];
  recommendation: ScamRecommendation;
  explanation: string;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
}

type IntentCategory =
  | 'legitimate_business'
  | 'legitimate_personal'
  | 'telemarketing'
  | 'survey'
  | 'suspicious_unknown'
  | 'tech_support_scam'
  | 'irs_scam'
  | 'bank_scam'
  | 'romance_scam'
  | 'grandparent_scam'
  | 'lottery_scam'
  | 'investment_scam'
  | 'utility_scam'
  | 'charity_scam';

interface Warning {
  level: 'info' | 'caution' | 'warning' | 'danger';
  message: string;
  action: string;
}

interface ScamRecommendation {
  action: 'continue' | 'verify' | 'caution' | 'end_call' | 'report';
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  reasons: string[];
  verificationSteps?: string[];
}

// ============================================================================
// Scam Pattern Database
// ============================================================================

/**
 * Known scam patterns from FBI IC3 and FTC reports
 * Updated: December 2025
 */
const SCAM_PATTERNS = {
  // IRS/Tax Scams (FBI IC3 #1 government impersonation)
  irsScam: {
    keywords: [
      'irs', 'internal revenue', 'tax', 'audit', 'back taxes',
      'tax debt', 'tax lien', 'arrest warrant', 'federal agent'
    ],
    phrases: [
      'you owe taxes',
      'warrant for your arrest',
      'police will come',
      'avoid legal action',
      'immediate payment required',
      'tax fraud investigation'
    ],
    paymentMethods: ['gift card', 'wire transfer', 'bitcoin', 'prepaid card'],
    severity: 'critical' as const
  },

  // Tech Support Scam
  techSupportScam: {
    keywords: [
      'microsoft', 'windows', 'apple', 'virus', 'malware', 'hacker',
      'computer compromised', 'security alert', 'tech support'
    ],
    phrases: [
      'your computer has been hacked',
      'we detected a virus',
      'remote access to fix',
      'pay for support plan',
      'refund for overcharge'
    ],
    paymentMethods: ['gift card', 'credit card', 'wire transfer'],
    severity: 'high' as const
  },

  // Bank/Financial Scam
  bankScam: {
    keywords: [
      'bank', 'account', 'fraud department', 'suspicious activity',
      'unauthorized transaction', 'verify your account'
    ],
    phrases: [
      'your account has been compromised',
      'verify your identity',
      'confirm your card number',
      'transfer to safe account',
      'freeze your funds'
    ],
    paymentMethods: ['wire transfer', 'zelle', 'venmo'],
    severity: 'critical' as const
  },

  // Grandparent/Emergency Scam
  grandparentScam: {
    keywords: [
      'grandchild', 'accident', 'hospital', 'jail', 'arrested',
      'attorney', 'lawyer', 'bail', 'emergency'
    ],
    phrases: [
      'please don\'t tell anyone',
      'i\'m in trouble',
      'need money urgently',
      'wire me money',
      'keep this between us'
    ],
    paymentMethods: ['wire transfer', 'gift card', 'cash'],
    severity: 'critical' as const
  },

  // Romance/Relationship Scam
  romanceScam: {
    keywords: [
      'love', 'relationship', 'military', 'overseas', 'oil rig',
      'inheritance', 'investment opportunity'
    ],
    phrases: [
      'i love you',
      'trust me',
      'invest together',
      'share my inheritance',
      'help me with customs fees'
    ],
    paymentMethods: ['wire transfer', 'cryptocurrency', 'gift card'],
    severity: 'high' as const
  },

  // Lottery/Prize Scam
  lotteryScam: {
    keywords: [
      'lottery', 'prize', 'winner', 'sweepstakes', 'million dollars',
      'congratulations', 'claim your prize'
    ],
    phrases: [
      'you\'ve won',
      'pay processing fee',
      'send taxes upfront',
      'claim within 24 hours',
      'exclusive winner'
    ],
    paymentMethods: ['wire transfer', 'gift card', 'money order'],
    severity: 'high' as const
  },

  // Investment/Cryptocurrency Scam
  investmentScam: {
    keywords: [
      'investment', 'crypto', 'bitcoin', 'returns', 'guaranteed',
      'double your money', 'trading platform'
    ],
    phrases: [
      'guaranteed returns',
      'no risk investment',
      'exclusive opportunity',
      'limited time offer',
      'act now before it\'s gone'
    ],
    paymentMethods: ['cryptocurrency', 'wire transfer'],
    severity: 'high' as const
  },

  // Utility Scam
  utilityScam: {
    keywords: [
      'electric company', 'gas company', 'utility', 'power',
      'disconnect', 'past due', 'final notice'
    ],
    phrases: [
      'pay immediately or disconnect',
      'avoid service interruption',
      'one hour to pay',
      'payment over phone'
    ],
    paymentMethods: ['gift card', 'wire transfer'],
    severity: 'high' as const
  }
};

// ============================================================================
// Linguistic Pattern Analyzer
// ============================================================================

/**
 * Analyzes linguistic patterns for scam indicators
 * Based on Stanford Persuasion Lab and FBI IC3 research
 */
export class LinguisticPatternAnalyzer {
  /**
   * Analyze text for urgency patterns
   */
  detectUrgencyPatterns(text: string): ScamIndicator[] {
    const indicators: ScamIndicator[] = [];
    const textLower = text.toLowerCase();

    const urgencyPatterns = [
      { pattern: /immediate(ly)?|right now|this instant/i, type: 'immediate_action_required' as const, severity: 'high' as const },
      { pattern: /limited time|offer expires|today only|within \d+ (hour|minute)/i, type: 'limited_time_offer' as const, severity: 'medium' as const },
      { pattern: /act now|don't wait|urgent|emergency|asap/i, type: 'artificial_urgency' as const, severity: 'medium' as const },
      { pattern: /last chance|final (notice|warning)|deadline/i, type: 'artificial_urgency' as const, severity: 'high' as const }
    ];

    for (const { pattern, type, severity } of urgencyPatterns) {
      const match = textLower.match(pattern);
      if (match) {
        indicators.push({
          type,
          severity,
          confidence: 0.85,
          evidence: `Detected urgency phrase: "${match[0]}"`,
          timestamp: Date.now()
        });
      }
    }

    return indicators;
  }

  /**
   * Analyze text for threat patterns
   */
  detectThreatPatterns(text: string): ScamIndicator[] {
    const indicators: ScamIndicator[] = [];
    const textLower = text.toLowerCase();

    const threatPatterns = [
      { pattern: /arrest|jail|prison|police|warrant/i, type: 'threat_of_arrest' as const, severity: 'critical' as const },
      { pattern: /close your account|suspend your account|freeze your (account|funds)/i, type: 'threat_of_account_closure' as const, severity: 'high' as const },
      { pattern: /legal action|lawsuit|sue you|court/i, type: 'legal_action_threat' as const, severity: 'high' as const },
      { pattern: /irs|internal revenue|federal tax/i, type: 'irs_impersonation' as const, severity: 'critical' as const }
    ];

    for (const { pattern, type, severity } of threatPatterns) {
      const match = textLower.match(pattern);
      if (match) {
        indicators.push({
          type,
          severity,
          confidence: 0.90,
          evidence: `Detected threat: "${match[0]}"`,
          timestamp: Date.now()
        });
      }
    }

    return indicators;
  }

  /**
   * Analyze text for authority impersonation
   */
  detectAuthorityImpersonation(text: string): ScamIndicator[] {
    const indicators: ScamIndicator[] = [];
    const textLower = text.toLowerCase();

    const authorityPatterns = [
      { pattern: /government|federal|social security|medicare|medicaid/i, type: 'government_impersonation' as const },
      { pattern: /bank of|chase|wells fargo|bank of america|citibank|fraud department/i, type: 'bank_impersonation' as const },
      { pattern: /microsoft|apple|google|amazon|tech support/i, type: 'tech_support_impersonation' as const },
      { pattern: /electric company|gas company|utility|power company/i, type: 'utility_impersonation' as const }
    ];

    for (const { pattern, type } of authorityPatterns) {
      const match = textLower.match(pattern);
      if (match) {
        // Check if combined with threatening or urgent language
        const hasUrgency = this.detectUrgencyPatterns(text).length > 0;
        const hasThreat = this.detectThreatPatterns(text).length > 0;

        if (hasUrgency || hasThreat) {
          indicators.push({
            type,
            severity: 'high',
            confidence: 0.80,
            evidence: `Claimed authority "${match[0]}" with ${hasUrgency ? 'urgency' : 'threats'}`,
            timestamp: Date.now()
          });
        }
      }
    }

    return indicators;
  }

  /**
   * Detect sensitive information requests
   */
  detectInfoRequests(text: string): ScamIndicator[] {
    const indicators: ScamIndicator[] = [];
    const textLower = text.toLowerCase();

    const infoPatterns = [
      { pattern: /social security|ssn|social number/i, type: 'ssn_request' as const, severity: 'critical' as const },
      { pattern: /bank account|routing number|account number/i, type: 'bank_account_request' as const, severity: 'critical' as const },
      { pattern: /credit card|card number|cvv|expiration/i, type: 'credit_card_request' as const, severity: 'critical' as const },
      { pattern: /password|pin|passcode/i, type: 'password_request' as const, severity: 'critical' as const },
      { pattern: /verification code|one.?time.?(password|code)|otp|2fa code/i, type: 'verification_code_request' as const, severity: 'critical' as const }
    ];

    for (const { pattern, type, severity } of infoPatterns) {
      const match = textLower.match(pattern);
      if (match) {
        indicators.push({
          type,
          severity,
          confidence: 0.95,
          evidence: `Requesting sensitive info: "${match[0]}"`,
          timestamp: Date.now()
        });
      }
    }

    return indicators;
  }

  /**
   * Detect suspicious payment methods
   */
  detectPaymentManipulation(text: string): ScamIndicator[] {
    const indicators: ScamIndicator[] = [];
    const textLower = text.toLowerCase();

    const paymentPatterns = [
      { pattern: /gift card|itunes card|google play card|amazon card/i, type: 'gift_card_payment' as const, severity: 'critical' as const },
      { pattern: /wire transfer|western union|moneygram/i, type: 'wire_transfer_request' as const, severity: 'critical' as const },
      { pattern: /bitcoin|cryptocurrency|crypto wallet|btc/i, type: 'cryptocurrency_payment' as const, severity: 'high' as const },
      { pattern: /untraceable|anonymous payment|cash only/i, type: 'untraceable_payment' as const, severity: 'critical' as const }
    ];

    for (const { pattern, type, severity } of paymentPatterns) {
      const match = textLower.match(pattern);
      if (match) {
        indicators.push({
          type,
          severity,
          confidence: 0.90,
          evidence: `Suspicious payment method: "${match[0]}"`,
          timestamp: Date.now()
        });
      }
    }

    return indicators;
  }

  /**
   * Detect psychological manipulation tactics
   */
  detectManipulationTactics(text: string): ScamIndicator[] {
    const indicators: ScamIndicator[] = [];
    const textLower = text.toLowerCase();

    const manipulationPatterns = [
      { pattern: /don't tell anyone|keep this (between us|secret)|don't hang up/i, type: 'isolation_attempt' as const, severity: 'high' as const },
      { pattern: /trust me|believe me|i promise|i swear/i, type: 'trust_building_rush' as const, severity: 'medium' as const },
      { pattern: /i'm the (supervisor|manager|agent)|authority|federal agent/i, type: 'authority_assertion' as const, severity: 'high' as const },
      { pattern: /this is confidential|classified|secret/i, type: 'secrecy_demand' as const, severity: 'high' as const }
    ];

    for (const { pattern, type, severity } of manipulationPatterns) {
      const match = textLower.match(pattern);
      if (match) {
        indicators.push({
          type,
          severity,
          confidence: 0.75,
          evidence: `Manipulation tactic: "${match[0]}"`,
          timestamp: Date.now()
        });
      }
    }

    return indicators;
  }

  /**
   * Comprehensive analysis of text
   */
  analyzeText(text: string): {
    indicators: ScamIndicator[];
    riskScore: number;
    categories: Set<string>;
  } {
    const allIndicators: ScamIndicator[] = [
      ...this.detectUrgencyPatterns(text),
      ...this.detectThreatPatterns(text),
      ...this.detectAuthorityImpersonation(text),
      ...this.detectInfoRequests(text),
      ...this.detectPaymentManipulation(text),
      ...this.detectManipulationTactics(text)
    ];

    // Calculate risk score based on indicators
    let riskScore = 0;
    const severityWeights = { low: 0.1, medium: 0.25, high: 0.4, critical: 0.6 };

    for (const indicator of allIndicators) {
      riskScore += severityWeights[indicator.severity] * indicator.confidence;
    }

    // Normalize to 0-1
    riskScore = Math.min(1, riskScore);

    // Track categories
    const categories = new Set<string>();
    for (const indicator of allIndicators) {
      categories.add(indicator.type);
    }

    return { indicators: allIndicators, riskScore, categories };
  }
}

// ============================================================================
// Caller Behavior Analyzer
// ============================================================================

/**
 * Analyzes caller behavior patterns for scam detection
 */
export class CallerBehaviorAnalyzer {
  private responseLatencies: number[] = [];
  private sentimentHistory: number[] = [];
  private textComplexityHistory: number[] = [];

  /**
   * Analyze response patterns
   */
  analyzeResponsePattern(
    transcript: TranscriptEntry[],
    currentEntry: TranscriptEntry
  ): CallerBehavior {
    // Get caller entries only
    const callerEntries = transcript.filter(e => e.speaker === 'caller');

    if (callerEntries.length < 2) {
      return this.getDefaultBehavior();
    }

    // Calculate response latency
    const latencies: number[] = [];
    for (let i = 1; i < transcript.length; i++) {
      if (transcript[i].speaker === 'caller' && transcript[i - 1].speaker !== 'caller') {
        latencies.push(transcript[i].timestamp - transcript[i - 1].timestamp);
      }
    }

    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 2000;

    // Calculate hesitation frequency (filler words, pauses)
    const hesitationPatterns = /\b(um|uh|er|ah|like|you know|i mean)\b/gi;
    const totalWords = callerEntries.reduce((sum, e) => sum + e.text.split(/\s+/).length, 0);
    let hesitations = 0;
    for (const entry of callerEntries) {
      const matches = entry.text.match(hesitationPatterns);
      hesitations += matches ? matches.length : 0;
    }
    const hesitationFrequency = totalWords > 0 ? hesitations / totalWords : 0;

    // Calculate script adherence (repetitive phrases, consistent pacing)
    const scriptAdherence = this.calculateScriptAdherence(callerEntries);

    // Calculate emotional variation
    const emotionalVariation = this.calculateEmotionalVariation(callerEntries);

    // Calculate aggression level
    const aggressionLevel = this.calculateAggressionLevel(callerEntries);

    // Calculate persistence level
    const persistenceLevel = this.calculatePersistence(callerEntries);

    // Calculate deflection frequency
    const deflectionFrequency = this.calculateDeflection(callerEntries);

    // Calculate pressure tactics usage
    const pressureTactics = this.calculatePressureTactics(callerEntries);

    return {
      hesitationFrequency: Math.min(1, hesitationFrequency * 5), // Normalize
      responseLatency: avgLatency,
      scriptAdherence,
      emotionalVariation,
      aggressionLevel,
      persistenceLevel,
      deflectionFrequency,
      pressureTactics
    };
  }

  /**
   * Calculate script adherence (how robotic/scripted the caller sounds)
   */
  private calculateScriptAdherence(entries: TranscriptEntry[]): number {
    if (entries.length < 3) return 0.5;

    // Check for repeated phrases
    const phrases: Map<string, number> = new Map();
    for (const entry of entries) {
      const words = entry.text.toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length - 2; i++) {
        const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        phrases.set(trigram, (phrases.get(trigram) || 0) + 1);
      }
    }

    // Count repeated trigrams
    let repeatedCount = 0;
    for (const count of phrases.values()) {
      if (count > 1) repeatedCount++;
    }

    // Check for consistent text length (scripted callers have uniform responses)
    const lengths = entries.map(e => e.text.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / lengths.length;
    const cv = Math.sqrt(variance) / avgLength; // Coefficient of variation

    // Low CV (consistent lengths) + repeated phrases = scripted
    const scriptScore = (repeatedCount / Math.max(1, phrases.size)) * 0.5 + (1 - Math.min(1, cv)) * 0.5;

    return scriptScore;
  }

  /**
   * Calculate emotional variation in caller's speech
   */
  private calculateEmotionalVariation(entries: TranscriptEntry[]): number {
    if (entries.length < 2) return 0.5;

    const sentiments = entries.map(e => e.sentiment);
    const mean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
    const variance = sentiments.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / sentiments.length;

    // Higher variance = more emotional variation (more human-like)
    return Math.min(1, Math.sqrt(variance) * 2);
  }

  /**
   * Calculate aggression level
   */
  private calculateAggressionLevel(entries: TranscriptEntry[]): number {
    let aggressionScore = 0;

    const aggressionPatterns = [
      /you (must|have to|need to)/i,
      /do (it|this) now/i,
      /don't (argue|question|doubt)/i,
      /i (demand|insist)/i,
      /shut up|listen to me/i,
      /or else|consequences/i
    ];

    for (const entry of entries) {
      for (const pattern of aggressionPatterns) {
        if (pattern.test(entry.text)) {
          aggressionScore += 0.15;
        }
      }

      // Check emotional markers
      if (entry.emotions.anger > 0.5) aggressionScore += 0.1;
      if (entry.emotions.frustration > 0.5) aggressionScore += 0.05;
    }

    return Math.min(1, aggressionScore);
  }

  /**
   * Calculate persistence level (how much they push despite resistance)
   */
  private calculatePersistence(entries: TranscriptEntry[]): number {
    let persistenceScore = 0;

    const persistencePatterns = [
      /i (understand|know) but/i,
      /let me explain again/i,
      /as i said/i,
      /one more time/i,
      /please just/i,
      /you need to understand/i,
      /this is your last chance/i
    ];

    for (const entry of entries) {
      for (const pattern of persistencePatterns) {
        if (pattern.test(entry.text)) {
          persistenceScore += 0.12;
        }
      }
    }

    return Math.min(1, persistenceScore);
  }

  /**
   * Calculate deflection frequency (avoiding direct questions)
   */
  private calculateDeflection(entries: TranscriptEntry[]): number {
    let deflectionScore = 0;

    const deflectionPatterns = [
      /that's not important/i,
      /don't worry about/i,
      /we can discuss that later/i,
      /focus on/i,
      /let's get back to/i,
      /that's not the issue/i,
      /i can't (tell|give) you that/i
    ];

    for (const entry of entries) {
      for (const pattern of deflectionPatterns) {
        if (pattern.test(entry.text)) {
          deflectionScore += 0.15;
        }
      }
    }

    return Math.min(1, deflectionScore);
  }

  /**
   * Calculate pressure tactics usage
   */
  private calculatePressureTactics(entries: TranscriptEntry[]): number {
    const analyzer = new LinguisticPatternAnalyzer();
    let tacticsScore = 0;

    for (const entry of entries) {
      const urgencyIndicators = analyzer.detectUrgencyPatterns(entry.text);
      const threatIndicators = analyzer.detectThreatPatterns(entry.text);

      tacticsScore += urgencyIndicators.length * 0.1;
      tacticsScore += threatIndicators.length * 0.15;
    }

    return Math.min(1, tacticsScore);
  }

  /**
   * Get default behavior for insufficient data
   */
  private getDefaultBehavior(): CallerBehavior {
    return {
      hesitationFrequency: 0.3,
      responseLatency: 2000,
      scriptAdherence: 0.3,
      emotionalVariation: 0.5,
      aggressionLevel: 0.1,
      persistenceLevel: 0.1,
      deflectionFrequency: 0.1,
      pressureTactics: 0.1
    };
  }
}

// ============================================================================
// Scam Category Classifier
// ============================================================================

/**
 * Classifies scam type based on detected patterns
 */
export class ScamCategoryClassifier {
  /**
   * Classify scam category from context
   */
  classify(
    context: ConversationContext,
    indicators: ScamIndicator[]
  ): {
    category: IntentCategory;
    confidence: number;
    matchedPattern: string;
  } {
    // Check each scam pattern
    const scores: Map<IntentCategory, number> = new Map();

    for (const [patternName, pattern] of Object.entries(SCAM_PATTERNS)) {
      let score = 0;

      // Check keywords in transcript
      const fullText = context.transcript.map(t => t.text).join(' ').toLowerCase();
      for (const keyword of pattern.keywords) {
        if (fullText.includes(keyword)) {
          score += 0.15;
        }
      }

      // Check phrases
      for (const phrase of pattern.phrases) {
        if (fullText.includes(phrase.toLowerCase())) {
          score += 0.25;
        }
      }

      // Check payment methods
      for (const method of pattern.paymentMethods) {
        if (context.paymentMethodsMentioned.some(m => m.toLowerCase().includes(method))) {
          score += 0.3;
        }
      }

      // Map pattern name to category
      const categoryMap: Record<string, IntentCategory> = {
        irsScam: 'irs_scam',
        techSupportScam: 'tech_support_scam',
        bankScam: 'bank_scam',
        grandparentScam: 'grandparent_scam',
        romanceScam: 'romance_scam',
        lotteryScam: 'lottery_scam',
        investmentScam: 'investment_scam',
        utilityScam: 'utility_scam'
      };

      const category = categoryMap[patternName] || 'suspicious_unknown';
      scores.set(category, Math.min(1, score));
    }

    // Find highest scoring category
    let bestCategory: IntentCategory = 'suspicious_unknown';
    let bestScore = 0;

    for (const [category, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    // If no high-scoring scam pattern, check for legitimate intent
    if (bestScore < 0.3) {
      const fullText = context.transcript.map(t => t.text).join(' ').toLowerCase();

      if (this.isLegitimateCall(fullText, indicators)) {
        return {
          category: 'legitimate_business',
          confidence: 0.7,
          matchedPattern: 'No scam patterns detected'
        };
      }

      return {
        category: 'suspicious_unknown',
        confidence: 0.5,
        matchedPattern: 'Insufficient data for classification'
      };
    }

    return {
      category: bestCategory,
      confidence: bestScore,
      matchedPattern: bestCategory.replace('_', ' ')
    };
  }

  /**
   * Check if call appears legitimate
   */
  private isLegitimateCall(text: string, indicators: ScamIndicator[]): boolean {
    // No critical indicators
    const hasCritical = indicators.some(i => i.severity === 'critical');
    if (hasCritical) return false;

    // Few total indicators
    if (indicators.length > 3) return false;

    // Positive signals
    const legitimatePatterns = [
      /follow up|following up/i,
      /scheduled (call|meeting|appointment)/i,
      /returning your call/i,
      /as we discussed/i,
      /confirm your appointment/i
    ];

    for (const pattern of legitimatePatterns) {
      if (pattern.test(text)) return true;
    }

    return false;
  }
}

// ============================================================================
// Real-Time Scam Intent Prediction Engine
// ============================================================================

/**
 * Main engine for real-time scam intent prediction
 * Integrates linguistic analysis, behavior modeling, and pattern classification
 */
export class ScamIntentPredictionEngine {
  private linguisticAnalyzer: LinguisticPatternAnalyzer;
  private behaviorAnalyzer: CallerBehaviorAnalyzer;
  private categoryClassifier: ScamCategoryClassifier;

  private sessionHistory: Map<string, ConversationContext> = new Map();
  private predictionCount: number = 0;
  private averageLatency: number = 0;

  constructor() {
    this.linguisticAnalyzer = new LinguisticPatternAnalyzer();
    this.behaviorAnalyzer = new CallerBehaviorAnalyzer();
    this.categoryClassifier = new ScamCategoryClassifier();
  }

  /**
   * Analyze call in real-time and predict scam intent
   */
  async predictIntent(
    sessionId: string,
    newEntry: TranscriptEntry,
    spamScore: number,
    deepfakeScore: number
  ): Promise<ScamIntentResult> {
    const startTime = performance.now();

    // Get or create session context
    let context = this.sessionHistory.get(sessionId);
    if (!context) {
      context = this.initializeContext();
      this.sessionHistory.set(sessionId, context);
    }

    // Add new entry to transcript
    context.transcript.push(newEntry);

    // 1. Linguistic analysis
    const linguisticResult = this.linguisticAnalyzer.analyzeText(newEntry.text);

    // 2. Behavior analysis
    const behavior = this.behaviorAnalyzer.analyzeResponsePattern(
      context.transcript,
      newEntry
    );

    // 3. Extract claims and info requests
    this.extractCallerClaims(newEntry, context);
    this.extractRequestedInfo(newEntry, context);
    this.extractMentions(newEntry, context);

    // 4. Categorize scam type
    const categoryResult = this.categoryClassifier.classify(context, linguisticResult.indicators);

    // 5. Calculate overall scam probability
    const scamProbability = this.calculateScamProbability(
      linguisticResult.riskScore,
      behavior,
      spamScore,
      deepfakeScore,
      categoryResult.confidence
    );

    // 6. Generate warnings and recommendation
    const warnings = this.generateWarnings(linguisticResult.indicators, behavior, scamProbability);
    const recommendation = this.generateRecommendation(scamProbability, linguisticResult.indicators, categoryResult.category);

    // 7. Build explanation
    const explanation = this.buildExplanation(
      scamProbability,
      linguisticResult.indicators,
      behavior,
      categoryResult.category
    );

    // 8. Determine risk level
    const riskLevel = this.determineRiskLevel(scamProbability, linguisticResult.indicators);

    const latency = performance.now() - startTime;
    this.updateStats(latency);

    const result: ScamIntentResult = {
      isScam: scamProbability > 0.6,
      scamProbability,
      intentCategory: categoryResult.category,
      confidence: categoryResult.confidence,
      indicators: linguisticResult.indicators,
      warnings,
      recommendation,
      explanation,
      riskLevel
    };

    console.log(`🔮 Scam intent: ${result.riskLevel.toUpperCase()} (${(scamProbability * 100).toFixed(1)}%) - ${latency.toFixed(1)}ms`);

    return result;
  }

  /**
   * Initialize conversation context
   */
  private initializeContext(): ConversationContext {
    return {
      transcript: [],
      callerClaims: [],
      requestedInfo: [],
      mentionedOrganizations: [],
      mentionedThreats: [],
      paymentMethodsMentioned: [],
      urgencyStatements: []
    };
  }

  /**
   * Extract caller claims from entry
   */
  private extractCallerClaims(entry: TranscriptEntry, context: ConversationContext): void {
    if (entry.speaker !== 'caller') return;

    const claimPatterns = [
      { pattern: /i('m| am) (from|with|calling from) (.+)/i, type: 'organization' as const },
      { pattern: /this is (.+) (from|with)/i, type: 'identity' as const },
      { pattern: /your (account|card|funds) (has|have) been/i, type: 'situation' as const },
      { pattern: /you (owe|have|must) (pay|\d+)/i, type: 'threat' as const },
      { pattern: /you('ve| have) won/i, type: 'offer' as const }
    ];

    for (const { pattern, type } of claimPatterns) {
      const match = entry.text.match(pattern);
      if (match) {
        context.callerClaims.push({
          claim: match[0],
          type,
          verifiable: type === 'organization' || type === 'identity',
          timestamp: entry.timestamp
        });
      }
    }
  }

  /**
   * Extract requested information types
   */
  private extractRequestedInfo(entry: TranscriptEntry, context: ConversationContext): void {
    if (entry.speaker !== 'caller') return;

    const infoPatterns: Array<{ pattern: RegExp; type: RequestedInfoType }> = [
      { pattern: /social security|ssn/i, type: 'ssn' },
      { pattern: /bank account|routing/i, type: 'bank_account' },
      { pattern: /credit card|card number/i, type: 'credit_card' },
      { pattern: /debit card/i, type: 'debit_card' },
      { pattern: /password/i, type: 'password' },
      { pattern: /pin/i, type: 'pin' },
      { pattern: /verification code|one.?time/i, type: 'verification_code' },
      { pattern: /date of birth|birthday|dob/i, type: 'dob' },
      { pattern: /mother('s)? maiden/i, type: 'mothers_maiden_name' }
    ];

    for (const { pattern, type } of infoPatterns) {
      if (pattern.test(entry.text) && !context.requestedInfo.includes(type)) {
        context.requestedInfo.push(type);
      }
    }
  }

  /**
   * Extract mentioned entities
   */
  private extractMentions(entry: TranscriptEntry, context: ConversationContext): void {
    if (entry.speaker !== 'caller') return;

    // Organizations
    const orgPatterns = [
      /irs|internal revenue/i,
      /social security/i,
      /microsoft|apple|google|amazon/i,
      /bank of america|chase|wells fargo|citibank/i,
      /fbi|police|sheriff|federal agent/i
    ];

    for (const pattern of orgPatterns) {
      const match = entry.text.match(pattern);
      if (match && !context.mentionedOrganizations.includes(match[0])) {
        context.mentionedOrganizations.push(match[0]);
      }
    }

    // Payment methods
    const paymentPatterns = [
      /gift card|itunes|google play|amazon card/i,
      /wire transfer|western union|moneygram/i,
      /bitcoin|crypto/i,
      /zelle|venmo|paypal/i
    ];

    for (const pattern of paymentPatterns) {
      const match = entry.text.match(pattern);
      if (match && !context.paymentMethodsMentioned.includes(match[0])) {
        context.paymentMethodsMentioned.push(match[0]);
      }
    }
  }

  /**
   * Calculate overall scam probability
   */
  private calculateScamProbability(
    linguisticRisk: number,
    behavior: CallerBehavior,
    spamScore: number,
    deepfakeScore: number,
    categoryConfidence: number
  ): number {
    // Weighted combination
    const weights = {
      linguistic: 0.30,
      behavior: 0.25,
      spam: 0.20,
      deepfake: 0.10,
      category: 0.15
    };

    // Behavior score
    const behaviorScore =
      behavior.scriptAdherence * 0.25 +
      behavior.aggressionLevel * 0.20 +
      behavior.persistenceLevel * 0.20 +
      behavior.pressureTactics * 0.25 +
      behavior.deflectionFrequency * 0.10;

    const probability =
      linguisticRisk * weights.linguistic +
      behaviorScore * weights.behavior +
      spamScore * weights.spam +
      deepfakeScore * weights.deepfake +
      categoryConfidence * weights.category;

    return Math.min(1, probability);
  }

  /**
   * Generate user warnings
   */
  private generateWarnings(
    indicators: ScamIndicator[],
    behavior: CallerBehavior,
    scamProbability: number
  ): Warning[] {
    const warnings: Warning[] = [];

    // Critical indicators
    const criticalIndicators = indicators.filter(i => i.severity === 'critical');
    for (const indicator of criticalIndicators) {
      warnings.push({
        level: 'danger',
        message: this.getWarningMessage(indicator),
        action: 'Do NOT provide this information'
      });
    }

    // High severity indicators
    const highIndicators = indicators.filter(i => i.severity === 'high');
    for (const indicator of highIndicators.slice(0, 2)) { // Limit to 2
      warnings.push({
        level: 'warning',
        message: this.getWarningMessage(indicator),
        action: 'Verify caller identity independently'
      });
    }

    // Behavioral warnings
    if (behavior.pressureTactics > 0.6) {
      warnings.push({
        level: 'warning',
        message: 'Caller is using high-pressure tactics',
        action: 'Take your time - legitimate callers will wait'
      });
    }

    if (behavior.aggressionLevel > 0.5) {
      warnings.push({
        level: 'caution',
        message: 'Caller is being aggressive',
        action: 'You can end the call at any time'
      });
    }

    // Overall risk warning
    if (scamProbability > 0.7) {
      warnings.push({
        level: 'danger',
        message: `High scam probability (${(scamProbability * 100).toFixed(0)}%)`,
        action: 'Consider ending this call'
      });
    }

    return warnings;
  }

  /**
   * Get warning message for indicator
   */
  private getWarningMessage(indicator: ScamIndicator): string {
    const messages: Record<ScamIndicatorType, string> = {
      'artificial_urgency': 'Caller is creating artificial urgency',
      'limited_time_offer': 'Suspicious "limited time" pressure',
      'immediate_action_required': 'Demanding immediate action is a red flag',
      'threat_of_arrest': 'Threatening arrest is a common scam tactic',
      'threat_of_account_closure': 'Account closure threats may be fake',
      'legal_action_threat': 'Legal threats over phone are suspicious',
      'irs_impersonation': 'IRS does NOT call demanding immediate payment',
      'government_impersonation': 'Government agencies rarely call unexpectedly',
      'bank_impersonation': 'Banks never ask for full card/PIN over phone',
      'tech_support_impersonation': 'Tech companies don\'t make unsolicited calls',
      'utility_impersonation': 'Utilities don\'t demand gift card payments',
      'ssn_request': 'NEVER give your SSN over phone',
      'bank_account_request': 'NEVER share bank details with callers',
      'credit_card_request': 'NEVER give card numbers to incoming calls',
      'password_request': 'NEVER share passwords over phone',
      'pin_request': 'NEVER share your PIN',
      'verification_code_request': '2FA codes should NEVER be shared',
      'gift_card_payment': 'NO legitimate organization accepts gift cards',
      'wire_transfer_request': 'Wire transfers are irreversible - be cautious',
      'cryptocurrency_payment': 'Crypto payments are untraceable - scam red flag',
      'untraceable_payment': 'Request for untraceable payment = SCAM',
      'isolation_attempt': 'Scammers try to isolate victims',
      'secrecy_demand': 'Demanding secrecy is a manipulation tactic',
      'trust_building_rush': 'Rushing to build trust is suspicious',
      'authority_assertion': 'Asserting authority is a control tactic',
      'script_reading': 'Caller appears to be reading from script',
      'caller_id_spoofing_mention': 'Mentioning caller ID proves nothing',
      'callback_number_different': 'Callback number mismatch is suspicious',
      'refusal_to_provide_info': 'Legitimate callers provide identification'
    };

    return messages[indicator.type] || indicator.evidence;
  }

  /**
   * Generate recommendation
   */
  private generateRecommendation(
    scamProbability: number,
    indicators: ScamIndicator[],
    category: IntentCategory
  ): ScamRecommendation {
    // Critical indicators = immediate end
    const hasCritical = indicators.some(i => i.severity === 'critical');

    if (scamProbability > 0.8 || hasCritical) {
      return {
        action: 'end_call',
        urgency: 'immediate',
        reasons: [
          'High scam probability detected',
          ...indicators.filter(i => i.severity === 'critical').map(i => i.evidence)
        ]
      };
    }

    if (scamProbability > 0.6) {
      return {
        action: 'caution',
        urgency: 'high',
        reasons: ['Multiple scam indicators detected'],
        verificationSteps: [
          'Hang up and call the organization directly',
          'Look up the official number independently',
          'Never use numbers provided by the caller'
        ]
      };
    }

    if (scamProbability > 0.4) {
      return {
        action: 'verify',
        urgency: 'medium',
        reasons: ['Some suspicious patterns detected'],
        verificationSteps: [
          'Ask for caller\'s name and department',
          'Request a callback number',
          'Verify through official channels'
        ]
      };
    }

    return {
      action: 'continue',
      urgency: 'low',
      reasons: ['No significant scam indicators']
    };
  }

  /**
   * Build explanation
   */
  private buildExplanation(
    scamProbability: number,
    indicators: ScamIndicator[],
    behavior: CallerBehavior,
    category: IntentCategory
  ): string {
    if (scamProbability < 0.3) {
      return 'This call appears to be legitimate. No significant scam indicators detected.';
    }

    const parts: string[] = [];

    if (category !== 'legitimate_business' && category !== 'legitimate_personal' && category !== 'suspicious_unknown') {
      parts.push(`Possible ${category.replace(/_/g, ' ')} detected.`);
    }

    if (indicators.length > 0) {
      const topIndicators = indicators
        .filter(i => i.severity === 'critical' || i.severity === 'high')
        .slice(0, 2)
        .map(i => i.evidence);

      if (topIndicators.length > 0) {
        parts.push(`Key concerns: ${topIndicators.join('; ')}`);
      }
    }

    if (behavior.pressureTactics > 0.5) {
      parts.push('Caller is using pressure tactics.');
    }

    if (behavior.scriptAdherence > 0.7) {
      parts.push('Caller appears to be reading from a script.');
    }

    return parts.join(' ');
  }

  /**
   * Determine risk level
   */
  private determineRiskLevel(
    scamProbability: number,
    indicators: ScamIndicator[]
  ): ScamIntentResult['riskLevel'] {
    const hasCritical = indicators.some(i => i.severity === 'critical');

    if (hasCritical || scamProbability > 0.8) return 'critical';
    if (scamProbability > 0.6) return 'high';
    if (scamProbability > 0.4) return 'medium';
    if (scamProbability > 0.2) return 'low';
    return 'safe';
  }

  /**
   * Update statistics
   */
  private updateStats(latency: number): void {
    this.predictionCount++;
    this.averageLatency = (this.averageLatency * (this.predictionCount - 1) + latency) / this.predictionCount;
  }

  /**
   * Get session context
   */
  getSessionContext(sessionId: string): ConversationContext | undefined {
    return this.sessionHistory.get(sessionId);
  }

  /**
   * Clear session
   */
  clearSession(sessionId: string): void {
    this.sessionHistory.delete(sessionId);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      predictionCount: this.predictionCount,
      averageLatency: this.averageLatency,
      activeSessions: this.sessionHistory.size
    };
  }
}

// ============================================================================
// Export Public API
// ============================================================================

export {
  LinguisticPatternAnalyzer,
  CallerBehaviorAnalyzer,
  ScamCategoryClassifier,
  SCAM_PATTERNS,
  type ScamIndicator,
  type ScamIndicatorType,
  type CallerBehavior,
  type ConversationContext,
  type TranscriptEntry,
  type ScamIntentResult,
  type IntentCategory,
  type Warning,
  type ScamRecommendation
};

/**
 * Phase 107 Summary:
 *
 * Lines of Code: ~1,400
 *
 * Components:
 * 1. LinguisticPatternAnalyzer - Urgency, threats, authority, info requests
 * 2. CallerBehaviorAnalyzer - Script adherence, aggression, persistence
 * 3. ScamCategoryClassifier - IRS, tech support, bank, grandparent, etc.
 * 4. ScamIntentPredictionEngine - Real-time prediction with explainable AI
 *
 * Scam Categories Detected:
 * - IRS/Tax scams (FBI IC3 #1)
 * - Tech support scams
 * - Bank/financial scams
 * - Grandparent/emergency scams
 * - Romance scams
 * - Lottery/prize scams
 * - Investment/crypto scams
 * - Utility scams
 *
 * Features:
 * - Real-time intent prediction during calls
 * - Linguistic pattern analysis (urgency, threats, manipulation)
 * - Caller behavior modeling (script reading, aggression)
 * - Psychological manipulation detection
 * - User-facing warnings with actionable advice
 * - Explainable AI with evidence
 *
 * Competitive Advantages:
 * vs Truecaller: Predicts NEW scams, not just known numbers
 * vs Hiya: Real-time intent analysis, not post-call
 * vs RoboKiller: Serious protection, not entertainment
 *
 * Research Citations:
 * - FBI IC3 2024: $12.5B losses, top scam patterns
 * - FTC Consumer Sentinel: 5.4M fraud reports
 * - Stanford Persuasion Lab: Social engineering psychology
 */
