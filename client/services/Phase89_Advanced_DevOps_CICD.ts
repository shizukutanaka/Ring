/**
 * Phase 89: Advanced DevOps & CI/CD
 *
 * Enterprise-grade DevOps and CI/CD platform for Ring WebRTC spam detection.
 * Implements GitHub Actions-style pipelines, GitOps, feature flags, and
 * comprehensive deployment strategies.
 *
 * Research Sources (2025):
 * - GitHub Actions Reusable Workflows: https://docs.github.com/en/actions/concepts/workflows-and-actions/reusable-workflows
 * - ArgoCD vs Flux GitOps: https://www.cncf.io/blog/2024/04/18/argo-cd-vs-flux-which-gitops-tool-is-right-for-you/
 * - LaunchDarkly Feature Flags: https://launchdarkly.com/
 * - Deployment Strategies: https://www.harness.io/blog/blue-green-canary-deployment-strategies
 * - Terraform vs Pulumi: https://www.pulumi.com/docs/iac/comparisons/terraform/
 * - Container Registry: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
 *
 * @module Phase89_Advanced_DevOps_CICD
 * @version 1.0.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * CI Pipeline Types
 */
export interface PipelineConfig {
  name: string;
  on: TriggerConfig;
  env?: Record<string, string>;
  jobs: Record<string, JobConfig>;
  concurrency?: ConcurrencyConfig;
}

export interface TriggerConfig {
  push?: { branches?: string[]; tags?: string[]; paths?: string[] };
  pull_request?: { branches?: string[]; types?: string[] };
  schedule?: { cron: string }[];
  workflow_dispatch?: { inputs?: Record<string, InputConfig> };
  workflow_call?: { inputs?: Record<string, InputConfig>; secrets?: Record<string, SecretConfig> };
}

export interface InputConfig {
  description: string;
  required?: boolean;
  default?: string;
  type?: 'string' | 'boolean' | 'choice' | 'environment';
  options?: string[];
}

export interface SecretConfig {
  description?: string;
  required?: boolean;
}

export interface JobConfig {
  name?: string;
  'runs-on': string | string[];
  needs?: string | string[];
  if?: string;
  environment?: string | EnvironmentConfig;
  env?: Record<string, string>;
  steps: StepConfig[];
  outputs?: Record<string, string>;
  strategy?: StrategyConfig;
  timeout_minutes?: number;
  continue_on_error?: boolean;
  services?: Record<string, ServiceConfig>;
}

export interface EnvironmentConfig {
  name: string;
  url?: string;
}

export interface StepConfig {
  id?: string;
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, string>;
  if?: string;
  continue_on_error?: boolean;
  timeout_minutes?: number;
  working_directory?: string;
}

export interface StrategyConfig {
  matrix?: Record<string, unknown[]>;
  fail_fast?: boolean;
  max_parallel?: number;
}

export interface ServiceConfig {
  image: string;
  ports?: string[];
  env?: Record<string, string>;
  options?: string;
}

export interface ConcurrencyConfig {
  group: string;
  cancel_in_progress?: boolean;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  startedAt: Date;
  completedAt?: Date;
  jobs: JobRun[];
  trigger: string;
  sha?: string;
  branch?: string;
}

export interface JobRun {
  id: string;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  steps: StepRun[];
  outputs: Record<string, string>;
}

export interface StepRun {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  conclusion?: 'success' | 'failure' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  output?: string;
}

/**
 * GitOps Types
 */
export interface GitOpsApplication {
  name: string;
  namespace: string;
  source: GitOpsSource;
  destination: GitOpsDestination;
  syncPolicy?: SyncPolicy;
  healthStatus?: HealthStatus;
  syncStatus?: SyncStatus;
}

export interface GitOpsSource {
  repoURL: string;
  path: string;
  targetRevision: string;
  helm?: HelmConfig;
  kustomize?: KustomizeConfig;
}

export interface HelmConfig {
  valueFiles?: string[];
  values?: string;
  parameters?: { name: string; value: string }[];
  releaseName?: string;
}

export interface KustomizeConfig {
  images?: { name: string; newName?: string; newTag?: string }[];
  namePrefix?: string;
  nameSuffix?: string;
}

export interface GitOpsDestination {
  server: string;
  namespace: string;
}

export interface SyncPolicy {
  automated?: {
    prune?: boolean;
    selfHeal?: boolean;
    allowEmpty?: boolean;
  };
  syncOptions?: string[];
  retry?: {
    limit: number;
    backoff: {
      duration: string;
      factor: number;
      maxDuration: string;
    };
  };
}

export type HealthStatus = 'Healthy' | 'Progressing' | 'Degraded' | 'Suspended' | 'Missing' | 'Unknown';
export type SyncStatus = 'Synced' | 'OutOfSync' | 'Unknown';

export interface GitOpsSync {
  applicationName: string;
  revision: string;
  status: SyncStatus;
  startedAt: Date;
  finishedAt?: Date;
  resources: ResourceSync[];
}

export interface ResourceSync {
  kind: string;
  name: string;
  namespace?: string;
  status: 'Synced' | 'OutOfSync' | 'Unknown';
  health?: HealthStatus;
  message?: string;
}

/**
 * Feature Flag Types
 */
export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  variations: FlagVariation[];
  defaultVariation: string;
  rules: TargetingRule[];
  percentageRollout?: PercentageRollout;
  prerequisites?: Prerequisite[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FlagVariation {
  id: string;
  value: unknown;
  name?: string;
  description?: string;
}

export interface TargetingRule {
  id: string;
  description?: string;
  clauses: RuleClause[];
  variation: string;
  rollout?: PercentageRollout;
}

export interface RuleClause {
  attribute: string;
  op: 'in' | 'notIn' | 'contains' | 'startsWith' | 'endsWith' | 'matches' | 'lessThan' | 'greaterThan' | 'before' | 'after';
  values: unknown[];
  negate?: boolean;
}

export interface PercentageRollout {
  variations: { variation: string; weight: number }[];
  bucketBy?: string;
  seed?: number;
}

export interface Prerequisite {
  flagKey: string;
  variation: string;
}

export interface EvaluationContext {
  key: string;
  anonymous?: boolean;
  attributes?: Record<string, unknown>;
  privateAttributes?: string[];
}

export interface FlagEvaluation {
  flagKey: string;
  value: unknown;
  variationId: string;
  reason: EvaluationReason;
  ruleIndex?: number;
}

export interface EvaluationReason {
  kind: 'OFF' | 'FALLTHROUGH' | 'TARGET_MATCH' | 'RULE_MATCH' | 'PREREQUISITE_FAILED' | 'ERROR';
  ruleId?: string;
  prerequisiteKey?: string;
  errorKind?: string;
}

/**
 * Deployment Strategy Types
 */
export type DeploymentStrategyType = 'rolling' | 'blue-green' | 'canary' | 'recreate' | 'a-b-testing';

export interface DeploymentConfig {
  name: string;
  strategy: DeploymentStrategyType;
  replicas: number;
  image: string;
  version: string;
  resources?: ResourceRequirements;
  healthCheck?: HealthCheckConfig;
  rollout?: RolloutConfig;
}

export interface ResourceRequirements {
  requests?: { cpu?: string; memory?: string };
  limits?: { cpu?: string; memory?: string };
}

export interface HealthCheckConfig {
  path: string;
  port: number;
  initialDelaySeconds?: number;
  periodSeconds?: number;
  timeoutSeconds?: number;
  successThreshold?: number;
  failureThreshold?: number;
}

export interface RolloutConfig {
  maxSurge?: string | number;
  maxUnavailable?: string | number;
  progressDeadlineSeconds?: number;
  revisionHistoryLimit?: number;
  canary?: CanaryConfig;
  blueGreen?: BlueGreenConfig;
}

export interface CanaryConfig {
  steps: CanaryStep[];
  analysis?: AnalysisConfig;
  antiAffinity?: 'required' | 'preferred';
}

export interface CanaryStep {
  setWeight?: number;
  pause?: { duration?: string };
  setCanaryScale?: { replicas?: number; weight?: number };
  analysis?: AnalysisConfig;
}

export interface BlueGreenConfig {
  activeService: string;
  previewService: string;
  autoPromotionEnabled?: boolean;
  autoPromotionSeconds?: number;
  scaleDownDelaySeconds?: number;
  prePromotionAnalysis?: AnalysisConfig;
  postPromotionAnalysis?: AnalysisConfig;
}

export interface AnalysisConfig {
  templates: AnalysisTemplate[];
  args?: { name: string; value: string }[];
  successCondition?: string;
  failureCondition?: string;
}

export interface AnalysisTemplate {
  templateName: string;
  clusterScope?: boolean;
}

export interface Deployment {
  id: string;
  config: DeploymentConfig;
  status: DeploymentStatus;
  createdAt: Date;
  updatedAt: Date;
  history: DeploymentRevision[];
}

export interface DeploymentStatus {
  phase: 'Pending' | 'Progressing' | 'Healthy' | 'Degraded' | 'Paused' | 'Failed';
  replicas: { desired: number; ready: number; available: number; updated: number };
  currentVersion: string;
  previousVersion?: string;
  canaryWeight?: number;
  blueGreenActive?: 'blue' | 'green';
  conditions: DeploymentCondition[];
}

export interface DeploymentCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  lastUpdateTime: Date;
}

