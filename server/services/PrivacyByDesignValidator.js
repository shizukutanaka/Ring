/**
 * Privacy by Design Validator
 *
 * Ensures GDPR, DSA, and DMA compliance in consent UI
 * Prevents dark patterns and enforces symmetric interfaces
 *
 * Reference: GDPR enforcement reports, EU DMA/DSA 2024-2025,
 * FTC dark patterns enforcement (2024)
 */

const { EventEmitter } = require('events');

class PrivacyByDesignValidator extends EventEmitter {
  constructor(options = {}) {
    super();

    this.jurisdiction = options.jurisdiction || 'GDPR';
    this.strictMode = options.strictMode !== false;

    // Compliance rules by regulation
    this.rules = {
      GDPR: {
        name: 'General Data Protection Regulation',
        region: 'EU',
        consentRequired: true,
        preCheckedBoxes: false,
        darkPatternsForbidden: true,
        requiredFields: ['name', 'email', 'consentType', 'explicit_timestamp'],
        uiRequirements: {
          acceptRejectSymmetry: true,
          sameFontSize: true,
          sameButtonSize: true,
          sameColorContrast: true,
          equalProminence: true,
          noDoubleNegatives: true
        },
        penalties: { max: '€20,000,000', percent: '4% global revenue' }
      },

      CCPA: {
        name: 'California Consumer Privacy Act',
        region: 'US-California',
        consentRequired: false, // Opt-out oriented
        preCheckedBoxes: false,
        darkPatternsForbidden: true,
        requiredFields: ['email', 'consentType', 'timestamp'],
        uiRequirements: {
          acceptRejectSymmetry: true,
          sameFontSize: true,
          sameButtonSize: true,
          equalProminence: true,
          noDeceptiveLanguage: true
        },
        penalties: { max: '$2,500 per violation', comment: 'FTC enforcement 2024' }
      },

      LGPD: {
        name: 'Lei Geral de Proteção de Dados',
        region: 'Brazil',
        consentRequired: true,
        preCheckedBoxes: false,
        darkPatternsForbidden: true,
        requiredFields: ['name', 'email', 'cpf', 'consentType', 'timestamp'],
        uiRequirements: {
          acceptRejectSymmetry: true,
          sameFontSize: true,
          sameButtonSize: true,
          equalProminence: true
        },
        penalties: { max: 'BRL 50,000,000', percent: '2% revenue' }
      },

      DMA: {
        name: 'Digital Markets Act',
        region: 'EU',
        consentRequired: true,
        preCheckedBoxes: false,
        darkPatternsForbidden: true,
        darkPatternsIllegal: true, // Explicitly illegal
        requiredFields: ['consentType', 'timestamp'],
        uiRequirements: {
          noManipulativeDesign: true,
          fairInterfaceDesign: true,
          acceptRejectSymmetry: true,
          sameFontSize: true,
          sameButtonSize: true,
          equalProminence: true
        },
        penalties: { max: '€10,000,000', percent: '10% global revenue' }
      },

      DSA: {
        name: 'Digital Services Act',
        region: 'EU',
        consentRequired: true,
        preCheckedBoxes: false,
        darkPatternsForbidden: true,
        requiredFields: ['consentType', 'timestamp', 'userConsent'],
        uiRequirements: {
          transparentAlgorithms: true,
          clearUserControls: true,
          acceptRejectSymmetry: true,
          sameFontSize: true,
          sameButtonSize: true,
          noDeceptivePatterns: true
        },
        penalties: { max: '€6,000,000', percent: '6% revenue' }
      }
    };

    // Dark pattern categories
    this.darkPatterns = {
      'pre-ticked-boxes': {
        forbidden: ['GDPR', 'CCPA', 'LGPD', 'DMA', 'DSA'],
        description: 'Pre-checked consent boxes',
        severity: 'critical',
        fix: 'All checkboxes must be unchecked by default'
      },
      'hidden-reject': {
        forbidden: ['GDPR', 'CCPA', 'LGPD', 'DMA', 'DSA'],
        description: 'Reject button hidden or difficult to find',
        severity: 'critical',
        fix: 'Reject button must be equally prominent as Accept'
      },
      'confused-buttons': {
        forbidden: ['GDPR', 'CCPA', 'LGPD', 'DMA', 'DSA'],
        description: 'Accept and Reject buttons different sizes/colors',
        severity: 'critical',
        fix: 'Both buttons must have identical styling'
      },
      'double-negative': {
        forbidden: ['GDPR', 'DSA'],
        description: 'Confusing "Do not reject" language',
        severity: 'high',
        fix: 'Use clear, positive language'
      },
      'sneaking': {
        forbidden: ['GDPR', 'CCPA', 'DMA', 'DSA'],
        description: 'Hiding consent request in long text',
        severity: 'high',
        fix: 'Make consent request obvious and standalone'
      },
      'trick-question': {
        forbidden: ['GDPR', 'CCPA', 'DSA'],
        description: 'Phrasing questions to confuse users',
        severity: 'high',
        fix: 'Use clear, straightforward language'
      },
      'forced-action': {
        forbidden: ['GDPR', 'CCPA', 'DMA', 'DSA'],
        description: 'Requiring consent to proceed',
        severity: 'medium',
        fix: 'Allow service access without non-essential consent'
      },
      'roach-motel': {
        forbidden: ['GDPR', 'CCPA', 'LGPD', 'DSA'],
        description: 'Easy to consent, hard to withdraw',
        severity: 'high',
        fix: 'Make withdrawal as easy as consent'
      }
    };

    // State
    this.state = {
      jurisdiction: options.jurisdiction || 'GDPR',
      violations: [],
      warnings: [],
      checks: {}
    };
  }

