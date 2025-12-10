/**
 * Phase 123: Advanced Integration Ecosystem & Marketplace
 *
 * Competitive Differentiation:
 * - vs Truecaller: No integration marketplace
 * - vs Hiya: Limited API, no third-party integrations
 * - vs RoboKiller: Closed ecosystem, no marketplace
 *
 * Key Features:
 * - Plugin/extension marketplace
 * - OAuth 2.1 app authorization
 * - Webhook management and delivery
 * - API rate limiting and throttling
 * - Integration templates
 * - Revenue sharing for developers
 * - App review and certification
 * - Integration analytics
 *
 * Use Cases:
 * - Third-party app ecosystem
 * - CRM integrations (Salesforce, HubSpot)
 * - Ticketing systems (Zendesk, Jira)
 * - Communication platforms (Slack, Teams)
 * - Custom workflow automation
 *
 * Research Sources:
 * - Stripe Connect marketplace model
 * - Zapier app platform
 * - Shopify App Store
 * - Salesforce AppExchange
 * - Slack App Directory
 * - OAuth 2.1 specification (2024)
 *
 * @module Phase123_Integration_Ecosystem_Marketplace
 * @version 1.0.0
 * @since December 2025
 */

export interface Integration {
  integrationId: string;
  name: string;
  description: string;
  developer: Developer;
  category: IntegrationCategory;
  icon: string;
  screenshots: string[];
  pricing: IntegrationPricing;
  status: IntegrationStatus;
  version: string;
  rating: number;
  installCount: number;
  reviews: Review[];
  permissions: Permission[];
  webhookEndpoints: string[];
  oauthConfig?: OAuthConfig;
  createdAt: number;
  updatedAt: number;
}

export type IntegrationCategory =
  | 'crm'
  | 'communication'
  | 'analytics'
  | 'security'
  | 'productivity'
  | 'automation'
  | 'telephony'
  | 'ai_ml';

export interface Developer {
  developerId: string;
  name: string;
  email: string;
  website?: string;
  verified: boolean;
  revenueShare: number; // percentage
}

export interface IntegrationPricing {
  model: 'free' | 'paid' | 'freemium' | 'usage_based';
  monthlyPrice?: number;
  setupFee?: number;
  currency: string;
  trialDays?: number;
}

export type IntegrationStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'suspended';

export interface Review {
  reviewId: string;
  userId: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  createdAt: number;
}

export type Permission =
  | 'read_calls'
  | 'write_calls'
  | 'read_users'
  | 'write_users'
  | 'read_analytics'
  | 'manage_webhooks'
  | 'access_recordings';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  scopes: string[];
  grantTypes: ('authorization_code' | 'refresh_token' | 'client_credentials')[];
}

export interface Installation {
  installationId: string;
  integrationId: string;
  tenantId: string;
  userId: string;
  config: Record<string, any>;
  accessToken?: string;
  refreshToken?: string;
  status: 'active' | 'paused' | 'uninstalled';
  installedAt: number;
  lastUsedAt?: number;
}

export interface Webhook {
  webhookId: string;
  integrationId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  status: 'active' | 'disabled';
  deliveryAttempts: number;
  lastDeliveryAt?: number;
  lastStatus?: number;
}

export type WebhookEvent =
  | 'call.started'
  | 'call.ended'
  | 'spam.detected'
  | 'user.created'
  | 'user.updated'
  | 'integration.installed'
  | 'integration.uninstalled';

export interface WebhookDelivery {
  deliveryId: string;
  webhookId: string;
  event: WebhookEvent;
  payload: any;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastAttemptAt?: number;
  responseCode?: number;
  responseBody?: string;
}

export interface IntegrationTemplate {
  templateId: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  steps: TemplateStep[];
  requiredConfig: ConfigField[];
}

export interface TemplateStep {
  stepId: string;
  title: string;
  description: string;
  action: string;
  config: Record<string, any>;
}

export interface ConfigField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  required: boolean;
  options?: { label: string; value: any }[];
  default?: any;
}

// ============================================================================
// Marketplace Manager
// ============================================================================

