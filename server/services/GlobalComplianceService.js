// Global Compliance Service for Call Recording
// Implements 25+ country-specific legal requirements with real-time validation

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const i18nService = require('./I18nService');

class GlobalComplianceService extends EventEmitter {
  constructor() {
    super();
    this.complianceRules = new Map();
    this.activeComplianceSessions = new Map();
    this.i18nService = i18nService;
    
    this.initializeComplianceRules();
  }

  // Initialize compliance rules for all supported countries
  initializeComplianceRules() {
    // United States - Federal and State laws
    this.complianceRules.set('US', {
      federal: {
        type: 'one_party',
        requiresDisclosure: true,
        legalBasis: 'Federal Wiretap Act (18 U.S.C. § 2511)',
        consentMethod: ['verbal', 'written', 'beep'],
        retentionPeriod: 365, // days
        storageLocation: 'US',
        crossBorderTransfer: false,
        penalties: {
          criminal: 'Up to 5 years imprisonment',
          civil: '$10,000 per violation'
        }
      },
      states: {
        'CA': {
          type: 'all_party',
          requiresDisclosure: true,
          legalBasis: 'California Penal Code § 632',
          consentMethod: ['explicit_consent'],
          additionalRequirements: ['privacy_policy', 'data_breach_notification']
        },
        'FL': {
          type: 'all_party',
          requiresDisclosure: true,
          legalBasis: 'Florida Statute § 934.03',
          consentMethod: ['explicit_consent'],
          additionalRequirements: ['written_consent_required']
        },
        'NY': {
          type: 'one_party',
          requiresDisclosure: true,
          legalBasis: 'New York Penal Law § 250.00',
          consentMethod: ['verbal', 'written'],
          additionalRequirements: ['business_purpose_only']
        },
        'TX': {
          type: 'one_party',
          requiresDisclosure: false,
          legalBasis: 'Texas Penal Code § 16.02',
          consentMethod: ['implied'],
          additionalRequirements: []
        }
      }
    });

    // European Union - GDPR
    this.complianceRules.set('EU', {
      type: 'gdpr',
      requiresDisclosure: true,
      legalBasis: 'GDPR (EU 2016/679)',
      consentMethod: ['explicit_consent', 'written'],
      retentionPeriod: 30,
      storageLocation: 'EU',
      crossBorderTransfer: false,
      dataSubjectRights: [
        'right_to_access',
        'right_to_rectification',
        'right_to_erasure',
        'right_to_portability',
        'right_to_object',
        'right_to_restrict_processing'
      ],
      penalties: {
        administrative: 'Up to €20 million or 4% of global turnover'
      },
      memberStates: {
        'DE': {
          additionalRequirements: ['employee_council_approval', 'data_protection_officer'],
          legalBasis: 'BDSG (Bundesdatenschutzgesetz)'
        },
        'FR': {
          additionalRequirements: ['cnil_notification', 'impact_assessment'],
          legalBasis: 'French Data Protection Act'
        },
        'UK': {
          additionalRequirements: ['pecr_compliance', 'ico_registration'],
          legalBasis: 'UK GDPR, PECR'
        },
        'ES': {
          additionalRequirements: ['aepd_notification', 'employee_representative'],
          legalBasis: 'GDPR, Spanish LSSI-CE'
        }
      }
    });

    // Canada
    this.complianceRules.set('CA', {
      type: 'one_party',
      requiresDisclosure: true,
      legalBasis: 'PIPEDA (Personal Information Protection and Electronic Documents Act)',
      consentMethod: ['explicit_consent'],
      retentionPeriod: 365,
      storageLocation: 'CA',
      crossBorderTransfer: false,
      additionalRequirements: ['purpose_specification', 'meaningful_consent'],
      penalties: {
        administrative: 'Up to $100,000 per violation'
      }
    });

    // Australia
    this.complianceRules.set('AU', {
      type: 'one_party',
      requiresDisclosure: true,
      legalBasis: 'Privacy Act 1988',
      consentMethod: ['explicit_consent'],
      retentionPeriod: 365,
      storageLocation: 'AU',
      crossBorderTransfer: false,
      additionalRequirements: ['app_collection_statement'],
      penalties: {
        civil: 'Up to $2.1 million per contravention'
      }
    });

    // Japan
    this.complianceRules.set('JP', {
      type: 'one_party',
      requiresDisclosure: true,
      legalBasis: '個人情報保護法 (Act on the Protection of Personal Information)',
      consentMethod: ['explicit_consent'],
      retentionPeriod: 365,
      storageLocation: 'JP',
      crossBorderTransfer: false,
      additionalRequirements: ['purpose_specification', 'ppc_commission_notification'],
      penalties: {
        administrative: 'Up to ¥100 million'
      }
    });

    // South Korea
    this.complianceRules.set('KR', {
      type: 'one_party',
      requiresDisclosure: true,
      legalBasis: '개인정보 보호법 (Personal Information Protection Act)',
      consentMethod: ['explicit_consent'],
      retentionPeriod: 365,
      storageLocation: 'KR',
      crossBorderTransfer: false,
      additionalRequirements: ['kiso_commission_approval'],
      penalties: {
        criminal: 'Up to 5 years imprisonment',
        administrative: 'Up to ₩50 million'
      }
    });

    // China
    this.complianceRules.set('CN', {
      type: 'one_party',
      requiresDisclosure: true,
      legalBasis: '网络安全法 (Cybersecurity Law)',
      consentMethod: ['explicit_consent'],
      retentionPeriod: 365,
      storageLocation: 'CN',
      crossBorderTransfer: false,
      additionalRequirements: ['cybersecurity_review', 'data_localization'],
      penalties: {
        administrative: 'Up to ¥1 million'
      }
    });

    // India
    this.complianceRules.set('IN', {
      type: 'one_party',
      requiresDisclosure: true,
      legalBasis: 'Information Technology Act, 2000',
      consentMethod: ['explicit_consent'],
      retentionPeriod: 365,
      storageLocation: 'IN',
      crossBorderTransfer: false,
      additionalRequirements: ['intermediary_guidelines'],
      penalties: {
        criminal: 'Up to 3 years imprisonment'
      }
    });

    // Brazil
    this.complianceRules.set('BR', {
      type: 'one_party',
      requiresDisclosure: true,
      legalBasis: 'LGPD (Lei Geral de Proteção de Dados)',
      consentMethod: ['explicit_consent'],
      retentionPeriod: 365,
      storageLocation: 'BR',
      crossBorderTransfer: false,
      additionalRequirements: ['anpd_registration', 'data_protection_officer'],
      penalties: {
        administrative: 'Up to R$50 million'
      }
    });

    // Additional countries with simplified rules
    const additionalCountries = [
      { code: 'MX', type: 'one_party', legalBasis: 'Federal Law on Protection of Personal Data' },
      { code: 'AR', type: 'one_party', legalBasis: 'Personal Data Protection Law' },
      { code: 'RU', type: 'one_party', legalBasis: 'Federal Law on Personal Data' },
      { code: 'ZA', type: 'one_party', legalBasis: 'Protection of Personal Information Act' },
      { code: 'SG', type: 'one_party', legalBasis: 'Personal Data Protection Act' },
      { code: 'MY', type: 'one_party', legalBasis: 'Personal Data Protection Act' },
      { code: 'TH', type: 'one_party', legalBasis: 'Personal Data Protection Act' },
      { code: 'ID', type: 'one_party', legalBasis: 'Electronic Information and Transactions Law' },
      { code: 'VN', type: 'one_party', legalBasis: 'Cybersecurity Law' },
      { code: 'PH', type: 'one_party', legalBasis: 'Data Privacy Act' }
    ];

    additionalCountries.forEach(country => {
      this.complianceRules.set(country.code, {
        type: country.type,
        requiresDisclosure: true,
        legalBasis: country.legalBasis,
        consentMethod: ['explicit_consent'],
        retentionPeriod: 365,
        storageLocation: country.code,
        crossBorderTransfer: false
      });
    });

    console.log(`Initialized compliance rules for ${this.complianceRules.size} countries/regions`);
  }

