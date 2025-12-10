// RTL Language Support Service
// Comprehensive right-to-left language support with advanced text handling

class RTLSupportService {
  constructor() {
    this.rtlLanguages = new Set([
      'ar',    // Arabic
      'he',    // Hebrew
      'fa',    // Persian (Farsi)
      'ur',    // Urdu
      'ku',    // Kurdish
      'ps',    // Pashto
      'sd',    // Sindhi
      'yid',   // Yiddish
      'syr',   // Syriac
      'th',    // Thai (special case)
      'dv',    // Divehi
      'az-Arab', // Azerbaijani (Arabic script)
      'kk-Arab', // Kazakh (Arabic script)
      'ky-Arab', // Kyrgyz (Arabic script)
      'ug-Arab', // Uyghur (Arabic script)
      'zh-Hant' // Chinese Traditional (mixed directionality)
    ]);

    this.mixedDirectionLanguages = new Set([
      'he',    // Hebrew with Latin text
      'ar',    // Arabic with numbers/English
      'fa',    // Persian with English
      'ur'     // Urdu with English
    ]);

    this.specialCharacterSets = {
      arabic: {
        range: '\u0600-\u06FF',
        digits: '\u0660-\u0669',
        punctuation: '\u0600-\u0604\u0608-\u060B\u0610-\u061A\u064B-\u065F\u0670-\u06D3\u06D5-\u06E8\u06EA-\u06EF\u06FA-\u06FF',
        diacritics: '\u064B-\u065F\u0670',
        ligatures: '\uFE70-\uFEFF'
      },
      hebrew: {
        range: '\u0590-\u05FF',
        punctuation: '\u0591-\u05C7\u05BE\u05C8\u05C9\u05CB\u05CC\u05CD\u05CF\u05D0-\u05EA\u05EF-\u05F4',
        diacritics: '\u0591-\u05BD\u05BF-\u05C5\u05C7',
        cantillation: '\u0591-\u05A1\u05A3-\u05BD\u05BF-\u05C7'
      },
      persian: {
        range: '\u064B-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF',
        extra: '\u0750-\u077F\u08A0-\u08FF',
        digits: '\u06F0-\u06F9'
      },
      urdu: {
        range: '\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF',
        extra: '\u08A0-\u08FF',
        digits: '\u06F0-\u06F9'
      },
      thai: {
        range: '\u0E00-\u0E7F',
        tones: '\u0E48-\u0E4F',
        diacritics: '\u0E31\u0E34-\u0E3A\u0E47-\u0E4E'
      }
    };

    this.textDirectionCache = new Map();
    this.initializeTextDirectionDetection();
  }

  // Initialize text direction detection
  initializeTextDirectionDetection() {
    // Create regex patterns for each script
    this.scriptPatterns = {
      arabic: new RegExp(`[${this.specialCharacterSets.arabic.range}]`),
      hebrew: new RegExp(`[${this.specialCharacterSets.hebrew.range}]`),
      persian: new RegExp(`[${this.specialCharacterSets.persian.range}]`),
      urdu: new RegExp(`[${this.specialCharacterSets.urdu.range}]`),
      thai: new RegExp(`[${this.specialCharacterSets.thai.range}]`),
      latin: new RegExp('[a-zA-Z]'),
      numbers: new RegExp('[0-9\u0660-\u0669\u06F0-\u06F9]'),
      punctuation: new RegExp('[\\p{P}\\p{S}]', 'u')
    };
  }

  // Check if language is RTL
  isRTLLanguage(languageCode) {
    // Handle language codes with regions
    const baseLang = languageCode.split('-')[0];
    return this.rtlLanguages.has(languageCode) || this.rtlLanguages.has(baseLang);
  }

  // Check if language has mixed directionality
  hasMixedDirectionality(languageCode) {
    const baseLang = languageCode.split('-')[0];
    return this.mixedDirectionLanguages.has(baseLang);
  }

  // Detect text direction for a given text
  detectTextDirection(text, languageHint = null) {
    // Check cache first
    const cacheKey = `${text.substring(0, 100)}_${languageHint}`;
    if (this.textDirectionCache.has(cacheKey)) {
      return this.textDirectionCache.get(cacheKey);
    }

    const result = this.analyzeTextDirection(text, languageHint);
    
    // Cache result
    this.textDirectionCache.set(cacheKey, result);
    
    // Limit cache size
    if (this.textDirectionCache.size > 1000) {
      const firstKey = this.textDirectionCache.keys().next().value;
      this.textDirectionCache.delete(firstKey);
    }

    return result;
  }

