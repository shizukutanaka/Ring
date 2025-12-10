// Privacy Compliance Service (GDPR/CCPA/Global Privacy Laws)
// Comprehensive privacy management and compliance automation

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

class PrivacyComplianceService {
  constructor() {
    this.complianceFrameworks = new Map();
    this.dataSubjectRequests = new Map();
    this.consentManager = new Map();
    this.dataRetention = new Map();
    this.auditTrail = [];
    this.privacySettings = new Map();
    
    this.initializeFrameworks();
    this.initializeRetentionPolicies();
  }

  // Initialize compliance frameworks
  initializeFrameworks() {
    // GDPR (EU)
    this.complianceFrameworks.set('GDPR', {
      regions: ['EU', 'GB', 'NO', 'IS', 'LI', 'CH'],
      requirements: {
        consent: {
          explicit: true,
          granular: true,
          informed: true,
          unambiguous: true,
          freelyGiven: true,
          specific: true,
          withdrawable: true
        },
        dataRights: {
          access: true,
          rectification: true,
          erasure: 'right_to_be_forgotten',
          portability: true,
          objection: true,
          restriction: true,
          notification: true
        },
        retention: {
          purposeLimitation: true,
          dataMinimization: true,
          storageLimitation: true,
          accuracy: true,
          security: true,
          accountability: true
        },
        breachNotification: {
          timeframe: 72, // hours
          supervisoryAuthority: true,
          dataSubjects: 'high_risk'
        },
        international: {
          transfers: 'adequacy_decision',
          safeguards: ['SCCs', 'BCRs'],
          bindingCorporateRules: true
        }
      },
      penalties: {
        maxFine: 20000000, // EUR or 4% of global turnover
        tiers: {
          lower: 10000000, // EUR or 2% of turnover
          upper: 20000000  // EUR or 4% of turnover
        }
      }
    });

    // CCPA (California)
    this.complianceFrameworks.set('CCPA', {
      regions: ['US-CA'],
      requirements: {
        consent: {
          explicit: false,
          optOut: true,
          optIn: 'sale_of_data',
          minors: 'opt_in_required',
          authorization: true
        },
        dataRights: {
          access: true,
          deletion: true,
          optOut: 'sale',
          portability: true,
          nondiscrimination: true
        },
        retention: {
          purposeLimitation: true,
          dataMinimization: false,
          storageLimitation: 'business_purpose',
          accuracy: true,
          security: true
        },
        breachNotification: {
          timeframe: 30, // days for California residents
          consumers: true,
          attorneyGeneral: 'unreasonable_risk'
        },
        international: {
          transfers: 'no_restriction',
          safeguards: [],
          bindingCorporateRules: false
        }
      },
      penalties: {
        maxFine: 7500, // USD per violation
        tiers: {
          civil: 7500,
          intentional: 7500,
          reckless: 7500
        }
      }
    });

    // LGPD (Brazil)
    this.complianceFrameworks.set('LGPD', {
      regions: ['BR'],
      requirements: {
        consent: {
          explicit: true,
          granular: true,
          informed: true,
          withdrawable: true
        },
        dataRights: {
          access: true,
          correction: true,
          deletion: true,
          portability: true,
          information: true,
          revocation: true
        },
        retention: {
          purposeLimitation: true,
          dataMinimization: true,
          storageLimitation: true,
          security: true
        },
        breachNotification: {
          timeframe: 72, // hours
          authority: true,
          dataSubjects: 'relevant_risk'
        }
      }
    });

    // PIPL (China)
    this.complianceFrameworks.set('PIPL', {
      regions: ['CN'],
      requirements: {
        consent: {
          explicit: true,
          separate: true,
          informed: true,
          withdrawable: true
        },
        dataRights: {
          access: true,
          correction: true,
          deletion: true,
          withdrawal: true,
          explanation: true
        },
        retention: {
          purposeLimitation: true,
          dataMinimization: true,
          storageLimitation: true,
          security: true,
          localStorage: 'critical_data'
        },
        international: {
          transfers: 'security_assessment',
          safeguards: ['certification', 'standard_contract'],
          localStorage: true
        }
      }
    });
  }

