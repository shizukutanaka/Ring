/**
 * Phase 122: Cost Optimization & Resource Management
 *
 * Competitive Differentiation:
 * - vs Truecaller: No cost optimization features (consumer pricing)
 * - vs Hiya: Fixed enterprise pricing, no resource management
 * - vs RoboKiller: No enterprise cost controls
 *
 * Key Features:
 * - Usage-based billing and cost tracking
 * - Resource quota management
 * - Auto-scaling policies
 * - Cost anomaly detection
 * - Budget alerts and forecasting
 * - Reserved capacity management
 * - Multi-tenant cost allocation
 * - Optimization recommendations
 *
 * Use Cases:
 * - Enterprise cost control
 * - Multi-tenant billing
 * - Budget management
 * - Resource optimization
 * - Capacity planning
 *
 * Research Sources:
 * - AWS Cost Explorer and Budgets
 * - Google Cloud Billing APIs
 * - Azure Cost Management
 * - Kubecost for Kubernetes
 * - FinOps Foundation best practices
 * - Spot instance optimization (2024-2025)
 *
 * @module Phase122_Cost_Optimization_Resource_Management
 * @version 1.0.0
 * @since December 2025
 */

export interface UsageRecord {
  recordId: string;
  tenantId: string;
  resourceType: ResourceType;
  quantity: number;
  unit: string;
  cost: number;
  currency: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export type ResourceType =
  | 'api_calls'
  | 'storage_gb'
  | 'bandwidth_gb'
  | 'compute_hours'
  | 'concurrent_calls'
  | 'transcription_minutes'
  | 'ai_tokens';

export interface PricingTier {
  tierId: string;
  name: string;
  resourcePrices: ResourcePrice[];
  includedQuotas: Quota[];
  overageRates: OverageRate[];
}

export interface ResourcePrice {
  resourceType: ResourceType;
  pricePerUnit: number;
  currency: string;
  unit: string;
}

export interface Quota {
  resourceType: ResourceType;
  limit: number;
  period: 'hourly' | 'daily' | 'monthly';
  softLimit?: number; // Warning threshold
}

export interface OverageRate {
  resourceType: ResourceType;
  pricePerUnit: number;
  startAfter: number; // Included quota threshold
}

export interface CostBudget {
  budgetId: string;
  name: string;
  amount: number;
  currency: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  scope: BudgetScope;
  alerts: BudgetAlert[];
  forecasted?: number;
  actual?: number;
}

export interface BudgetScope {
  tenantIds?: string[];
  resourceTypes?: ResourceType[];
  tags?: Record<string, string>;
}

export interface BudgetAlert {
  threshold: number; // percentage
  recipients: string[];
  triggered: boolean;
}

export interface CostAnomaly {
  anomalyId: string;
  detectedAt: number;
  resourceType: ResourceType;
  expectedCost: number;
  actualCost: number;
  deviation: number; // percentage
  severity: 'low' | 'medium' | 'high';
  possibleCauses: string[];
}

export interface ResourceAllocation {
  allocationId: string;
  tenantId: string;
  resourceType: string;
  allocated: number;
  used: number;
  reserved: number;
  available: number;
}

export interface AutoScalingPolicy {
  policyId: string;
  resourceType: string;
  minCapacity: number;
  maxCapacity: number;
  targetUtilization: number; // percentage
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number; // seconds
}

export interface OptimizationRecommendation {
  recommendationId: string;
  type: RecommendationType;
  resourceType: ResourceType;
  currentCost: number;
  projectedCost: number;
  savings: number;
  confidence: number; // 0-1
  description: string;
  actionRequired: string;
}

export type RecommendationType =
  | 'rightsize'
  | 'reserved_capacity'
  | 'spot_instances'
  | 'scheduled_shutdown'
  | 'storage_tier_migration'
  | 'api_caching';

// ============================================================================
// Usage Tracking Engine
// ============================================================================

export class UsageTrackingEngine {
  private usageRecords: UsageRecord[] = [];

