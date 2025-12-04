/**
 * Phase 90: Advanced Internationalization & Localization
 *
 * Enterprise-grade i18n/l10n platform for Ring WebRTC spam detection.
 * Implements ICU MessageFormat, RTL support, locale detection, and
 * comprehensive formatting using the ECMAScript Internationalization API.
 *
 * Research Sources (2025):
 * - React-intl/FormatJS: https://formatjs.io/
 * - ICU MessageFormat: https://unicode-org.github.io/icu/userguide/format_parse/messages/
 * - RTL Styling: https://rtlstyling.com/posts/rtl-styling/
 * - Intl API: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
 * - Crowdin TMS: https://crowdin.com/
 * - Locale Detection: https://phrase.com/blog/posts/detecting-a-users-locale/
 *
 * @module Phase90_Advanced_Internationalization_Localization
 * @version 1.0.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Locale Types
 */
export interface Locale {
  code: string; // BCP 47 language tag (e.g., 'en-US', 'ja-JP')
  language: string; // ISO 639-1 (e.g., 'en', 'ja')
  region?: string; // ISO 3166-1 alpha-2 (e.g., 'US', 'JP')
  script?: string; // ISO 15924 (e.g., 'Latn', 'Hans')
  name: string; // Display name in English
  nativeName: string; // Display name in native language
  direction: 'ltr' | 'rtl';
  numberFormat: NumberFormatConfig;
  dateFormat: DateFormatConfig;
  pluralRules: PluralCategory[];
}

export interface NumberFormatConfig {
  decimalSeparator: string;
  groupingSeparator: string;
  currencySymbol: string;
  currencyCode: string;
  currencyPosition: 'prefix' | 'suffix';
}

export interface DateFormatConfig {
  short: string; // e.g., 'MM/DD/YYYY'
  medium: string;
  long: string;
  full: string;
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  monthNames: string[];
  dayNames: string[];
}

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * Message Types (ICU MessageFormat)
 */
export interface MessageDescriptor {
  id: string;
  defaultMessage: string;
  description?: string;
}

export interface MessageValues {
  [key: string]: string | number | boolean | Date | MessageFormatElement | undefined;
}

export interface MessageFormatElement {
  type: 'argument' | 'plural' | 'select' | 'selectordinal' | 'date' | 'time' | 'number';
  value: string;
  options?: Record<string, string | MessageFormatElement[]>;
  style?: string;
}

export interface CompiledMessage {
  id: string;
  pattern: string;
  ast: MessageAST;
}

export interface MessageAST {
  type: 'messageFormatPattern';
  elements: MessageElement[];
}

export type MessageElement =
  | { type: 'literal'; value: string }
  | { type: 'argument'; value: string }
  | { type: 'plural'; value: string; offset?: number; options: Record<string, MessageElement[]> }
  | { type: 'select'; value: string; options: Record<string, MessageElement[]> }
  | { type: 'date'; value: string; style?: string }
  | { type: 'time'; value: string; style?: string }
  | { type: 'number'; value: string; style?: string };

/**
 * Translation Types
 */
export interface TranslationBundle {
  locale: string;
  messages: Record<string, string>;
  metadata?: {
    version: string;
    lastUpdated: Date;
    translator?: string;
    reviewStatus?: 'draft' | 'reviewed' | 'approved';
  };
}

export interface TranslationKey {
  id: string;
  namespace?: string;
  context?: string;
  maxLength?: number;
  screenshot?: string;
}

export interface TranslationProgress {
  locale: string;
  totalKeys: number;
  translatedKeys: number;
  reviewedKeys: number;
  approvedKeys: number;
  percentage: number;
}

/**
 * Locale Detection Types
 */
export interface LocaleDetectionConfig {
  order: LocaleDetectionSource[];
  fallback: string;
  caches?: ('cookie' | 'localStorage' | 'sessionStorage')[];
  cookieName?: string;
  lookupQuerystring?: string;
  lookupCookie?: string;
  lookupLocalStorage?: string;
}

export type LocaleDetectionSource =
  | 'querystring'
  | 'cookie'
  | 'localStorage'
  | 'sessionStorage'
  | 'navigator'
  | 'htmlTag'
  | 'path'
  | 'subdomain'
  | 'header';

export interface DetectedLocale {
  locale: string;
  source: LocaleDetectionSource;
  confidence: number;
}

/**
 * RTL Types
 */
export interface RTLConfig {
  enabled: boolean;
  locales: string[];
  flipMargins: boolean;
  flipPadding: boolean;
  flipPositioning: boolean;
  flipBorders: boolean;
  flipTransforms: boolean;
}

export interface LogicalCSS {
  marginInlineStart?: string;
  marginInlineEnd?: string;
  paddingInlineStart?: string;
  paddingInlineEnd?: string;
  insetInlineStart?: string;
  insetInlineEnd?: string;
  borderInlineStart?: string;
  borderInlineEnd?: string;
  textAlign?: 'start' | 'end' | 'center';
}

/**
 * Formatting Types
 */
export interface FormatOptions {
  locale?: string;
  timezone?: string;
}

export interface DateFormatOptions extends FormatOptions {
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  weekday?: 'long' | 'short' | 'narrow';
  era?: 'long' | 'short' | 'narrow';
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  hour12?: boolean;
  timeZoneName?: 'long' | 'short' | 'shortOffset' | 'longOffset' | 'shortGeneric' | 'longGeneric';
}

export interface NumberFormatOptions extends FormatOptions {
  style?: 'decimal' | 'currency' | 'percent' | 'unit';
  currency?: string;
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  currencySign?: 'standard' | 'accounting';
  unit?: string;
  unitDisplay?: 'long' | 'short' | 'narrow';
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  compactDisplay?: 'short' | 'long';
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  minimumIntegerDigits?: number;
  minimumSignificantDigits?: number;
  maximumSignificantDigits?: number;
  useGrouping?: boolean | 'always' | 'auto' | 'min2';
}

export interface RelativeTimeFormatOptions extends FormatOptions {
  numeric?: 'always' | 'auto';
  style?: 'long' | 'short' | 'narrow';
}

export interface ListFormatOptions extends FormatOptions {
  type?: 'conjunction' | 'disjunction' | 'unit';
  style?: 'long' | 'short' | 'narrow';
}

/**
 * TMS Integration Types
 */
export interface TMSConfig {
  provider: 'crowdin' | 'lokalise' | 'phrase' | 'custom';
  projectId: string;
  apiKey: string;
  baseUrl?: string;
  syncInterval?: number;
}

export interface TMSProject {
  id: string;
  name: string;
  sourceLocale: string;
  targetLocales: string[];
  progress: TranslationProgress[];
}

export interface TMSSyncResult {
  added: number;
  updated: number;
  deleted: number;
  errors: string[];
  timestamp: Date;
}

// ============================================================================
// INTL FORMATTER ENGINE
// ============================================================================