export class MarketplaceManager {
  private integrations: Map<string, Integration> = new Map();
  private installations: Map<string, Installation> = new Map();

  /**
   * Submit integration for review
   */
  submitIntegration(integration: Integration): void {
    integration.status = 'pending_review';
    this.integrations.set(integration.integrationId, integration);
  }

  /**
   * Approve integration
   */
  approveIntegration(integrationId: string): void {
    const integration = this.integrations.get(integrationId);
    if (integration && integration.status === 'pending_review') {
      integration.status = 'approved';
    }
  }

  /**
   * Publish integration
   */
  publishIntegration(integrationId: string): void {
    const integration = this.integrations.get(integrationId);
    if (integration && integration.status === 'approved') {
      integration.status = 'published';
    }
  }

  /**
   * Search integrations
   */
  searchIntegrations(query: {
    category?: IntegrationCategory;
    search?: string;
    minRating?: number;
  }): Integration[] {
    let results = Array.from(this.integrations.values()).filter(
      i => i.status === 'published'
    );

    if (query.category) {
      results = results.filter(i => i.category === query.category);
    }

    if (query.search) {
      results = results.filter(
        i =>
          i.name.toLowerCase().includes(query.search!.toLowerCase()) ||
          i.description.toLowerCase().includes(query.search!.toLowerCase())
      );
    }

    if (query.minRating !== undefined) {
      results = results.filter(i => i.rating >= query.minRating!);
    }

    return results.sort((a, b) => b.installCount - a.installCount);
  }

  /**
   * Install integration
   */
  installIntegration(
    integrationId: string,
    tenantId: string,
    userId: string,
    config: Record<string, any>
  ): Installation {
    const installationId = `inst_${Date.now()}`;

    const installation: Installation = {
      installationId,
      integrationId,
      tenantId,
      userId,
      config,
      status: 'active',
      installedAt: Date.now()
    };

    this.installations.set(installationId, installation);

    // Increment install count
    const integration = this.integrations.get(integrationId);
    if (integration) {
      integration.installCount++;
    }

    return installation;
  }

  /**
   * Uninstall integration
   */
  uninstallIntegration(installationId: string): void {
    const installation = this.installations.get(installationId);
    if (installation) {
      installation.status = 'uninstalled';
    }
  }

  /**
   * Add review
   */
  addReview(integrationId: string, review: Review): void {
    const integration = this.integrations.get(integrationId);
    if (!integration) return;

    integration.reviews.push(review);

    // Recalculate average rating
    const totalRating = integration.reviews.reduce((sum, r) => sum + r.rating, 0);
    integration.rating = totalRating / integration.reviews.length;
  }
}

// ============================================================================
// OAuth Provider
// ============================================================================

export class OAuthProvider {
  private clients: Map<string, OAuthConfig> = new Map();
  private authorizationCodes: Map<string, { clientId: string; userId: string; scopes: string[]; expiresAt: number }> =
    new Map();
  private accessTokens: Map<string, { clientId: string; userId: string; scopes: string[]; expiresAt: number }> =
    new Map();

  /**
   * Register OAuth client
   */
  registerClient(integrationId: string, config: OAuthConfig): void {
    this.clients.set(config.clientId, config);
  }

  /**
   * Generate authorization code
   */
  generateAuthorizationCode(
    clientId: string,
    userId: string,
    scopes: string[]
  ): string {
    const code = this.generateToken();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.authorizationCodes.set(code, {
      clientId,
      userId,
      scopes,
      expiresAt
    });

    return code;
  }

  /**
   * Exchange authorization code for access token
   */
  exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string
  ): { accessToken: string; refreshToken: string; expiresIn: number } | null {
    const authCode = this.authorizationCodes.get(code);
    if (!authCode || authCode.expiresAt < Date.now()) {
      return null;
    }

    const client = this.clients.get(clientId);
    if (!client || client.clientSecret !== clientSecret) {
      return null;
    }

    // Generate tokens
    const accessToken = this.generateToken();
    const refreshToken = this.generateToken();
    const expiresAt = Date.now() + 3600 * 1000; // 1 hour

    this.accessTokens.set(accessToken, {
      clientId,
      userId: authCode.userId,
      scopes: authCode.scopes,
      expiresAt
    });

    // Delete authorization code (one-time use)
    this.authorizationCodes.delete(code);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600
    };
  }

  /**
   * Validate access token
   */
  validateToken(token: string): { valid: boolean; userId?: string; scopes?: string[] } {
    const tokenData = this.accessTokens.get(token);
    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: tokenData.userId,
      scopes: tokenData.scopes
    };
  }

  private generateToken(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }
}

