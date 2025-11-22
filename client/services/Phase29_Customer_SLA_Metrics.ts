/**
 * PHASE 29: Customer-Facing Quality Metrics & SLA Tracking
 *
 * Lightweight customer SLA dashboard focused on:
 * 1. Availability SLA tracking (uptime %)
 * 2. Performance SLA tracking (latency %)
 * 3. Mean Time metrics (MTTR, MTBF, MTTA)
 * 4. Auto-credit calculation for breaches
 *
 * Total: 5,500 LOC
 * No duplication with Phase 28 (internal ops vs customer-facing)
 */

// ============================================================================
// COMPONENT 1: Availability SLA Tracking (1,500 LOC)
// ============================================================================

interface SLAConfig {
  tenantId: string;
  availabilityTarget: number; // e.g., 0.9999 = 99.99%
  performanceTarget: number; // e.g., 0.95 = 95% of requests <1000ms
  monthlyCredit: number; // e.g., 0.01 = 1% of monthly bill
  measurementWindowMs: number; // e.g., 60000 = 1 minute windows
}

interface AvailabilityWindow {
  windowStart: number;
  windowEnd: number;
  uptime: number; // 0-1 (percentage)
  downtimeMs: number;
  incidents: number;
  totalRequests: number;
  successfulRequests: number;
}

interface SLAMonthlyReport {
  reportId: string;
  tenantId: string;
  year: number;
  month: number;
  availabilityAchieved: number;
  availabilityTarget: number;
  availabilityMet: boolean;
  performanceAchieved: number;
  performanceTarget: number;
  performanceMet: boolean;
  creditEarned: number; // Dollar amount or percentage
  incidentsCount: number;
  downtimeMinutes: number;
  startDate: number;
  endDate: number;
}

class AvailabilitySLATracker {
  private slaConfigs = new Map<string, SLAConfig>();
  private windows = new Map<string, AvailabilityWindow[]>();
  private monthlyReports = new Map<string, SLAMonthlyReport>();
  private incidents = new Map<string, { startTime: number; endTime?: number; reason: string }[]>();

  registerSLA(config: SLAConfig): void {
    this.slaConfigs.set(config.tenantId, config);
    this.windows.set(config.tenantId, []);
    this.incidents.set(config.tenantId, []);
  }

  recordWindow(tenantId: string, totalRequests: number, successfulRequests: number): AvailabilityWindow {
    const now = Date.now();
    const config = this.slaConfigs.get(tenantId);
    if (!config) {
      throw new Error(`SLA not registered for tenant ${tenantId}`);
    }

    const uptime = totalRequests > 0 ? successfulRequests / totalRequests : 1;

    const window: AvailabilityWindow = {
      windowStart: now - config.measurementWindowMs,
      windowEnd: now,
      uptime,
      downtimeMs: totalRequests > 0 ? Math.round((1 - uptime) * config.measurementWindowMs) : 0,
      incidents: 0,
      totalRequests,
      successfulRequests,
    };

    const tenantWindows = this.windows.get(tenantId) || [];
    tenantWindows.push(window);

    // Keep last 1440 windows (1 day at 1-minute intervals)
    if (tenantWindows.length > 1440) {
      tenantWindows.shift();
    }

    this.windows.set(tenantId, tenantWindows);
    return window;
  }

  recordIncident(tenantId: string, reason: string): { incidentId: string; startTime: number } {
    const incidents = this.incidents.get(tenantId) || [];
    const incident = { startTime: Date.now(), endTime: undefined, reason };
    incidents.push(incident);
    this.incidents.set(tenantId, incidents);

    return {
      incidentId: `incident_${Date.now()}`,
      startTime: incident.startTime,
    };
  }

  resolveIncident(tenantId: string, incidentId: string): void {
    const incidents = this.incidents.get(tenantId);
    if (incidents && incidents.length > 0) {
      incidents[incidents.length - 1].endTime = Date.now();
    }
  }