  // Create compliance session for a call
  createComplianceSession(sessionId, participantInfo, callMetadata) {
    const session = {
      id: sessionId,
      participants: participantInfo,
      callMetadata,
      startTime: Date.now(),
      complianceStatus: {
        isCompliant: false,
        requirementsMet: [],
        missingRequirements: [],
        warnings: [],
        jurisdiction: null
      },
      consentRecords: [],
      auditLog: []
    };

    // Determine applicable jurisdiction
    session.complianceStatus.jurisdiction = this.determineJurisdiction(participantInfo, callMetadata);
    
    // Validate initial compliance
    this.validateCompliance(session);
    
    this.activeComplianceSessions.set(sessionId, session);
    
    console.log(`Created compliance session ${sessionId} for jurisdiction ${session.complianceStatus.jurisdiction}`);
    
    return session;
  }

  // Determine applicable jurisdiction
  determineJurisdiction(participantInfo, callMetadata) {
    // Priority order: participant location > server location > company location > default
    const locations = [
      ...participantInfo.map(p => p.location),
      callMetadata.serverLocation,
      callMetadata.companyLocation,
      'US' // default
    ];

    // Find the first location with compliance rules
    for (const location of locations) {
      if (this.complianceRules.has(location)) {
        return location;
      }
      
      // Check for EU member states
      if (location && this.complianceRules.has('EU')) {
        const euRules = this.complianceRules.get('EU');
        if (euRules.memberStates && euRules.memberStates[location]) {
          return location;
        }
      }
      
      // Check for US states
      if (location && this.complianceRules.has('US')) {
        const usRules = this.complianceRules.get('US');
        if (usRules.states && usRules.states[location]) {
          return 'US-' + location;
        }
      }
    }

    return 'UNKNOWN';
  }