/**
 * ECMAScript Internationalization API Formatter Engine
 *
 * Provides locale-aware formatting for dates, numbers, currencies,
 * relative times, and lists using native browser APIs.
 *
 * Based on: ECMA-402, MDN Intl documentation
 */
export class IntlFormatterEngine {
  private locale: string;
  private timezone: string;
  private formatters: Map<string, Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat | Intl.ListFormat> = new Map();

  constructor(locale = 'en-US', timezone = 'UTC') {
    this.locale = locale;
    this.timezone = timezone;
  }

  /**
   * Set current locale
   */
  setLocale(locale: string): void {
    this.locale = locale;
    this.formatters.clear(); // Clear cached formatters
  }

  /**
   * Set timezone
   */
  setTimezone(timezone: string): void {
    this.timezone = timezone;
    this.formatters.clear();
  }

  /**
   * Format a date
   */
  formatDate(date: Date | number, options: DateFormatOptions = {}): string {
    const locale = options.locale || this.locale;
    const key = `date:${locale}:${JSON.stringify(options)}`;

    let formatter = this.formatters.get(key) as Intl.DateTimeFormat | undefined;
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale, {
        ...options,
        timeZone: options.timezone || this.timezone,
      });
      this.formatters.set(key, formatter);
    }

    return formatter.format(date);
  }

  /**
   * Format date to parts
   */
  formatDateToParts(date: Date | number, options: DateFormatOptions = {}): Intl.DateTimeFormatPart[] {
    const locale = options.locale || this.locale;
    const formatter = new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: options.timezone || this.timezone,
    });
    return formatter.formatToParts(date);
  }

  /**
   * Format a number
   */
  formatNumber(value: number, options: NumberFormatOptions = {}): string {
    const locale = options.locale || this.locale;
    const key = `number:${locale}:${JSON.stringify(options)}`;

    let formatter = this.formatters.get(key) as Intl.NumberFormat | undefined;
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, options);
      this.formatters.set(key, formatter);
    }

    return formatter.format(value);
  }

  /**
   * Format currency
   */
  formatCurrency(value: number, currency: string, options: NumberFormatOptions = {}): string {
    return this.formatNumber(value, {
      ...options,
      style: 'currency',
      currency,
    });
  }

  /**
   * Format percentage
   */
  formatPercent(value: number, options: NumberFormatOptions = {}): string {
    return this.formatNumber(value, {
      ...options,
      style: 'percent',
    });
  }

  /**
   * Format with unit
   */
  formatUnit(value: number, unit: string, options: NumberFormatOptions = {}): string {
    return this.formatNumber(value, {
      ...options,
      style: 'unit',
      unit,
    });
  }

  /**
   * Format compact number (e.g., 1.2K, 3.4M)
   */
  formatCompact(value: number, options: NumberFormatOptions = {}): string {
    return this.formatNumber(value, {
      ...options,
      notation: 'compact',
      compactDisplay: options.compactDisplay || 'short',
    });
  }

  /**
   * Format relative time
   */
  formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, options: RelativeTimeFormatOptions = {}): string {
    const locale = options.locale || this.locale;
    const key = `reltime:${locale}:${JSON.stringify(options)}`;

    let formatter = this.formatters.get(key) as Intl.RelativeTimeFormat | undefined;
    if (!formatter) {
      formatter = new Intl.RelativeTimeFormat(locale, {
        numeric: options.numeric || 'auto',
        style: options.style || 'long',
      });
      this.formatters.set(key, formatter);
    }

    return formatter.format(value, unit);
  }

  /**
   * Format relative time from date (auto-selects best unit)
   */
  formatRelativeTimeFromDate(date: Date, options: RelativeTimeFormatOptions = {}): string {
    const now = Date.now();
    const diffMs = date.getTime() - now;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    const diffWeek = Math.round(diffDay / 7);
    const diffMonth = Math.round(diffDay / 30);
    const diffYear = Math.round(diffDay / 365);

    if (Math.abs(diffSec) < 60) {
      return this.formatRelativeTime(diffSec, 'second', options);
    } else if (Math.abs(diffMin) < 60) {
      return this.formatRelativeTime(diffMin, 'minute', options);
    } else if (Math.abs(diffHour) < 24) {
      return this.formatRelativeTime(diffHour, 'hour', options);
    } else if (Math.abs(diffDay) < 7) {
      return this.formatRelativeTime(diffDay, 'day', options);
    } else if (Math.abs(diffWeek) < 4) {
      return this.formatRelativeTime(diffWeek, 'week', options);
    } else if (Math.abs(diffMonth) < 12) {
      return this.formatRelativeTime(diffMonth, 'month', options);
    } else {
      return this.formatRelativeTime(diffYear, 'year', options);
    }
  }

  /**
   * Format list (conjunction/disjunction)
   */
  formatList(items: string[], options: ListFormatOptions = {}): string {
    const locale = options.locale || this.locale;
    const key = `list:${locale}:${JSON.stringify(options)}`;

    let formatter = this.formatters.get(key) as Intl.ListFormat | undefined;
    if (!formatter) {
      formatter = new Intl.ListFormat(locale, {
        type: options.type || 'conjunction',
        style: options.style || 'long',
      });
      this.formatters.set(key, formatter);
    }

    return formatter.format(items);
  }

  /**
   * Get display name for locale
   */
  getLocaleDisplayName(localeCode: string, displayLocale?: string): string {
    const displayNames = new Intl.DisplayNames(displayLocale || this.locale, { type: 'language' });
    return displayNames.of(localeCode) || localeCode;
  }

  /**
   * Get display name for region
   */
  getRegionDisplayName(regionCode: string, displayLocale?: string): string {
    const displayNames = new Intl.DisplayNames(displayLocale || this.locale, { type: 'region' });
    return displayNames.of(regionCode) || regionCode;
  }

  /**
   * Get display name for currency
   */
  getCurrencyDisplayName(currencyCode: string, displayLocale?: string): string {
    const displayNames = new Intl.DisplayNames(displayLocale || this.locale, { type: 'currency' });
    return displayNames.of(currencyCode) || currencyCode;
  }

  /**
   * Get plural rules for locale
   */
  getPluralCategory(count: number, options?: { type?: 'cardinal' | 'ordinal' }): PluralCategory {
    const pluralRules = new Intl.PluralRules(this.locale, options);
    return pluralRules.select(count) as PluralCategory;
  }

  /**
   * Get supported locales
   */
  static getSupportedLocales(requested: string[]): string[] {
    return Intl.DateTimeFormat.supportedLocalesOf(requested);
  }
}

// ============================================================================
// MESSAGE FORMATTER ENGINE (ICU MessageFormat)
// ============================================================================

/**
 * ICU MessageFormat Engine
 *
 * Implements ICU MessageFormat syntax for complex translations
 * with pluralization, select, and date/time/number formatting.
 *
 * Based on: ICU MessageFormat, FormatJS
 */