export interface DeploymentRevision {
  revision: number;
  version: string;
  image: string;
  createdAt: Date;
  rolledBackFrom?: number;
}

/**
 * Infrastructure as Code Types
 */
export interface IaCStack {
  name: string;
  project: string;
  runtime: 'terraform' | 'pulumi' | 'cloudformation';
  backend?: IaCBackend;
  config: Record<string, IaCConfigValue>;
  resources: IaCResource[];
  outputs: Record<string, IaCOutput>;
}

export interface IaCBackend {
  type: 's3' | 'gcs' | 'azure' | 'local' | 'http';
  config: Record<string, string>;
}

export interface IaCConfigValue {
  value: unknown;
  secret?: boolean;
  description?: string;
}

export interface IaCResource {
  type: string;
  name: string;
  provider?: string;
  properties: Record<string, unknown>;
  dependsOn?: string[];
  count?: number;
  forEach?: Record<string, unknown>;
  lifecycle?: {
    createBeforeDestroy?: boolean;
    preventDestroy?: boolean;
    ignoreChanges?: string[];
  };
}

export interface IaCOutput {
  value: unknown;
  description?: string;
  sensitive?: boolean;
}

export interface IaCPlan {
  stackName: string;
  operations: IaCOperation[];
  summary: { add: number; change: number; destroy: number };
  createdAt: Date;
}

export interface IaCOperation {
  action: 'create' | 'update' | 'delete' | 'replace' | 'read';
  resourceType: string;
  resourceName: string;
  changes?: { attribute: string; before: unknown; after: unknown }[];
}

export interface IaCState {
  version: number;
  stackName: string;
  resources: IaCStateResource[];
  outputs: Record<string, unknown>;
  lastUpdated: Date;
}

export interface IaCStateResource {
  type: string;
  name: string;
  id: string;
  attributes: Record<string, unknown>;
  dependencies: string[];
}

/**
 * Container Registry Types
 */
export interface ContainerImage {
  repository: string;
  tag: string;
  digest?: string;
  size?: number;
  created?: Date;
  labels?: Record<string, string>;
  config?: ImageConfig;
  vulnerabilities?: VulnerabilityScan;
  attestations?: ImageAttestation[];
}

export interface ImageConfig {
  architecture: string;
  os: string;
  layers: number;
  entrypoint?: string[];
  cmd?: string[];
  env?: string[];
  exposedPorts?: string[];
  workdir?: string;
}

export interface VulnerabilityScan {
  scanDate: Date;
  scanner: string;
  vulnerabilities: Vulnerability[];
  summary: { critical: number; high: number; medium: number; low: number };
}

export interface Vulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  package: string;
  version: string;
  fixedVersion?: string;
  description: string;
  url?: string;
}

export interface ImageAttestation {
  type: 'provenance' | 'sbom' | 'signature';
  predicateType?: string;
  signature?: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

export interface RegistryConfig {
  url: string;
  type: 'docker-hub' | 'ghcr' | 'ecr' | 'gcr' | 'acr' | 'harbor';
  credentials?: RegistryCredentials;
  retentionPolicy?: RetentionPolicy;
}

export interface RegistryCredentials {
  username?: string;
  password?: string;
  token?: string;
}

export interface RetentionPolicy {
  keepLast?: number;
  keepDays?: number;
  keepSemver?: boolean;
  excludeTags?: string[];
}

/**
 * Environment Promotion Types
 */
export interface Environment {
  name: string;
  tier: 'development' | 'staging' | 'production';
  url?: string;
  approvers?: string[];
  deploymentConfig?: Partial<DeploymentConfig>;
  variables?: Record<string, string>;
  secrets?: string[];
  protectionRules?: ProtectionRule[];
}

export interface ProtectionRule {
  type: 'required-reviewers' | 'wait-timer' | 'branch-policy' | 'deployment-branches';
  config: Record<string, unknown>;
}

export interface PromotionRequest {
  id: string;
  artifact: string;
  version: string;
  fromEnvironment: string;
  toEnvironment: string;
  status: 'pending' | 'approved' | 'rejected' | 'deployed' | 'failed';
  requestedBy: string;
  requestedAt: Date;
  approvals: Approval[];
  deployedAt?: Date;
  notes?: string;
}

export interface Approval {
  approver: string;
  decision: 'approved' | 'rejected';
  comment?: string;
  timestamp: Date;
}

// ============================================================================
// CI PIPELINE ENGINE
// ============================================================================

/**
 * GitHub Actions-style CI Pipeline Engine
 *
 * Implements reusable workflows, composite actions, matrix builds,
 * and modern CI/CD best practices from 2025.
 *
 * Based on: GitHub Actions Reusable Workflows, DevToolHub best practices
 */
export class CIPipelineEngine {
  private pipelines: Map<string, PipelineConfig> = new Map();
  private runs: Map<string, PipelineRun> = new Map();
  private actions: Map<string, CompositeAction> = new Map();
  private secrets: Map<string, string> = new Map();

  /**
   * Register a pipeline configuration
   */
  registerPipeline(id: string, config: PipelineConfig): void {
    this.validatePipeline(config);
    this.pipelines.set(id, config);
  }

  /**
   * Register a composite action for reuse
   */
  registerAction(name: string, action: CompositeAction): void {
    this.actions.set(name, action);
  }

  /**
   * Set a secret for pipeline use
   */
  setSecret(name: string, value: string): void {
    this.secrets.set(name, value);
  }

  /**
   * Trigger a pipeline run
   */
  async triggerPipeline(
    pipelineId: string,
    trigger: string,
    inputs?: Record<string, unknown>
  ): Promise<PipelineRun> {
    const config = this.pipelines.get(pipelineId);
    if (!config) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    const run: PipelineRun = {
      id: this.generateRunId(),
      pipelineId,
      status: 'queued',
      startedAt: new Date(),
      jobs: [],
      trigger,
      sha: inputs?.sha as string,
      branch: inputs?.branch as string,
    };

    this.runs.set(run.id, run);

    // Execute pipeline asynchronously
    this.executePipeline(run, config, inputs).catch((error) => {
      run.status = 'failed';
      run.conclusion = 'failure';
      run.completedAt = new Date();
      console.error(`Pipeline ${pipelineId} failed:`, error);
    });

    return run;
  }

  /**
   * Get pipeline run status
   */
  getRunStatus(runId: string): PipelineRun | undefined {
    return this.runs.get(runId);
  }

  /**
   * Cancel a running pipeline
   */
  async cancelRun(runId: string): Promise<boolean> {
    const run = this.runs.get(runId);
    if (!run || run.status === 'completed') {
      return false;
    }

    run.status = 'cancelled';
    run.conclusion = 'cancelled';
    run.completedAt = new Date();
    return true;
  }

  /**
   * Create reusable workflow configuration
   */
  createReusableWorkflow(
    name: string,
    inputs: Record<string, InputConfig>,
    secrets: Record<string, SecretConfig>,
    jobs: Record<string, JobConfig>
  ): PipelineConfig {
    return {
      name,
      on: {
        workflow_call: { inputs, secrets },
      },
      jobs,
    };
  }

  /**
   * Generate workflow YAML
   */
  toYAML(pipelineId: string): string {
    const config = this.pipelines.get(pipelineId);
    if (!config) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    return this.serializeToYAML(config);
  }

  private async executePipeline(
    run: PipelineRun,
    config: PipelineConfig,
    inputs?: Record<string, unknown>
  ): Promise<void> {
    run.status = 'in_progress';

    const jobOrder = this.topologicalSort(config.jobs);
    const jobOutputs: Map<string, Record<string, string>> = new Map();

    for (const jobId of jobOrder) {
      const jobConfig = config.jobs[jobId];

      // Check job condition
      if (jobConfig.if && !this.evaluateCondition(jobConfig.if, { inputs, jobs: Object.fromEntries(jobOutputs) })) {
        continue;
      }

      // Check dependencies
      const needs = Array.isArray(jobConfig.needs) ? jobConfig.needs : jobConfig.needs ? [jobConfig.needs] : [];
      const dependenciesMet = needs.every((dep) => {
        const depJob = run.jobs.find((j) => j.name === dep);
        return depJob?.conclusion === 'success';
      });

      if (!dependenciesMet && needs.length > 0) {
        continue;
      }

      const jobRun = await this.executeJob(jobId, jobConfig, config.env, inputs);
      run.jobs.push(jobRun);
      jobOutputs.set(jobId, jobRun.outputs);

      if (jobRun.conclusion === 'failure' && !jobConfig.continue_on_error) {
        run.status = 'failed';
        run.conclusion = 'failure';
        run.completedAt = new Date();
        return;
      }
    }

    run.status = 'completed';
    run.conclusion = run.jobs.every((j) => j.conclusion === 'success' || j.conclusion === 'skipped')
      ? 'success'
      : 'failure';
    run.completedAt = new Date();
  }