  // Validate compliance for a session
  validateCompliance(session) {
    const jurisdiction = session.complianceStatus.jurisdiction;
    const rules = this.getComplianceRules(jurisdiction);
    
    if (!rules) {
      session.complianceStatus.warnings.push({
        type: 'unknown_jurisdiction',
        message: 'Unknown jurisdiction - compliance verification required'
      });
      return;
    }

    // Reset compliance status
    session.complianceStatus.requirementsMet = [];
    session.complianceStatus.missingRequirements = [];
    session.complianceStatus.warnings = [];

    // Check disclosure requirement
    if (rules.requiresDisclosure) {
      const hasDisclosure = session.consentRecords.some(record => 
        record.type === 'disclosure' && record.timestamp > 0
      );
      
      if (hasDisclosure) {
        session.complianceStatus.requirementsMet.push('disclosure');
      } else {
        session.complianceStatus.missingRequirements.push({
          type: 'disclosure',
          message: 'Disclosure of recording required',
          action: 'Provide verbal or written disclosure'
        });
      }
    }

    // Check consent requirements based on recording type
    if (rules.type === 'all_party') {
      const allParticipantsConsented = session.participants.every(participant =>
        session.consentRecords.some(record =>
          record.participantId === participant.id &&
          record.type === 'consent' &&
          record.value === true
        )
      );

      if (allParticipantsConsented) {
        session.complianceStatus.requirementsMet.push('all_party_consent');
      } else {
        session.complianceStatus.missingRequirements.push({
          type: 'all_party_consent',
          message: 'Consent required from all participants',
          action: 'Obtain explicit consent from all participants'
        });
      }
    } else if (rules.type === 'one_party') {
      const hasAnyConsent = session.consentRecords.some(record =>
        record.type === 'consent' && record.value === true
      );

      if (hasAnyConsent) {
        session.complianceStatus.requirementsMet.push('one_party_consent');
      } else {
        session.complianceStatus.missingRequirements.push({
          type: 'one_party_consent',
          message: 'Consent required from at least one participant',
          action: 'Obtain consent from recording participant'
        });
      }
    }

    // Check GDPR-specific requirements
    if (rules.type === 'gdpr') {
      const gdprRequirements = ['data_protection_officer', 'privacy_policy', 'data_subject_rights'];
      
      gdprRequirements.forEach(requirement => {
        const hasRequirement = session.consentRecords.some(record =>
          record.type === requirement && record.value === true
        );

        if (hasRequirement) {
          session.complianceStatus.requirementsMet.push(requirement);
        } else {
          session.complianceStatus.missingRequirements.push({
            type: requirement,
            message: `GDPR requirement: ${requirement}`,
            action: 'Implement GDPR compliance measures'
          });
        }
      });
    }

    // Check additional requirements
    if (rules.additionalRequirements) {
      rules.additionalRequirements.forEach(requirement => {
        const hasRequirement = session.consentRecords.some(record =>
          record.type === requirement && record.value === true
        );

        if (hasRequirement) {
          session.complianceStatus.requirementsMet.push(requirement);
        } else {
          session.complianceStatus.missingRequirements.push({
            type: requirement,
            message: `Additional requirement: ${requirement}`,
            action: 'Implement additional compliance measures'
          });
        }
      });
    }

    // Determine overall compliance
    session.complianceStatus.isCompliant = session.complianceStatus.missingRequirements.length === 0;

    // Add jurisdiction-specific warnings
    this.addJurisdictionWarnings(session, jurisdiction);

    // Emit compliance validation event
    this.emit('complianceValidated', {
      sessionId: session.id,
      complianceStatus: session.complianceStatus,
      jurisdiction
    });
  }