export class MessageFormatterEngine {
  private locale: string;
  private messages: Map<string, CompiledMessage> = new Map();
  private intlFormatter: IntlFormatterEngine;

  constructor(locale = 'en-US') {
    this.locale = locale;
    this.intlFormatter = new IntlFormatterEngine(locale);
  }

  /**
   * Set locale
   */
  setLocale(locale: string): void {
    this.locale = locale;
    this.intlFormatter.setLocale(locale);
  }

  /**
   * Add messages
   */
  addMessages(messages: Record<string, string>): void {
    for (const [id, pattern] of Object.entries(messages)) {
      const compiled: CompiledMessage = {
        id,
        pattern,
        ast: this.parse(pattern),
      };
      this.messages.set(id, compiled);
    }
  }

  /**
   * Format a message
   */
  format(id: string, values: MessageValues = {}): string {
    const message = this.messages.get(id);
    if (!message) {
      console.warn(`Missing translation: ${id}`);
      return id;
    }

    return this.formatAST(message.ast.elements, values);
  }

  /**
   * Format a message pattern directly
   */
  formatPattern(pattern: string, values: MessageValues = {}): string {
    const ast = this.parse(pattern);
    return this.formatAST(ast.elements, values);
  }

  /**
   * Parse ICU message pattern
   */
  private parse(pattern: string): MessageAST {
    const elements: MessageElement[] = [];
    let i = 0;
    let currentLiteral = '';

    while (i < pattern.length) {
      const char = pattern[i];

      if (char === '{') {
        // Save current literal
        if (currentLiteral) {
          elements.push({ type: 'literal', value: currentLiteral });
          currentLiteral = '';
        }

        // Parse argument
        const endIndex = this.findMatchingBrace(pattern, i);
        const argContent = pattern.slice(i + 1, endIndex);
        elements.push(this.parseArgument(argContent));
        i = endIndex + 1;
      } else if (char === "'" && i + 1 < pattern.length) {
        // Escape sequence
        if (pattern[i + 1] === "'") {
          currentLiteral += "'";
          i += 2;
        } else {
          const endQuote = pattern.indexOf("'", i + 1);
          if (endQuote !== -1) {
            currentLiteral += pattern.slice(i + 1, endQuote);
            i = endQuote + 1;
          } else {
            currentLiteral += char;
            i++;
          }
        }
      } else {
        currentLiteral += char;
        i++;
      }
    }

    if (currentLiteral) {
      elements.push({ type: 'literal', value: currentLiteral });
    }

    return { type: 'messageFormatPattern', elements };
  }

  /**
   * Parse argument expression
   */
  private parseArgument(content: string): MessageElement {
    const parts = content.split(',').map((p) => p.trim());
    const argName = parts[0];

    if (parts.length === 1) {
      return { type: 'argument', value: argName };
    }

    const argType = parts[1].toLowerCase();

    switch (argType) {
      case 'plural':
      case 'selectordinal': {
        const optionsStr = parts.slice(2).join(',');
        const options = this.parsePluralOptions(optionsStr);
        const element: MessageElement = {
          type: argType === 'selectordinal' ? 'select' : 'plural',
          value: argName,
          options,
        };
        // Extract offset if present
        const offsetMatch = optionsStr.match(/offset:\s*(\d+)/);
        if (offsetMatch && element.type === 'plural') {
          (element as Extract<MessageElement, { type: 'plural' }>).offset = parseInt(offsetMatch[1]);
        }
        return element;
      }

      case 'select': {
        const optionsStr = parts.slice(2).join(',');
        return {
          type: 'select',
          value: argName,
          options: this.parseSelectOptions(optionsStr),
        };
      }

      case 'date':
        return {
          type: 'date',
          value: argName,
          style: parts[2],
        };

      case 'time':
        return {
          type: 'time',
          value: argName,
          style: parts[2],
        };

      case 'number':
        return {
          type: 'number',
          value: argName,
          style: parts[2],
        };

      default:
        return { type: 'argument', value: argName };
    }
  }

  /**
   * Parse plural options
   */
  private parsePluralOptions(optionsStr: string): Record<string, MessageElement[]> {
    const options: Record<string, MessageElement[]> = {};
    const regex = /(?:offset:\s*\d+\s+)?(=\d+|zero|one|two|few|many|other)\s*\{([^}]*)\}/g;
    let match;

    while ((match = regex.exec(optionsStr)) !== null) {
      const key = match[1];
      const value = match[2];
      options[key] = this.parse(value).elements;
    }

    return options;
  }

  /**
   * Parse select options
   */
  private parseSelectOptions(optionsStr: string): Record<string, MessageElement[]> {
    const options: Record<string, MessageElement[]> = {};
    const regex = /(\w+)\s*\{([^}]*)\}/g;
    let match;

    while ((match = regex.exec(optionsStr)) !== null) {
      const key = match[1];
      const value = match[2];
      options[key] = this.parse(value).elements;
    }

    return options;
  }

  /**
   * Format AST elements
   */
  private formatAST(elements: MessageElement[], values: MessageValues): string {
    return elements.map((element) => this.formatElement(element, values)).join('');
  }

  /**
   * Format single element
   */
  private formatElement(element: MessageElement, values: MessageValues): string {
    switch (element.type) {
      case 'literal':
        return element.value;

      case 'argument': {
        const value = values[element.value];
        return value !== undefined ? String(value) : `{${element.value}}`;
      }

      case 'plural': {
        const count = values[element.value] as number;
        const offset = element.offset || 0;
        const adjustedCount = count - offset;

        // Check exact match first
        const exactKey = `=${count}`;
        if (element.options[exactKey]) {
          return this.formatAST(element.options[exactKey], values).replace(/#/g, String(adjustedCount));
        }

        // Get plural category
        const category = this.intlFormatter.getPluralCategory(adjustedCount);
        const option = element.options[category] || element.options.other;

        if (option) {
          return this.formatAST(option, values).replace(/#/g, String(adjustedCount));
        }
        return String(count);
      }

      case 'select': {
        const value = values[element.value] as string;
        const option = element.options[value] || element.options.other;
        return option ? this.formatAST(option, values) : String(value);
      }

      case 'date': {
        const date = values[element.value] as Date;
        if (!date) return '';
        const style = this.getDateStyle(element.style);
        return this.intlFormatter.formatDate(date, style);
      }

      case 'time': {
        const time = values[element.value] as Date;
        if (!time) return '';
        const style = this.getTimeStyle(element.style);
        return this.intlFormatter.formatDate(time, style);
      }

      case 'number': {
        const num = values[element.value] as number;
        if (num === undefined) return '';
        const style = this.getNumberStyle(element.style);
        return this.intlFormatter.formatNumber(num, style);
      }

      default:
        return '';
    }
  }

  private getDateStyle(style?: string): DateFormatOptions {
    switch (style) {
      case 'short': return { dateStyle: 'short' };
      case 'medium': return { dateStyle: 'medium' };
      case 'long': return { dateStyle: 'long' };
      case 'full': return { dateStyle: 'full' };
      default: return { dateStyle: 'medium' };
    }
  }

  private getTimeStyle(style?: string): DateFormatOptions {
    switch (style) {
      case 'short': return { timeStyle: 'short' };
      case 'medium': return { timeStyle: 'medium' };
      case 'long': return { timeStyle: 'long' };
      case 'full': return { timeStyle: 'full' };
      default: return { timeStyle: 'short' };
    }
  }

  private getNumberStyle(style?: string): NumberFormatOptions {
    switch (style) {
      case 'integer': return { maximumFractionDigits: 0 };
      case 'percent': return { style: 'percent' };
      case 'currency': return { style: 'currency', currency: 'USD' };
      default: return {};
    }
  }

  private findMatchingBrace(str: string, start: number): number {
    let depth = 1;
    let i = start + 1;

    while (i < str.length && depth > 0) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') depth--;
      i++;
    }

    return i - 1;
  }
}