  private async executeJob(
    jobId: string,
    config: JobConfig,
    pipelineEnv?: Record<string, string>,
    inputs?: Record<string, unknown>
  ): Promise<JobRun> {
    const jobRun: JobRun = {
      id: this.generateRunId(),
      name: config.name || jobId,
      status: 'in_progress',
      startedAt: new Date(),
      steps: [],
      outputs: {},
    };

    const env = { ...pipelineEnv, ...config.env };

    // Handle matrix strategy
    const matrices = config.strategy?.matrix ? this.expandMatrix(config.strategy.matrix) : [{}];

    for (const matrix of matrices) {
      for (const stepConfig of config.steps) {
        const stepRun = await this.executeStep(stepConfig, env, inputs, matrix);
        jobRun.steps.push(stepRun);

        if (stepRun.conclusion === 'failure' && !stepConfig.continue_on_error) {
          jobRun.status = 'failed';
          jobRun.conclusion = 'failure';
          jobRun.completedAt = new Date();
          return jobRun;
        }

        // Extract outputs
        if (stepConfig.id && stepRun.output) {
          // Parse output format: name=value
          const outputLines = stepRun.output.split('\n');
          for (const line of outputLines) {
            const match = line.match(/^::set-output name=(\w+)::(.*)$/);
            if (match) {
              jobRun.outputs[`${stepConfig.id}.${match[1]}`] = match[2];
            }
          }
        }
      }
    }

    jobRun.status = 'completed';
    jobRun.conclusion = 'success';
    jobRun.completedAt = new Date();
    return jobRun;
  }

  private async executeStep(
    config: StepConfig,
    env: Record<string, string>,
    inputs?: Record<string, unknown>,
    matrix?: Record<string, unknown>
  ): Promise<StepRun> {
    const stepRun: StepRun = {
      name: config.name || config.uses || 'Run',
      status: 'running',
      startedAt: new Date(),
    };

    try {
      // Check step condition
      if (config.if && !this.evaluateCondition(config.if, { inputs, matrix, env })) {
        stepRun.status = 'skipped';
        stepRun.conclusion = 'skipped';
        stepRun.completedAt = new Date();
        return stepRun;
      }

      if (config.uses) {
        // Execute action
        const action = this.actions.get(config.uses);
        if (action) {
          stepRun.output = await this.executeCompositeAction(action, config.with, env);
        } else {
          // Simulate external action
          stepRun.output = `Executed action: ${config.uses}`;
        }
      } else if (config.run) {
        // Execute shell command (simulated)
        stepRun.output = `Executed: ${config.run}`;
      }

      stepRun.status = 'completed';
      stepRun.conclusion = 'success';
    } catch (error) {
      stepRun.status = 'failed';
      stepRun.conclusion = 'failure';
      stepRun.output = error instanceof Error ? error.message : String(error);
    }

    stepRun.completedAt = new Date();
    return stepRun;
  }

  private async executeCompositeAction(
    action: CompositeAction,
    inputs?: Record<string, unknown>,
    env?: Record<string, string>
  ): Promise<string> {
    const outputs: string[] = [];

    for (const step of action.runs.steps) {
      // Substitute inputs in run command
      let command = step.run || '';
      if (inputs) {
        for (const [key, value] of Object.entries(inputs)) {
          command = command.replace(new RegExp(`\\$\\{\\{ inputs\\.${key} \\}\\}`, 'g'), String(value));
        }
      }
      outputs.push(`Step: ${step.name || 'unnamed'} - ${command}`);
    }

    return outputs.join('\n');
  }

  private validatePipeline(config: PipelineConfig): void {
    if (!config.name) {
      throw new Error('Pipeline name is required');
    }
    if (!config.jobs || Object.keys(config.jobs).length === 0) {
      throw new Error('At least one job is required');
    }
  }

  private topologicalSort(jobs: Record<string, JobConfig>): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (jobId: string) => {
      if (visited.has(jobId)) return;
      if (visiting.has(jobId)) {
        throw new Error(`Circular dependency detected at job: ${jobId}`);
      }

      visiting.add(jobId);
      const job = jobs[jobId];
      const needs = Array.isArray(job.needs) ? job.needs : job.needs ? [job.needs] : [];

      for (const dep of needs) {
        visit(dep);
      }

      visiting.delete(jobId);
      visited.add(jobId);
      sorted.push(jobId);
    };

    for (const jobId of Object.keys(jobs)) {
      visit(jobId);
    }

    return sorted;
  }

  private expandMatrix(matrix: Record<string, unknown[]>): Record<string, unknown>[] {
    const keys = Object.keys(matrix);
    if (keys.length === 0) return [{}];

    const result: Record<string, unknown>[] = [];
    const expand = (index: number, current: Record<string, unknown>) => {
      if (index === keys.length) {
        result.push({ ...current });
        return;
      }

      const key = keys[index];
      for (const value of matrix[key]) {
        current[key] = value;
        expand(index + 1, current);
      }
    };

    expand(0, {});
    return result;
  }

  private evaluateCondition(
    condition: string,
    context: Record<string, unknown>
  ): boolean {
    // Simple condition evaluation
    if (condition === 'always()') return true;
    if (condition === 'failure()') return false;
    if (condition === 'success()') return true;

    // Check for simple equality
    const match = condition.match(/\$\{\{\s*(\w+)\.(\w+)\s*==\s*'(\w+)'\s*\}\}/);
    if (match) {
      const [, obj, prop, value] = match;
      const ctx = context[obj] as Record<string, unknown>;
      return ctx?.[prop] === value;
    }

    return true;
  }

  private serializeToYAML(config: PipelineConfig, indent = 0): string {
    const lines: string[] = [];
    const pad = '  '.repeat(indent);

    lines.push(`${pad}name: ${config.name}`);
    lines.push(`${pad}on:`);

    if (config.on.push) {
      lines.push(`${pad}  push:`);
      if (config.on.push.branches) {
        lines.push(`${pad}    branches: [${config.on.push.branches.join(', ')}]`);
      }
    }

    if (config.on.pull_request) {
      lines.push(`${pad}  pull_request:`);
      if (config.on.pull_request.branches) {
        lines.push(`${pad}    branches: [${config.on.pull_request.branches.join(', ')}]`);
      }
    }

    lines.push(`${pad}jobs:`);
    for (const [jobId, job] of Object.entries(config.jobs)) {
      lines.push(`${pad}  ${jobId}:`);
      lines.push(`${pad}    runs-on: ${Array.isArray(job['runs-on']) ? job['runs-on'].join(', ') : job['runs-on']}`);
      if (job.needs) {
        lines.push(`${pad}    needs: ${Array.isArray(job.needs) ? `[${job.needs.join(', ')}]` : job.needs}`);
      }
      lines.push(`${pad}    steps:`);
      for (const step of job.steps) {
        if (step.name) lines.push(`${pad}      - name: ${step.name}`);
        if (step.uses) lines.push(`${pad}        uses: ${step.uses}`);
        if (step.run) lines.push(`${pad}        run: ${step.run}`);
      }
    }

    return lines.join('\n');
  }

  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface CompositeAction {
  name: string;
  description: string;
  inputs?: Record<string, InputConfig>;
  outputs?: Record<string, { description: string; value: string }>;
  runs: {
    using: 'composite';
    steps: StepConfig[];
  };
}

// ============================================================================
// GITOPS CONTROLLER
// ============================================================================

/**
 * ArgoCD/Flux-style GitOps Controller
 *
 * Implements declarative GitOps with automatic sync, health monitoring,
 * and drift detection. ArgoCD holds 50% market share (2025).
 *
 * Based on: ArgoCD, Flux CD, CNCF GitOps principles
 */
export class GitOpsController {
  private applications: Map<string, GitOpsApplication> = new Map();
  private syncs: Map<string, GitOpsSync[]> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register a GitOps application
   */
  registerApplication(app: GitOpsApplication): void {
    this.applications.set(app.name, {
      ...app,
      healthStatus: 'Unknown',
      syncStatus: 'Unknown',
    });
  }