  // Initialize data retention policies
  initializeRetentionPolicies() {
    this.dataRetention.set('call_recordings', {
      default: 90, // days
      max: 365, // days
      legalHold: true,
      categories: {
        'customer_service': 180,
        'sales': 90,
        'support': 365,
        'compliance': 2555, // 7 years
        'legal': 2555
      },
      exceptions: {
        'legal_hold': 'indefinite',
        'investigation': 'until_resolution',
        'regulatory': 'as_required'
      }
    });

    this.dataRetention.set('metadata', {
      default: 365,
      max: 2555,
      legalHold: true,
      categories: {
        'session_info': 90,
        'participant_data': 365,
        'consent_records': 2555,
        'audit_logs': 2555
      }
    });

    this.dataRetention.set('transcriptions', {
      default: 180,
      max: 2555,
      legalHold: true,
      categories: {
        'ai_generated': 90,
        'human_verified': 365,
        'legal_review': 2555
      }
    });
  }

  // Determine applicable compliance frameworks
  getApplicableFrameworks(userLocation, dataProcessingLocation) {
    const frameworks = [];
    
    for (const [name, framework] of this.complianceFrameworks) {
      if (framework.regions.includes(userLocation) || 
          framework.regions.includes(dataProcessingLocation)) {
        frameworks.push(name);
      }
    }
    
    // Default to GDPR if no specific framework applies
    if (frameworks.length === 0) {
      frameworks.push('GDPR');
    }
    
    return frameworks;
  }

  // Manage consent records
  recordConsent(consentData) {
    const consentId = crypto.randomUUID();
    const consentRecord = {
      id: consentId,
      timestamp: Date.now(),
      userId: consentData.userId,
      sessionId: consentData.sessionId,
      purpose: consentData.purpose, // 'call_recording', 'data_processing', 'marketing'
      consentGiven: consentData.consentGiven,
      legalBasis: consentData.legalBasis, // 'consent', 'legitimate_interest', 'contractual'
      scope: consentData.scope, // 'specific', 'all'
      duration: consentData.duration, // 'session', '30_days', 'indefinite'
      withdrawalMechanism: consentData.withdrawalMechanism,
      language: consentData.language,
      ipAddress: consentData.ipAddress,
      userAgent: consentData.userAgent,
      location: consentData.location,
      frameworks: consentData.frameworks || ['GDPR'],
      version: consentData.version || '1.0',
      metadata: {
        granular: consentData.granular || false,
        explicit: consentData.explicit || false,
        informed: consentData.informed || false,
        freelyGiven: consentData.freelyGiven || false
      }
    };

    this.consentManager.set(consentId, consentRecord);
    this.logAuditEvent('CONSENT_RECORDED', consentRecord);
    
    return consentId;
  }

  // Check if consent is valid
  isConsentValid(consentId, purpose, userId) {
    const consent = this.consentManager.get(consentId);
    
    if (!consent) {
      return { valid: false, reason: 'consent_not_found' };
    }
    
    if (consent.userId !== userId) {
      return { valid: false, reason: 'user_mismatch' };
    }
    
    if (consent.purpose !== purpose && consent.scope !== 'all') {
      return { valid: false, reason: 'purpose_mismatch' };
    }
    
    if (!consent.consentGiven) {
      return { valid: false, reason: 'consent_withdrawn' };
    }
    
    // Check duration
    if (consent.duration !== 'indefinite') {
      const expiryTime = this.calculateConsentExpiry(consent);
      if (Date.now() > expiryTime) {
        return { valid: false, reason: 'consent_expired' };
      }
    }
    
    return { valid: true, consent };
  }

  // Calculate consent expiry time
  calculateConsentExpiry(consent) {
    const durations = {
      'session': 24 * 60 * 60 * 1000, // 24 hours
      '30_days': 30 * 24 * 60 * 60 * 1000,
      '90_days': 90 * 24 * 60 * 60 * 1000,
      '1_year': 365 * 24 * 60 * 60 * 1000,
      'indefinite': Number.MAX_SAFE_INTEGER
    };
    
    return consent.timestamp + (durations[consent.duration] || durations['30_days']);
  }