  /**
   * Validate consent UI design
   */
  validateConsentUI(uiConfig) {
    const jurisdictionRules = this.rules[this.state.jurisdiction];

    if (!jurisdictionRules) {
      throw new Error(`Unknown jurisdiction: ${this.state.jurisdiction}`);
    }

    const violations = [];
    const warnings = [];

    // Run all validation checks
    console.log(`🔍 Validating consent UI against ${jurisdictionRules.name}...`);

    // Check 1: Pre-ticked boxes
    if (!jurisdictionRules.preCheckedBoxes && uiConfig.preCheckedBoxes) {
      violations.push(this.createViolation(
        'pre-ticked-boxes',
        'Consent boxes cannot be pre-ticked',
        'critical'
      ));
    }

    // Check 2: Button symmetry
    if (jurisdictionRules.uiRequirements.acceptRejectSymmetry) {
      const symmCheck = this.checkButtonSymmetry(uiConfig);
      if (!symmCheck.valid) {
        violations.push(symmCheck.violation);
      }
    }

    // Check 3: Text content
    const textCheck = this.checkTextContent(uiConfig);
    if (textCheck.violations.length > 0) {
      violations.push(...textCheck.violations);
    }
    if (textCheck.warnings.length > 0) {
      warnings.push(...textCheck.warnings);
    }

    // Check 4: Color contrast
    if (jurisdictionRules.uiRequirements.sameColorContrast) {
      const contrastCheck = this.checkColorContrast(uiConfig);
      if (!contrastCheck.valid) {
        warnings.push(contrastCheck.warning);
      }
    }

    // Check 5: Accessibility
    const a11yCheck = this.checkAccessibility(uiConfig);
    if (a11yCheck.violations.length > 0) {
      violations.push(...a11yCheck.violations);
    }

    // Check 6: Location-specific requirements
    const locCheck = this.checkLocationRequirements(
      this.state.jurisdiction,
      uiConfig
    );
    if (locCheck.violations.length > 0) {
      violations.push(...locCheck.violations);
    }

    this.state.violations = violations;
    this.state.warnings = warnings;

    const isCompliant = violations.length === 0;

    this.emit('validation:complete', {
      jurisdiction: this.state.jurisdiction,
      isCompliant,
      violations,
      warnings,
      severity: this.calculateSeverity(violations)
    });

    return {
      isCompliant,
      violations,
      warnings,
      recommendation: isCompliant ? '✅ Compliant' : '❌ Non-compliant'
    };
  }