// ============================================================================
// LOCALE DETECTOR ENGINE
// ============================================================================

/**
 * Locale Detection Engine
 *
 * Detects user locale from multiple sources with configurable
 * priority and fallback behavior.
 *
 * Based on: Phrase locale detection, i18next-browser-languageDetector
 */
export class LocaleDetectorEngine {
  private config: LocaleDetectionConfig;
  private supportedLocales: Set<string>;
  private cachedLocale: string | null = null;

  constructor(
    config: Partial<LocaleDetectionConfig> = {},
    supportedLocales: string[] = ['en-US']
  ) {
    this.config = {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      fallback: 'en-US',
      caches: ['localStorage'],
      cookieName: 'i18n_locale',
      lookupQuerystring: 'lang',
      lookupCookie: 'i18n_locale',
      lookupLocalStorage: 'i18n_locale',
      ...config,
    };
    this.supportedLocales = new Set(supportedLocales);
  }

  /**
   * Detect user locale
   */
  detect(): DetectedLocale {
    for (const source of this.config.order) {
      const result = this.detectFromSource(source);
      if (result && this.isSupported(result.locale)) {
        this.cacheLocale(result.locale);
        return result;
      }
    }

    return {
      locale: this.config.fallback,
      source: 'querystring', // fallback marker
      confidence: 0,
    };
  }

  /**
   * Detect from specific source
   */
  private detectFromSource(source: LocaleDetectionSource): DetectedLocale | null {
    switch (source) {
      case 'querystring':
        return this.detectFromQuerystring();
      case 'cookie':
        return this.detectFromCookie();
      case 'localStorage':
        return this.detectFromLocalStorage();
      case 'sessionStorage':
        return this.detectFromSessionStorage();
      case 'navigator':
        return this.detectFromNavigator();
      case 'htmlTag':
        return this.detectFromHtmlTag();
      case 'path':
        return this.detectFromPath();
      case 'subdomain':
        return this.detectFromSubdomain();
      case 'header':
        return this.detectFromHeader();
      default:
        return null;
    }
  }

  private detectFromQuerystring(): DetectedLocale | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const locale = params.get(this.config.lookupQuerystring || 'lang');
    if (locale) {
      return { locale, source: 'querystring', confidence: 1.0 };
    }
    return null;
  }

  private detectFromCookie(): DetectedLocale | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.config.lookupCookie) {
        return { locale: value, source: 'cookie', confidence: 0.9 };
      }
    }
    return null;
  }

  private detectFromLocalStorage(): DetectedLocale | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const locale = localStorage.getItem(this.config.lookupLocalStorage || 'i18n_locale');
      if (locale) {
        return { locale, source: 'localStorage', confidence: 0.9 };
      }
    } catch {
      // localStorage may be blocked
    }
    return null;
  }

  private detectFromSessionStorage(): DetectedLocale | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const locale = sessionStorage.getItem(this.config.lookupLocalStorage || 'i18n_locale');
      if (locale) {
        return { locale, source: 'sessionStorage', confidence: 0.8 };
      }
    } catch {
      // sessionStorage may be blocked
    }
    return null;
  }

  private detectFromNavigator(): DetectedLocale | null {
    if (typeof navigator === 'undefined') return null;

    // navigator.languages provides ordered preference list
    const languages = navigator.languages || [navigator.language];
    for (const lang of languages) {
      if (this.isSupported(lang)) {
        return { locale: lang, source: 'navigator', confidence: 0.7 };
      }

      // Try language without region
      const langOnly = lang.split('-')[0];
      if (this.isSupported(langOnly)) {
        return { locale: langOnly, source: 'navigator', confidence: 0.6 };
      }
    }

    // Return first navigator language even if not supported
    if (languages.length > 0) {
      return { locale: languages[0], source: 'navigator', confidence: 0.5 };
    }

    return null;
  }

  private detectFromHtmlTag(): DetectedLocale | null {
    if (typeof document === 'undefined') return null;
    const lang = document.documentElement.lang;
    if (lang) {
      return { locale: lang, source: 'htmlTag', confidence: 0.6 };
    }
    return null;
  }

  private detectFromPath(): DetectedLocale | null {
    if (typeof window === 'undefined') return null;
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      const potentialLocale = pathSegments[0];
      if (this.isLocaleFormat(potentialLocale)) {
        return { locale: potentialLocale, source: 'path', confidence: 0.8 };
      }
    }
    return null;
  }

  private detectFromSubdomain(): DetectedLocale | null {
    if (typeof window === 'undefined') return null;
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    if (this.isLocaleFormat(subdomain)) {
      return { locale: subdomain, source: 'subdomain', confidence: 0.8 };
    }
    return null;
  }

  private detectFromHeader(): DetectedLocale | null {
    // Accept-Language header is only available server-side
    // This is a placeholder for server-side implementation
    return null;
  }

  /**
   * Check if locale is supported
   */
  isSupported(locale: string): boolean {
    if (this.supportedLocales.has(locale)) return true;

    // Check language without region
    const langOnly = locale.split('-')[0];
    for (const supported of this.supportedLocales) {
      if (supported.startsWith(langOnly)) return true;
    }

    return false;
  }

  /**
   * Check if string looks like a locale code
   */
  private isLocaleFormat(str: string): boolean {
    return /^[a-z]{2}(-[A-Z]{2})?$/.test(str);
  }

  /**
   * Cache detected locale
   */
  private cacheLocale(locale: string): void {
    this.cachedLocale = locale;

    for (const cache of this.config.caches || []) {
      try {
        switch (cache) {
          case 'localStorage':
            localStorage.setItem(this.config.lookupLocalStorage || 'i18n_locale', locale);
            break;
          case 'sessionStorage':
            sessionStorage.setItem(this.config.lookupLocalStorage || 'i18n_locale', locale);
            break;
          case 'cookie':
            document.cookie = `${this.config.cookieName}=${locale};path=/;max-age=31536000`;
            break;
        }
      } catch {
        // Storage may be blocked
      }
    }
  }

  /**
   * Get cached locale
   */
  getCachedLocale(): string | null {
    return this.cachedLocale;
  }

  /**
   * Clear cached locale
   */
  clearCache(): void {
    this.cachedLocale = null;
    for (const cache of this.config.caches || []) {
      try {
        switch (cache) {
          case 'localStorage':
            localStorage.removeItem(this.config.lookupLocalStorage || 'i18n_locale');
            break;
          case 'sessionStorage':
            sessionStorage.removeItem(this.config.lookupLocalStorage || 'i18n_locale');
            break;
          case 'cookie':
            document.cookie = `${this.config.cookieName}=;path=/;max-age=0`;
            break;
        }
      } catch {
        // Storage may be blocked
      }
    }
  }

  /**
   * Set supported locales
   */
  setSupportedLocales(locales: string[]): void {
    this.supportedLocales = new Set(locales);
  }
}