  // Analyze text direction
  analyzeTextDirection(text, languageHint) {
    if (!text || text.trim().length === 0) {
      return { direction: 'ltr', confidence: 1.0, script: 'unknown' };
    }

    const analysis = {
      direction: 'ltr',
      confidence: 0.0,
      script: 'unknown',
      rtlChars: 0,
      ltrChars: 0,
      mixed: false
    };

    // Count characters by script
    for (const char of text) {
      if (this.scriptPatterns.arabic.test(char) || 
          this.scriptPatterns.hebrew.test(char) ||
          this.scriptPatterns.persian.test(char) ||
          this.scriptPatterns.urdu.test(char)) {
        analysis.rtlChars++;
      } else if (this.scriptPatterns.latin.test(char)) {
        analysis.ltrChars++;
      }
    }

    const totalChars = analysis.rtlChars + analysis.ltrChars;
    
    if (totalChars === 0) {
      // No directional characters, use language hint
      if (languageHint && this.isRTLLanguage(languageHint)) {
        analysis.direction = 'rtl';
        analysis.confidence = 0.8;
      } else {
        analysis.direction = 'ltr';
        analysis.confidence = 0.5;
      }
    } else {
      // Calculate RTL ratio
      const rtlRatio = analysis.rtlChars / totalChars;
      
      if (rtlRatio > 0.7) {
        analysis.direction = 'rtl';
        analysis.confidence = rtlRatio;
      } else if (rtlRatio < 0.3) {
        analysis.direction = 'ltr';
        analysis.confidence = 1 - rtlRatio;
      } else {
        // Mixed directionality
        analysis.direction = languageHint && this.isRTLLanguage(languageHint) ? 'rtl' : 'ltr';
        analysis.mixed = true;
        analysis.confidence = Math.max(rtlRatio, 1 - rtlRatio) * 0.7;
      }
    }

    // Determine primary script
    if (analysis.rtlChars > analysis.ltrChars) {
      if (this.scriptPatterns.arabic.test(text)) analysis.script = 'arabic';
      else if (this.scriptPatterns.hebrew.test(text)) analysis.script = 'hebrew';
      else if (this.scriptPatterns.persian.test(text)) analysis.script = 'persian';
      else if (this.scriptPatterns.urdu.test(text)) analysis.script = 'urdu';
      else analysis.script = 'rtl';
    } else {
      if (this.scriptPatterns.latin.test(text)) analysis.script = 'latin';
      else if (this.scriptPatterns.thai.test(text)) analysis.script = 'thai';
      else analysis.script = 'ltr';
    }

    return analysis;
  }

  // Process text for RTL display
  processTextForRTL(text, languageCode, options = {}) {
    const isRTL = this.isRTLLanguage(languageCode);
    const hasMixed = this.hasMixedDirectionality(languageCode);
    
    if (!isRTL && !hasMixed) {
      return {
        text,
        direction: 'ltr',
        processed: false,
        original: text
      };
    }

    let processedText = text;
    const processingSteps = [];

    // Step 1: Handle bidirectional text
    if (hasMixed) {
      processedText = this.handleBidirectionalText(processedText, languageCode);
      processingSteps.push('bidirectional');
    }

    // Step 2: Handle numbers and punctuation
    processedText = this.handleNumbersAndPunctuation(processedText, languageCode);
    processingSteps.push('numbers_punctuation');

    // Step 3: Handle special characters and diacritics
    processedText = this.handleSpecialCharacters(processedText, languageCode);
    processingSteps.push('special_characters');

    // Step 4: Apply text shaping if needed
    if (options.enableShaping !== false) {
      processedText = this.applyTextShaping(processedText, languageCode);
      processingSteps.push('text_shaping');
    }

    return {
      text: processedText,
      direction: isRTL ? 'rtl' : 'ltr',
      processed: true,
      original: text,
      processingSteps,
      languageCode
    };
  }

  // Handle bidirectional text
  handleBidirectionalText(text, languageCode) {
    // Add Unicode bidirectional control characters where needed
    let result = text;
    
    // Handle embedded LTR text in RTL context
    if (this.isRTLLanguage(languageCode)) {
      // Wrap English/Latin text in LRE/PDF markers
      result = result.replace(/([a-zA-Z][a-zA-Z0-9\s\.\,\!\?\-\_\:]+)/g, '\u202A$1\u202C');
      
      // Handle numbers
      result = result.replace(/([0-9]+)/g, '\u202A$1\u202C');
    }
    
    return result;
  }