// ============================================================================
// Webhook Manager
// ============================================================================

export class WebhookManager {
  private webhooks: Map<string, Webhook> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private deliveryQueue: WebhookDelivery[] = [];

  /**
   * Register webhook
   */
  registerWebhook(webhook: Webhook): void {
    this.webhooks.set(webhook.webhookId, webhook);
  }

  /**
   * Trigger webhook
   */
  async triggerWebhook(event: WebhookEvent, payload: any): Promise<void> {
    const webhooks = Array.from(this.webhooks.values()).filter(
      w => w.status === 'active' && w.events.includes(event)
    );

    for (const webhook of webhooks) {
      const deliveryId = `delivery_${Date.now()}`;

      const delivery: WebhookDelivery = {
        deliveryId,
        webhookId: webhook.webhookId,
        event,
        payload,
        status: 'pending',
        attempts: 0
      };

      this.deliveries.set(deliveryId, delivery);
      this.deliveryQueue.push(delivery);
    }

    // Process queue
    await this.processDeliveryQueue();
  }

  /**
   * Process delivery queue
   */
  private async processDeliveryQueue(): Promise<void> {
    while (this.deliveryQueue.length > 0) {
      const delivery = this.deliveryQueue.shift()!;
      await this.deliverWebhook(delivery);
    }
  }

  /**
   * Deliver webhook
   */
  private async deliverWebhook(delivery: WebhookDelivery): Promise<void> {
    const webhook = this.webhooks.get(delivery.webhookId);
    if (!webhook) return;

    delivery.attempts++;
    delivery.lastAttemptAt = Date.now();

    try {
      // Simulate HTTP request
      const success = Math.random() > 0.1; // 90% success rate

      if (success) {
        delivery.status = 'sent';
        delivery.responseCode = 200;
        webhook.lastDeliveryAt = Date.now();
        webhook.lastStatus = 200;
      } else {
        throw new Error('Delivery failed');
      }
    } catch (error) {
      delivery.status = 'failed';
      delivery.responseCode = 500;

      // Retry logic (max 3 attempts)
      if (delivery.attempts < 3) {
        setTimeout(() => {
          delivery.status = 'pending';
          this.deliveryQueue.push(delivery);
          this.processDeliveryQueue();
        }, Math.pow(2, delivery.attempts) * 1000); // Exponential backoff
      }
    }

    webhook.deliveryAttempts++;
  }

  /**
   * Get webhook deliveries
   */
  getDeliveries(webhookId: string): WebhookDelivery[] {
    return Array.from(this.deliveries.values()).filter(
      d => d.webhookId === webhookId
    );
  }
}

// ============================================================================
// Integration Template Engine
// ============================================================================

export class IntegrationTemplateEngine {
  private templates: Map<string, IntegrationTemplate> = new Map();

  /**
   * Register template
   */
  registerTemplate(template: IntegrationTemplate): void {
    this.templates.set(template.templateId, template);
  }

  /**
   * Get templates by category
   */
  getTemplates(category?: IntegrationCategory): IntegrationTemplate[] {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    return templates;
  }

  /**
   * Instantiate template
   */
  instantiateTemplate(
    templateId: string,
    config: Record<string, any>
  ): Integration | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Validate required config
    const missingFields = template.requiredConfig
      .filter(field => field.required && !config[field.name])
      .map(field => field.name);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Create integration from template
    const integration: Integration = {
      integrationId: `int_${Date.now()}`,
      name: template.name,
      description: template.description,
      developer: {
        developerId: 'dev_template',
        name: 'Template',
        email: 'template@ring.com',
        verified: true,
        revenueShare: 0
      },
      category: template.category,
      icon: '',
      screenshots: [],
      pricing: { model: 'free', currency: 'USD' },
      status: 'draft',
      version: '1.0.0',
      rating: 0,
      installCount: 0,
      reviews: [],
      permissions: [],
      webhookEndpoints: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return integration;
  }
}

