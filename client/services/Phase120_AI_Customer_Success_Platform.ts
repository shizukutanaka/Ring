/**
 * Phase 120: AI-Powered Customer Success Platform
 *
 * Competitive Differentiation:
 * - vs Truecaller: No customer success features (consumer app)
 * - vs Hiya: No AI-powered customer engagement
 * - vs RoboKiller: No customer success platform
 *
 * Key Features:
 * - AI-powered health score prediction
 * - Churn risk prediction and prevention
 * - Automated onboarding workflows
 * - Product usage analytics
 * - Personalized success plans
 * - Proactive outreach automation
 * - Customer journey mapping
 * - NPS and satisfaction tracking
 *
 * Use Cases:
 * - SaaS customer success teams
 * - Enterprise account management
 * - Onboarding automation
 * - Churn prevention
 * - Upsell opportunity identification
 *
 * Research Sources:
 * - Gainsight customer success platform
 * - Totango customer health scoring
 * - ChurnZero predictive analytics
 * - Salesforce Customer 360
 * - HubSpot Customer Platform
 *
 * @module Phase120_AI_Customer_Success_Platform
 * @version 1.0.0
 * @since December 2025
 */

export interface Customer {
  customerId: string;
  name: string;
  email: string;
  company?: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  mrr: number; // Monthly Recurring Revenue
  signupDate: number;
  lastActivityDate: number;
  healthScore: number; // 0-100
  churnRisk: ChurnRisk;
  lifecycle: CustomerLifecycle;
  csm?: string; // Customer Success Manager ID
  metadata: Record<string, any>;
}

export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';

export type CustomerLifecycle =
  | 'onboarding'
  | 'adopting'
  | 'active'
  | 'expanding'
  | 'at_risk'
  | 'churned';

export interface HealthScoreConfig {
  weights: {
    usage: number;
    engagement: number;
    support: number;
    billing: number;
    nps: number;
  };
  thresholds: {
    healthy: number;    // >= 70
    warning: number;    // 50-69
    critical: number;   // < 50
  };
}

export interface UsageMetrics {
  customerId: string;
  period: { start: number; end: number };
  callsPlaced: number;
  spamReportsSubmitted: number;
  featuresUsed: string[];
  activeUsers: number;
  licensedSeats: number;
  apiCallsCount: number;
  loginFrequency: number; // days between logins
}

export interface EngagementMetrics {
  customerId: string;
  emailOpenRate: number;
  emailClickRate: number;
  trainingSessionsAttended: number;
  documentationViews: number;
  featureAdoptionRate: number; // percentage
  timeToValue: number; // days from signup to first value
}

export interface SupportMetrics {
  customerId: string;
  ticketsCreated: number;
  ticketsResolved: number;
  avgResolutionTime: number; // hours
  escalations: number;
  satisfactionScore: number; // 1-5
}

export interface NPSResponse {
  customerId: string;
  score: number; // 0-10
  category: 'detractor' | 'passive' | 'promoter';
  feedback?: string;
  submittedAt: number;
}

export interface SuccessPlan {
  planId: string;
  customerId: string;
  objectives: Objective[];
  milestones: Milestone[];
  tasks: Task[];
  status: 'draft' | 'active' | 'completed';
  createdAt: number;
  updatedAt: number;
}

export interface Objective {
  objectiveId: string;
  description: string;
  targetDate: number;
  status: 'pending' | 'in_progress' | 'completed';
  metrics?: Record<string, number>;
}

export interface Milestone {
  milestoneId: string;
  title: string;
  description: string;
  dueDate: number;
  completedAt?: number;
  status: 'upcoming' | 'current' | 'completed' | 'missed';
}

export interface Task {
  taskId: string;
  description: string;
  assignedTo: string;
  dueDate: number;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed';
  completedAt?: number;
}

export interface Playbook {
  playbookId: string;
  name: string;
  trigger: PlaybookTrigger;
  actions: PlaybookAction[];
  conditions: PlaybookCondition[];
  enabled: boolean;
}

export interface PlaybookTrigger {
  type: 'health_score_drop' | 'usage_decline' | 'support_spike' | 'nps_detractor' | 'renewal_approaching';
  threshold?: number;
}

export interface PlaybookAction {
  type: 'email' | 'task' | 'notification' | 'webhook';
  config: Record<string, any>;
}

export interface PlaybookCondition {
  field: string;
  operator: '>' | '<' | '=' | '!=';
  value: any;
}

// ============================================================================
// Health Score Engine
// ============================================================================

export class HealthScoreEngine {
  private config: HealthScoreConfig;