  // Handle numbers and punctuation
  handleNumbersAndPunctuation(text, languageCode) {
    let result = text;
    
    // Handle Arabic-Indic digits
    if (['ar', 'fa', 'ur', 'ku', 'ps', 'sd'].includes(languageCode.split('-')[0])) {
      // Convert Western digits to Arabic-Indic digits
      result = result.replace(/[0-9]/g, (match) => {
        const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return arabicDigits[parseInt(match)];
      });
    }
    
    // Handle Persian digits
    if (languageCode.startsWith('fa')) {
      result = result.replace(/[0-9]/g, (match) => {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return persianDigits[parseInt(match)];
      });
    }
    
    return result;
  }

  // Handle special characters and diacritics
  handleSpecialCharacters(text, languageCode) {
    let result = text;
    
    // Handle Arabic diacritics
    if (languageCode.startsWith('ar')) {
      // Normalize diacritics
      result = result.replace(/[\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652]/g, (match) => {
        // Optional: Remove or normalize diacritics
        return match; // Keep diacritics for now
      });
    }
    
    // Handle Hebrew diacritics (niqqud)
    if (languageCode.startsWith('he')) {
      // Optional: Remove niqqud for cleaner display
      result = result.replace(/[\u0591-\u05BD\u05BF-\u05C5\u05C7]/g, '');
    }
    
    return result;
  }

  // Apply text shaping
  applyTextShaping(text, languageCode) {
    // In a real implementation, this would use a text shaping library
    // like harfbuzz or node-pango for proper glyph shaping
    
    let result = text;
    
    // Handle Arabic ligatures
    if (languageCode.startsWith('ar')) {
      // Simple ligature handling (would be more complex in reality)
      result = result.replace(/لا/g, 'ﻻ');
      result = result.replace(/لأ/g, 'ﻷ');
      result = result.replace(/لإ/g, 'ﻹ');
      result = result.replace(/لآ/g, 'ﻵ');
    }
    
    return result;
  }

  // Generate CSS for RTL support
  generateRTLCSS(languageCode) {
    const isRTL = this.isRTLLanguage(languageCode);
    const hasMixed = this.hasMixedDirectionality(languageCode);
    
    const cssRules = [];
    
    if (isRTL) {
      cssRules.push(`
        [lang="${languageCode}"], [lang="${languageCode.split('-')[0]}"] {
          direction: rtl;
          text-align: right;
        }
        
        [lang="${languageCode}"] .text-align-left {
          text-align: right !important;
        }
        
        [lang="${languageCode}"] .text-align-right {
          text-align: left !important;
        }
        
        [lang="${languageCode}"] .float-left {
          float: right !important;
        }
        
        [lang="${languageCode}"] .float-right {
          float: left !important;
        }
        
        [lang="${languageCode}"] .ml-1, [lang="${languageCode}"] .me-1 {
          margin-left: 0 !important;
          margin-right: 0.25rem !important;
        }
        
        [lang="${languageCode}"] .mr-1, [lang="${languageCode}"] .ms-1 {
          margin-right: 0 !important;
          margin-left: 0.25rem !important;
        }
        
        [lang="${languageCode}"] .pl-1, [lang="${languageCode}"] .pe-1 {
          padding-left: 0 !important;
          padding-right: 0.25rem !important;
        }
        
        [lang="${languageCode}"] .pr-1, [lang="${languageCode}"] .ps-1 {
          padding-right: 0 !important;
          padding-left: 0.25rem !important;
        }
      `);
    }
    
    if (hasMixed) {
      cssRules.push(`
        [lang="${languageCode}"] .mixed-text {
          unicode-bidi: plaintext;
          text-align: start;
        }
        
        [lang="${languageCode}"] .embedded-ltr {
          unicode-bidi: embed;
          direction: ltr;
        }
        
        [lang="${languageCode}"] .embedded-rtl {
          unicode-bidi: embed;
          direction: rtl;
        }
      `);
    }
    
    // Font recommendations
    const fontRecommendations = this.getFontRecommendations(languageCode);
    if (fontRecommendations.length > 0) {
      cssRules.push(`
        [lang="${languageCode}"] {
          font-family: ${fontRecommendations.join(', ')};
        }
      `);
    }
    
    return cssRules.join('\n');
  }

  // Get font recommendations for language
  getFontRecommendations(languageCode) {
    const fontMap = {
      'ar': ['Noto Sans Arabic', 'Arial Unicode MS', 'Tahoma', 'DejaVu Sans'],
      'he': ['Noto Sans Hebrew', 'Arial Hebrew', 'David', 'DejaVu Sans'],
      'fa': ['Noto Sans Arabic', 'B Nazanin', 'Tahoma', 'DejaVu Sans'],
      'ur': ['Noto Nastaliq Urdu', 'Nafees Web Naskh', 'Arial Unicode MS'],
      'th': ['Noto Sans Thai', 'Sukhumvit Set', 'Tahoma'],
      'zh-Hant': ['Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC']
    };
    
    return fontMap[languageCode] || fontMap[languageCode.split('-')[0]] || [];
  }