// ============================================================================
// RTL SUPPORT ENGINE
// ============================================================================

/**
 * RTL (Right-to-Left) Support Engine
 *
 * Provides RTL layout support for Arabic, Hebrew, and other
 * RTL languages using CSS logical properties.
 *
 * Based on: RTL Styling 101, W3C Internationalization
 */
export class RTLSupportEngine {
  private config: RTLConfig;
  private rtlLocales: Set<string>;

  constructor(config: Partial<RTLConfig> = {}) {
    this.config = {
      enabled: true,
      locales: ['ar', 'he', 'fa', 'ur', 'yi', 'ps', 'sd', 'dv'],
      flipMargins: true,
      flipPadding: true,
      flipPositioning: true,
      flipBorders: true,
      flipTransforms: true,
      ...config,
    };

    this.rtlLocales = new Set(this.config.locales);
  }

  /**
   * Check if locale is RTL
   */
  isRTL(locale: string): boolean {
    const lang = locale.split('-')[0].toLowerCase();
    return this.rtlLocales.has(lang);
  }

  /**
   * Get text direction for locale
   */
  getDirection(locale: string): 'ltr' | 'rtl' {
    return this.isRTL(locale) ? 'rtl' : 'ltr';
  }

  /**
   * Apply RTL attributes to HTML element
   */
  applyToDocument(locale: string): void {
    if (typeof document === 'undefined') return;

    const dir = this.getDirection(locale);
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', locale);

    // Add RTL class for CSS targeting
    if (dir === 'rtl') {
      document.documentElement.classList.add('rtl');
      document.documentElement.classList.remove('ltr');
    } else {
      document.documentElement.classList.add('ltr');
      document.documentElement.classList.remove('rtl');
    }
  }

  /**
   * Convert physical CSS properties to logical
   */
  toLogicalCSS(physical: Record<string, string>): LogicalCSS {
    const logical: LogicalCSS = {};

    if (physical['margin-left']) {
      logical.marginInlineStart = physical['margin-left'];
    }
    if (physical['margin-right']) {
      logical.marginInlineEnd = physical['margin-right'];
    }
    if (physical['padding-left']) {
      logical.paddingInlineStart = physical['padding-left'];
    }
    if (physical['padding-right']) {
      logical.paddingInlineEnd = physical['padding-right'];
    }
    if (physical['left']) {
      logical.insetInlineStart = physical['left'];
    }
    if (physical['right']) {
      logical.insetInlineEnd = physical['right'];
    }
    if (physical['border-left']) {
      logical.borderInlineStart = physical['border-left'];
    }
    if (physical['border-right']) {
      logical.borderInlineEnd = physical['border-right'];
    }
    if (physical['text-align']) {
      const align = physical['text-align'];
      if (align === 'left') logical.textAlign = 'start';
      else if (align === 'right') logical.textAlign = 'end';
      else if (align === 'center') logical.textAlign = 'center';
    }

    return logical;
  }

  /**
   * Generate RTL-aware CSS
   */
  generateCSS(selector: string, styles: LogicalCSS): string {
    const declarations: string[] = [];

    if (styles.marginInlineStart) {
      declarations.push(`margin-inline-start: ${styles.marginInlineStart}`);
    }
    if (styles.marginInlineEnd) {
      declarations.push(`margin-inline-end: ${styles.marginInlineEnd}`);
    }
    if (styles.paddingInlineStart) {
      declarations.push(`padding-inline-start: ${styles.paddingInlineStart}`);
    }
    if (styles.paddingInlineEnd) {
      declarations.push(`padding-inline-end: ${styles.paddingInlineEnd}`);
    }
    if (styles.insetInlineStart) {
      declarations.push(`inset-inline-start: ${styles.insetInlineStart}`);
    }
    if (styles.insetInlineEnd) {
      declarations.push(`inset-inline-end: ${styles.insetInlineEnd}`);
    }
    if (styles.borderInlineStart) {
      declarations.push(`border-inline-start: ${styles.borderInlineStart}`);
    }
    if (styles.borderInlineEnd) {
      declarations.push(`border-inline-end: ${styles.borderInlineEnd}`);
    }
    if (styles.textAlign) {
      declarations.push(`text-align: ${styles.textAlign}`);
    }

    return `${selector} {\n  ${declarations.join(';\n  ')};\n}`;
  }

  /**
   * Get recommended fonts for RTL language
   */
  getRecommendedFonts(locale: string): string[] {
    const lang = locale.split('-')[0].toLowerCase();

    switch (lang) {
      case 'ar':
        return ['Amiri', 'Noto Sans Arabic', 'Cairo', 'Scheherazade', 'system-ui'];
      case 'he':
        return ['Noto Sans Hebrew', 'Heebo', 'Assistant', 'Frank Ruhl Libre', 'system-ui'];
      case 'fa':
        return ['Vazir', 'Noto Sans Arabic', 'B Nazanin', 'system-ui'];
      case 'ur':
        return ['Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'system-ui'];
      default:
        return ['system-ui'];
    }
  }

  /**
   * Get CSS for RTL font stack
   */
  getFontFamilyCSS(locale: string): string {
    const fonts = this.getRecommendedFonts(locale);
    return `font-family: ${fonts.map((f) => (f.includes(' ') ? `"${f}"` : f)).join(', ')}`;
  }

  /**
   * Add RTL locale
   */
  addRTLLocale(locale: string): void {
    this.rtlLocales.add(locale.split('-')[0].toLowerCase());
  }

  /**
   * Get all RTL locales
   */
  getRTLLocales(): string[] {
    return Array.from(this.rtlLocales);
  }
}

// ============================================================================
// TRANSLATION MANAGER ENGINE
// ============================================================================

/**
 * Translation Manager Engine
 *
 * Manages translation bundles with loading, caching, and
 * TMS integration support.
 *
 * Based on: Crowdin, Lokalise, Phrase TMS patterns
 */
export class TranslationManagerEngine {
  private bundles: Map<string, TranslationBundle> = new Map();
  private pendingLoads: Map<string, Promise<TranslationBundle>> = new Map();
  private tmsConfig: TMSConfig | null = null;
  private messageFormatter: MessageFormatterEngine;
  private onMissingKey: ((key: string, locale: string) => void) | null = null;