  /**
   * Record usage
   */
  recordUsage(record: Omit<UsageRecord, 'recordId' | 'timestamp'>): UsageRecord {
    const usageRecord: UsageRecord = {
      recordId: `usage_${Date.now()}`,
      timestamp: Date.now(),
      ...record
    };

    this.usageRecords.push(usageRecord);
    return usageRecord;
  }

  /**
   * Get usage for tenant
   */
  getUsage(tenantId: string, startTime: number, endTime: number): UsageRecord[] {
    return this.usageRecords.filter(
      r => r.tenantId === tenantId && r.timestamp >= startTime && r.timestamp <= endTime
    );
  }

  /**
   * Aggregate usage by resource type
   */
  aggregateUsage(
    tenantId: string,
    startTime: number,
    endTime: number
  ): Map<ResourceType, { quantity: number; cost: number }> {
    const usage = this.getUsage(tenantId, startTime, endTime);
    const aggregated = new Map<ResourceType, { quantity: number; cost: number }>();

    usage.forEach(record => {
      const current = aggregated.get(record.resourceType) || { quantity: 0, cost: 0 };
      current.quantity += record.quantity;
      current.cost += record.cost;
      aggregated.set(record.resourceType, current);
    });

    return aggregated;
  }

  /**
   * Calculate total cost
   */
  calculateTotalCost(tenantId: string, startTime: number, endTime: number): number {
    const usage = this.getUsage(tenantId, startTime, endTime);
    return usage.reduce((total, record) => total + record.cost, 0);
  }
}

// ============================================================================
// Cost Calculator
// ============================================================================

export class CostCalculator {
  private pricingTiers: Map<string, PricingTier> = new Map();

  /**
   * Register pricing tier
   */
  registerPricingTier(tier: PricingTier): void {
    this.pricingTiers.set(tier.tierId, tier);
  }

  /**
   * Calculate cost for usage
   */
  calculateCost(
    tierId: string,
    resourceType: ResourceType,
    quantity: number
  ): { baseCost: number; overageCost: number; total: number } {
    const tier = this.pricingTiers.get(tierId);
    if (!tier) throw new Error(`Pricing tier ${tierId} not found`);

    const price = tier.resourcePrices.find(p => p.resourceType === resourceType);
    if (!price) throw new Error(`No price for resource type ${resourceType}`);

    // Find included quota
    const quota = tier.includedQuotas.find(q => q.resourceType === resourceType);
    const includedQuantity = quota?.limit || 0;

    // Calculate base cost (for included quantity)
    const baseCost = Math.min(quantity, includedQuantity) * price.pricePerUnit;

    // Calculate overage cost
    let overageCost = 0;
    if (quantity > includedQuantity) {
      const overage = quantity - includedQuantity;
      const overageRate = tier.overageRates.find(r => r.resourceType === resourceType);
      const rate = overageRate?.pricePerUnit || price.pricePerUnit;
      overageCost = overage * rate;
    }

    return {
      baseCost,
      overageCost,
      total: baseCost + overageCost
    };
  }

  /**
   * Estimate monthly cost
   */
  estimateMonthlyCost(
    tierId: string,
    projectedUsage: Map<ResourceType, number>
  ): { breakdown: Map<ResourceType, number>; total: number } {
    const breakdown = new Map<ResourceType, number>();
    let total = 0;

    projectedUsage.forEach((quantity, resourceType) => {
      const cost = this.calculateCost(tierId, resourceType, quantity);
      breakdown.set(resourceType, cost.total);
      total += cost.total;
    });

    return { breakdown, total };
  }
}

// ============================================================================
// Budget Manager
// ============================================================================

export class BudgetManager {
  private budgets: Map<string, CostBudget> = new Map();
  private usageEngine: UsageTrackingEngine;

  constructor(usageEngine: UsageTrackingEngine) {
    this.usageEngine = usageEngine;
  }

  /**
   * Create budget
   */
  createBudget(budget: CostBudget): void {
    this.budgets.set(budget.budgetId, budget);
  }