  // Withdraw consent
  withdrawConsent(consentId, userId, reason) {
    const consent = this.consentManager.get(consentId);
    
    if (!consent || consent.userId !== userId) {
      throw new Error('Invalid consent record');
    }
    
    consent.consentGiven = false;
    consent.withdrawalTimestamp = Date.now();
    consent.withdrawalReason = reason;
    
    this.logAuditEvent('CONSENT_WITHDRAWN', {
      consentId,
      userId,
      reason,
      timestamp: Date.now()
    });
    
    // Trigger data deletion if required
    this.processConsentWithdrawal(consent);
    
    return consent;
  }

  // Process consent withdrawal consequences
  processConsentWithdrawal(consent) {
    if (consent.purpose === 'call_recording') {
      // Delete or anonymize call recordings
      this.scheduleDataDeletion('call_recordings', consent.userId, 'consent_withdrawal');
    }
    
    if (consent.purpose === 'data_processing') {
      // Stop all data processing activities
      this.stopDataProcessing(consent.userId);
    }
  }

  // Handle data subject requests (DSAR)
  createDataSubjectRequest(requestData) {
    const requestId = crypto.randomUUID();
    const request = {
      id: requestId,
      timestamp: Date.now(),
      userId: requestData.userId,
      type: requestData.type, // 'access', 'deletion', 'portability', 'rectification', 'objection'
      status: 'pending',
      priority: requestData.priority || 'normal',
      scope: requestData.scope || 'all',
      format: requestData.format || 'json',
      delivery: requestData.delivery || 'secure_download',
      identity: {
        verified: false,
        verificationMethod: null,
        verificationTimestamp: null
      },
      processing: {
        started: null,
        completed: null,
        estimatedCompletion: null,
        assignedTo: null
      },
      metadata: {
        userAgent: requestData.userAgent,
        ipAddress: requestData.ipAddress,
        location: requestData.location,
        frameworks: requestData.frameworks || ['GDPR'],
        legalReference: requestData.legalReference
      },
      audit: []
    };

    this.dataSubjectRequests.set(requestId, request);
    this.logAuditEvent('DSAR_CREATED', request);
    
    // Start processing if identity is pre-verified
    if (requestData.verifiedIdentity) {
      this.verifyIdentity(requestId, requestData.verifiedIdentity);
    }
    
    return requestId;
  }

  // Verify identity for DSAR
  async verifyIdentity(requestId, verificationData) {
    const request = this.dataSubjectRequests.get(requestId);
    if (!request) {
      throw new Error('Request not found');
    }
    
    // Implement identity verification logic
    const verificationResult = await this.performIdentityVerification(verificationData);
    
    request.identity.verified = verificationResult.verified;
    request.identity.verificationMethod = verificationResult.method;
    request.identity.verificationTimestamp = Date.now();
    
    if (verificationResult.verified) {
      request.status = 'verified';
      this.startDSARProcessing(requestId);
    } else {
      request.status = 'identity_verification_failed';
    }
    
    this.logAuditEvent('IDENTITY_VERIFICATION', {
      requestId,
      verified: verificationResult.verified,
      method: verificationResult.method
    });
    
    return verificationResult;
  }

  // Perform identity verification
  async performIdentityVerification(verificationData) {
    // This would integrate with identity verification services
    // For now, return a placeholder result
    return {
      verified: true,
      method: 'document_verification',
      confidence: 0.95
    };
  }