  constructor(defaultLocale = 'en-US') {
    this.messageFormatter = new MessageFormatterEngine(defaultLocale);
  }

  /**
   * Configure TMS integration
   */
  configureTMS(config: TMSConfig): void {
    this.tmsConfig = config;
  }

  /**
   * Load translation bundle
   */
  async loadBundle(
    locale: string,
    loader: () => Promise<Record<string, string>>
  ): Promise<TranslationBundle> {
    // Check if already loaded
    if (this.bundles.has(locale)) {
      return this.bundles.get(locale)!;
    }

    // Check if load is pending
    if (this.pendingLoads.has(locale)) {
      return this.pendingLoads.get(locale)!;
    }

    // Start loading
    const loadPromise = (async () => {
      try {
        const messages = await loader();
        const bundle: TranslationBundle = {
          locale,
          messages,
          metadata: {
            version: '1.0.0',
            lastUpdated: new Date(),
          },
        };

        this.bundles.set(locale, bundle);
        this.messageFormatter.addMessages(messages);
        this.pendingLoads.delete(locale);

        return bundle;
      } catch (error) {
        this.pendingLoads.delete(locale);
        throw error;
      }
    })();

    this.pendingLoads.set(locale, loadPromise);
    return loadPromise;
  }

  /**
   * Add translation bundle directly
   */
  addBundle(bundle: TranslationBundle): void {
    this.bundles.set(bundle.locale, bundle);
    this.messageFormatter.addMessages(bundle.messages);
  }

  /**
   * Get translation
   */
  translate(key: string, values: MessageValues = {}, locale?: string): string {
    const bundle = locale ? this.bundles.get(locale) : this.getCurrentBundle();

    if (!bundle || !bundle.messages[key]) {
      this.handleMissingKey(key, locale || 'unknown');
      return key;
    }

    return this.messageFormatter.formatPattern(bundle.messages[key], values);
  }

  /**
   * Get translation (alias)
   */
  t(key: string, values: MessageValues = {}, locale?: string): string {
    return this.translate(key, values, locale);
  }

  /**
   * Check if translation exists
   */
  hasTranslation(key: string, locale?: string): boolean {
    const bundle = locale ? this.bundles.get(locale) : this.getCurrentBundle();
    return !!bundle?.messages[key];
  }

  /**
   * Get all keys for locale
   */
  getKeys(locale?: string): string[] {
    const bundle = locale ? this.bundles.get(locale) : this.getCurrentBundle();
    return bundle ? Object.keys(bundle.messages) : [];
  }

  /**
   * Get translation progress
   */
  getProgress(baseLocale: string, targetLocale: string): TranslationProgress {
    const baseBundle = this.bundles.get(baseLocale);
    const targetBundle = this.bundles.get(targetLocale);

    if (!baseBundle) {
      return {
        locale: targetLocale,
        totalKeys: 0,
        translatedKeys: 0,
        reviewedKeys: 0,
        approvedKeys: 0,
        percentage: 0,
      };
    }

    const totalKeys = Object.keys(baseBundle.messages).length;
    const translatedKeys = targetBundle
      ? Object.keys(targetBundle.messages).filter((key) => baseBundle.messages[key]).length
      : 0;

    return {
      locale: targetLocale,
      totalKeys,
      translatedKeys,
      reviewedKeys: 0, // Would require metadata tracking
      approvedKeys: 0,
      percentage: totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0,
    };
  }

  /**
   * Set missing key handler
   */
  onMissing(handler: (key: string, locale: string) => void): void {
    this.onMissingKey = handler;
  }

  /**
   * Sync with TMS (simulated)
   */
  async syncWithTMS(): Promise<TMSSyncResult> {
    if (!this.tmsConfig) {
      throw new Error('TMS not configured');
    }

    // Simulate TMS sync
    return {
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [],
      timestamp: new Date(),
    };
  }