  /**
   * Sync application to desired state
   */
  async syncApplication(
    appName: string,
    revision?: string,
    prune = false
  ): Promise<GitOpsSync> {
    const app = this.applications.get(appName);
    if (!app) {
      throw new Error(`Application not found: ${appName}`);
    }

    const sync: GitOpsSync = {
      applicationName: appName,
      revision: revision || app.source.targetRevision,
      status: 'Unknown',
      startedAt: new Date(),
      resources: [],
    };

    try {
      // Simulate fetching manifests from Git
      const manifests = await this.fetchManifests(app.source);

      // Apply resources
      for (const manifest of manifests) {
        const resourceSync: ResourceSync = {
          kind: manifest.kind,
          name: manifest.metadata.name,
          namespace: manifest.metadata.namespace,
          status: 'Synced',
          health: 'Healthy',
        };
        sync.resources.push(resourceSync);
      }

      sync.status = 'Synced';
      app.syncStatus = 'Synced';
      app.healthStatus = 'Healthy';
    } catch (error) {
      sync.status = 'OutOfSync';
      app.syncStatus = 'OutOfSync';
      app.healthStatus = 'Degraded';
    }

    sync.finishedAt = new Date();

    // Store sync history
    const history = this.syncs.get(appName) || [];
    history.push(sync);
    this.syncs.set(appName, history);

    return sync;
  }

  /**
   * Enable automated sync for application
   */
  enableAutoSync(appName: string, intervalMs = 180000): void {
    const app = this.applications.get(appName);
    if (!app) {
      throw new Error(`Application not found: ${appName}`);
    }

    // Clear existing interval
    const existing = this.syncIntervals.get(appName);
    if (existing) {
      clearInterval(existing);
    }

    // Update sync policy
    app.syncPolicy = {
      ...app.syncPolicy,
      automated: {
        ...app.syncPolicy?.automated,
        selfHeal: true,
        prune: true,
      },
    };

    // Start sync interval
    const interval = setInterval(async () => {
      const status = await this.checkDrift(appName);
      if (status === 'OutOfSync') {
        await this.syncApplication(appName);
      }
    }, intervalMs);

    this.syncIntervals.set(appName, interval);
  }

  /**
   * Disable automated sync
   */
  disableAutoSync(appName: string): void {
    const interval = this.syncIntervals.get(appName);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(appName);
    }

    const app = this.applications.get(appName);
    if (app?.syncPolicy?.automated) {
      app.syncPolicy.automated = undefined;
    }
  }

  /**
   * Check for drift between desired and live state
   */
  async checkDrift(appName: string): Promise<SyncStatus> {
    const app = this.applications.get(appName);
    if (!app) {
      throw new Error(`Application not found: ${appName}`);
    }

    // Simulate drift detection
    const desiredManifests = await this.fetchManifests(app.source);
    const liveManifests = await this.getLiveState(app.destination);

    const hasDrift = this.compareManifests(desiredManifests, liveManifests);

    app.syncStatus = hasDrift ? 'OutOfSync' : 'Synced';
    return app.syncStatus;
  }

  /**
   * Get application health status
   */
  getHealth(appName: string): HealthStatus {
    const app = this.applications.get(appName);
    return app?.healthStatus || 'Unknown';
  }

  /**
   * Get sync history
   */
  getSyncHistory(appName: string): GitOpsSync[] {
    return this.syncs.get(appName) || [];
  }

  /**
   * Rollback to previous revision
   */
  async rollback(appName: string, revision: string): Promise<GitOpsSync> {
    return this.syncApplication(appName, revision);
  }

  /**
   * Get application status
   */
  getApplicationStatus(appName: string): GitOpsApplication | undefined {
    return this.applications.get(appName);
  }

  /**
   * List all applications
   */
  listApplications(): GitOpsApplication[] {
    return Array.from(this.applications.values());
  }

  private async fetchManifests(source: GitOpsSource): Promise<KubernetesManifest[]> {
    // Simulate fetching from Git repo
    return [
      {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name: 'ring-api', namespace: source.path },
        spec: {},
      },
      {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: 'ring-api-svc', namespace: source.path },
        spec: {},
      },
    ];
  }

  private async getLiveState(destination: GitOpsDestination): Promise<KubernetesManifest[]> {
    // Simulate getting live state from cluster
    return [];
  }

  private compareManifests(
    desired: KubernetesManifest[],
    live: KubernetesManifest[]
  ): boolean {
    // Simple comparison - in real implementation would do deep diff
    return desired.length !== live.length;
  }
}

interface KubernetesManifest {
  apiVersion: string;
  kind: string;
  metadata: { name: string; namespace?: string };
  spec: Record<string, unknown>;
}

// ============================================================================
// FEATURE FLAG MANAGER
// ============================================================================

/**
 * LaunchDarkly/Unleash-style Feature Flag Manager
 *
 * Implements progressive rollouts, targeting rules, and A/B testing.
 * LaunchDarkly serves 5,500+ enterprises including quarter of Fortune 500.
 *
 * Based on: LaunchDarkly, Unleash, feature flag best practices 2025
 */