  /**
   * Check budget status
   */
  checkBudgets(): CostBudget[] {
    const now = Date.now();
    const alerts: CostBudget[] = [];

    this.budgets.forEach(budget => {
      const { startTime, endTime } = this.getBudgetPeriod(budget, now);
      const actual = this.calculateBudgetCost(budget, startTime, endTime);
      budget.actual = actual;

      const percentUsed = (actual / budget.amount) * 100;

      budget.alerts.forEach(alert => {
        if (percentUsed >= alert.threshold && !alert.triggered) {
          alert.triggered = true;
          alerts.push(budget);
          this.sendBudgetAlert(budget, alert, percentUsed);
        }
      });
    });

    return alerts;
  }

  /**
   * Forecast budget consumption
   */
  forecastBudget(budgetId: string): number {
    const budget = this.budgets.get(budgetId);
    if (!budget) return 0;

    const now = Date.now();
    const { startTime, endTime } = this.getBudgetPeriod(budget, now);
    const elapsed = now - startTime;
    const total = endTime - startTime;

    if (elapsed === 0) return 0;

    const actual = budget.actual || 0;
    const rate = actual / elapsed;
    return rate * total;
  }

  private getBudgetPeriod(budget: CostBudget, timestamp: number): { startTime: number; endTime: number } {
    const date = new Date(timestamp);

    switch (budget.period) {
      case 'monthly':
        return {
          startTime: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
          endTime: new Date(date.getFullYear(), date.getMonth() + 1, 0).getTime()
        };
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3);
        return {
          startTime: new Date(date.getFullYear(), quarter * 3, 1).getTime(),
          endTime: new Date(date.getFullYear(), quarter * 3 + 3, 0).getTime()
        };
      case 'yearly':
        return {
          startTime: new Date(date.getFullYear(), 0, 1).getTime(),
          endTime: new Date(date.getFullYear(), 11, 31).getTime()
        };
    }
  }

  private calculateBudgetCost(budget: CostBudget, startTime: number, endTime: number): number {
    let total = 0;

    // Filter by scope
    if (budget.scope.tenantIds) {
      budget.scope.tenantIds.forEach(tenantId => {
        total += this.usageEngine.calculateTotalCost(tenantId, startTime, endTime);
      });
    }

    return total;
  }

  private sendBudgetAlert(budget: CostBudget, alert: BudgetAlert, percentUsed: number): void {
    console.log(`Budget alert: ${budget.name} is ${percentUsed.toFixed(1)}% used`);
    alert.recipients.forEach(recipient => {
      console.log(`Sending alert to ${recipient}`);
    });
  }
}

// ============================================================================
// Cost Anomaly Detector
// ============================================================================

export class CostAnomalyDetector {
  private usageEngine: UsageTrackingEngine;

  constructor(usageEngine: UsageTrackingEngine) {
    this.usageEngine = usageEngine;
  }

  /**
   * Detect cost anomalies
   */
  detectAnomalies(tenantId: string): CostAnomaly[] {
    const anomalies: CostAnomaly[] = [];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get recent usage
    const todayUsage = this.usageEngine.aggregateUsage(tenantId, oneDayAgo, now);
    const baselineUsage = this.usageEngine.aggregateUsage(tenantId, oneWeekAgo, oneDayAgo);

    todayUsage.forEach((current, resourceType) => {
      const baseline = baselineUsage.get(resourceType);
      if (!baseline) return;

      const avgCost = baseline.cost / 7; // Average daily cost
      const deviation = ((current.cost - avgCost) / avgCost) * 100;

      if (Math.abs(deviation) > 50) { // 50% threshold
        anomalies.push({
          anomalyId: `anomaly_${Date.now()}_${resourceType}`,
          detectedAt: now,
          resourceType,
          expectedCost: avgCost,
          actualCost: current.cost,
          deviation,
          severity: Math.abs(deviation) > 100 ? 'high' : 'medium',
          possibleCauses: this.suggestCauses(resourceType, deviation)
        });
      }
    });

    return anomalies;
  }