  // Validate RTL text input
  validateRTLInput(text, languageCode, validationRules = {}) {
    const isRTL = this.isRTLLanguage(languageCode);
    const analysis = this.detectTextDirection(text, languageCode);
    
    const validation = {
      isValid: true,
      warnings: [],
      errors: [],
      suggestions: []
    };

    // Check direction consistency
    if (isRTL && analysis.direction === 'ltr' && analysis.confidence > 0.8) {
      validation.warnings.push('Text appears to be LTR but language is RTL');
    }

    // Check for mixed directionality issues
    if (analysis.mixed && !this.hasMixedDirectionality(languageCode)) {
      validation.warnings.push('Mixed directionality detected in non-mixed language');
    }

    // Validate special characters
    const specialChars = this.getSpecialCharacterValidation(text, languageCode);
    if (specialChars.invalid.length > 0) {
      validation.errors.push(`Invalid characters: ${specialChars.invalid.join(', ')}`);
      validation.isValid = false;
    }

    // Check for common RTL issues
    const commonIssues = this.checkCommonRTLIssues(text, languageCode);
    validation.warnings.push(...commonIssues);

    return validation;
  }

  // Get special character validation
  getSpecialCharacterValidation(text, languageCode) {
    const validation = {
      valid: [],
      invalid: [],
      suspicious: []
    };

    const baseLang = languageCode.split('-')[0];
    const charSet = this.specialCharacterSets[baseLang];

    if (!charSet) {
      return validation;
    }

    for (const char of text) {
      if (this.scriptPatterns[baseLang].test(char)) {
        validation.valid.push(char);
      } else if (/[\u0000-\u001F\u007F-\u009F]/.test(char)) {
        validation.invalid.push(char);
      } else if (!/[\w\s]/.test(char)) {
        validation.suspicious.push(char);
      }
    }

    return validation;
  }

  // Check common RTL issues
  checkCommonRTLIssues(text, languageCode) {
    const issues = [];
    
    // Check for improperly ordered numbers
    if (/(\d+)\s+([a-zA-Z]+)/.test(text)) {
      issues.push('Numbers followed by Latin text may display incorrectly');
    }

    // Check for missing diacritics in Arabic
    if (languageCode.startsWith('ar') && !/[\u064B-\u065F]/.test(text) && text.length > 10) {
      issues.push('Consider adding diacritics for better readability');
    }

    // Check for punctuation placement
    if (/[.,!?][a-zA-Z]/.test(text)) {
      issues.push('Punctuation followed by Latin text may need bidirectional control');
    }

    return issues;
  }

  // Get text statistics
  getTextStatistics(text, languageCode) {
    const analysis = this.detectTextDirection(text, languageCode);
    
    return {
      totalCharacters: text.length,
      rtlCharacters: analysis.rtlChars,
      ltrCharacters: analysis.ltrChars,
      direction: analysis.direction,
      confidence: analysis.confidence,
      script: analysis.script,
      isMixed: analysis.mixed,
      languageCode,
      specialCharacters: this.countSpecialCharacters(text, languageCode),
      words: text.split(/\s+/).filter(word => word.length > 0).length
    };
  }

  // Count special characters
  countSpecialCharacters(text, languageCode) {
    const counts = {
      diacritics: 0,
      punctuation: 0,
      numbers: 0,
      symbols: 0
    };

    const baseLang = languageCode.split('-')[0];
    
    for (const char of text) {
      if (this.scriptPatterns.punctuation.test(char)) {
        counts.punctuation++;
      } else if (this.scriptPatterns.numbers.test(char)) {
        counts.numbers++;
      } else if (/[^\w\s]/.test(char)) {
        counts.symbols++;
      }
      
      // Count diacritics for specific languages
      if (baseLang === 'ar' && /[\u064B-\u065F]/.test(char)) {
        counts.diacritics++;
      } else if (baseLang === 'he' && /[\u0591-\u05BD\u05BF-\u05C5\u05C7]/.test(char)) {
        counts.diacritics++;
      }
    }

    return counts;
  }

  // Clear cache
  clearCache() {
    this.textDirectionCache.clear();
  }

  // Get service statistics
  getStatistics() {
    return {
      supportedRTLLanguages: Array.from(this.rtlLanguages),
      mixedDirectionLanguages: Array.from(this.mixedDirectionLanguages),
      cacheSize: this.textDirectionCache.size,
      supportedScripts: Object.keys(this.specialCharacterSets)
    };
  }
}

// Create singleton instance
const rtlSupportService = new RTLSupportService();

module.exports = rtlSupportService;