export class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private evaluations: Map<string, FlagEvaluation[]> = new Map();

  /**
   * Create a new feature flag
   */
  createFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): FeatureFlag {
    const now = new Date();
    const fullFlag: FeatureFlag = {
      ...flag,
      createdAt: now,
      updatedAt: now,
    };

    this.flags.set(flag.key, fullFlag);
    return fullFlag;
  }

  /**
   * Evaluate a feature flag for a context
   */
  evaluate(flagKey: string, context: EvaluationContext, defaultValue?: unknown): FlagEvaluation {
    const flag = this.flags.get(flagKey);

    if (!flag) {
      return {
        flagKey,
        value: defaultValue,
        variationId: 'default',
        reason: { kind: 'ERROR', errorKind: 'FLAG_NOT_FOUND' },
      };
    }

    // Check if flag is enabled
    if (!flag.enabled) {
      const variation = flag.variations.find((v) => v.id === flag.defaultVariation);
      return {
        flagKey,
        value: variation?.value ?? defaultValue,
        variationId: flag.defaultVariation,
        reason: { kind: 'OFF' },
      };
    }

    // Check prerequisites
    for (const prereq of flag.prerequisites || []) {
      const prereqResult = this.evaluate(prereq.flagKey, context);
      if (prereqResult.variationId !== prereq.variation) {
        return {
          flagKey,
          value: flag.variations.find((v) => v.id === flag.defaultVariation)?.value,
          variationId: flag.defaultVariation,
          reason: { kind: 'PREREQUISITE_FAILED', prerequisiteKey: prereq.flagKey },
        };
      }
    }

    // Evaluate targeting rules
    for (let i = 0; i < flag.rules.length; i++) {
      const rule = flag.rules[i];
      if (this.evaluateRule(rule, context)) {
        // Handle rule rollout
        if (rule.rollout) {
          const variationId = this.selectRolloutVariation(rule.rollout, context.key);
          const variation = flag.variations.find((v) => v.id === variationId);
          return {
            flagKey,
            value: variation?.value,
            variationId,
            reason: { kind: 'RULE_MATCH', ruleId: rule.id },
            ruleIndex: i,
          };
        }

        const variation = flag.variations.find((v) => v.id === rule.variation);
        return {
          flagKey,
          value: variation?.value,
          variationId: rule.variation,
          reason: { kind: 'RULE_MATCH', ruleId: rule.id },
          ruleIndex: i,
        };
      }
    }

    // Check percentage rollout
    if (flag.percentageRollout) {
      const variationId = this.selectRolloutVariation(flag.percentageRollout, context.key);
      const variation = flag.variations.find((v) => v.id === variationId);
      return {
        flagKey,
        value: variation?.value,
        variationId,
        reason: { kind: 'FALLTHROUGH' },
      };
    }

    // Return default variation
    const defaultVar = flag.variations.find((v) => v.id === flag.defaultVariation);
    const result: FlagEvaluation = {
      flagKey,
      value: defaultVar?.value,
      variationId: flag.defaultVariation,
      reason: { kind: 'FALLTHROUGH' },
    };

    // Store evaluation
    const history = this.evaluations.get(flagKey) || [];
    history.push(result);
    this.evaluations.set(flagKey, history);

    return result;
  }

  /**
   * Update flag targeting rules
   */
  updateRules(flagKey: string, rules: TargetingRule[]): void {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      throw new Error(`Flag not found: ${flagKey}`);
    }

    flag.rules = rules;
    flag.updatedAt = new Date();
  }

  /**
   * Update percentage rollout
   */
  updateRollout(flagKey: string, rollout: PercentageRollout): void {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      throw new Error(`Flag not found: ${flagKey}`);
    }

    flag.percentageRollout = rollout;
    flag.updatedAt = new Date();
  }

  /**
   * Toggle flag on/off
   */
  toggleFlag(flagKey: string, enabled: boolean): void {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      throw new Error(`Flag not found: ${flagKey}`);
    }

    flag.enabled = enabled;
    flag.updatedAt = new Date();
  }

  /**
   * Get flag evaluation statistics
   */
  getStats(flagKey: string): { total: number; byVariation: Record<string, number> } {
    const history = this.evaluations.get(flagKey) || [];
    const byVariation: Record<string, number> = {};

    for (const eval_ of history) {
      byVariation[eval_.variationId] = (byVariation[eval_.variationId] || 0) + 1;
    }

    return { total: history.length, byVariation };
  }

  /**
   * Progressive rollout helper
   */
  progressiveRollout(
    flagKey: string,
    stages: { percentage: number; durationMs: number }[]
  ): void {
    let currentStage = 0;

    const advance = () => {
      if (currentStage >= stages.length) return;

      const stage = stages[currentStage];
      this.updateRollout(flagKey, {
        variations: [
          { variation: 'enabled', weight: stage.percentage },
          { variation: 'disabled', weight: 100 - stage.percentage },
        ],
      });

      currentStage++;
      if (currentStage < stages.length) {
        setTimeout(advance, stage.durationMs);
      }
    };

    advance();
  }

  /**
   * Get all flags
   */
  listFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  private evaluateRule(rule: TargetingRule, context: EvaluationContext): boolean {
    return rule.clauses.every((clause) => this.evaluateClause(clause, context));
  }

  private evaluateClause(clause: RuleClause, context: EvaluationContext): boolean {
    const value = context.attributes?.[clause.attribute] ?? context[clause.attribute as keyof EvaluationContext];

    let result: boolean;
    switch (clause.op) {
      case 'in':
        result = clause.values.includes(value);
        break;
      case 'notIn':
        result = !clause.values.includes(value);
        break;
      case 'contains':
        result = typeof value === 'string' && clause.values.some((v) => value.includes(String(v)));
        break;
      case 'startsWith':
        result = typeof value === 'string' && clause.values.some((v) => value.startsWith(String(v)));
        break;
      case 'endsWith':
        result = typeof value === 'string' && clause.values.some((v) => value.endsWith(String(v)));
        break;
      case 'matches':
        result = typeof value === 'string' && clause.values.some((v) => new RegExp(String(v)).test(value));
        break;
      case 'lessThan':
        result = typeof value === 'number' && clause.values.some((v) => value < Number(v));
        break;
      case 'greaterThan':
        result = typeof value === 'number' && clause.values.some((v) => value > Number(v));
        break;
      default:
        result = false;
    }

    return clause.negate ? !result : result;
  }

  private selectRolloutVariation(rollout: PercentageRollout, key: string): string {
    const hash = this.hashKey(key, rollout.seed);
    const bucket = hash % 100;

    let cumulative = 0;
    for (const { variation, weight } of rollout.variations) {
      cumulative += weight;
      if (bucket < cumulative) {
        return variation;
      }
    }

    return rollout.variations[rollout.variations.length - 1].variation;
  }

  private hashKey(key: string, seed?: number): number {
    let hash = seed || 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// ============================================================================
// DEPLOYMENT STRATEGY MANAGER
// ============================================================================

/**
 * Deployment Strategy Manager
 *
 * Implements Blue-Green, Canary, Rolling, and A/B testing strategies
 * with health checks, automatic rollback, and traffic management.
 *
 * Based on: Harness, Argo Rollouts, 2025 deployment best practices
 */
export class DeploymentStrategyManager {
  private deployments: Map<string, Deployment> = new Map();
  private healthCheckers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new deployment
   */
  async createDeployment(config: DeploymentConfig): Promise<Deployment> {
    const deployment: Deployment = {
      id: `deploy_${Date.now()}`,
      config,
      status: {
        phase: 'Pending',
        replicas: { desired: config.replicas, ready: 0, available: 0, updated: 0 },
        currentVersion: config.version,
        conditions: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [],
    };

    this.deployments.set(config.name, deployment);

    // Execute deployment strategy
    await this.executeStrategy(deployment);

    return deployment;
  }

  /**
   * Update deployment with new version
   */
  async updateDeployment(name: string, newVersion: string, newImage: string): Promise<Deployment> {
    const deployment = this.deployments.get(name);
    if (!deployment) {
      throw new Error(`Deployment not found: ${name}`);
    }

    // Store current version in history
    deployment.history.push({
      revision: deployment.history.length + 1,
      version: deployment.config.version,
      image: deployment.config.image,
      createdAt: new Date(),
    });

    // Update config
    deployment.status.previousVersion = deployment.config.version;
    deployment.config.version = newVersion;
    deployment.config.image = newImage;
    deployment.updatedAt = new Date();

    // Execute strategy for update
    await this.executeStrategy(deployment);

    return deployment;
  }

  /**
   * Rollback to previous version
   */
  async rollback(name: string, revision?: number): Promise<Deployment> {
    const deployment = this.deployments.get(name);
    if (!deployment) {
      throw new Error(`Deployment not found: ${name}`);
    }

    const targetRevision = revision
      ? deployment.history.find((h) => h.revision === revision)
      : deployment.history[deployment.history.length - 1];

    if (!targetRevision) {
      throw new Error('No revision to rollback to');
    }

    return this.updateDeployment(name, targetRevision.version, targetRevision.image);
  }

  /**
   * Pause deployment (for canary/blue-green)
   */
  pauseDeployment(name: string): void {
    const deployment = this.deployments.get(name);
    if (deployment) {
      deployment.status.phase = 'Paused';
      deployment.updatedAt = new Date();
    }
  }

  /**
   * Resume paused deployment
   */
  async resumeDeployment(name: string): Promise<void> {
    const deployment = this.deployments.get(name);
    if (deployment && deployment.status.phase === 'Paused') {
      await this.executeStrategy(deployment);
    }
  }

  /**
   * Promote canary to full traffic
   */
  async promoteCanary(name: string): Promise<void> {
    const deployment = this.deployments.get(name);
    if (!deployment || deployment.config.strategy !== 'canary') {
      throw new Error('Not a canary deployment');
    }

    deployment.status.canaryWeight = 100;
    deployment.status.phase = 'Healthy';
    deployment.status.replicas.ready = deployment.config.replicas;
    deployment.status.replicas.available = deployment.config.replicas;
    deployment.updatedAt = new Date();
  }

  /**
   * Switch blue-green environments
   */
  async switchBlueGreen(name: string): Promise<void> {
    const deployment = this.deployments.get(name);
    if (!deployment || deployment.config.strategy !== 'blue-green') {
      throw new Error('Not a blue-green deployment');
    }

    deployment.status.blueGreenActive =
      deployment.status.blueGreenActive === 'blue' ? 'green' : 'blue';
    deployment.updatedAt = new Date();
  }

  /**
   * Get deployment status
   */
  getStatus(name: string): DeploymentStatus | undefined {
    return this.deployments.get(name)?.status;
  }

  /**
   * Get deployment history
   */
  getHistory(name: string): DeploymentRevision[] {
    return this.deployments.get(name)?.history || [];
  }

  private async executeStrategy(deployment: Deployment): Promise<void> {
    deployment.status.phase = 'Progressing';

    switch (deployment.config.strategy) {
      case 'rolling':
        await this.executeRolling(deployment);
        break;
      case 'blue-green':
        await this.executeBlueGreen(deployment);
        break;
      case 'canary':
        await this.executeCanary(deployment);
        break;
      case 'recreate':
        await this.executeRecreate(deployment);
        break;
      case 'a-b-testing':
        await this.executeABTesting(deployment);
        break;
    }
  }

  private async executeRolling(deployment: Deployment): Promise<void> {
    const { replicas } = deployment.config;
    const maxSurge = this.parseRolloutParam(deployment.config.rollout?.maxSurge, replicas, 1);
    const maxUnavailable = this.parseRolloutParam(deployment.config.rollout?.maxUnavailable, replicas, 0);

    // Simulate rolling update
    for (let i = 0; i < replicas; i += maxSurge) {
      const batch = Math.min(maxSurge, replicas - i);
      deployment.status.replicas.updated += batch;
      await this.simulateHealthCheck(deployment);
      deployment.status.replicas.ready += batch;
      deployment.status.replicas.available += batch;
    }

    deployment.status.phase = 'Healthy';
    deployment.status.currentVersion = deployment.config.version;
  }

  private async executeBlueGreen(deployment: Deployment): Promise<void> {
    const blueGreen = deployment.config.rollout?.blueGreen;

    // Deploy to preview environment
    deployment.status.blueGreenActive = deployment.status.blueGreenActive === 'blue' ? 'green' : 'blue';
    deployment.status.replicas.updated = deployment.config.replicas;

    // Run pre-promotion analysis
    if (blueGreen?.prePromotionAnalysis) {
      const analysisResult = await this.runAnalysis(blueGreen.prePromotionAnalysis);
      if (!analysisResult) {
        deployment.status.phase = 'Failed';
        return;
      }
    }

    // Auto-promote if enabled
    if (blueGreen?.autoPromotionEnabled) {
      await new Promise((resolve) =>
        setTimeout(resolve, (blueGreen.autoPromotionSeconds || 30) * 1000)
      );
    } else {
      deployment.status.phase = 'Paused';
      return;
    }

    // Switch traffic
    deployment.status.replicas.ready = deployment.config.replicas;
    deployment.status.replicas.available = deployment.config.replicas;
    deployment.status.phase = 'Healthy';
  }

  private async executeCanary(deployment: Deployment): Promise<void> {
    const canary = deployment.config.rollout?.canary;
    if (!canary?.steps) {
      deployment.status.phase = 'Failed';
      return;
    }

    for (const step of canary.steps) {
      if (step.setWeight !== undefined) {
        deployment.status.canaryWeight = step.setWeight;
        deployment.status.replicas.updated = Math.ceil(
          (deployment.config.replicas * step.setWeight) / 100
        );
      }

      if (step.pause) {
        if (step.pause.duration) {
          const ms = this.parseDuration(step.pause.duration);
          await new Promise((resolve) => setTimeout(resolve, ms));
        } else {
          deployment.status.phase = 'Paused';
          return;
        }
      }

      if (step.analysis) {
        const analysisResult = await this.runAnalysis(step.analysis);
        if (!analysisResult) {
          // Rollback on analysis failure
          deployment.status.phase = 'Failed';
          return;
        }
      }

      await this.simulateHealthCheck(deployment);
    }

    // Promote to 100%
    deployment.status.canaryWeight = 100;
    deployment.status.replicas.ready = deployment.config.replicas;
    deployment.status.replicas.available = deployment.config.replicas;
    deployment.status.phase = 'Healthy';
  }

  private async executeRecreate(deployment: Deployment): Promise<void> {
    // Scale down old version
    deployment.status.replicas.ready = 0;
    deployment.status.replicas.available = 0;

    // Scale up new version
    deployment.status.replicas.updated = deployment.config.replicas;
    await this.simulateHealthCheck(deployment);

    deployment.status.replicas.ready = deployment.config.replicas;
    deployment.status.replicas.available = deployment.config.replicas;
    deployment.status.phase = 'Healthy';
  }

  private async executeABTesting(deployment: Deployment): Promise<void> {
    // A/B testing uses feature flags for traffic splitting
    deployment.status.canaryWeight = 50; // Default 50/50 split
    deployment.status.replicas.updated = deployment.config.replicas;
    deployment.status.replicas.ready = deployment.config.replicas;
    deployment.status.replicas.available = deployment.config.replicas;
    deployment.status.phase = 'Healthy';
  }

  private parseRolloutParam(
    param: string | number | undefined,
    total: number,
    defaultValue: number
  ): number {
    if (param === undefined) return defaultValue;
    if (typeof param === 'number') return param;
    if (param.endsWith('%')) {
      return Math.ceil((total * parseInt(param)) / 100);
    }
    return parseInt(param) || defaultValue;
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(s|m|h)$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    switch (match[2]) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      default: return 0;
    }
  }

  private async simulateHealthCheck(deployment: Deployment): Promise<boolean> {
    // Simulate health check delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    return true;
  }

  private async runAnalysis(config: AnalysisConfig): Promise<boolean> {
    // Simulate analysis
    await new Promise((resolve) => setTimeout(resolve, 100));
    return true;
  }
}

// ============================================================================
// INFRASTRUCTURE AS CODE ENGINE
// ============================================================================

/**
 * Terraform/Pulumi-style Infrastructure as Code Engine
 *
 * Implements declarative infrastructure management with planning,
 * state management, and multi-cloud support.
 *
 * Based on: Terraform, Pulumi, IaC best practices 2025
 */
export class IaCEngine {
  private stacks: Map<string, IaCStack> = new Map();
  private states: Map<string, IaCState> = new Map();

  /**
   * Define an infrastructure stack
   */
  defineStack(stack: IaCStack): void {
    this.stacks.set(stack.name, stack);
  }

  /**
   * Plan infrastructure changes
   */
  plan(stackName: string): IaCPlan {
    const stack = this.stacks.get(stackName);
    if (!stack) {
      throw new Error(`Stack not found: ${stackName}`);
    }

    const currentState = this.states.get(stackName);
    const operations: IaCOperation[] = [];

    // Compare desired state with current state
    for (const resource of stack.resources) {
      const stateResource = currentState?.resources.find(
        (r) => r.type === resource.type && r.name === resource.name
      );

      if (!stateResource) {
        operations.push({
          action: 'create',
          resourceType: resource.type,
          resourceName: resource.name,
        });
      } else {
        const changes = this.detectChanges(resource.properties, stateResource.attributes);
        if (changes.length > 0) {
          operations.push({
            action: 'update',
            resourceType: resource.type,
            resourceName: resource.name,
            changes,
          });
        }
      }
    }

    // Check for deletions
    if (currentState) {
      for (const stateResource of currentState.resources) {
        const exists = stack.resources.find(
          (r) => r.type === stateResource.type && r.name === stateResource.name
        );
        if (!exists) {
          operations.push({
            action: 'delete',
            resourceType: stateResource.type,
            resourceName: stateResource.name,
          });
        }
      }
    }

    return {
      stackName,
      operations,
      summary: {
        add: operations.filter((o) => o.action === 'create').length,
        change: operations.filter((o) => o.action === 'update').length,
        destroy: operations.filter((o) => o.action === 'delete').length,
      },
      createdAt: new Date(),
    };
  }

  /**
   * Apply infrastructure changes
   */
  async apply(stackName: string): Promise<IaCState> {
    const stack = this.stacks.get(stackName);
    if (!stack) {
      throw new Error(`Stack not found: ${stackName}`);
    }

    const plan = this.plan(stackName);
    const currentState = this.states.get(stackName) || {
      version: 1,
      stackName,
      resources: [],
      outputs: {},
      lastUpdated: new Date(),
    };

    // Apply operations in dependency order
    const sortedOperations = this.sortByDependencies(plan.operations, stack);

    for (const operation of sortedOperations) {
      switch (operation.action) {
        case 'create':
          await this.createResource(operation, stack, currentState);
          break;
        case 'update':
          await this.updateResource(operation, stack, currentState);
          break;
        case 'delete':
          await this.deleteResource(operation, currentState);
          break;
      }
    }

    // Update outputs
    for (const [key, output] of Object.entries(stack.outputs)) {
      currentState.outputs[key] = output.value;
    }

    currentState.lastUpdated = new Date();
    this.states.set(stackName, currentState);

    return currentState;
  }

  /**
   * Destroy all resources in stack
   */
  async destroy(stackName: string): Promise<void> {
    const state = this.states.get(stackName);
    if (!state) return;

    // Delete in reverse dependency order
    const reversedResources = [...state.resources].reverse();

    for (const resource of reversedResources) {
      console.log(`Destroying ${resource.type}:${resource.name}`);
    }

    this.states.delete(stackName);
  }

  /**
   * Get current state
   */
  getState(stackName: string): IaCState | undefined {
    return this.states.get(stackName);
  }

  /**
   * Import existing resource
   */
  import(
    stackName: string,
    resourceType: string,
    resourceName: string,
    id: string,
    attributes: Record<string, unknown>
  ): void {
    const state = this.states.get(stackName) || {
      version: 1,
      stackName,
      resources: [],
      outputs: {},
      lastUpdated: new Date(),
    };

    state.resources.push({
      type: resourceType,
      name: resourceName,
      id,
      attributes,
      dependencies: [],
    });

    this.states.set(stackName, state);
  }

  /**
   * Generate Terraform HCL
   */
  toTerraform(stackName: string): string {
    const stack = this.stacks.get(stackName);
    if (!stack) {
      throw new Error(`Stack not found: ${stackName}`);
    }

    const lines: string[] = [];

    // Provider block
    lines.push('terraform {');
    lines.push('  required_providers {');
    lines.push('    aws = {');
    lines.push('      source  = "hashicorp/aws"');
    lines.push('      version = "~> 5.0"');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('');

    // Resources
    for (const resource of stack.resources) {
      lines.push(`resource "${resource.type}" "${resource.name}" {`);
      for (const [key, value] of Object.entries(resource.properties)) {
        lines.push(`  ${key} = ${JSON.stringify(value)}`);
      }
      lines.push('}');
      lines.push('');
    }

    // Outputs
    for (const [key, output] of Object.entries(stack.outputs)) {
      lines.push(`output "${key}" {`);
      lines.push(`  value = ${JSON.stringify(output.value)}`);
      if (output.description) {
        lines.push(`  description = "${output.description}"`);
      }
      if (output.sensitive) {
        lines.push('  sensitive = true');
      }
      lines.push('}');
      lines.push('');
    }

    return lines.join('\n');
  }

  private detectChanges(
    desired: Record<string, unknown>,
    current: Record<string, unknown>
  ): { attribute: string; before: unknown; after: unknown }[] {
    const changes: { attribute: string; before: unknown; after: unknown }[] = [];

    for (const [key, value] of Object.entries(desired)) {
      if (JSON.stringify(current[key]) !== JSON.stringify(value)) {
        changes.push({
          attribute: key,
          before: current[key],
          after: value,
        });
      }
    }

    return changes;
  }

  private sortByDependencies(operations: IaCOperation[], stack: IaCStack): IaCOperation[] {
    // Simple topological sort based on resource dependencies
    const sorted: IaCOperation[] = [];
    const visited = new Set<string>();

    const visit = (resourceName: string) => {
      if (visited.has(resourceName)) return;

      const resource = stack.resources.find((r) => r.name === resourceName);
      if (resource?.dependsOn) {
        for (const dep of resource.dependsOn) {
          visit(dep);
        }
      }

      visited.add(resourceName);
      const op = operations.find((o) => o.resourceName === resourceName);
      if (op) sorted.push(op);
    };

    for (const op of operations) {
      visit(op.resourceName);
    }

    return sorted;
  }

  private async createResource(
    operation: IaCOperation,
    stack: IaCStack,
    state: IaCState
  ): Promise<void> {
    const resource = stack.resources.find(
      (r) => r.type === operation.resourceType && r.name === operation.resourceName
    );
    if (!resource) return;

    // Simulate resource creation
    const id = `${resource.type}_${Date.now()}`;

    state.resources.push({
      type: resource.type,
      name: resource.name,
      id,
      attributes: resource.properties,
      dependencies: resource.dependsOn || [],
    });
  }

  private async updateResource(
    operation: IaCOperation,
    stack: IaCStack,
    state: IaCState
  ): Promise<void> {
    const resource = stack.resources.find(
      (r) => r.type === operation.resourceType && r.name === operation.resourceName
    );
    const stateResource = state.resources.find(
      (r) => r.type === operation.resourceType && r.name === operation.resourceName
    );

    if (resource && stateResource) {
      stateResource.attributes = { ...stateResource.attributes, ...resource.properties };
    }
  }

  private async deleteResource(operation: IaCOperation, state: IaCState): Promise<void> {
    const index = state.resources.findIndex(
      (r) => r.type === operation.resourceType && r.name === operation.resourceName
    );
    if (index !== -1) {
      state.resources.splice(index, 1);
    }
  }
}

// ============================================================================
// CONTAINER REGISTRY MANAGER
// ============================================================================

/**
 * Container Registry Manager
 *
 * Manages Docker images across registries with vulnerability scanning,
 * retention policies, and attestations.
 *
 * Based on: GitHub Container Registry, Docker Hub, Harbor
 */
export class ContainerRegistryManager {
  private registries: Map<string, RegistryConfig> = new Map();
  private images: Map<string, ContainerImage[]> = new Map();

  /**
   * Register a container registry
   */
  registerRegistry(name: string, config: RegistryConfig): void {
    this.registries.set(name, config);
  }

  /**
   * Push an image to registry
   */
  async pushImage(
    registryName: string,
    image: Omit<ContainerImage, 'created'>
  ): Promise<ContainerImage> {
    const registry = this.registries.get(registryName);
    if (!registry) {
      throw new Error(`Registry not found: ${registryName}`);
    }

    const fullImage: ContainerImage = {
      ...image,
      created: new Date(),
    };

    // Add to registry storage
    const repoImages = this.images.get(image.repository) || [];
    repoImages.push(fullImage);
    this.images.set(image.repository, repoImages);

    // Apply retention policy
    if (registry.retentionPolicy) {
      await this.applyRetentionPolicy(image.repository, registry.retentionPolicy);
    }

    return fullImage;
  }

  /**
   * Pull image metadata
   */
  async pullImage(repository: string, tag: string): Promise<ContainerImage | undefined> {
    const repoImages = this.images.get(repository);
    return repoImages?.find((i) => i.tag === tag);
  }

  /**
   * List images in repository
   */
  listImages(repository: string): ContainerImage[] {
    return this.images.get(repository) || [];
  }

  /**
   * Scan image for vulnerabilities
   */
  async scanImage(repository: string, tag: string): Promise<VulnerabilityScan> {
    const image = await this.pullImage(repository, tag);
    if (!image) {
      throw new Error(`Image not found: ${repository}:${tag}`);
    }

    // Simulate vulnerability scan
    const scan: VulnerabilityScan = {
      scanDate: new Date(),
      scanner: 'trivy',
      vulnerabilities: [
        {
          id: 'CVE-2024-1234',
          severity: 'high',
          package: 'openssl',
          version: '1.1.1',
          fixedVersion: '1.1.1k',
          description: 'Buffer overflow vulnerability',
        },
      ],
      summary: { critical: 0, high: 1, medium: 0, low: 0 },
    };

    image.vulnerabilities = scan;
    return scan;
  }

  /**
   * Add attestation to image
   */
  async addAttestation(
    repository: string,
    tag: string,
    attestation: Omit<ImageAttestation, 'createdAt'>
  ): Promise<void> {
    const image = await this.pullImage(repository, tag);
    if (!image) {
      throw new Error(`Image not found: ${repository}:${tag}`);
    }

    const fullAttestation: ImageAttestation = {
      ...attestation,
      createdAt: new Date(),
    };

    image.attestations = image.attestations || [];
    image.attestations.push(fullAttestation);
  }

  /**
   * Delete image tag
   */
  async deleteImage(repository: string, tag: string): Promise<boolean> {
    const repoImages = this.images.get(repository);
    if (!repoImages) return false;

    const index = repoImages.findIndex((i) => i.tag === tag);
    if (index === -1) return false;

    repoImages.splice(index, 1);
    return true;
  }

  /**
   * Apply retention policy
   */
  private async applyRetentionPolicy(
    repository: string,
    policy: RetentionPolicy
  ): Promise<void> {
    const repoImages = this.images.get(repository);
    if (!repoImages) return;

    let imagesToKeep = [...repoImages];

    // Exclude protected tags
    if (policy.excludeTags) {
      imagesToKeep = imagesToKeep.filter((i) =>
        !policy.excludeTags!.some((pattern) => new RegExp(pattern).test(i.tag))
      );
    }

    // Keep semver tags
    if (policy.keepSemver) {
      const semverPattern = /^v?\d+\.\d+\.\d+$/;
      imagesToKeep = imagesToKeep.filter((i) => semverPattern.test(i.tag));
    }

    // Keep last N images
    if (policy.keepLast) {
      imagesToKeep.sort((a, b) => (b.created?.getTime() || 0) - (a.created?.getTime() || 0));
      imagesToKeep = imagesToKeep.slice(0, policy.keepLast);
    }

    // Keep images within N days
    if (policy.keepDays) {
      const cutoff = Date.now() - policy.keepDays * 24 * 60 * 60 * 1000;
      imagesToKeep = imagesToKeep.filter((i) => (i.created?.getTime() || 0) >= cutoff);
    }

    this.images.set(repository, imagesToKeep);
  }
}

// ============================================================================
// ENVIRONMENT PROMOTION MANAGER
// ============================================================================

/**
 * Environment Promotion Manager
 *
 * Manages artifact promotion across environments with approvals,
 * protection rules, and audit trails.
 *
 * Based on: Octopus Deploy, GitOps practices, 2025 best practices
 */
export class EnvironmentPromotionManager {
  private environments: Map<string, Environment> = new Map();
  private promotions: Map<string, PromotionRequest> = new Map();
  private promotionOrder: string[] = [];

  /**
   * Register an environment
   */
  registerEnvironment(env: Environment): void {
    this.environments.set(env.name, env);
    this.updatePromotionOrder();
  }

  /**
   * Request promotion to next environment
   */
  async requestPromotion(
    artifact: string,
    version: string,
    fromEnv: string,
    toEnv: string,
    requestedBy: string,
    notes?: string
  ): Promise<PromotionRequest> {
    // Validate environments
    const from = this.environments.get(fromEnv);
    const to = this.environments.get(toEnv);

    if (!from || !to) {
      throw new Error('Invalid environment');
    }

    // Check promotion path
    if (!this.isValidPromotionPath(fromEnv, toEnv)) {
      throw new Error(`Cannot promote from ${fromEnv} to ${toEnv}`);
    }

    const request: PromotionRequest = {
      id: `promo_${Date.now()}`,
      artifact,
      version,
      fromEnvironment: fromEnv,
      toEnvironment: toEnv,
      status: 'pending',
      requestedBy,
      requestedAt: new Date(),
      approvals: [],
      notes,
    };

    this.promotions.set(request.id, request);

    // Auto-approve if no approvers required
    if (!to.approvers || to.approvers.length === 0) {
      request.status = 'approved';
      await this.executePromotion(request.id);
    }

    return request;
  }

  /**
   * Approve a promotion request
   */
  async approve(
    requestId: string,
    approver: string,
    comment?: string
  ): Promise<void> {
    const request = this.promotions.get(requestId);
    if (!request || request.status !== 'pending') {
      throw new Error('Invalid or already processed request');
    }

    const targetEnv = this.environments.get(request.toEnvironment);
    if (!targetEnv?.approvers?.includes(approver)) {
      throw new Error('Not authorized to approve');
    }

    request.approvals.push({
      approver,
      decision: 'approved',
      comment,
      timestamp: new Date(),
    });

    // Check if all approvals received
    const requiredApprovers = targetEnv.approvers || [];
    const approvedBy = request.approvals
      .filter((a) => a.decision === 'approved')
      .map((a) => a.approver);

    if (requiredApprovers.every((a) => approvedBy.includes(a))) {
      request.status = 'approved';
      await this.executePromotion(requestId);
    }
  }

  /**
   * Reject a promotion request
   */
  reject(requestId: string, rejector: string, reason: string): void {
    const request = this.promotions.get(requestId);
    if (!request || request.status !== 'pending') {
      throw new Error('Invalid or already processed request');
    }

    request.approvals.push({
      approver: rejector,
      decision: 'rejected',
      comment: reason,
      timestamp: new Date(),
    });

    request.status = 'rejected';
  }

  /**
   * Get promotion status
   */
  getPromotionStatus(requestId: string): PromotionRequest | undefined {
    return this.promotions.get(requestId);
  }

  /**
   * List pending promotions for environment
   */
  getPendingPromotions(envName: string): PromotionRequest[] {
    return Array.from(this.promotions.values()).filter(
      (p) => p.toEnvironment === envName && p.status === 'pending'
    );
  }

  /**
   * Get promotion history
   */
  getPromotionHistory(artifact?: string): PromotionRequest[] {
    const all = Array.from(this.promotions.values());
    return artifact ? all.filter((p) => p.artifact === artifact) : all;
  }

  /**
   * Get next environment in promotion chain
   */
  getNextEnvironment(currentEnv: string): string | undefined {
    const index = this.promotionOrder.indexOf(currentEnv);
    return index >= 0 && index < this.promotionOrder.length - 1
      ? this.promotionOrder[index + 1]
      : undefined;
  }

  private async executePromotion(requestId: string): Promise<void> {
    const request = this.promotions.get(requestId);
    if (!request) return;

    try {
      // Simulate deployment
      await new Promise((resolve) => setTimeout(resolve, 100));

      request.status = 'deployed';
      request.deployedAt = new Date();
    } catch {
      request.status = 'failed';
    }
  }

  private isValidPromotionPath(from: string, to: string): boolean {
    const fromIndex = this.promotionOrder.indexOf(from);
    const toIndex = this.promotionOrder.indexOf(to);
    return fromIndex >= 0 && toIndex >= 0 && toIndex === fromIndex + 1;
  }

  private updatePromotionOrder(): void {
    const tierOrder: Record<string, number> = {
      development: 0,
      staging: 1,
      production: 2,
    };

    this.promotionOrder = Array.from(this.environments.values())
      .sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier])
      .map((e) => e.name);
  }
}

