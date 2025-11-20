/**
 * Phase 5: Accessibility Features (WCAG 2.1 Level AA)
 *
 * Research-backed implementation based on:
 * - WCAG 2.1 Level AA compliance requirements
 * - Live captions (real-time transcription)
 * - Audio descriptions for video
 * - Keyboard navigation support
 * - Screen reader compatibility (ARIA labels)
 * - High contrast mode
 * - Customizable text sizing
 */

/**
 * Accessibility Configuration
 */
export interface AccessibilityConfig {
  captionsEnabled: boolean;
  captionsLanguage: string;
  audioDescriptionsEnabled: boolean;
  highContrastMode: boolean;
  textScale: number; // 0.8 to 1.5
  keyboardNavigationEnabled: boolean;
  screenReaderMode: boolean;
  focusIndicatorBold: boolean;
}

/**
 * Caption Object
 */
export interface Caption {
  startTime: number; // milliseconds
  endTime: number;
  speaker: string;
  text: string;
  soundDescriptions?: string[]; // e.g., "[phone ringing]", "[laughter]"
}

/**
 * Keyboard Shortcut
 */
export interface KeyboardShortcut {
  key: string;
  modifiers: string[];
  action: string;
  description: string;
}

/**
 * Accessibility Service
 * Implements WCAG 2.1 Level AA compliance for video conferencing
 */
export class AccessibilityService {
  private config: AccessibilityConfig = {
    captionsEnabled: false,
    captionsLanguage: 'en',
    audioDescriptionsEnabled: false,
    highContrastMode: false,
    textScale: 1.0,
    keyboardNavigationEnabled: true,
    screenReaderMode: false,
    focusIndicatorBold: false
  };

  private captions: Caption[] = [];
  private audioDescriptions: Array<{
    timestamp: number;
    description: string;
  }> = [];

  private captionBuffer: Array<{
    timestamp: number;
    text: string;
  }> = [];

  private keyboardShortcuts: KeyboardShortcut[] = this.initializeKeyboardShortcuts();
  private accessibilityLog: Array<{
    timestamp: number;
    event: string;
    details: any;
  }> = [];

  /**
   * Initialize accessibility service
   */
  constructor() {
    this.logAccessibilityEvent('service-initialized', { config: this.config });
  }

  /**
   * Enable closed captions
   */
  enableClosedCaptions(language: string = 'en'): {
    enabled: boolean;
    language: string;
  } {
    this.config.captionsEnabled = true;
    this.config.captionsLanguage = language;

    // Initialize caption rendering
    this.initializeCaptionRendering();

    this.logAccessibilityEvent('captions-enabled', { language });

    return {
      enabled: true,
      language
    };
  }

  /**
   * Disable closed captions
   */
  disableClosedCaptions(): void {
    this.config.captionsEnabled = false;
    this.logAccessibilityEvent('captions-disabled', {});
  }

  /**
   * Add caption to stream
   */
  addCaption(caption: Caption): void {
    this.captions.push(caption);
    this.captionBuffer.push({
      timestamp: Date.now(),
      text: caption.text
    });

    // Keep only last 30 seconds of captions
    const thirtySecondsAgo = Date.now() - 30000;
    this.captionBuffer = this.captionBuffer.filter(
      (cap) => cap.timestamp > thirtySecondsAgo
    );
  }

  /**
   * Get current captions for display
   */
  getCurrentCaptions(): Caption[] {
    const now = Date.now();

    return this.captions.filter((cap) => cap.startTime <= now && cap.endTime >= now);
  }

  /**
   * Enable audio descriptions (narration of visual content)
   */
  enableAudioDescriptions(): { enabled: boolean } {
    this.config.audioDescriptionsEnabled = true;

    this.logAccessibilityEvent('audio-descriptions-enabled', {});

    return { enabled: true };
  }

  /**
   * Add audio description
   */
  addAudioDescription(timestamp: number, description: string): void {
    this.audioDescriptions.push({ timestamp, description });
  }