  /**
   * Check button symmetry (Accept vs Reject)
   */
  checkButtonSymmetry(uiConfig) {
    const { acceptButton, rejectButton } = uiConfig;

    if (!acceptButton || !rejectButton) {
      return {
        valid: false,
        violation: this.createViolation(
          'hidden-reject',
          'Both Accept and Reject buttons must be present',
          'critical'
        )
      };
    }

    // Check font size
    const fontDiff = Math.abs(
      parseFloat(acceptButton.fontSize || '16') -
      parseFloat(rejectButton.fontSize || '16')
    );

    if (fontDiff > 2) {
      return {
        valid: false,
        violation: this.createViolation(
          'confused-buttons',
          `Font size mismatch: ${acceptButton.fontSize} vs ${rejectButton.fontSize}`,
          'critical'
        )
      };
    }

    // Check button width/padding
    const widthDiff = Math.abs(
      (acceptButton.padding || '12px').replace('px', '') -
      (rejectButton.padding || '12px').replace('px', '')
    );

    if (widthDiff > 5) {
      return {
        valid: false,
        violation: this.createViolation(
          'confused-buttons',
          'Button padding must be equal',
          'critical'
        )
      };
    }

    // Check color contrast
    const acceptContrast = this.calculateContrast(acceptButton.backgroundColor);
    const rejectContrast = this.calculateContrast(rejectButton.backgroundColor);

    if (Math.abs(acceptContrast - rejectContrast) > 30) {
      return {
        valid: false,
        violation: this.createViolation(
          'confused-buttons',
          'Button color contrast must be similar',
          'critical'
        )
      };
    }

    return { valid: true };
  }

  /**
   * Check text content for dark patterns
   */
  checkTextContent(uiConfig) {
    const violations = [];
    const warnings = [];

    const text = (uiConfig.text || '').toLowerCase();

    // Check for double negatives
    const doubleNegatives = /do not (reject|decline)/i;
    if (doubleNegatives.test(text)) {
      violations.push(this.createViolation(
        'double-negative',
        'Confusing double-negative language detected',
        'high'
      ));
    }

    // Check for sneaking (too long intro text)
    const introLength = (uiConfig.introText || '').length;
    if (introLength > 500) {
      warnings.push(this.createWarning(
        'sneaking',
        'Consent request text is very long - may be considered "sneaking"'
      ));
    }

    // Check for trick questions
    const trickPatterns = /(?:are you sure|confirm again|re-confirm)/i;
    if (trickPatterns.test(text)) {
      violations.push(this.createViolation(
        'trick-question',
        'Potentially confusing question phrasing detected',
        'high'
      ));
    }

    // Check for jargon (accessibility issue)
    const jargon = /synergize|leverage|paradigm shift|blockchain/i;
    if (jargon.test(text)) {
      warnings.push(this.createWarning(
        'unclear-language',
        'Consent text contains unnecessarily complex jargon'
      ));
    }

    return { violations, warnings };
  }

  /**
   * Check color contrast (WCAG AA standard)
   */
  checkColorContrast(uiConfig) {
    // Simplified check - should use actual color contrast calculation
    const acceptBg = uiConfig.acceptButton?.backgroundColor || '#ffffff';
    const rejectBg = uiConfig.rejectButton?.backgroundColor || '#ffffff';

    const acceptContrast = this.calculateContrast(acceptBg);
    const rejectContrast = this.calculateContrast(rejectBg);

    const valid = acceptContrast > 4.5 && rejectContrast > 4.5; // WCAG AA

    return {
      valid,
      warning: !valid ? this.createWarning(
        'color-contrast',
        'Button colors may not meet WCAG AA accessibility standards'
      ) : null
    };
  }

  /**
   * Check accessibility features
   */
  checkAccessibility(uiConfig) {
    const violations = [];

    // Check keyboard navigation
    if (!uiConfig.keyboardAccessible) {
      violations.push(this.createViolation(
        'accessibility',
        'Consent UI must be keyboard accessible',
        'high'
      ));
    }

    // Check screen reader support
    if (!uiConfig.ariaLabels) {
      violations.push(this.createViolation(
        'accessibility',
        'ARIA labels required for screen reader support',
        'medium'
      ));
    }

    // Check tab order
    if (!uiConfig.tabOrder || uiConfig.tabOrder.length === 0) {
      violations.push(this.createViolation(
        'accessibility',
        'Logical tab order must be defined',
        'medium'
      ));
    }

    return { violations };
  }