  // Start processing DSAR
  async startDSARProcessing(requestId) {
    const request = this.dataSubjectRequests.get(requestId);
    if (!request || !request.identity.verified) {
      throw new Error('Request not verified');
    }
    
    request.status = 'processing';
    request.processing.started = Date.now();
    request.processing.estimatedCompletion = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
    
    this.logAuditEvent('DSAR_PROCESSING_STARTED', { requestId });
    
    // Process based on request type
    switch (request.type) {
      case 'access':
        await this.processAccessRequest(requestId);
        break;
      case 'deletion':
        await this.processDeletionRequest(requestId);
        break;
      case 'portability':
        await this.processPortabilityRequest(requestId);
        break;
      case 'rectification':
        await this.processRectificationRequest(requestId);
        break;
      case 'objection':
        await this.processObjectionRequest(requestId);
        break;
    }
  }

  // Process access request
  async processAccessRequest(requestId) {
    const request = this.dataSubjectRequests.get(requestId);
    const userData = await this.collectUserData(request.userId, request.scope);
    
    const accessReport = {
      requestId,
      userId: request.userId,
      generatedAt: Date.now(),
      dataCategories: Object.keys(userData),
      records: userData,
      processingActivities: await this.getUserProcessingActivities(request.userId),
      recipients: await this.getDataRecipients(request.userId),
      retentionPeriods: await this.getDataRetentionPeriods(request.userId),
      legalBasis: await this.getLegalBasisForUserData(request.userId)
    };
    
    // Store access report
    await this.storeAccessReport(accessReport);
    
    request.status = 'completed';
    request.processing.completed = Date.now();
    
    this.logAuditEvent('ACCESS_REQUEST_COMPLETED', { requestId });
    
    return accessReport;
  }

  // Process deletion request (Right to be Forgotten)
  async processDeletionRequest(requestId) {
    const request = this.dataSubjectRequests.get(requestId);
    
    // Collect all user data
    const userData = await this.collectUserData(request.userId, 'all');
    
    // Check for legal holds or retention requirements
    const holds = await this.checkLegalHolds(request.userId);
    
    if (holds.length > 0) {
      request.status = 'legal_hold';
      request.legalHolds = holds;
      this.logAuditEvent('DELETION_BLOCKED_BY_LEGAL_HOLD', { requestId, holds });
      return;
    }
    
    // Perform deletion
    const deletionReport = {
      requestId,
      userId: request.userId,
      deletedAt: Date.now(),
      deletedCategories: [],
      retainedCategories: [],
      anonymizedCategories: []
    };
    
    for (const [category, records] of Object.entries(userData)) {
      const retention = this.dataRetention.get(category);
      
      if (retention && retention.legalHold) {
        deletionReport.retainedCategories.push(category);
      } else if (this.shouldAnonymize(category)) {
        await this.anonymizeData(category, records);
        deletionReport.anonymizedCategories.push(category);
      } else {
        await this.deleteData(category, records);
        deletionReport.deletedCategories.push(category);
      }
    }
    
    // Store deletion report
    await this.storeDeletionReport(deletionReport);
    
    request.status = 'completed';
    request.processing.completed = Date.now();
    
    this.logAuditEvent('DELETION_REQUEST_COMPLETED', { requestId });
    
    return deletionReport;
  }

  // Process data portability request
  async processPortabilityRequest(requestId) {
    const request = this.dataSubjectRequests.get(requestId);
    const userData = await this.collectUserData(request.userId, request.scope);
    
    // Convert to requested format
    const portableData = this.convertToFormat(userData, request.format);
    
    const portabilityReport = {
      requestId,
      userId: request.userId,
      generatedAt: Date.now(),
      format: request.format,
      data: portableData,
      metadata: {
        categories: Object.keys(userData),
        recordCount: this.countRecords(userData),
        size: JSON.stringify(portableData).length
      }
    };
    
    // Store and provide secure download
    await this.storePortableData(portabilityReport);
    
    request.status = 'completed';
    request.processing.completed = Date.now();
    
    this.logAuditEvent('PORTABILITY_REQUEST_COMPLETED', { requestId });
    
    return portabilityReport;
  }