  /**
   * Export translations
   */
  exportBundle(locale: string, format: 'json' | 'xliff' | 'po' = 'json'): string {
    const bundle = this.bundles.get(locale);
    if (!bundle) {
      throw new Error(`Bundle not found: ${locale}`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(bundle.messages, null, 2);

      case 'xliff':
        return this.toXLIFF(bundle);

      case 'po':
        return this.toPO(bundle);

      default:
        return JSON.stringify(bundle.messages, null, 2);
    }
  }

  /**
   * Get loaded locales
   */
  getLoadedLocales(): string[] {
    return Array.from(this.bundles.keys());
  }

  private getCurrentBundle(): TranslationBundle | undefined {
    // Return first loaded bundle as current
    return this.bundles.values().next().value;
  }

  private handleMissingKey(key: string, locale: string): void {
    if (this.onMissingKey) {
      this.onMissingKey(key, locale);
    } else {
      console.warn(`Missing translation: ${key} [${locale}]`);
    }
  }

  private toXLIFF(bundle: TranslationBundle): string {
    const units = Object.entries(bundle.messages)
      .map(
        ([id, message]) => `
    <trans-unit id="${id}">
      <source>${this.escapeXML(message)}</source>
      <target>${this.escapeXML(message)}</target>
    </trans-unit>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" target-language="${bundle.locale}" datatype="plaintext">
    <body>${units}
    </body>
  </file>
</xliff>`;
  }

  private toPO(bundle: TranslationBundle): string {
    const entries = Object.entries(bundle.messages)
      .map(
        ([id, message]) => `
msgid "${this.escapePO(id)}"
msgstr "${this.escapePO(message)}"`
      )
      .join('\n');

    return `# Translation file for ${bundle.locale}
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: ${bundle.locale}\\n"
${entries}`;
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private escapePO(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
}

// ============================================================================
// LOCALE NEGOTIATOR ENGINE
// ============================================================================

/**
 * Locale Negotiator Engine
 *
 * Matches requested locales to supported locales with
 * fallback chains and quality value handling.
 *
 * Based on: HTTP Accept-Language, BCP 47
 */
export class LocaleNegotiatorEngine {
  private supportedLocales: Map<string, Locale> = new Map();
  private fallbackChains: Map<string, string[]> = new Map();
  private defaultLocale: string;

  constructor(defaultLocale = 'en-US') {
    this.defaultLocale = defaultLocale;
  }

  /**
   * Register a supported locale
   */
  registerLocale(locale: Locale): void {
    this.supportedLocales.set(locale.code, locale);
  }

  /**
   * Set fallback chain for locale
   */
  setFallbackChain(locale: string, chain: string[]): void {
    this.fallbackChains.set(locale, chain);
  }

  /**
   * Negotiate best matching locale
   */
  negotiate(requested: string | string[]): string {
    const requestedList = Array.isArray(requested) ? requested : [requested];

    for (const req of requestedList) {
      // Exact match
      if (this.supportedLocales.has(req)) {
        return req;
      }

      // Language match (without region)
      const lang = req.split('-')[0];
      for (const [code] of this.supportedLocales) {
        if (code.startsWith(lang + '-') || code === lang) {
          return code;
        }
      }
    }

    return this.defaultLocale;
  }

  /**
   * Parse Accept-Language header
   */
  parseAcceptLanguage(header: string): { locale: string; quality: number }[] {
    return header
      .split(',')
      .map((part) => {
        const [locale, quality] = part.trim().split(';q=');
        return {
          locale: locale.trim(),
          quality: quality ? parseFloat(quality) : 1.0,
        };
      })
      .sort((a, b) => b.quality - a.quality);
  }

  /**
   * Get fallback chain for locale
   */
  getFallbackChain(locale: string): string[] {
    // Check custom chain
    if (this.fallbackChains.has(locale)) {
      return this.fallbackChains.get(locale)!;
    }

    // Generate automatic chain
    const chain: string[] = [locale];
    const parts = locale.split('-');

    // Add language-only version
    if (parts.length > 1) {
      chain.push(parts[0]);
    }

    // Add default
    if (!chain.includes(this.defaultLocale)) {
      chain.push(this.defaultLocale);
    }

    return chain;
  }

  /**
   * Get locale info
   */
  getLocaleInfo(code: string): Locale | undefined {
    return this.supportedLocales.get(code);
  }

  /**
   * Get all supported locales
   */
  getSupportedLocales(): Locale[] {
    return Array.from(this.supportedLocales.values());
  }

  /**
   * Check if locale is supported
   */
  isSupported(locale: string): boolean {
    return this.supportedLocales.has(locale);
  }

  /**
   * Set default locale
   */
  setDefaultLocale(locale: string): void {
    this.defaultLocale = locale;
  }

  /**
   * Get default locale
   */
  getDefaultLocale(): string {
    return this.defaultLocale;
  }
}

// ============================================================================
// INTEGRATED I18N PLATFORM
// ============================================================================

/**
 * Integrated Internationalization Platform
 *
 * Unified i18n platform for Ring combining all engines
 * with Ring-specific defaults.
 */
export class IntegratedI18nPlatform {
  public readonly formatter: IntlFormatterEngine;
  public readonly messages: MessageFormatterEngine;
  public readonly detector: LocaleDetectorEngine;
  public readonly rtl: RTLSupportEngine;
  public readonly translations: TranslationManagerEngine;
  public readonly negotiator: LocaleNegotiatorEngine;

  private currentLocale: string;
  private readonly onLocaleChange: ((locale: string) => void)[] = [];

  constructor(defaultLocale = 'en-US') {
    this.currentLocale = defaultLocale;
    this.formatter = new IntlFormatterEngine(defaultLocale);
    this.messages = new MessageFormatterEngine(defaultLocale);
    this.detector = new LocaleDetectorEngine({}, this.getSupportedLocaleCodes());
    this.rtl = new RTLSupportEngine();
    this.translations = new TranslationManagerEngine(defaultLocale);
    this.negotiator = new LocaleNegotiatorEngine(defaultLocale);

    this.initializeRingDefaults();
  }

  /**
   * Initialize Ring-specific defaults
   */
  private initializeRingDefaults(): void {
    // Register supported locales
    const locales: Locale[] = [
      {
        code: 'en-US',
        language: 'en',
        region: 'US',
        name: 'English (US)',
        nativeName: 'English (US)',
        direction: 'ltr',
        numberFormat: {
          decimalSeparator: '.',
          groupingSeparator: ',',
          currencySymbol: '$',
          currencyCode: 'USD',
          currencyPosition: 'prefix',
        },
        dateFormat: {
          short: 'MM/DD/YYYY',
          medium: 'MMM D, YYYY',
          long: 'MMMM D, YYYY',
          full: 'dddd, MMMM D, YYYY',
          firstDayOfWeek: 0,
          monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
          dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        },
        pluralRules: ['one', 'other'],
      },
      {
        code: 'ja-JP',
        language: 'ja',
        region: 'JP',
        name: 'Japanese',
        nativeName: '日本語',
        direction: 'ltr',
        numberFormat: {
          decimalSeparator: '.',
          groupingSeparator: ',',
          currencySymbol: '¥',
          currencyCode: 'JPY',
          currencyPosition: 'prefix',
        },
        dateFormat: {
          short: 'YYYY/MM/DD',
          medium: 'YYYY年M月D日',
          long: 'YYYY年M月D日',
          full: 'YYYY年M月D日 dddd',
          firstDayOfWeek: 0,
          monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
          dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
        },
        pluralRules: ['other'],
      },
      {
        code: 'es-ES',
        language: 'es',
        region: 'ES',
        name: 'Spanish (Spain)',
        nativeName: 'Español (España)',
        direction: 'ltr',
        numberFormat: {
          decimalSeparator: ',',
          groupingSeparator: '.',
          currencySymbol: '€',
          currencyCode: 'EUR',
          currencyPosition: 'suffix',
        },
        dateFormat: {
          short: 'DD/MM/YYYY',
          medium: 'D MMM YYYY',
          long: 'D de MMMM de YYYY',
          full: 'dddd, D de MMMM de YYYY',
          firstDayOfWeek: 1,
          monthNames: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
          dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
        },
        pluralRules: ['one', 'other'],
      },
      {
        code: 'ar-SA',
        language: 'ar',
        region: 'SA',
        name: 'Arabic (Saudi Arabia)',
        nativeName: 'العربية (السعودية)',
        direction: 'rtl',
        numberFormat: {
          decimalSeparator: '٫',
          groupingSeparator: '٬',
          currencySymbol: 'ر.س',
          currencyCode: 'SAR',
          currencyPosition: 'suffix',
        },
        dateFormat: {
          short: 'DD/MM/YYYY',
          medium: 'D MMM YYYY',
          long: 'D MMMM YYYY',
          full: 'dddd، D MMMM YYYY',
          firstDayOfWeek: 6,
          monthNames: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
          dayNames: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
        },
        pluralRules: ['zero', 'one', 'two', 'few', 'many', 'other'],
      },
      {
        code: 'zh-CN',
        language: 'zh',
        region: 'CN',
        script: 'Hans',
        name: 'Chinese (Simplified)',
        nativeName: '简体中文',
        direction: 'ltr',
        numberFormat: {
          decimalSeparator: '.',
          groupingSeparator: ',',
          currencySymbol: '¥',
          currencyCode: 'CNY',
          currencyPosition: 'prefix',
        },
        dateFormat: {
          short: 'YYYY/MM/DD',
          medium: 'YYYY年M月D日',
          long: 'YYYY年M月D日',
          full: 'YYYY年M月D日 dddd',
          firstDayOfWeek: 1,
          monthNames: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
          dayNames: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
        },
        pluralRules: ['other'],
      },
      {
        code: 'de-DE',
        language: 'de',
        region: 'DE',
        name: 'German (Germany)',
        nativeName: 'Deutsch (Deutschland)',
        direction: 'ltr',
        numberFormat: {
          decimalSeparator: ',',
          groupingSeparator: '.',
          currencySymbol: '€',
          currencyCode: 'EUR',
          currencyPosition: 'suffix',
        },
        dateFormat: {
          short: 'DD.MM.YYYY',
          medium: 'D. MMM YYYY',
          long: 'D. MMMM YYYY',
          full: 'dddd, D. MMMM YYYY',
          firstDayOfWeek: 1,
          monthNames: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
          dayNames: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
        },
        pluralRules: ['one', 'other'],
      },
      {
        code: 'fr-FR',
        language: 'fr',
        region: 'FR',
        name: 'French (France)',
        nativeName: 'Français (France)',
        direction: 'ltr',
        numberFormat: {
          decimalSeparator: ',',
          groupingSeparator: ' ',
          currencySymbol: '€',
          currencyCode: 'EUR',
          currencyPosition: 'suffix',
        },
        dateFormat: {
          short: 'DD/MM/YYYY',
          medium: 'D MMM YYYY',
          long: 'D MMMM YYYY',
          full: 'dddd D MMMM YYYY',
          firstDayOfWeek: 1,
          monthNames: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
          dayNames: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
        },
        pluralRules: ['one', 'other'],
      },
      {
        code: 'ko-KR',
        language: 'ko',
        region: 'KR',
        name: 'Korean',
        nativeName: '한국어',
        direction: 'ltr',
        numberFormat: {
          decimalSeparator: '.',
          groupingSeparator: ',',
          currencySymbol: '₩',
          currencyCode: 'KRW',
          currencyPosition: 'prefix',
        },
        dateFormat: {
          short: 'YYYY.MM.DD',
          medium: 'YYYY년 M월 D일',
          long: 'YYYY년 M월 D일',
          full: 'YYYY년 M월 D일 dddd',
          firstDayOfWeek: 0,
          monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
          dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
        },
        pluralRules: ['other'],
      },
    ];

    for (const locale of locales) {
      this.negotiator.registerLocale(locale);
    }

    // Set up fallback chains
    this.negotiator.setFallbackChain('en-GB', ['en-GB', 'en-US', 'en']);
    this.negotiator.setFallbackChain('es-MX', ['es-MX', 'es-ES', 'es']);
    this.negotiator.setFallbackChain('zh-TW', ['zh-TW', 'zh-CN', 'zh']);

    // Add Ring-specific translations
    this.translations.addBundle({
      locale: 'en-US',
      messages: {
        'app.name': 'Ring Spam Blocker',
        'call.incoming': 'Incoming call from {caller}',
        'call.spam_detected': 'Spam call detected! Score: {score, number, percent}',
        'call.blocked': '{count, plural, one {# call blocked} other {# calls blocked}} today',
        'settings.language': 'Language',
        'settings.notifications': 'Notifications',
        'error.generic': 'An error occurred. Please try again.',
      },
    });

    this.translations.addBundle({
      locale: 'ja-JP',
      messages: {
        'app.name': 'Ring スパムブロッカー',
        'call.incoming': '{caller}からの着信',
        'call.spam_detected': 'スパム着信を検出しました！スコア: {score, number, percent}',
        'call.blocked': '本日{count}件の着信をブロックしました',
        'settings.language': '言語',
        'settings.notifications': '通知',
        'error.generic': 'エラーが発生しました。もう一度お試しください。',
      },
    });

    this.translations.addBundle({
      locale: 'ar-SA',
      messages: {
        'app.name': 'حاجب المكالمات المزعجة',
        'call.incoming': 'مكالمة واردة من {caller}',
        'call.spam_detected': 'تم اكتشاف مكالمة مزعجة! النتيجة: {score, number, percent}',
        'call.blocked': '{count, plural, zero {لا مكالمات محظورة} one {مكالمة واحدة محظورة} two {مكالمتان محظورتان} few {# مكالمات محظورة} many {# مكالمة محظورة} other {# مكالمة محظورة}} اليوم',
        'settings.language': 'اللغة',
        'settings.notifications': 'الإشعارات',
        'error.generic': 'حدث خطأ. يرجى المحاولة مرة أخرى.',
      },
    });

    // Update detector with supported locales
    this.detector.setSupportedLocales(this.getSupportedLocaleCodes());
  }

  /**
   * Get supported locale codes
   */
  private getSupportedLocaleCodes(): string[] {
    return this.negotiator.getSupportedLocales().map((l) => l.code);
  }

  /**
   * Set current locale
   */
  async setLocale(locale: string): Promise<void> {
    const negotiated = this.negotiator.negotiate(locale);
    this.currentLocale = negotiated;

    // Update all engines
    this.formatter.setLocale(negotiated);
    this.messages.setLocale(negotiated);

    // Apply RTL if needed
    this.rtl.applyToDocument(negotiated);

    // Notify listeners
    for (const handler of this.onLocaleChange) {
      handler(negotiated);
    }
  }

  /**
   * Get current locale
   */
  getLocale(): string {
    return this.currentLocale;
  }

  /**
   * Detect and set user locale
   */
  async detectAndSetLocale(): Promise<string> {
    const detected = this.detector.detect();
    await this.setLocale(detected.locale);
    return this.currentLocale;
  }

  /**
   * Translate shorthand
   */
  t(key: string, values: MessageValues = {}): string {
    return this.translations.translate(key, values, this.currentLocale);
  }

  /**
   * Format date shorthand
   */
  formatDate(date: Date, options?: DateFormatOptions): string {
    return this.formatter.formatDate(date, options);
  }

  /**
   * Format number shorthand
   */
  formatNumber(value: number, options?: NumberFormatOptions): string {
    return this.formatter.formatNumber(value, options);
  }

  /**
   * Format currency shorthand
   */
  formatCurrency(value: number, currency: string): string {
    return this.formatter.formatCurrency(value, currency);
  }

  /**
   * Format relative time shorthand
   */
  formatRelativeTime(date: Date): string {
    return this.formatter.formatRelativeTimeFromDate(date);
  }

  /**
   * Add locale change listener
   */
  onLocaleChanged(handler: (locale: string) => void): () => void {
    this.onLocaleChange.push(handler);
    return () => {
      const index = this.onLocaleChange.indexOf(handler);
      if (index > -1) {
        this.onLocaleChange.splice(index, 1);
      }
    };
  }

  /**
   * Get platform status
   */
  getStatus(): {
    currentLocale: string;
    supportedLocales: number;
    loadedBundles: number;
    isRTL: boolean;
  } {
    return {
      currentLocale: this.currentLocale,
      supportedLocales: this.negotiator.getSupportedLocales().length,
      loadedBundles: this.translations.getLoadedLocales().length,
      isRTL: this.rtl.isRTL(this.currentLocale),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default IntegratedI18nPlatform;