  /**
   * Check location-specific requirements
   */
  checkLocationRequirements(jurisdiction, uiConfig) {
    const violations = [];
    const rules = this.rules[jurisdiction];

    // GDPR: Explicit consent required
    if (jurisdiction === 'GDPR' && !uiConfig.explicitConsent) {
      violations.push(this.createViolation(
        'explicit-consent',
        'GDPR requires explicit, affirmative consent',
        'critical'
      ));
    }

    // LGPD: CPF tracking for Brazilians
    if (jurisdiction === 'LGPD' && uiConfig.targetCountry === 'BR') {
      if (!uiConfig.collectCPF) {
        violations.push(this.createViolation(
          'lgpd-cpf',
          'LGPD requires CPF collection for Brazilian users',
          'medium'
        ));
      }
    }

    // CCPA: California-specific language
    if (jurisdiction === 'CCPA' && !uiConfig.californiaNotice) {
      violations.push(this.createViolation(
        'ccpa-notice',
        'California-specific privacy notice required',
        'medium'
      ));
    }

    return { violations };
  }

  /**
   * Calculate color contrast ratio
   */
  calculateContrast(color) {
    // Simplified - real implementation would use WCAG formula
    // Returns value 1-21 (1 = same color, 21 = max contrast)
    return 10; // Placeholder
  }

  /**
   * Create violation object
   */
  createViolation(type, message, severity) {
    const pattern = this.darkPatterns[type] || {};

    return {
      type,
      pattern: pattern.description,
      message,
      severity,
      forbidden: pattern.forbidden || [],
      fix: pattern.fix,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create warning object
   */
  createWarning(type, message) {
    return {
      type,
      message,
      severity: 'low',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate overall severity
   */
  calculateSeverity(violations) {
    const hasCritical = violations.some(v => v.severity === 'critical');
    const hasHigh = violations.some(v => v.severity === 'high');
    const hasMedium = violations.some(v => v.severity === 'medium');

    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    if (hasMedium) return 'medium';
    return 'none';
  }

  /**
   * Get compliance report
   */
  getComplianceReport() {
    const rules = this.rules[this.state.jurisdiction];

    return {
      jurisdiction: this.state.jurisdiction,
      regulation: rules.name,
      region: rules.region,
      compliant: this.state.violations.length === 0,
      violations: this.state.violations,
      warnings: this.state.warnings,
      penalties: rules.penalties,
      requiredFields: rules.requiredFields,
      uiRequirements: rules.uiRequirements,
      recommendations: this.generateRecommendations(),
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Generate compliance recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    for (const violation of this.state.violations) {
      recommendations.push({
        issue: violation.message,
        fix: violation.fix,
        priority: violation.severity
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        issue: 'No violations found',
        fix: 'Continue monitoring for compliance',
        priority: 'info'
      });
    }

    return recommendations;
  }

  /**
   * Generate compliant UI template
   */
  generateCompliantTemplate(jurisdiction) {
    const rules = this.rules[jurisdiction];

    return {
      structure: {
        header: {
          title: 'Your Privacy Matters',
          description: 'We respect your data and give you full control'
        },
        consentOptions: [
          'Recording this call',
          'Storage (90 days)',
          'Analytics (optional)',
          'Data sharing (optional)'
        ],
        buttons: {
          accept: {
            text: 'Accept Selected',
            style: 'primary-symmetric',
            fontSize: '16px',
            padding: '12px 24px',
            backgroundColor: '#0066cc',
            contrast: '> 4.5:1'
          },
          reject: {
            text: 'Reject All',
            style: 'primary-symmetric',
            fontSize: '16px',
            padding: '12px 24px',
            backgroundColor: '#0066cc',
            contrast: '> 4.5:1'
          },
          customize: {
            text: 'Manage Preferences',
            style: 'tertiary',
            fontSize: '14px'
          }
        }
      },
      requirements: rules.uiRequirements,
      compliance: {
        preCheckedBoxes: rules.preCheckedBoxes,
        explicitConsent: rules.consentRequired,
        darkPatternsForbidden: rules.darkPatternsForbidden
      }
    };
  }

  /**
   * Get audit trail template
   */
  getAuditTrailTemplate() {
    return {
      timestamp: Date.now(),
      jurisdiction: this.state.jurisdiction,
      userConsent: {
        explicit: true,
        timestamp: Date.now(),
        ipAddress: '127.0.0.1',
        userAgent: 'User-Agent-String',
        consentChoices: {},
        signature: 'RSA-signature'
      },
      validation: {
        compliant: true,
        violations: [],
        checkedAt: Date.now()
      },
      retention: {
        consentUntil: Date.now() + (90 * 24 * 60 * 60 * 1000),
        deletionDate: Date.now() + (90 * 24 * 60 * 60 * 1000)
      }
    };
  }
}

module.exports = PrivacyByDesignValidator;