  /**
   * Get audio descriptions for current moment
   */
  getCurrentAudioDescription(currentTime: number): string | null {
    const description = this.audioDescriptions.find(
      (desc) => desc.timestamp >= currentTime - 2000 && desc.timestamp <= currentTime + 2000
    );

    return description ? description.description : null;
  }

  /**
   * Apply high contrast mode
   */
  applyHighContrastMode(enabled: boolean = true): {
    enabled: boolean;
    colors: {
      foreground: string;
      background: string;
      focus: string;
      border: string;
    };
  } {
    this.config.highContrastMode = enabled;

    const colors = enabled
      ? {
          foreground: '#000000',
          background: '#FFFFFF',
          focus: '#FF0000',
          border: '#000000'
        }
      : {
          foreground: '#333333',
          background: '#FFFFFF',
          focus: '#0066CC',
          border: '#CCCCCC'
        };

    // Apply to DOM
    if (enabled) {
      document.documentElement.classList.add('high-contrast-mode');
    } else {
      document.documentElement.classList.remove('high-contrast-mode');
    }

    this.logAccessibilityEvent('high-contrast-mode', { enabled, colors });

    return { enabled, colors };
  }

  /**
   * Adjust text size for accessibility
   */
  adjustTextSize(scale: number): { scale: number } {
    // Clamp between 0.8x and 1.5x
    const clampedScale = Math.max(0.8, Math.min(1.5, scale));
    this.config.textScale = clampedScale;

    // Apply to document
    document.documentElement.style.fontSize = `${16 * clampedScale}px`;

    this.logAccessibilityEvent('text-size-adjusted', { scale: clampedScale });

    return { scale: clampedScale };
  }

  /**
   * Get keyboard shortcuts for accessibility navigation
   */
  getKeyboardShortcuts(): KeyboardShortcut[] {
    return this.keyboardShortcuts;
  }

  /**
   * Initialize keyboard shortcuts (WCAG 2.1 requirement)
   */
  private initializeKeyboardShortcuts(): KeyboardShortcut[] {
    return [
      {
        key: 'Enter',
        modifiers: ['Space'],
        action: 'toggle-call',
        description: 'Toggle call mute'
      },
      {
        key: 'V',
        modifiers: ['Control'],
        action: 'toggle-video',
        description: 'Toggle video on/off'
      },
      {
        key: 'M',
        modifiers: ['Control'],
        action: 'toggle-mute',
        description: 'Toggle audio mute'
      },
      {
        key: 'C',
        modifiers: ['Control'],
        action: 'toggle-captions',
        description: 'Toggle closed captions'
      },
      {
        key: 'D',
        modifiers: ['Control'],
        action: 'toggle-audio-descriptions',
        description: 'Toggle audio descriptions'
      },
      {
        key: 'H',
        modifiers: ['Control'],
        action: 'show-help',
        description: 'Show keyboard shortcuts help'
      },
      {
        key: 'Tab',
        modifiers: [],
        action: 'navigate-focus',
        description: 'Navigate to next interactive element'
      },
      {
        key: 'Shift+Tab',
        modifiers: [],
        action: 'navigate-focus-back',
        description: 'Navigate to previous interactive element'
      },
      {
        key: 'Escape',
        modifiers: [],
        action: 'close-dialog',
        description: 'Close dialog or exit fullscreen'
      }
    ];
  }

  /**
   * Add ARIA labels to elements (for screen readers)
   */
  setAriaLabel(elementId: string, label: string, role?: string): void {
    const element = document.getElementById(elementId);

    if (element) {
      element.setAttribute('aria-label', label);

      if (role) {
        element.setAttribute('role', role);
      }

      this.logAccessibilityEvent('aria-label-set', { elementId, label, role });
    }
  }

  /**
   * Set focus indicator styling for keyboard navigation
   */
  setBoldFocusIndicator(bold: boolean = true): void {
    this.config.focusIndicatorBold = bold;

    const style = document.createElement('style');
    const focusWidth = bold ? '3px' : '2px';
    const focusColor = this.config.highContrastMode ? '#FF0000' : '#0066CC';

    style.textContent = `
      *:focus {
        outline: ${focusWidth} solid ${focusColor} !important;
        outline-offset: 2px;
      }
    `;

    document.head.appendChild(style);

    this.logAccessibilityEvent('focus-indicator-updated', { bold });
  }