  private suggestCauses(resourceType: ResourceType, deviation: number): string[] {
    if (deviation > 0) {
      return [
        'Unexpected increase in usage',
        'New feature launch',
        'Traffic spike',
        'Misconfigured service',
        'Potential abuse or attack'
      ];
    } else {
      return [
        'Service degradation',
        'Traffic drop',
        'Feature disabled',
        'Scheduled maintenance'
      ];
    }
  }
}

// ============================================================================
// Resource Allocator
// ============================================================================

export class ResourceAllocator {
  private allocations: Map<string, ResourceAllocation> = new Map();

  /**
   * Allocate resources
   */
  allocate(tenantId: string, resourceType: string, amount: number): ResourceAllocation {
    const allocationId = `alloc_${Date.now()}`;

    const allocation: ResourceAllocation = {
      allocationId,
      tenantId,
      resourceType,
      allocated: amount,
      used: 0,
      reserved: 0,
      available: amount
    };

    this.allocations.set(allocationId, allocation);
    return allocation;
  }

  /**
   * Use resources
   */
  useResources(allocationId: string, amount: number): boolean {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) return false;

    if (allocation.available < amount) {
      return false; // Insufficient resources
    }

    allocation.used += amount;
    allocation.available -= amount;
    return true;
  }

  /**
   * Release resources
   */
  releaseResources(allocationId: string, amount: number): void {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) return;

    allocation.used = Math.max(0, allocation.used - amount);
    allocation.available = allocation.allocated - allocation.used - allocation.reserved;
  }

  /**
   * Get allocation utilization
   */
  getUtilization(allocationId: string): number {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) return 0;

    return (allocation.used / allocation.allocated) * 100;
  }
}

// ============================================================================
// Auto Scaler
// ============================================================================

export class AutoScaler {
  private policies: Map<string, AutoScalingPolicy> = new Map();
  private allocator: ResourceAllocator;
  private lastScaleTime: Map<string, number> = new Map();

  constructor(allocator: ResourceAllocator) {
    this.allocator = allocator;
  }

  /**
   * Register scaling policy
   */
  registerPolicy(policy: AutoScalingPolicy): void {
    this.policies.set(policy.policyId, policy);
  }

  /**
   * Evaluate scaling policies
   */
  evaluateScaling(allocationId: string): { action: 'scale_up' | 'scale_down' | 'none'; newCapacity?: number } {
    const allocation = this.allocator['allocations'].get(allocationId);
    if (!allocation) return { action: 'none' };

    const policy = Array.from(this.policies.values()).find(p => p.resourceType === allocation.resourceType);
    if (!policy) return { action: 'none' };

    // Check cooldown
    const lastScale = this.lastScaleTime.get(policy.policyId) || 0;
    if (Date.now() - lastScale < policy.cooldownPeriod * 1000) {
      return { action: 'none' };
    }

    const utilization = this.allocator.getUtilization(allocationId);

    if (utilization >= policy.scaleUpThreshold) {
      const newCapacity = Math.min(allocation.allocated * 1.5, policy.maxCapacity);
      this.lastScaleTime.set(policy.policyId, Date.now());
      return { action: 'scale_up', newCapacity };
    }

    if (utilization <= policy.scaleDownThreshold) {
      const newCapacity = Math.max(allocation.allocated * 0.7, policy.minCapacity);
      this.lastScaleTime.set(policy.policyId, Date.now());
      return { action: 'scale_down', newCapacity };
    }

    return { action: 'none' };
  }
}

// ============================================================================
// Optimization Advisor
// ============================================================================

export class OptimizationAdvisor {
  private usageEngine: UsageTrackingEngine;