  constructor(config: HealthScoreConfig) {
    this.config = config;
  }

  /**
   * Calculate customer health score
   */
  calculateHealthScore(
    usage: UsageMetrics,
    engagement: EngagementMetrics,
    support: SupportMetrics,
    nps?: NPSResponse
  ): number {
    const usageScore = this.calculateUsageScore(usage);
    const engagementScore = this.calculateEngagementScore(engagement);
    const supportScore = this.calculateSupportScore(support);
    const npsScore = nps ? this.calculateNPSScore(nps.score) : 50;

    const weightedScore =
      usageScore * this.config.weights.usage +
      engagementScore * this.config.weights.engagement +
      supportScore * this.config.weights.support +
      npsScore * this.config.weights.nps;

    return Math.round(Math.max(0, Math.min(100, weightedScore)));
  }

  private calculateUsageScore(usage: UsageMetrics): number {
    let score = 0;

    // Seat utilization
    const seatUtilization = usage.activeUsers / usage.licensedSeats;
    score += seatUtilization * 40; // 40 points max

    // Feature adoption
    const featureAdoption = usage.featuresUsed.length / 10; // Assume 10 key features
    score += Math.min(featureAdoption, 1) * 30; // 30 points max

    // Activity level
    const activityScore = Math.min(usage.callsPlaced / 100, 1);
    score += activityScore * 30; // 30 points max

    return score;
  }

  private calculateEngagementScore(engagement: EngagementMetrics): number {
    let score = 0;

    // Email engagement
    score += engagement.emailOpenRate * 25;
    score += engagement.emailClickRate * 25;

    // Training engagement
    const trainingScore = Math.min(engagement.trainingSessionsAttended / 5, 1);
    score += trainingScore * 25;

    // Feature adoption
    score += engagement.featureAdoptionRate * 25;

    return score;
  }

  private calculateSupportScore(support: SupportMetrics): number {
    let score = 100;

    // Penalize high ticket volume
    if (support.ticketsCreated > 10) {
      score -= Math.min((support.ticketsCreated - 10) * 2, 30);
    }

    // Penalize escalations
    score -= support.escalations * 10;

    // Reward high satisfaction
    score += (support.satisfactionScore - 3) * 10;

    return Math.max(0, score);
  }

  private calculateNPSScore(nps: number): number {
    // Convert NPS (0-10) to 0-100 score
    if (nps >= 9) return 100; // Promoter
    if (nps >= 7) return 70;  // Passive
    return 30; // Detractor
  }

  /**
   * Determine health status
   */
  getHealthStatus(score: number): 'healthy' | 'warning' | 'critical' {
    if (score >= this.config.thresholds.healthy) return 'healthy';
    if (score >= this.config.thresholds.warning) return 'warning';
    return 'critical';
  }
}

// ============================================================================
// Churn Prediction Engine
// ============================================================================

export class ChurnPredictionEngine {
  /**
   * Predict churn risk using ML model (simplified)
   */
  predictChurnRisk(customer: Customer, metrics: {
    usage: UsageMetrics;
    engagement: EngagementMetrics;
    support: SupportMetrics;
  }): ChurnRisk {
    let riskScore = 0;

    // Health score is primary indicator
    if (customer.healthScore < 50) riskScore += 40;
    else if (customer.healthScore < 70) riskScore += 20;

    // Low usage indicates risk
    const usageRate = metrics.usage.callsPlaced > 0 ? 1 : 0;
    if (usageRate < 0.3) riskScore += 30;

    // Support issues
    if (metrics.support.ticketsCreated > 5) riskScore += 15;
    if (metrics.support.escalations > 0) riskScore += 10;

    // Engagement decline
    if (metrics.engagement.emailOpenRate < 0.2) riskScore += 15;

    // Determine risk category
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Calculate days to potential churn
   */
  calculateDaysToChurn(customer: Customer): number {
    const daysSinceLastActivity = (Date.now() - customer.lastActivityDate) / (1000 * 60 * 60 * 24);

    if (customer.churnRisk === 'critical') return 7;
    if (customer.churnRisk === 'high') return 14;
    if (customer.churnRisk === 'medium') return 30;
    return 90;
  }
}

// ============================================================================
// Success Plan Manager
// ============================================================================

export class SuccessPlanManager {
  private plans: Map<string, SuccessPlan> = new Map();