  // Add jurisdiction-specific warnings
  addJurisdictionWarnings(session, jurisdiction) {
    const rules = this.getComplianceRules(jurisdiction);
    
    if (!rules) return;

    // Add strict requirement warnings
    if (rules.type === 'all_party' || rules.type === 'gdpr') {
      session.complianceStatus.warnings.push({
        type: 'strict_requirements',
        message: 'Strict consent requirements apply',
        severity: 'high'
      });
    }

    // Add legal advice warnings for complex jurisdictions
    const complexJurisdictions = ['DE', 'FR', 'US-CA', 'US-FL', 'BR', 'CN'];
    if (complexJurisdictions.includes(jurisdiction)) {
      session.complianceStatus.warnings.push({
        type: 'legal_advice_recommended',
        message: 'Legal consultation recommended for this jurisdiction',
        severity: 'medium'
      });
    }
  }

  // Get compliance rules for jurisdiction
  getComplianceRules(jurisdiction) {
    if (!jurisdiction || jurisdiction === 'UNKNOWN') {
      return null;
    }

    // Check direct jurisdiction
    if (this.complianceRules.has(jurisdiction)) {
      return this.complianceRules.get(jurisdiction);
    }

    // Check US state rules
    if (jurisdiction.startsWith('US-')) {
      const stateCode = jurisdiction.substring(3);
      const usRules = this.complianceRules.get('US');
      if (usRules && usRules.states && usRules.states[stateCode]) {
        return { ...usRules.federal, ...usRules.states[stateCode] };
      }
    }

    // Check EU member state rules
    const euRules = this.complianceRules.get('EU');
    if (euRules && euRules.memberStates && euRules.memberStates[jurisdiction]) {
      return { ...euRules, ...euRules.memberStates[jurisdiction] };
    }

    return null;
  }