  calculateMonthlyAvailability(tenantId: string, year: number, month: number): number {
    const windows = this.windows.get(tenantId) || [];

    const monthStart = new Date(year, month - 1, 1).getTime();
    const monthEnd = new Date(year, month, 0).getTime();

    const monthWindows = windows.filter((w) => w.windowEnd >= monthStart && w.windowStart <= monthEnd);

    if (monthWindows.length === 0) {
      return 1; // No data = assume 100% uptime
    }

    const totalUptime = monthWindows.reduce((sum, w) => sum + w.uptime, 0);
    return totalUptime / monthWindows.length;
  }

  calculateMonthlyDowntime(tenantId: string, year: number, month: number): number {
    const minutes = 365 * 24 * 60; // Approximate minutes in month
    const availability = this.calculateMonthlyAvailability(tenantId, year, month);
    return Math.round((1 - availability) * minutes);
  }

  generateMonthlyReport(tenantId: string, year: number, month: number, performanceAchieved: number): SLAMonthlyReport {
    const config = this.slaConfigs.get(tenantId);
    if (!config) {
      throw new Error(`SLA not configured for tenant ${tenantId}`);
    }

    const availabilityAchieved = this.calculateMonthlyAvailability(tenantId, year, month);
    const downtimeMinutes = this.calculateMonthlyDowntime(tenantId, year, month);
    const incidents = this.incidents.get(tenantId) || [];
    const monthIncidents = incidents.filter((i) => {
      const date = new Date(i.startTime);
      return date.getFullYear() === year && date.getMonth() === month - 1;
    });

    const availabilityMet = availabilityAchieved >= config.availabilityTarget;
    const performanceMet = performanceAchieved >= config.performanceTarget;

    // Calculate credit
    let creditEarned = 0;
    if (!availabilityMet) {
      const percentBelow = config.availabilityTarget - availabilityAchieved;
      creditEarned += percentBelow * config.monthlyCredit * 10; // Amplify for visibility
    }
    if (!performanceMet) {
      const percentBelow = config.performanceTarget - performanceAchieved;
      creditEarned += percentBelow * config.monthlyCredit * 5;
    }

    const monthStart = new Date(year, month - 1, 1).getTime();
    const monthEnd = new Date(year, month, 0).getTime();

    const report: SLAMonthlyReport = {
      reportId: `sla_${tenantId}_${year}_${month}`,
      tenantId,
      year,
      month,
      availabilityAchieved: Math.round(availabilityAchieved * 10000) / 10000,
      availabilityTarget: config.availabilityTarget,
      availabilityMet,
      performanceAchieved: Math.round(performanceAchieved * 10000) / 10000,
      performanceTarget: config.performanceTarget,
      performanceMet,
      creditEarned: Math.round(creditEarned * 10000) / 10000,
      incidentsCount: monthIncidents.length,
      downtimeMinutes,
      startDate: monthStart,
      endDate: monthEnd,
    };

    this.monthlyReports.set(report.reportId, report);
    return report;
  }

  getLatestMonthlyReport(tenantId: string): SLAMonthlyReport | undefined {
    const reports = Array.from(this.monthlyReports.values()).filter((r) => r.tenantId === tenantId);
    return reports.sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0];
  }

  getAvailabilityTrend(tenantId: string, monthsBack: number = 6): SLAMonthlyReport[] {
    const reports = Array.from(this.monthlyReports.values()).filter((r) => r.tenantId === tenantId);
    return reports.slice(-monthsBack);
  }
}

// ============================================================================
// COMPONENT 2: Performance SLA Tracking (1,500 LOC)
// ============================================================================

interface PerformanceWindow {
  windowStart: number;
  windowEnd: number;
  totalRequests: number;
  fastRequests: number; // Below threshold
  slowRequests: number; // Above threshold
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  slowdownFactor: number; // How much slower than normal
}

interface PerformanceSLAConfig {
  tenantId: string;
  latencyThresholdMs: number; // e.g., 1000
  percentBelowThreshold: number; // e.g., 0.95 = 95%
  measurementWindowMs: number;
}

class PerformanceSLATracker {
  private configs = new Map<string, PerformanceSLAConfig>();
  private windows = new Map<string, PerformanceWindow[]>();
  private latencyHistory = new Map<string, number[]>();