  // Data breach notification
  async reportDataBreach(breachData) {
    const breachId = crypto.randomUUID();
    const breach = {
      id: breachId,
      timestamp: Date.now(),
      discoveredAt: breachData.discoveredAt,
      severity: breachData.severity, // 'low', 'medium', 'high', 'critical'
      type: breachData.type, // 'unauthorized_access', 'data_loss', 'theft', 'modification'
      scope: breachData.scope,
      affectedUsers: breachData.affectedUsers || [],
      dataCategories: breachData.dataCategories || [],
      description: breachData.description,
      mitigation: breachData.mitigation || [],
      notificationRequirements: this.calculateNotificationRequirements(breachData),
      status: 'investigating'
    };

    // Determine notification requirements
    const frameworks = breachData.frameworks || ['GDPR'];
    const notificationPlan = this.createNotificationPlan(breach, frameworks);
    
    breach.notificationPlan = notificationPlan;
    
    this.logAuditEvent('DATA_BREACH_REPORTED', breach);
    
    // Start notification process if required
    if (notificationPlan.immediate) {
      await this.executeNotificationPlan(breach);
    }
    
    return breachId;
  }

  // Calculate notification requirements
  calculateNotificationRequirements(breachData) {
    const requirements = {
      supervisoryAuthority: false,
      dataSubjects: false,
      timeframe: null,
      content: []
    };
    
    // GDPR requirements
    if (breachData.frameworks?.includes('GDPR')) {
      if (breachData.severity === 'high' || breachData.severity === 'critical') {
        requirements.supervisoryAuthority = true;
        requirements.dataSubjects = true;
        requirements.timeframe = 72; // hours
      }
    }
    
    // CCPA requirements
    if (breachData.frameworks?.includes('CCPA')) {
      if (breachData.type === 'unauthorized_access' && breachData.affectedUsers?.length > 0) {
        requirements.dataSubjects = true;
        requirements.timeframe = 30; // days
      }
    }
    
    return requirements;
  }

  // Create notification plan
  createNotificationPlan(breach, frameworks) {
    const plan = {
      immediate: false,
      scheduled: null,
      channels: [],
      templates: [],
      recipients: {
        authorities: [],
        dataSubjects: [],
        internal: []
      }
    };
    
    frameworks.forEach(framework => {
      const frameworkConfig = this.complianceFrameworks.get(framework);
      if (frameworkConfig?.requirements.breachNotification) {
        const config = frameworkConfig.requirements.breachNotification;
        
        if (config.timeframe) {
          plan.scheduled = breach.timestamp + (config.timeframe * 60 * 60 * 1000);
          plan.immediate = config.timeframe <= 72; // Immediate for urgent notifications
        }
        
        if (config.supervisoryAuthority) {
          plan.recipients.authorities.push(this.getSupervisoryAuthority(framework));
        }
        
        if (config.dataSubjects === true || 
            (config.dataSubjects === 'high_risk' && breach.severity === 'high')) {
          plan.recipients.dataSubjects = breach.affectedUsers;
        }
      }
    });
    
    return plan;
  }

  // Get supervisory authority for framework
  getSupervisoryAuthority(framework) {
    const authorities = {
      'GDPR': {
        name: 'Information Commissioner\'s Office',
        email: 'casework@ico.org.uk',
        phone: '+44 303 123 1113'
      },
      'CCPA': {
        name: 'California Attorney General',
        email: 'privacy@oag.ca.gov',
        phone: '1-800-952-5225'
      }
    };
    
    return authorities[framework] || null;
  }

  // Execute notification plan
  async executeNotificationPlan(breach) {
    const { notificationPlan } = breach;
    
    // Notify authorities
    for (const authority of notificationPlan.recipients.authorities) {
      await this.notifyAuthority(breach, authority);
    }
    
    // Notify data subjects
    for (const subject of notificationPlan.recipients.dataSubjects) {
      await this.notifyDataSubject(breach, subject);
    }
    
    breach.status = 'notified';
    breach.notifiedAt = Date.now();
    
    this.logAuditEvent('BREACH_NOTIFICATIONS_SENT', { breachId: breach.id });
  }