  // Record consent or disclosure
  recordConsent(sessionId, consentData) {
    const session = this.activeComplianceSessions.get(sessionId);
    if (!session) {
      throw new Error(`Compliance session ${sessionId} not found`);
    }

    const consentRecord = {
      id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...consentData
    };

    session.consentRecords.push(consentRecord);
    
    // Add to audit log
    session.auditLog.push({
      timestamp: Date.now(),
      action: 'consent_recorded',
      details: consentRecord
    });

    // Revalidate compliance
    this.validateCompliance(session);

    this.emit('consentRecorded', {
      sessionId,
      consentRecord,
      complianceStatus: session.complianceStatus
    });

    return consentRecord;
  }

  // Get localized consent text
  getLocalizedConsentText(jurisdiction, language = 'en') {
    const rules = this.getComplianceRules(jurisdiction);
    if (!rules) {
      return this.getFallbackConsentText(language);
    }

    const consentText = {
      title: this.i18nService.getLegalText(`legal.consent.${rules.type}_title`, language),
      message: this.i18nService.getLegalText(`legal.consent.${rules.type}_message`, language),
      legalBasis: rules.legalBasis,
      requirements: this.getConsentRequirements(rules, language),
      actions: this.getConsentActions(rules, language)
    };

    return consentText;
  }

  // Get consent requirements
  getConsentRequirements(rules, language) {
    const requirements = [];

    if (rules.requiresDisclosure) {
      requirements.push({
        type: 'disclosure',
        text: this.i18nService.getLegalText('legal.requirements.disclosure', language)
      });
    }

    if (rules.type === 'all_party') {
      requirements.push({
        type: 'all_party_consent',
        text: this.i18nService.getLegalText('legal.requirements.all_party_consent', language)
      });
    }

    if (rules.type === 'gdpr') {
      requirements.push({
        type: 'gdpr_rights',
        text: this.i18nService.getLegalText('legal.requirements.gdpr_rights', language)
      });
    }

    return requirements;
  }

  // Get consent actions
  getConsentActions(rules, language) {
    return [
      {
        action: 'accept',
        text: this.i18nService.getLegalText('legal.actions.accept_recording', language),
        style: 'primary'
      },
      {
        action: 'decline',
        text: this.i18nService.getLegalText('legal.actions.decline_recording', language),
        style: 'secondary'
      },
      {
        action: 'learn_more',
        text: this.i18nService.getLegalText('legal.actions.learn_more', language),
        style: 'link'
      }
    ];
  }

  // Get fallback consent text
  getFallbackConsentText(language) {
    return {
      title: this.i18nService.getLegalText('legal.consent.varies_title', language),
      message: this.i18nService.getLegalText('legal.consent.varies_message', language),
      legalBasis: 'Unknown jurisdiction',
      requirements: [{
        type: 'legal_review',
        text: this.i18nService.getLegalText('legal.warnings.legal_advice_required', language)
      }],
      actions: this.getConsentActions({}, language)
    };
  }