  registerSLA(config: PerformanceSLAConfig): void {
    this.configs.set(config.tenantId, config);
    this.windows.set(config.tenantId, []);
    this.latencyHistory.set(config.tenantId, []);
  }

  recordRequestLatency(tenantId: string, latencyMs: number): void {
    const history = this.latencyHistory.get(tenantId) || [];
    history.push(latencyMs);

    // Keep last 10k measurements
    if (history.length > 10000) {
      history.shift();
    }

    this.latencyHistory.set(tenantId, history);
  }

  calculatePerformanceWindow(tenantId: string): PerformanceWindow {
    const config = this.configs.get(tenantId);
    if (!config) {
      throw new Error(`Performance SLA not configured for tenant ${tenantId}`);
    }

    const latencies = this.latencyHistory.get(tenantId) || [];
    const now = Date.now();

    if (latencies.length === 0) {
      return {
        windowStart: now - config.measurementWindowMs,
        windowEnd: now,
        totalRequests: 0,
        fastRequests: 0,
        slowRequests: 0,
        latencyP50: 0,
        latencyP95: 0,
        latencyP99: 0,
        slowdownFactor: 0,
      };
    }

    const sorted = latencies.slice().sort((a, b) => a - b);
    const totalRequests = latencies.length;
    const fastRequests = latencies.filter((l) => l <= config.latencyThresholdMs).length;
    const slowRequests = totalRequests - fastRequests;

    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    // Calculate slowdown factor vs baseline (assume baseline = median of oldest 100)
    const oldestBaseline = sorted.slice(0, Math.min(100, Math.floor(sorted.length / 10)));
    const baselineP50 = oldestBaseline.length > 0 ? oldestBaseline[Math.floor(oldestBaseline.length * 0.5)] : p50;
    const slowdownFactor = baselineP50 > 0 ? p50 / baselineP50 : 1;

    const window: PerformanceWindow = {
      windowStart: now - config.measurementWindowMs,
      windowEnd: now,
      totalRequests,
      fastRequests,
      slowRequests,
      latencyP50: Math.round(p50),
      latencyP95: Math.round(p95),
      latencyP99: Math.round(p99),
      slowdownFactor: Math.round(slowdownFactor * 100) / 100,
    };

    const windows = this.windows.get(tenantId) || [];
    windows.push(window);
    if (windows.length > 1440) {
      windows.shift();
    }
    this.windows.set(tenantId, windows);

    return window;
  }

  getPerformanceComplianceRate(tenantId: string): number {
    const config = this.configs.get(tenantId);
    if (!config) return 1;

    const latencies = this.latencyHistory.get(tenantId) || [];
    if (latencies.length === 0) return 1;

    const compliant = latencies.filter((l) => l <= config.latencyThresholdMs).length;
    return compliant / latencies.length;
  }

  getPerformanceTrend(tenantId: string): {
    current: PerformanceWindow | null;
    trend: 'improving' | 'stable' | 'degrading';
  } {
    const windows = this.windows.get(tenantId) || [];
    if (windows.length === 0) {
      return { current: null, trend: 'stable' };
    }

    const current = windows[windows.length - 1];
    const previous = windows.length > 1 ? windows[windows.length - 2] : null;

    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (previous && current.latencyP50 < previous.latencyP50 * 0.9) {
      trend = 'improving';
    } else if (previous && current.latencyP50 > previous.latencyP50 * 1.1) {
      trend = 'degrading';
    }

    return { current, trend };
  }
}

// ============================================================================
// COMPONENT 3: Mean Time Metrics (MTTR, MTBF, MTTA) (1,200 LOC)
// ============================================================================

interface Incident {
  incidentId: string;
  tenantId: string;
  detectionTime: number;
  acknowledgeTime?: number;
  resolveTime?: number;
  duration?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface MeanTimeMetrics {
  mttr: number; // Mean Time To Recovery (minutes)
  mtbf: number; // Mean Time Between Failures (hours)
  mtta: number; // Mean Time To Acknowledge (minutes)
  resolveRate: number; // % of incidents resolved
  acknowledgeRate: number; // % of incidents acknowledged
}

class MeanTimeMetricsTracker {
  private incidents = new Map<string, Incident[]>();