// ============================================================================
// INTEGRATED DEVOPS PLATFORM
// ============================================================================

/**
 * Integrated DevOps Platform
 *
 * Unified platform combining CI/CD, GitOps, feature flags,
 * deployments, IaC, and environment management for Ring.
 */
export class IntegratedDevOpsPlatform {
  public readonly pipeline: CIPipelineEngine;
  public readonly gitops: GitOpsController;
  public readonly flags: FeatureFlagManager;
  public readonly deployment: DeploymentStrategyManager;
  public readonly iac: IaCEngine;
  public readonly registry: ContainerRegistryManager;
  public readonly promotion: EnvironmentPromotionManager;

  constructor() {
    this.pipeline = new CIPipelineEngine();
    this.gitops = new GitOpsController();
    this.flags = new FeatureFlagManager();
    this.deployment = new DeploymentStrategyManager();
    this.iac = new IaCEngine();
    this.registry = new ContainerRegistryManager();
    this.promotion = new EnvironmentPromotionManager();

    this.initializeRingDefaults();
  }

  /**
   * Initialize Ring-specific defaults
   */
  private initializeRingDefaults(): void {
    // Register CI pipeline
    this.pipeline.registerPipeline('ring-ci', {
      name: 'Ring CI/CD Pipeline',
      on: {
        push: { branches: ['main', 'develop'] },
        pull_request: { branches: ['main'] },
      },
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          steps: [
            { name: 'Checkout', uses: 'actions/checkout@v4' },
            { name: 'Setup Node', uses: 'actions/setup-node@v4', with: { 'node-version': '20' } },
            { name: 'Install', run: 'npm ci' },
            { name: 'Build', run: 'npm run build' },
            { name: 'Test', run: 'npm test' },
          ],
        },
        deploy: {
          'runs-on': 'ubuntu-latest',
          needs: 'build',
          if: "${{ github.ref == 'refs/heads/main' }}",
          environment: 'production',
          steps: [
            { name: 'Deploy', run: 'npm run deploy' },
          ],
        },
      },
    });

    // Register GitOps application
    this.gitops.registerApplication({
      name: 'ring-api',
      namespace: 'ring-system',
      source: {
        repoURL: 'https://github.com/ring/manifests',
        path: 'k8s/ring-api',
        targetRevision: 'main',
      },
      destination: {
        server: 'https://kubernetes.default.svc',
        namespace: 'ring-system',
      },
      syncPolicy: {
        automated: { prune: true, selfHeal: true },
      },
    });

    // Register feature flags
    this.flags.createFlag({
      key: 'ai-spam-detection-v2',
      name: 'AI Spam Detection V2',
      description: 'New ML-based spam detection algorithm',
      enabled: true,
      variations: [
        { id: 'enabled', value: true, name: 'Enabled' },
        { id: 'disabled', value: false, name: 'Disabled' },
      ],
      defaultVariation: 'disabled',
      rules: [],
      percentageRollout: {
        variations: [
          { variation: 'enabled', weight: 10 },
          { variation: 'disabled', weight: 90 },
        ],
      },
    });

    // Register environments
    this.promotion.registerEnvironment({
      name: 'development',
      tier: 'development',
      url: 'https://dev.ring.example.com',
    });

    this.promotion.registerEnvironment({
      name: 'staging',
      tier: 'staging',
      url: 'https://staging.ring.example.com',
      approvers: ['qa-team'],
    });

    this.promotion.registerEnvironment({
      name: 'production',
      tier: 'production',
      url: 'https://api.ring.example.com',
      approvers: ['release-manager', 'security-team'],
      protectionRules: [
        { type: 'required-reviewers', config: { count: 2 } },
        { type: 'wait-timer', config: { minutes: 15 } },
      ],
    });

    // Register container registry
    this.registry.registerRegistry('ghcr', {
      url: 'ghcr.io/ring',
      type: 'ghcr',
      retentionPolicy: {
        keepLast: 10,
        keepSemver: true,
        excludeTags: ['latest', 'stable'],
      },
    });
  }

  /**
   * Full deployment pipeline
   */
  async deployToEnvironment(
    artifact: string,
    version: string,
    environment: string,
    requestedBy: string
  ): Promise<{
    pipelineRun: PipelineRun;
    promotion?: PromotionRequest;
  }> {
    // Trigger CI pipeline
    const pipelineRun = await this.pipeline.triggerPipeline('ring-ci', 'manual', {
      artifact,
      version,
      environment,
    });

    // Wait for pipeline completion
    // (In real implementation, would use webhooks/polling)

    // Request promotion if not development
    let promotion: PromotionRequest | undefined;
    if (environment !== 'development') {
      const currentEnv = environment === 'production' ? 'staging' : 'development';
      promotion = await this.promotion.requestPromotion(
        artifact,
        version,
        currentEnv,
        environment,
        requestedBy
      );
    }

    return { pipelineRun, promotion };
  }

  /**
   * Get platform status
   */
  getStatus(): {
    pipelines: number;
    gitopsApps: number;
    featureFlags: number;
    deployments: number;
    environments: number;
  } {
    return {
      pipelines: 1, // Ring CI pipeline
      gitopsApps: this.gitops.listApplications().length,
      featureFlags: this.flags.listFlags().length,
      deployments: 0, // Would track active deployments
      environments: 3, // dev, staging, prod
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default IntegratedDevOpsPlatform;
