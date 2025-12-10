// Server-side i18n service for WebRTC Call Recorder
// Backend internationalization for API responses and error messages

const i18n = require('i18next');
const Backend = require('i18next-fs-backend');
const { join } = require('path');

class I18nService {
  constructor() {
    this.initialized = false;
    this.defaultLanguage = 'en';
    this.supportedLanguages = [
      'en', 'ja', 'zh', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru',
      'ar', 'hi', 'th', 'vi', 'id', 'ms', 'tr', 'pl', 'nl', 'sv',
      'da', 'no', 'fi', 'el', 'he', 'cs', 'hu', 'ro', 'bg', 'hr',
      'sk', 'sl', 'et', 'lv', 'lt', 'uk', 'sr', 'bn', 'ta', 'te',
      'mr', 'gu', 'kn', 'ml', 'pa', 'ne', 'si', 'my', 'km', 'lo',
      'ka', 'am', 'sw', 'zu', 'af', 'ha', 'yo', 'ig'
    ];
  }

  // Initialize i18n for server
  async initialize() {
    if (this.initialized) return;

    await i18n
      .use(Backend)
      .init({
        // Default language
        lng: this.defaultLanguage,
        
        // Fallback language
        fallbackLng: this.defaultLanguage,
        
        // Debug mode
        debug: process.env.NODE_ENV === 'development',
        
        // Namespaces
        ns: ['common', 'errors', 'legal', 'notifications'],
        defaultNS: 'common',
        
        // Backend configuration
        backend: {
          loadPath: join(__dirname, '../../i18n/locales/{{lng}}/{{ns}}.json'),
          addPath: join(__dirname, '../../i18n/locales/{{lng}}/{{ns}}.json'),
        },
        
        // Interpolation
        interpolation: {
          escapeValue: false,
        },
        
        // Pluralization
        pluralSeparator: '_',
        
        // Key separator
        keySeparator: '.',
        
        // Save missing keys in development
        saveMissing: process.env.NODE_ENV === 'development',
        missingKeyHandler: process.env.NODE_ENV === 'development' ? (lng, ns, key) => {
          console.warn(`Missing translation key: ${key} for language: ${lng} in namespace: ${ns}`);
        } : undefined,
        
        // Load configuration
        load: 'languageOnly',
        
        // Simplified language detection
        lowerCaseLng: true,
        cleanCode: true,
        
        // Preload languages
        preload: ['en', 'ja'],
      });

    this.initialized = true;
  }

  // Get translation for a specific language
  t(key, options = {}) {
    const { language = this.defaultLanguage, ...restOptions } = options;
    
    if (!this.initialized) {
      console.warn('I18nService not initialized, returning key');
      return key;
    }

    return i18n.t(key, { lng: language, ...restOptions });
  }

  // Get error message in specific language
  getErrorMessage(errorKey, language = this.defaultLanguage, params = {}) {
    return this.t(`errors.${errorKey}`, { language, ...params });
  }

  // Get notification message in specific language
  getNotificationMessage(notificationKey, language = this.defaultLanguage, params = {}) {
    return this.t(`notifications.${notificationKey}`, { language, ...params });
  }

  // Get legal text in specific language
  getLegalText(legalKey, language = this.defaultLanguage, params = {}) {
    return this.t(`legal.${legalKey}`, { language, ...params });
  }

  // Get common text in specific language
  getCommonText(commonKey, language = this.defaultLanguage, params = {}) {
    return this.t(`common.${commonKey}`, { language, ...params });
  }

  // Change language
  changeLanguage(language) {
    return i18n.changeLanguage(language);
  }

  // Get current language
  getCurrentLanguage() {
    return i18n.language;
  }

  // Check if language is supported
  isLanguageSupported(language) {
    return this.supportedLanguages.includes(language);
  }