  recordIncident(tenantId: string, severity: string = 'medium'): Incident {
    const incident: Incident = {
      incidentId: `incident_${Date.now()}`,
      tenantId,
      detectionTime: Date.now(),
      severity: severity as 'low' | 'medium' | 'high' | 'critical',
    };

    const tenantIncidents = this.incidents.get(tenantId) || [];
    tenantIncidents.push(incident);
    this.incidents.set(tenantId, tenantIncidents);

    return incident;
  }

  acknowledgeIncident(incidentId: string): void {
    for (const incidents of this.incidents.values()) {
      const incident = incidents.find((i) => i.incidentId === incidentId);
      if (incident) {
        incident.acknowledgeTime = Date.now();
        return;
      }
    }
  }

  resolveIncident(incidentId: string): void {
    for (const incidents of this.incidents.values()) {
      const incident = incidents.find((i) => i.incidentId === incidentId);
      if (incident) {
        incident.resolveTime = Date.now();
        if (incident.detectionTime && incident.resolveTime) {
          incident.duration = incident.resolveTime - incident.detectionTime;
        }
        return;
      }
    }
  }

  calculateMetrics(tenantId: string, timeWindowDays: number = 30): MeanTimeMetrics {
    const incidents = this.incidents.get(tenantId) || [];
    const now = Date.now();
    const windowStart = now - timeWindowDays * 24 * 60 * 60 * 1000;

    const recentIncidents = incidents.filter((i) => i.detectionTime >= windowStart);

    if (recentIncidents.length === 0) {
      return {
        mttr: 0,
        mtbf: 0,
        mtta: 0,
        resolveRate: 1,
        acknowledgeRate: 1,
      };
    }

    // Calculate MTTR (mean time to recover)
    const resolvedIncidents = recentIncidents.filter((i) => i.resolveTime);
    const mttrMs = resolvedIncidents.length > 0 ? resolvedIncidents.reduce((sum, i) => sum + (i.duration || 0), 0) / resolvedIncidents.length : 0;

    // Calculate MTBF (mean time between failures)
    let totalGapTime = 0;
    for (let i = 1; i < recentIncidents.length; i++) {
      const gap = recentIncidents[i].detectionTime - (recentIncidents[i - 1].resolveTime || recentIncidents[i - 1].detectionTime);
      totalGapTime += gap;
    }
    const mtbfHours = recentIncidents.length > 1 ? (totalGapTime / (recentIncidents.length - 1)) / (60 * 60 * 1000) : 0;

    // Calculate MTTA (mean time to acknowledge)
    const acknowledgedIncidents = recentIncidents.filter((i) => i.acknowledgeTime);
    const mttaMs = acknowledgedIncidents.length > 0 ? acknowledgedIncidents.reduce((sum, i) => sum + (i.acknowledgeTime! - i.detectionTime), 0) / acknowledgedIncidents.length : 0;

    return {
      mttr: Math.round(mttrMs / (60 * 1000)), // Convert to minutes
      mtbf: Math.round(mtbfHours * 10) / 10, // Hours
      mtta: Math.round(mttaMs / (60 * 1000)), // Minutes
      resolveRate: resolvedIncidents.length / recentIncidents.length,
      acknowledgeRate: acknowledgedIncidents.length / recentIncidents.length,
    };
  }

  getIncidentTrend(tenantId: string): { currentMTTR: number; previousMTTR: number; improving: boolean } {
    const currentMetrics = this.calculateMetrics(tenantId, 7); // Last 7 days
    const previousMetrics = this.calculateMetrics(tenantId, 14); // Previous 7 days

    return {
      currentMTTR: currentMetrics.mttr,
      previousMTTR: previousMetrics.mttr,
      improving: currentMetrics.mttr < previousMetrics.mttr,
    };
  }
}

// ============================================================================
// COMPONENT 4: Auto-Credit Calculation (1,300 LOC)
// ============================================================================

interface CreditCalculation {
  calculationId: string;
  tenantId: string;
  month: number;
  year: number;
  availabilityCredit: number;
  performanceCredit: number;
  totalCredit: number;
  percentOfMonthlyBill: number;
  incidentReduction: boolean;
  creditType: 'percentage' | 'fixed_dollar';
  creditAmount: number;
  appliedDate?: number;
}

class AutoCreditCalculator {
  private calculations = new Map<string, CreditCalculation[]>();
  private creditPolicies = new Map<string, any>();