  constructor(usageEngine: UsageTrackingEngine) {
    this.usageEngine = usageEngine;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(tenantId: string): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const usage = this.usageEngine.aggregateUsage(tenantId, thirtyDaysAgo, now);

    usage.forEach((stats, resourceType) => {
      // Check for reserved capacity opportunity
      if (stats.cost > 1000) {
        recommendations.push({
          recommendationId: `rec_${Date.now()}_reserved`,
          type: 'reserved_capacity',
          resourceType,
          currentCost: stats.cost,
          projectedCost: stats.cost * 0.7, // 30% savings
          savings: stats.cost * 0.3,
          confidence: 0.85,
          description: `High consistent usage of ${resourceType}`,
          actionRequired: 'Purchase reserved capacity for 1 year commitment'
        });
      }

      // Check for API caching opportunity
      if (resourceType === 'api_calls' && stats.quantity > 1000000) {
        recommendations.push({
          recommendationId: `rec_${Date.now()}_cache`,
          type: 'api_caching',
          resourceType,
          currentCost: stats.cost,
          projectedCost: stats.cost * 0.6, // 40% reduction
          savings: stats.cost * 0.4,
          confidence: 0.75,
          description: 'High volume of API calls detected',
          actionRequired: 'Enable API response caching'
        });
      }
    });

    return recommendations;
  }
}

// ============================================================================
// Integrated Cost Optimization Platform
// ============================================================================

export class CostOptimizationPlatform {
  private usageEngine: UsageTrackingEngine;
  private costCalculator: CostCalculator;
  private budgetManager: BudgetManager;
  private anomalyDetector: CostAnomalyDetector;
  private allocator: ResourceAllocator;
  private autoScaler: AutoScaler;
  private advisor: OptimizationAdvisor;

  constructor() {
    this.usageEngine = new UsageTrackingEngine();
    this.costCalculator = new CostCalculator();
    this.budgetManager = new BudgetManager(this.usageEngine);
    this.anomalyDetector = new CostAnomalyDetector(this.usageEngine);
    this.allocator = new ResourceAllocator();
    this.autoScaler = new AutoScaler(this.allocator);
    this.advisor = new OptimizationAdvisor(this.usageEngine);
  }

  /**
   * Track resource usage
   */
  trackUsage(
    tenantId: string,
    resourceType: ResourceType,
    quantity: number,
    tierId: string
  ): UsageRecord {
    const { total } = this.costCalculator.calculateCost(tierId, resourceType, quantity);

    return this.usageEngine.recordUsage({
      tenantId,
      resourceType,
      quantity,
      unit: 'units',
      cost: total,
      currency: 'USD',
      metadata: { tierId }
    });
  }

  /**
   * Get cost summary
   */
  getCostSummary(tenantId: string, period: 'day' | 'week' | 'month'): any {
    const now = Date.now();
    const startTime = period === 'day' ? now - 24 * 60 * 60 * 1000 :
                      period === 'week' ? now - 7 * 24 * 60 * 60 * 1000 :
                      now - 30 * 24 * 60 * 60 * 1000;

    const usage = this.usageEngine.aggregateUsage(tenantId, startTime, now);
    const total = this.usageEngine.calculateTotalCost(tenantId, startTime, now);

    return {
      period,
      totalCost: total,
      breakdown: Object.fromEntries(usage),
      timestamp: now
    };
  }

  /**
   * Run optimization analysis
   */
  analyze(tenantId: string): any {
    return {
      anomalies: this.anomalyDetector.detectAnomalies(tenantId),
      recommendations: this.advisor.generateRecommendations(tenantId),
      budgets: Array.from(this.budgetManager['budgets'].values()),
      timestamp: Date.now()
    };
  }

  // Expose engines
  getUsageEngine(): UsageTrackingEngine { return this.usageEngine; }
  getCostCalculator(): CostCalculator { return this.costCalculator; }
  getBudgetManager(): BudgetManager { return this.budgetManager; }
  getAnomalyDetector(): CostAnomalyDetector { return this.anomalyDetector; }
  getAllocator(): ResourceAllocator { return this.allocator; }
  getAutoScaler(): AutoScaler { return this.autoScaler; }
  getAdvisor(): OptimizationAdvisor { return this.advisor; }
}

export default CostOptimizationPlatform;