  /**
   * Create success plan
   */
  createPlan(customerId: string, template?: string): SuccessPlan {
    const planId = `plan_${Date.now()}`;

    const plan: SuccessPlan = {
      planId,
      customerId,
      objectives: this.getDefaultObjectives(),
      milestones: this.getDefaultMilestones(),
      tasks: [],
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.plans.set(planId, plan);
    return plan;
  }

  private getDefaultObjectives(): Objective[] {
    return [
      {
        objectiveId: 'obj_1',
        description: 'Complete onboarding and setup',
        targetDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
        status: 'pending'
      },
      {
        objectiveId: 'obj_2',
        description: 'Achieve 80% feature adoption',
        targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        status: 'pending'
      },
      {
        objectiveId: 'obj_3',
        description: 'Reach target usage metrics',
        targetDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
        status: 'pending'
      }
    ];
  }

  private getDefaultMilestones(): Milestone[] {
    return [
      {
        milestoneId: 'mile_1',
        title: 'First Call Placed',
        description: 'Customer places first spam detection call',
        dueDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
        status: 'upcoming'
      },
      {
        milestoneId: 'mile_2',
        title: 'Team Onboarded',
        description: 'All team members trained and active',
        dueDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
        status: 'upcoming'
      }
    ];
  }

  /**
   * Add task to plan
   */
  addTask(planId: string, task: Omit<Task, 'taskId'>): void {
    const plan = this.plans.get(planId);
    if (!plan) return;

    const taskId = `task_${Date.now()}`;
    plan.tasks.push({ taskId, ...task });
    plan.updatedAt = Date.now();
  }

  /**
   * Complete milestone
   */
  completeMilestone(planId: string, milestoneId: string): void {
    const plan = this.plans.get(planId);
    if (!plan) return;

    const milestone = plan.milestones.find(m => m.milestoneId === milestoneId);
    if (milestone) {
      milestone.status = 'completed';
      milestone.completedAt = Date.now();
      plan.updatedAt = Date.now();
    }
  }
}

// ============================================================================
// Playbook Automation Engine
// ============================================================================

export class PlaybookAutomationEngine {
  private playbooks: Map<string, Playbook> = new Map();

  /**
   * Register playbook
   */
  registerPlaybook(playbook: Playbook): void {
    this.playbooks.set(playbook.playbookId, playbook);
  }

  /**
   * Evaluate playbooks for customer
   */
  async evaluatePlaybooks(customer: Customer, metrics: any): Promise<Playbook[]> {
    const triggeredPlaybooks: Playbook[] = [];

    for (const playbook of this.playbooks.values()) {
      if (!playbook.enabled) continue;

      const triggered = this.evaluateTrigger(playbook.trigger, customer, metrics);
      const conditionsMet = this.evaluateConditions(playbook.conditions, customer, metrics);

      if (triggered && conditionsMet) {
        triggeredPlaybooks.push(playbook);
      }
    }

    return triggeredPlaybooks;
  }

  private evaluateTrigger(trigger: PlaybookTrigger, customer: Customer, metrics: any): boolean {
    switch (trigger.type) {
      case 'health_score_drop':
        return customer.healthScore < (trigger.threshold || 50);

      case 'usage_decline':
        return metrics.usage?.callsPlaced < 10;

      case 'nps_detractor':
        return metrics.nps?.category === 'detractor';

      case 'support_spike':
        return metrics.support?.ticketsCreated > 5;

      default:
        return false;
    }
  }

  private evaluateConditions(conditions: PlaybookCondition[], customer: Customer, metrics: any): boolean {
    return conditions.every(condition => {
      const value = this.getFieldValue(condition.field, customer, metrics);

      switch (condition.operator) {
        case '>': return value > condition.value;
        case '<': return value < condition.value;
        case '=': return value === condition.value;
        case '!=': return value !== condition.value;
        default: return false;
      }
    });
  }

  private getFieldValue(field: string, customer: Customer, metrics: any): any {
    if (field.startsWith('customer.')) {
      const key = field.replace('customer.', '');
      return (customer as any)[key];
    }
    if (field.startsWith('metrics.')) {
      const path = field.replace('metrics.', '').split('.');
      let value = metrics;
      for (const key of path) {
        value = value?.[key];
      }
      return value;
    }
    return undefined;
  }

  /**
   * Execute playbook actions
   */
  async executePlaybook(playbook: Playbook, customer: Customer): Promise<void> {
    for (const action of playbook.actions) {
      await this.executeAction(action, customer);
    }
  }

