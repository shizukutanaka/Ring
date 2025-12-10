// Legal Database Internationalization Service
// Enhances legal database with multilingual support

const fs = require('fs');
const path = require('path');
const i18nService = require('./I18nService');

class LegalI18nService {
  constructor() {
    this.legalDbPath = path.join(__dirname, '../legaldb/expanded_legaldb.json');
    this.legalData = null;
    this.i18nService = i18nService;
  }

  // Load legal database
  loadLegalDatabase() {
    if (this.legalData) return this.legalData;

    try {
      const content = fs.readFileSync(this.legalDbPath, 'utf8');
      this.legalData = JSON.parse(content);
      return this.legalData;
    } catch (error) {
      console.error('Failed to load legal database:', error);
      return null;
    }
  }

  // Get localized legal information for a jurisdiction
  getLocalizedLegalInfo(jurisdiction, language = 'en') {
    const legalData = this.loadLegalDatabase();
    if (!legalData || !legalData.countries[jurisdiction]) {
      return this.getFallbackLegalInfo(language);
    }

    const countryInfo = legalData.countries[jurisdiction];
    
    return {
      jurisdiction,
      type: countryInfo.type,
      note: this.getLocalizedNote(countryInfo.note, language),
      legal_basis: this.getLocalizedLegalBasis(countryInfo.legal_basis, language),
      requires_disclosure: countryInfo.requires_disclosure,
      consent_title: this.getConsentTitle(countryInfo.type, language),
      consent_message: this.getConsentMessage(countryInfo.type, language),
      user_rights: this.getUserRights(countryInfo.type, language),
      warnings: this.getWarnings(countryInfo.type, language),
      actions: this.getActions(language),
      compliance_status: this.getComplianceStatus(countryInfo.type, language),
      localized_at: new Date().toISOString(),
    };
  }

  // Get localized note
  getLocalizedNote(originalNote, language) {
    // For now, return original note. In production, this would be translated
    // using professional legal translation services
    return originalNote;
  }

  // Get localized legal basis
  getLocalizedLegalBasis(legalBasis, language) {
    if (!legalBasis) return null;
    
    const translationKey = this.getLegalBasisTranslationKey(legalBasis);
    return this.i18nService.getLegalText(translationKey, language) || legalBasis;
  }

  // Get translation key for legal basis
  getLegalBasisTranslationKey(legalBasis) {
    const mapping = {
      '個人情報保護法': 'legal_basis.personal_information_protection_act',
      'California Penal Code § 632': 'legal_basis.california_penal_code_632',
      'Texas Penal Code § 16.02': 'legal_basis.texas_penal_code_16_02',
      'New York Penal Law § 250.00': 'legal_basis.new_york_penal_law_250_00',
      'Florida Statute § 934.03': 'legal_basis.florida_statute_934_03',
      'Canadian Criminal Code § 184': 'legal_basis.canadian_criminal_code_184',
      'UK GDPR, PECR': 'legal_basis.uk_gdpr_pecr',
      'GDPR (EU 2016/679)': 'legal_basis.eu_gdpr_2016_679',
      'Strafgesetzbuch § 201': 'legal_basis.strafgesetzbuch_201',
      'French Data Protection Act': 'legal_basis.french_data_protection_act',
      'GDPR, Spanish LSSI-CE': 'legal_basis.spanish_lssi_ce',
      'GDPR, Italian Privacy Code': 'legal_basis.italian_privacy_code',
      'GDPR, Dutch AVG': 'legal_basis.dutch_avg',
      'Surveillance Devices Act (各州)': 'legal_basis.surveillance_devices_act',
      'Crimes Act 1961': 'legal_basis.crimes_act_1961',
    };
    
    return mapping[legalBasis] || legalBasis;
  }

  // Get consent title based on recording type
  getConsentTitle(recordingType, language) {
    const titleMap = {
      'one_party': 'legal.consent.one_party_title',
      'all_party': 'legal.consent.all_party_title',
      'gdpr': 'legal.consent.gdpr_title',
      'varies': 'legal.consent.varies_title',
    };
    
    const key = titleMap[recordingType] || 'legal.consent.varies_title';
    return this.i18nService.getLegalText(key, language);
  }