// ============================================================================
// Integration Analytics
// ============================================================================

export class IntegrationAnalytics {
  private events: Map<string, any[]> = new Map();

  /**
   * Track event
   */
  trackEvent(integrationId: string, event: string, data: any = {}): void {
    if (!this.events.has(integrationId)) {
      this.events.set(integrationId, []);
    }

    this.events.get(integrationId)!.push({
      event,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get analytics
   */
  getAnalytics(integrationId: string, period: 'day' | 'week' | 'month'): any {
    const events = this.events.get(integrationId) || [];
    const now = Date.now();
    const startTime =
      period === 'day'
        ? now - 24 * 60 * 60 * 1000
        : period === 'week'
        ? now - 7 * 24 * 60 * 60 * 1000
        : now - 30 * 24 * 60 * 60 * 1000;

    const filteredEvents = events.filter(e => e.timestamp >= startTime);

    const eventCounts = new Map<string, number>();
    filteredEvents.forEach(e => {
      eventCounts.set(e.event, (eventCounts.get(e.event) || 0) + 1);
    });

    return {
      period,
      totalEvents: filteredEvents.length,
      eventBreakdown: Object.fromEntries(eventCounts),
      timestamp: now
    };
  }
}

// ============================================================================
// Integrated Marketplace Platform
// ============================================================================

export class IntegrationMarketplacePlatform {
  private marketplaceManager: MarketplaceManager;
  private oauthProvider: OAuthProvider;
  private webhookManager: WebhookManager;
  private templateEngine: IntegrationTemplateEngine;
  private analytics: IntegrationAnalytics;

  constructor() {
    this.marketplaceManager = new MarketplaceManager();
    this.oauthProvider = new OAuthProvider();
    this.webhookManager = new WebhookManager();
    this.templateEngine = new IntegrationTemplateEngine();
    this.analytics = new IntegrationAnalytics();
  }

  /**
   * Publish integration
   */
  publishIntegration(integration: Integration): void {
    this.marketplaceManager.submitIntegration(integration);

    if (integration.oauthConfig) {
      this.oauthProvider.registerClient(
        integration.integrationId,
        integration.oauthConfig
      );
    }

    this.analytics.trackEvent(integration.integrationId, 'integration.submitted');
  }

  /**
   * Install integration for tenant
   */
  installIntegration(
    integrationId: string,
    tenantId: string,
    userId: string,
    config: Record<string, any>
  ): Installation {
    const installation = this.marketplaceManager.installIntegration(
      integrationId,
      tenantId,
      userId,
      config
    );

    this.analytics.trackEvent(integrationId, 'integration.installed', {
      tenantId,
      userId
    });

    // Trigger webhook
    this.webhookManager.triggerWebhook('integration.installed', {
      integrationId,
      installationId: installation.installationId,
      tenantId
    });

    return installation;
  }

  /**
   * Get marketplace statistics
   */
  getMarketplaceStats(): any {
    const integrations = this.marketplaceManager['integrations'];
    const installations = this.marketplaceManager['installations'];

    return {
      totalIntegrations: integrations.size,
      publishedIntegrations: Array.from(integrations.values()).filter(
        i => i.status === 'published'
      ).length,
      totalInstallations: installations.size,
      activeInstallations: Array.from(installations.values()).filter(
        i => i.status === 'active'
      ).length,
      timestamp: Date.now()
    };
  }

  // Expose managers
  getMarketplaceManager(): MarketplaceManager {
    return this.marketplaceManager;
  }
  getOAuthProvider(): OAuthProvider {
    return this.oauthProvider;
  }
  getWebhookManager(): WebhookManager {
    return this.webhookManager;
  }
  getTemplateEngine(): IntegrationTemplateEngine {
    return this.templateEngine;
  }
  getAnalytics(): IntegrationAnalytics {
    return this.analytics;
  }
}

export default IntegrationMarketplacePlatform;