  private async executeAction(action: PlaybookAction, customer: Customer): Promise<void> {
    switch (action.type) {
      case 'email':
        console.log(`Sending email to ${customer.email}: ${action.config.template}`);
        break;

      case 'task':
        console.log(`Creating task: ${action.config.description} for CSM: ${customer.csm}`);
        break;

      case 'notification':
        console.log(`Sending notification: ${action.config.message}`);
        break;

      case 'webhook':
        console.log(`Calling webhook: ${action.config.url}`);
        break;
    }
  }
}

// ============================================================================
// Customer Success Platform
// ============================================================================

export class CustomerSuccessPlatform {
  private healthScoreEngine: HealthScoreEngine;
  private churnEngine: ChurnPredictionEngine;
  private successPlanManager: SuccessPlanManager;
  private playbookEngine: PlaybookAutomationEngine;
  private customers: Map<string, Customer> = new Map();

  constructor(healthScoreConfig: HealthScoreConfig) {
    this.healthScoreEngine = new HealthScoreEngine(healthScoreConfig);
    this.churnEngine = new ChurnPredictionEngine();
    this.successPlanManager = new SuccessPlanManager();
    this.playbookEngine = new PlaybookAutomationEngine();
  }

  /**
   * Register customer
   */
  registerCustomer(customer: Customer): void {
    this.customers.set(customer.customerId, customer);
  }

  /**
   * Update customer health
   */
  async updateCustomerHealth(
    customerId: string,
    metrics: {
      usage: UsageMetrics;
      engagement: EngagementMetrics;
      support: SupportMetrics;
      nps?: NPSResponse;
    }
  ): Promise<void> {
    const customer = this.customers.get(customerId);
    if (!customer) return;

    // Calculate health score
    customer.healthScore = this.healthScoreEngine.calculateHealthScore(
      metrics.usage,
      metrics.engagement,
      metrics.support,
      metrics.nps
    );

    // Predict churn risk
    customer.churnRisk = this.churnEngine.predictChurnRisk(customer, metrics);

    // Evaluate playbooks
    const triggeredPlaybooks = await this.playbookEngine.evaluatePlaybooks(customer, metrics);

    // Execute triggered playbooks
    for (const playbook of triggeredPlaybooks) {
      await this.playbookEngine.executePlaybook(playbook, customer);
    }
  }

  /**
   * Create success plan for customer
   */
  createSuccessPlan(customerId: string): SuccessPlan {
    return this.successPlanManager.createPlan(customerId);
  }

  /**
   * Get customer insights
   */
  getCustomerInsights(customerId: string): any {
    const customer = this.customers.get(customerId);
    if (!customer) return null;

    const daysToChurn = this.churnEngine.calculateDaysToChurn(customer);

    return {
      customerId,
      healthScore: customer.healthScore,
      healthStatus: this.healthScoreEngine.getHealthStatus(customer.healthScore),
      churnRisk: customer.churnRisk,
      daysToChurn,
      lifecycle: customer.lifecycle,
      recommendations: this.getRecommendations(customer)
    };
  }

  private getRecommendations(customer: Customer): string[] {
    const recommendations: string[] = [];

    if (customer.healthScore < 50) {
      recommendations.push('Schedule urgent call with CSM');
      recommendations.push('Review product usage and identify blockers');
    }

    if (customer.churnRisk === 'critical') {
      recommendations.push('Offer discount or incentive to retain');
      recommendations.push('Escalate to senior leadership');
    }

    if (customer.lifecycle === 'onboarding') {
      recommendations.push('Complete onboarding checklist');
      recommendations.push('Schedule product training session');
    }

    return recommendations;
  }

  /**
   * Get platform metrics
   */
  getPlatformMetrics(): any {
    const customers = Array.from(this.customers.values());

    return {
      totalCustomers: customers.length,
      avgHealthScore: customers.reduce((sum, c) => sum + c.healthScore, 0) / customers.length,
      atRiskCustomers: customers.filter(c => c.churnRisk === 'high' || c.churnRisk === 'critical').length,
      totalMRR: customers.reduce((sum, c) => sum + c.mrr, 0),
      churnRiskBreakdown: {
        low: customers.filter(c => c.churnRisk === 'low').length,
        medium: customers.filter(c => c.churnRisk === 'medium').length,
        high: customers.filter(c => c.churnRisk === 'high').length,
        critical: customers.filter(c => c.churnRisk === 'critical').length
      }
    };
  }

  // Expose engines
  getHealthScoreEngine(): HealthScoreEngine { return this.healthScoreEngine; }
  getChurnEngine(): ChurnPredictionEngine { return this.churnEngine; }
  getSuccessPlanManager(): SuccessPlanManager { return this.successPlanManager; }
  getPlaybookEngine(): PlaybookAutomationEngine { return this.playbookEngine; }
}

export default CustomerSuccessPlatform;