  // Get consent message based on recording type
  getConsentMessage(recordingType, language) {
    const messageMap = {
      'one_party': 'legal.consent.one_party_message',
      'all_party': 'legal.consent.all_party_message',
      'gdpr': 'legal.consent.gdpr_message',
      'varies': 'legal.consent.varies_message',
    };
    
    const key = messageMap[recordingType] || 'legal.consent.varies_message';
    return this.i18nService.getLegalText(key, language);
  }

  // Get user rights based on recording type
  getUserRights(recordingType, language) {
    const rights = [];
    
    if (recordingType === 'gdpr') {
      const gdprRights = [
        'legal.rights.object',
        'legal.rights.access',
        'legal.rights.delete',
        'legal.rights.rectify',
        'legal.rights.portability',
        'legal.rights.complain'
      ];
      
      rights.push(...gdprRights.map(key => ({
        type: key.split('.').pop(),
        title: this.i18nService.getLegalText(key, language)
      })));
    }
    
    return rights;
  }

  // Get warnings based on recording type
  getWarnings(recordingType, language) {
    const warnings = [];
    
    if (recordingType === 'varies') {
      warnings.push({
        type: 'jurisdiction_unknown',
        message: this.i18nService.getLegalText('legal.warnings.jurisdiction_unknown', language)
      });
    }
    
    if (recordingType === 'gdpr' || recordingType === 'all_party') {
      warnings.push({
        type: 'strict_requirements',
        message: this.i18nService.getLegalText('legal.warnings.strict_requirements', language)
      });
    }
    
    // Add legal advice warning for complex jurisdictions
    const complexJurisdictions = ['DE', 'US-FL', 'EU'];
    if (complexJurisdictions.some(jur => recordingType.includes(jur))) {
      warnings.push({
        type: 'legal_advice_required',
        message: this.i18nService.getLegalText('legal.warnings.legal_advice_required', language)
      });
    }
    
    return warnings;
  }