  // Get language info
  getLanguageInfo(languageCode) {
    const languageNames = {
      'en': 'English',
      'ja': '日本語',
      'zh': '中文',
      'ko': '한국어',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский',
      'ar': 'العربية',
      'hi': 'हिन्दी',
      'th': 'ไทย',
      'vi': 'Tiếng Việt',
      'id': 'Bahasa Indonesia',
      'ms': 'Bahasa Melayu',
      'tr': 'Türkçe',
      'pl': 'Polski',
      'nl': 'Nederlands',
      'sv': 'Svenska',
      'da': 'Dansk',
      'no': 'Norsk',
      'fi': 'Suomi',
      'el': 'Ελληνικά',
      'he': 'עברית',
      'cs': 'Čeština',
      'hu': 'Magyar',
      'ro': 'Română',
      'bg': 'Български',
      'hr': 'Hrvatski',
      'sk': 'Slovenčina',
      'sl': 'Slovenščina',
      'et': 'Eesti',
      'lv': 'Latviešu',
      'lt': 'Lietuvių',
      'uk': 'Українська',
      'sr': 'Српски',
      'bn': 'বাংলা',
      'ta': 'தமிழ்',
      'te': 'తెలుగు',
      'mr': 'मराठी',
      'gu': 'ગુજરાતી',
      'kn': 'ಕನ್ನಡ',
      'ml': 'മലയാളം',
      'pa': 'ਪੰਜਾਬੀ',
      'ne': 'नेपाली',
      'si': 'සිංහල',
      'my': 'မြန်မာ',
      'km': 'ខ្មែរ',
      'lo': 'ລາວ',
      'ka': 'ქართული',
      'am': 'አማርኛ',
      'sw': 'Kiswahili',
      'zu': 'IsiZulu',
      'af': 'Afrikaans',
      'ha': 'Hausa',
      'yo': 'Yorùbá',
      'ig': 'Igbo',
    };
    
    return {
      code: languageCode,
      name: languageNames[languageCode] || languageCode,
      isRTL: this.isRTL(languageCode),
    };
  }

  // Check if language is RTL
  isRTL(languageCode) {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'ku', 'ps', 'sd'];
    return rtlLanguages.includes(languageCode);
  }

  // Extract language from request
  extractLanguageFromRequest(req) {
    // Priority order: query param > header > accept-language > default
    const queryLang = req.query.lang || req.query.language;
    if (queryLang && this.isLanguageSupported(queryLang)) {
      return queryLang;
    }

    const headerLang = req.get('Accept-Language') || req.get('X-Language');
    if (headerLang) {
      // Parse Accept-Language header
      const preferredLang = headerLang.split(',')[0].split('-')[0];
      if (this.isLanguageSupported(preferredLang)) {
        return preferredLang;
      }
    }

    return this.defaultLanguage;
  }

  // Middleware for Express
  middleware() {
    return (req, res, next) => {
      req.language = this.extractLanguageFromRequest(req);
      req.t = (key, options = {}) => this.t(key, { language: req.language, ...options });
      next();
    };
  }

  // Format error response with i18n
  formatErrorResponse(errorKey, statusCode = 500, language = this.defaultLanguage, params = {}) {
    const message = this.getErrorMessage(errorKey, language, params);
    return {
      error: true,
      status: statusCode,
      message,
      errorKey,
      language,
      timestamp: new Date().toISOString(),
    };
  }

  // Format success response with i18n
  formatSuccessResponse(data, messageKey = null, language = this.defaultLanguage, params = {}) {
    const response = {
      success: true,
      data,
      language,
      timestamp: new Date().toISOString(),
    };

    if (messageKey) {
      response.message = this.getCommonText(messageKey, language, params);
    }

    return response;
  }

  // Get all supported languages
  getSupportedLanguages() {
    return this.supportedLanguages.map(code => this.getLanguageInfo(code));
  }

  // Validate translation structure
  validateTranslations(language, namespace) {
    const translations = i18n.getResourceBundle(language, namespace);
    const errors = [];
    
    const validateObject = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
          validateObject(value, currentPath);
        } else if (typeof value !== 'string') {
          errors.push(`Invalid translation type at ${currentPath}: expected string, got ${typeof value}`);
        }
      }
    };

    validateObject(translations);
    return errors;
  }

  // Reload translations
  async reloadTranslations() {
    await i18n.reloadResources();
  }
}

// Create singleton instance
const i18nService = new I18nService();

module.exports = i18nService;