  // Notify supervisory authority
  async notifyAuthority(breach, authority) {
    const notification = {
      breachId: breach.id,
      timestamp: Date.now(),
      authority,
      content: this.generateAuthorityNotification(breach),
      method: 'secure_email'
    };
    
    // This would integrate with secure email services
    console.log(`Notifying authority: ${authority.name}`, notification);
    
    this.logAuditEvent('AUTHORITY_NOTIFIED', notification);
  }

  // Notify data subjects
  async notifyDataSubject(breach, subjectId) {
    const notification = {
      breachId: breach.id,
      subjectId,
      timestamp: Date.now(),
      content: this.generateSubjectNotification(breach),
      method: 'secure_message'
    };
    
    // This would integrate with user notification systems
    console.log(`Notifying data subject: ${subjectId}`, notification);
    
    this.logAuditEvent('DATA_SUBJECT_NOTIFIED', notification);
  }

  // Generate authority notification content
  generateAuthorityNotification(breach) {
    return {
      subject: `Data Breach Report - ${breach.id}`,
      content: {
        breachId: breach.id,
        severity: breach.severity,
        type: breach.type,
        affectedUsers: breach.affectedUsers.length,
        dataCategories: breach.dataCategories,
        description: breach.description,
        mitigation: breach.mitigation,
        discoveredAt: breach.discoveredAt,
        reportedAt: breach.timestamp
      }
    };
  }

  // Generate subject notification content
  generateSubjectNotification(breach) {
    return {
      subject: 'Important Security Notification',
      content: {
        incidentType: 'data_breach',
        description: 'We are writing to inform you about a data security incident that may have affected your personal information.',
        affectedData: breach.dataCategories,
        protectiveMeasures: breach.mitigation,
        recommendations: [
          'Monitor your accounts for suspicious activity',
          'Change your passwords',
          'Be cautious of phishing attempts'
        ],
        contactInfo: {
          email: 'privacy@company.com',
          phone: '1-800-PRIVACY'
        }
      }
    };
  }

  // Helper methods for data operations
  async collectUserData(userId, scope) {
    // This would integrate with database systems
    // Placeholder implementation
    return {
      call_recordings: [],
      metadata: [],
      transcriptions: [],
      consent_records: []
    };
  }

  shouldAnonymize(category) {
    // Determine if data should be anonymized instead of deleted
    const anonymizableCategories = ['call_recordings', 'transcriptions'];
    return anonymizableCategories.includes(category);
  }

  async anonymizeData(category, records) {
    // Implement data anonymization
    console.log(`Anonymizing ${category} records: ${records.length} items`);
  }

  async deleteData(category, records) {
    // Implement data deletion
    console.log(`Deleting ${category} records: ${records.length} items`);
  }

  async checkLegalHolds(userId) {
    // Check for legal holds on user data
    return []; // Placeholder
  }

  async scheduleDataDeletion(category, userId, reason) {
    // Schedule data for deletion
    console.log(`Scheduling deletion of ${category} for user ${userId}: ${reason}`);
  }

  async stopDataProcessing(userId) {
    // Stop all data processing for user
    console.log(`Stopping data processing for user ${userId}`);
  }

  convertToFormat(userData, format) {
    // Convert data to requested format (JSON, CSV, XML)
    switch (format) {
      case 'csv':
        return this.convertToCSV(userData);
      case 'xml':
        return this.convertToXML(userData);
      default:
        return userData; // JSON
    }
  }

  convertToCSV(userData) {
    // Convert to CSV format
    return 'CSV format placeholder';
  }

  convertToXML(userData) {
    // Convert to XML format
    return '<xml>placeholder</xml>';
  }

  countRecords(userData) {
    return Object.values(userData).reduce((total, records) => total + records.length, 0);
  }

  // Audit logging
  logAuditEvent(event, data) {
    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      event,
      data,
      service: 'PrivacyComplianceService'
    };
    
    this.auditTrail.push(auditEntry);
    