  // Get action buttons
  getActions(language) {
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
      },
      {
        action: 'view_policy',
        text: this.i18nService.getLegalText('legal.actions.view_policy', language),
        style: 'link'
      }
    ];
  }

  // Get compliance status
  getComplianceStatus(recordingType, language) {
    const statusMap = {
      'one_party': 'legal.compliance.compliant',
      'all_party': 'legal.compliance.compliant',
      'gdpr': 'legal.compliance.compliant',
      'varies': 'legal.compliance.verification_required',
    };
    
    const key = statusMap[recordingType] || 'legal.compliance.verification_required';
    return {
      status: key.split('.').pop(),
      text: this.i18nService.getLegalText(key, language)
    };
  }

  // Get fallback legal info when jurisdiction is unknown
  getFallbackLegalInfo(language) {
    return {
      jurisdiction: 'UNKNOWN',
      type: 'varies',
      note: this.i18nService.getLegalText('legal.warnings.jurisdiction_unknown', language),
      legal_basis: null,
      requires_disclosure: true,
      consent_title: this.i18nService.getLegalText('legal.consent.varies_title', language),
      consent_message: this.i18nService.getLegalText('legal.consent.varies_message', language),
      user_rights: [],
      warnings: [{
        type: 'jurisdiction_unknown',
        message: this.i18nService.getLegalText('legal.warnings.jurisdiction_unknown', language)
      }],
      actions: this.getActions(language),
      compliance_status: {
        status: 'verification_required',
        text: this.i18nService.getLegalText('legal.compliance.verification_required', language)
      },
      localized_at: new Date().toISOString(),
    };
  }

  // Get all supported jurisdictions with localized info
  getAllLocalizedJurisdictions(language = 'en') {
    const legalData = this.loadLegalDatabase();
    if (!legalData) return [];

    const jurisdictions = [];
    
    for (const [code, info] of Object.entries(legalData.countries)) {
      jurisdictions.push({
        code,
        name: this.getCountryName(code, language),
        localized_info: this.getLocalizedLegalInfo(code, language)
      });
    }
    
    return jurisdictions.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get country name in specific language
  getCountryName(countryCode, language) {
    const countryNames = {
      'en': {
        'JP': 'Japan',
        'US': 'United States',
        'CA': 'Canada',
        'GB': 'United Kingdom',
        'EU': 'European Union',
        'DE': 'Germany',
        'FR': 'France',
        'ES': 'Spain',
        'IT': 'Italy',
        'NL': 'Netherlands',
        'AU': 'Australia',
        'NZ': 'New Zealand',
        'CN': 'China',
        'KR': 'South Korea',
        'IN': 'India',
        'BR': 'Brazil',
        'MX': 'Mexico',
        'AR': 'Argentina',
        'RU': 'Russia',
        'ZA': 'South Africa',
        'EG': 'Egypt',
        'IL': 'Israel',
        'SA': 'Saudi Arabia',
        'AE': 'United Arab Emirates',
        'TH': 'Thailand',
        'SG': 'Singapore',
        'MY': 'Malaysia',
        'PH': 'Philippines',
        'ID': 'Indonesia',
        'VN': 'Vietnam',
        'PK': 'Pakistan',
        'BD': 'Bangladesh',
        'LK': 'Sri Lanka',
        'NP': 'Nepal',
        'MM': 'Myanmar',
        'KH': 'Cambodia',
        'LA': 'Laos',
        'BT': 'Bhutan',
        'MV': 'Maldives',
        'MN': 'Mongolia',
        'KZ': 'Kazakhstan',
        'UZ': 'Uzbekistan',
        'KG': 'Kyrgyzstan',
        'TJ': 'Tajikistan',
        'TM': 'Turkmenistan',
        'AF': 'Afghanistan',
        'IR': 'Iran',
        'IQ': 'Iraq',
        'SY': 'Syria',
        'JO': 'Jordan',
        'LB': 'Lebanon',
        'CY': 'Cyprus',
        'GR': 'Greece',
        'TR': 'Turkey',
        'PL': 'Poland',
        'CZ': 'Czech Republic',
        'SK': 'Slovakia',
        'HU': 'Hungary',
        'RO': 'Romania',
        'BG': 'Bulgaria',
        'HR': 'Croatia',
        'SI': 'Slovenia',
        'EE': 'Estonia',
        'LV': 'Latvia',
        'LT': 'Lithuania',
        'UA': 'Ukraine',
        'BY': 'Belarus',
        'MD': 'Moldova',
        'AL': 'Albania',
        'MK': 'North Macedonia',
        'RS': 'Serbia',
        'ME': 'Montenegro',
        'BA': 'Bosnia and Herzegovina',
        'XK': 'Kosovo',
        'LI': 'Liechtenstein',
        'CH': 'Switzerland',
        'IS': 'Iceland',
        'NO': 'Norway',
        'SE': 'Sweden',
        'FI': 'Finland',
        'DK': 'Denmark',
        'PT': 'Portugal',
        'IE': 'Ireland',
        'LU': 'Luxembourg',
        'BE': 'Belgium',
        'AT': 'Austria',
        'MT': 'Malta',
        'GI': 'Gibraltar',
        'FO': 'Faroe Islands',
        'GL': 'Greenland',
        'AX': 'Åland Islands'
      },
      'ja': {
        'JP': '日本',
        'US': 'アメリカ合衆国',
        'CA': 'カナダ',
        'GB': 'イギリス',
        'EU': '欧州連合',
        'DE': 'ドイツ',
        'FR': 'フランス',
        'ES': 'スペイン',
        'IT': 'イタリア',
        'NL': 'オランダ',
        'AU': 'オーストラリア',
        'NZ': 'ニュージーランド',
        'CN': '中国',
        'KR': '韓国',
        'IN': 'インド',
        'BR': 'ブラジル',
        'MX': 'メキシコ',
        'AR': 'アルゼンチン',
        'RU': 'ロシア',
        'ZA': '南アフリカ',
        'EG': 'エジプト',
        'IL': 'イスラエル',
        'SA': 'サウジアラビア',
        'AE': 'アラブ首長国連邦',
        'TH': 'タイ',
        'SG': 'シンガポール',
        'MY': 'マレーシア',
        'PH': 'フィリピン',
        'ID': 'インドネシア',
        'VN': 'ベトナム',
        'PK': 'パキスタン',
        'BD': 'バングラデシュ',
        'LK': 'スリランカ',
        'NP': 'ネパール',
        'MM': 'ミャンマー',
        'KH': 'カンボジア',
        'LA': 'ラオス',
        'BT': 'ブータン',
        'MV': 'モルディブ',
        'MN': 'モンゴル',
        'KZ': 'カザフスタン',
        'UZ': 'ウズベキスタン',
        'KG': 'キルギス',
        'TJ': 'タジキスタン',
        'TM': 'トルクメニスタン',
        'AF': 'アフガニスタン',
        'IR': 'イラン',
        'IQ': 'イラク',
        'SY': 'シリア',
        'JO': 'ヨルダン',
        'LB': 'レバノン',
        'CY': 'キプロス',
        'GR': 'ギリシャ',
        'TR': 'トルコ',
        'PL': 'ポーランド',
        'CZ': 'チェコ',
        'SK': 'スロバキア',
        'HU': 'ハンガリー',
        'RO': 'ルーマニア',
        'BG': 'ブルガリア',
        'HR': 'クロアチア',
        'SI': 'スロベニア',
        'EE': 'エストニア',
        'LV': 'ラトビア',
        'LT': 'リトアニア',
        'UA': 'ウクライナ',
        'BY': 'ベラルーシ',
        'MD': 'モルドバ',
        'AL': 'アルバニア',
        'MK': '北マケドニア',
        'RS': 'セルビア',
        'ME': 'モンテネグロ',
        'BA': 'ボスニア・ヘルツェゴビナ',
        'XK': 'コソボ',
        'LI': 'リヒテンシュタイン',
        'CH': 'スイス',
        'IS': 'アイスランド',
        'NO': 'ノルウェー',
        'SE': 'スウェーデン',
        'FI': 'フィンランド',
        'DK': 'デンマーク',
        'PT': 'ポルトガル',
        'IE': 'アイルランド',
        'LU': 'ルクセンブルク',
        'BE': 'ベルギー',
        'AT': 'オーストリア',
        'MT': 'マルタ',
        'GI': 'ジブラルタル',
        'FO': 'フェロー諸島',
        'GL': 'グリーンランド',
        'AX': 'オーランド諸島'
      }
    };
    
    return countryNames[language]?.[countryCode] || countryCode;
  }

  // Validate legal compliance for a specific scenario
  validateLegalCompliance(jurisdiction, recordingIntent, participantConsent, language = 'en') {
    const legalInfo = this.getLocalizedLegalInfo(jurisdiction, language);
    const validation = {
      is_compliant: false,
      requirements_met: [],
      missing_requirements: [],
      warnings: [],
      recommendations: [],
    };

    // Check consent requirements
    if (legalInfo.requires_disclosure && !recordingIntent.disclosed) {
      validation.missing_requirements.push({
        type: 'disclosure',
        message: this.i18nService.getLegalText('legal.disclosure.must_inform', language)
      });
    } else if (legalInfo.requires_disclosure && recordingIntent.disclosed) {
      validation.requirements_met.push('disclosure');
    }

    // Check consent based on recording type
    if (legalInfo.type === 'all_party' && !participantConsent.all_parties) {
      validation.missing_requirements.push({
        type: 'consent',
        message: this.i18nService.getLegalText('legal.consent.all_party_message', language)
      });
    } else if (legalInfo.type === 'all_party' && participantConsent.all_parties) {
      validation.requirements_met.push('all_party_consent');
    }

    // GDPR specific checks
    if (legalInfo.type === 'gdpr') {
      if (!recordingIntent.gdpr_compliant) {
        validation.missing_requirements.push({
          type: 'gdpr',
          message: 'GDPR compliance requirements not met'
        });
      } else {
        validation.requirements_met.push('gdpr_compliance');
      }
    }

    // Determine overall compliance
    validation.is_compliant = validation.missing_requirements.length === 0;
    
    // Add warnings from legal info
    validation.warnings = legalInfo.warnings;

    // Add recommendations
    if (legalInfo.type === 'varies') {
      validation.recommendations.push({
        type: 'legal_review',
        message: this.i18nService.getLegalText('legal.warnings.legal_advice_required', language)
      });
    }

    return validation;
  }
}

module.exports = new LegalI18nService();