  // Get session compliance status
  getComplianceStatus(sessionId) {
    const session = this.activeComplianceSessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      sessionId: session.id,
      jurisdiction: session.complianceStatus.jurisdiction,
      isCompliant: session.complianceStatus.isCompliant,
      requirementsMet: session.complianceStatus.requirementsMet,
      missingRequirements: session.complianceStatus.missingRequirements,
      warnings: session.complianceStatus.warnings,
      consentRecords: session.consentRecords.length,
      sessionDuration: Date.now() - session.startTime
    };
  }

  // End compliance session
  endComplianceSession(sessionId) {
    const session = this.activeComplianceSessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Add session end to audit log
    session.auditLog.push({
      timestamp: Date.now(),
      action: 'session_ended',
      details: {
        duration: Date.now() - session.startTime,
        finalComplianceStatus: session.complianceStatus
      }
    });

    // Generate compliance report
    const report = this.generateComplianceReport(session);

    // Remove from active sessions
    this.activeComplianceSessions.delete(sessionId);

    // Emit session end event
    this.emit('complianceSessionEnded', {
      sessionId,
      report
    });

    console.log(`Ended compliance session ${sessionId}`);
    
    return report;
  }

  // Generate compliance report
  generateComplianceReport(session) {
    return {
      sessionId: session.id,
      jurisdiction: session.complianceStatus.jurisdiction,
      startTime: session.startTime,
      endTime: Date.now(),
      duration: Date.now() - session.startTime,
      finalComplianceStatus: session.complianceStatus,
      participantCount: session.participants.length,
      consentRecords: session.consentRecords,
      auditLog: session.auditLog,
      complianceScore: this.calculateComplianceScore(session)
    };
  }

  // Calculate compliance score
  calculateComplianceScore(session) {
    const totalRequirements = session.complianceStatus.requirementsMet.length + 
                             session.complianceStatus.missingRequirements.length;
    
    if (totalRequirements === 0) return 0;
    
    const metRequirements = session.complianceStatus.requirementsMet.length;
    const baseScore = (metRequirements / totalRequirements) * 100;
    
    // Deduct points for warnings
    const warningDeduction = session.complianceStatus.warnings.length * 5;
    
    return Math.max(0, baseScore - warningDeduction);
  }

  // Get all supported jurisdictions
  getSupportedJurisdictions() {
    const jurisdictions = [];
    
    for (const [code, rules] of this.complianceRules.entries()) {
      if (code === 'US') {
        // Add federal and states
        jurisdictions.push({
          code: 'US',
          name: 'United States (Federal)',
          type: rules.federal.type,
          legalBasis: rules.federal.legalBasis
        });
        
        for (const stateCode of Object.keys(rules.states)) {
          jurisdictions.push({
            code: `US-${stateCode}`,
            name: `United States - ${stateCode}`,
            type: rules.states[stateCode].type,
            legalBasis: rules.states[stateCode].legalBasis
          });
        }
      } else if (code === 'EU') {
        // Add EU and member states
        jurisdictions.push({
          code: 'EU',
          name: 'European Union',
          type: rules.type,
          legalBasis: rules.legalBasis
        });
        
        for (const memberState of Object.keys(rules.memberStates)) {
          jurisdictions.push({
            code: memberState,
            name: `EU - ${memberState}`,
            type: rules.type,
            legalBasis: rules.memberStates[memberState].legalBasis || rules.legalBasis
          });
        }
      } else {
        jurisdictions.push({
          code,
          name: this.getCountryName(code),
          type: rules.type,
          legalBasis: rules.legalBasis
        });
      }
    }
    
    return jurisdictions.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get country name
  getCountryName(code) {
    const countryNames = {
      'CA': 'Canada',
      'AU': 'Australia',
      'JP': 'Japan',
      'KR': 'South Korea',
      'CN': 'China',
      'IN': 'India',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'AR': 'Argentina',
      'RU': 'Russia',
      'ZA': 'South Africa',
      'SG': 'Singapore',
      'MY': 'Malaysia',
      'TH': 'Thailand',
      'ID': 'Indonesia',
      'VN': 'Vietnam',
      'PH': 'Philippines'
    };
    
    return countryNames[code] || code;
  }

  // Health check
  async healthCheck() {
    const stats = {
      activeSessions: this.activeComplianceSessions.size,
      supportedJurisdictions: this.complianceRules.size,
      totalCountries: this.getSupportedJurisdictions().length,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    return stats;
  }

  // Cleanup resources
  async cleanup() {
    console.log('Cleaning up Global Compliance Service...');
    
    // End all active sessions
    for (const sessionId of this.activeComplianceSessions.keys()) {
      this.endComplianceSession(sessionId);
    }
    
    console.log('Global Compliance Service cleaned up');
  }
}

module.exports = GlobalComplianceService;