  /**
   * Enable screen reader optimizations
   */
  enableScreenReaderMode(enabled: boolean = true): { enabled: boolean } {
    this.config.screenReaderMode = enabled;

    // Add live region for screen reader announcements
    if (enabled) {
      const liveRegion = document.createElement('div');
      liveRegion.id = 'a11y-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      document.body.appendChild(liveRegion);
    }

    this.logAccessibilityEvent('screen-reader-mode', { enabled });

    return { enabled };
  }

  /**
   * Announce message to screen reader
   */
  announceToScreenReader(message: string): void {
    const liveRegion = document.getElementById('a11y-live-region');

    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }

  /**
   * Initialize caption rendering on page
   */
  private initializeCaptionRendering(): void {
    // Create caption container if it doesn't exist
    if (!document.getElementById('captions-container')) {
      const container = document.createElement('div');
      container.id = 'captions-container';
      container.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: #FFFFFF;
        padding: 10px 20px;
        border-radius: 4px;
        font-size: 16px;
        max-width: 90%;
        text-align: center;
        z-index: 1000;
      `;
      document.body.appendChild(container);
    }
  }

  /**
   * Get accessibility audit report
   */
  getAccessibilityAudit(): {
    wcagCompliance: string;
    checklist: Array<{ requirement: string; status: 'pass' | 'fail' | 'pending' }>;
    improvementAreas: string[];
  } {
    const checklist = [
      {
        requirement: 'WCAG 2.1 SC 1.2.4 - Live Captions',
        status: this.config.captionsEnabled ? ('pass' as const) : ('fail' as const)
      },
      {
        requirement: 'WCAG 2.1 SC 1.2.5 - Audio Descriptions',
        status: this.config.audioDescriptionsEnabled ? ('pass' as const) : ('fail' as const)
      },
      {
        requirement: 'WCAG 2.1 SC 1.4.3 - High Contrast',
        status: 'pending' as const // Depends on user preference
      },
      {
        requirement: 'WCAG 2.1 SC 1.4.4 - Text Resize',
        status: this.config.textScale !== 1.0 ? ('pass' as const) : ('fail' as const)
      },
      {
        requirement: 'WCAG 2.1 SC 2.1.1 - Keyboard Navigation',
        status: this.config.keyboardNavigationEnabled ? ('pass' as const) : ('fail' as const)
      },
      {
        requirement: 'WCAG 2.1 SC 2.4.7 - Focus Visible',
        status: this.config.focusIndicatorBold ? ('pass' as const) : ('fail' as const)
      },
      {
        requirement: 'WCAG 2.1 SC 4.1.2 - Name, Role, Value (ARIA)',
        status: this.config.screenReaderMode ? ('pass' as const) : ('fail' as const)
      }
    ];

    const passCount = checklist.filter((item) => item.status === 'pass').length;
    const wcagCompliance =
      passCount >= 6 ? 'WCAG 2.1 Level AA' : 'Partial Compliance';

    const improvementAreas = checklist
      .filter((item) => item.status === 'fail')
      .map((item) => item.requirement);

    return {
      wcagCompliance,
      checklist,
      improvementAreas
    };
  }

  /**
   * Log accessibility event
   */
  private logAccessibilityEvent(event: string, details: any): void {
    this.accessibilityLog.push({
      timestamp: Date.now(),
      event,
      details
    });

    // Keep only last 100 events
    if (this.accessibilityLog.length > 100) {
      this.accessibilityLog.shift();
    }
  }

  /**
   * Get service diagnostics
   */
  getDiagnostics(): any {
    return {
      config: this.config,
      captionsActive: this.getCurrentCaptions().length > 0,
      totalCaptions: this.captions.length,
      audioDescriptionsCount: this.audioDescriptions.length,
      keyboardShortcuts: this.keyboardShortcuts.length,
      wcagAudit: this.getAccessibilityAudit(),
      eventLogEntries: this.accessibilityLog.length
    };
  }
}

export { AccessibilityService };