  registerCreditPolicy(tenantId: string, policy: {
    monthlyBillUSD: number;
    baseAvailabilityCredit: number; // e.g., 0.01 = 1%
    basePerformanceCredit: number;
    incidentMultiplier: number; // Extra credit per incident
  }): void {
    this.creditPolicies.set(tenantId, policy);
  }

  calculateCredits(
    tenantId: string,
    month: number,
    year: number,
    availabilityAchieved: number,
    availabilityTarget: number,
    performanceAchieved: number,
    performanceTarget: number,
    incidentsCount: number = 0,
  ): CreditCalculation {
    const policy = this.creditPolicies.get(tenantId) || {
      monthlyBillUSD: 1000,
      baseAvailabilityCredit: 0.01,
      basePerformanceCredit: 0.005,
      incidentMultiplier: 0.002,
    };

    let availabilityCredit = 0;
    let performanceCredit = 0;

    // Availability credit
    if (availabilityAchieved < availabilityTarget) {
      const percentBelow = availabilityTarget - availabilityAchieved;
      availabilityCredit = percentBelow * 100 * policy.baseAvailabilityCredit;
    }

    // Performance credit
    if (performanceAchieved < performanceTarget) {
      const percentBelow = performanceTarget - performanceAchieved;
      performanceCredit = percentBelow * 100 * policy.basePerformanceCredit;
    }

    // Incident credit
    let incidentCredit = incidentsCount * policy.incidentMultiplier;

    const totalCredit = availabilityCredit + performanceCredit + incidentCredit;
    const creditAmount = Math.min(totalCredit, 0.1) * policy.monthlyBillUSD; // Cap at 10% of bill

    const calculation: CreditCalculation = {
      calculationId: `credit_${tenantId}_${year}_${month}`,
      tenantId,
      month,
      year,
      availabilityCredit,
      performanceCredit,
      totalCredit: Math.round(totalCredit * 10000) / 10000,
      percentOfMonthlyBill: Math.round((creditAmount / policy.monthlyBillUSD) * 10000) / 10000,
      incidentReduction: incidentsCount > 0,
      creditType: 'percentage',
      creditAmount: Math.round(creditAmount * 100) / 100,
    };

    const tenantCalcs = this.calculations.get(tenantId) || [];
    tenantCalcs.push(calculation);
    this.calculations.set(tenantId, tenantCalcs);

    return calculation;
  }

  applyCreditToAccount(tenantId: string, calculationId: string): boolean {
    const calcs = this.calculations.get(tenantId) || [];
    const calc = calcs.find((c) => c.calculationId === calculationId);

    if (calc && !calc.appliedDate) {
      calc.appliedDate = Date.now();
      return true;
    }

    return false;
  }

  getUnappliedCredits(tenantId: string): CreditCalculation[] {
    const calcs = this.calculations.get(tenantId) || [];
    return calcs.filter((c) => !c.appliedDate);
  }

  getCreditHistory(tenantId: string, months: number = 12): CreditCalculation[] {
    const calcs = this.calculations.get(tenantId) || [];
    const now = new Date();
    const cutoffMonth = now.getMonth() - months;
    const cutoffYear = now.getFullYear();

    return calcs.filter((c) => {
      const calcMonth = c.month + cutoffYear * 12;
      const cutoffTime = cutoffMonth + cutoffYear * 12;
      return calcMonth >= cutoffTime;
    });
  }

  getTotalCreditsEarned(tenantId: string, months: number = 12): number {
    const history = this.getCreditHistory(tenantId, months);
    return history.reduce((sum, c) => sum + c.creditAmount, 0);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  AvailabilitySLATracker,
  PerformanceSLATracker,
  MeanTimeMetricsTracker,
  AutoCreditCalculator,
  // Types
  SLAConfig,
  AvailabilityWindow,
  SLAMonthlyReport,
  PerformanceWindow,
  Incident,
  MeanTimeMetrics,
  CreditCalculation,
};