    // Keep audit trail manageable
    if (this.auditTrail.length > 10000) {
      this.auditTrail = this.auditTrail.slice(-5000);
    }
  }

  // Get compliance status
  getComplianceStatus() {
    const status = {
      frameworks: Array.from(this.complianceFrameworks.keys()),
      activeConsents: this.consentManager.size,
      pendingDSARs: Array.from(this.dataSubjectRequests.values())
        .filter(req => req.status === 'pending' || req.status === 'processing').length,
      recentBreaches: this.auditTrail
        .filter(entry => entry.event === 'DATA_BREACH_REPORTED')
        .length,
      auditTrailSize: this.auditTrail.length
    };
    
    return status;
  }

  // Generate compliance report
  generateComplianceReport() {
    const report = {
      timestamp: Date.now(),
      frameworks: this.getFrameworkStatus(),
      consent: this.getConsentReport(),
      dataSubjectRequests: this.getDSARReport(),
      dataRetention: this.getRetentionReport(),
      breaches: this.getBreachReport(),
      recommendations: this.getComplianceRecommendations()
    };
    
    return report;
  }

  getFrameworkStatus() {
    const status = {};
    for (const [name, framework] of this.complianceFrameworks) {
      status[name] = {
        regions: framework.regions,
        requirements: Object.keys(framework.requirements),
        penalties: framework.penalties
      };
    }
    return status;
  }

  getConsentReport() {
    const consents = Array.from(this.consentManager.values());
    return {
      total: consents.length,
      active: consents.filter(c => c.consentGiven).length,
      withdrawn: consents.filter(c => !c.consentGiven).length,
      byPurpose: this.groupBy(consents, 'purpose'),
      byFramework: this.groupBy(consents, 'frameworks')
    };
  }

  getDSARReport() {
    const requests = Array.from(this.dataSubjectRequests.values());
    return {
      total: requests.length,
      byStatus: this.groupBy(requests, 'status'),
      byType: this.groupBy(requests, 'type'),
      averageProcessingTime: this.calculateAverageProcessingTime(requests)
    };
  }

  getRetentionReport() {
    return {
      policies: Array.from(this.dataRetention.entries()).map(([category, policy]) => ({
        category,
        default: policy.default,
        max: policy.max,
        legalHold: policy.legalHold
      }))
    };
  }

  getBreachReport() {
    const breaches = this.auditTrail.filter(entry => entry.event === 'DATA_BREACH_REPORTED');
    return {
      total: breaches.length,
      bySeverity: this.groupBy(breaches, 'data.severity'),
      byType: this.groupBy(breaches, 'data.type'),
      last30Days: breaches.filter(b => Date.now() - b.timestamp < 30 * 24 * 60 * 60 * 1000).length
    };
  }

  getComplianceRecommendations() {
    const recommendations = [];
    
    // Analyze consent patterns
    const consentReport = this.getConsentReport();
    if (consentReport.withdrawn / consentReport.total > 0.1) {
      recommendations.push({
        type: 'consent_optimization',
        priority: 'high',
        message: 'High consent withdrawal rate detected. Review consent process.'
      });
    }
    
    // Analyze DSAR processing
    const dsarReport = this.getDSARReport();
    if (dsarReport.averageProcessingTime > 15 * 24 * 60 * 60 * 1000) { // 15 days
      recommendations.push({
        type: 'dsar_processing',
        priority: 'medium',
        message: 'DSAR processing time exceeds recommended 15 days.'
      });
    }
    
    return recommendations;
  }

  // Helper methods
  groupBy(items, key) {
    return items.reduce((groups, item) => {
      const value = item[key];
      if (Array.isArray(value)) {
        value.forEach(v => {
          groups[v] = (groups[v] || 0) + 1;
        });
      } else {
        groups[value] = (groups[value] || 0) + 1;
      }
      return groups;
    }, {});
  }

  calculateAverageProcessingTime(requests) {
    const completed = requests.filter(req => req.processing.completed && req.processing.started);
    if (completed.length === 0) return 0;
    
    const totalTime = completed.reduce((sum, req) => 
      sum + (req.processing.completed - req.processing.started), 0);
    
    return totalTime / completed.length;
  }
}

module.exports = new PrivacyComplianceService();
