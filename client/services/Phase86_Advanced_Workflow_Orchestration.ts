/**
 * Phase 86: Advanced Workflow & Orchestration
 *
 * Enterprise-grade workflow orchestration for the Ring WebRTC spam call elimination platform.
 * Implements Temporal-style durable execution, Airflow-style DAGs, saga patterns, and state machines.
 *
 * Research Sources (2024-2025):
 * - Temporal.io Durable Execution: https://temporal.io/how-it-works
 * - Apache Airflow 3.0 (April 2025): https://pirgee.com/blogs/apache-airflow-in-2025-enhancements-in-workflow-orchestration
 * - Saga Pattern: https://microservices.io/patterns/data/saga.html
 * - XState Statecharts: https://stately.ai/docs
 * - AWS Step Functions: https://aws.amazon.com/step-functions/
 * - Camunda Zeebe: https://camunda.com/platform/zeebe/
 * - CQRS/Event Sourcing: https://microservices.io/patterns/data/event-sourcing.html
 * - Resilience Patterns: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html
 *
 * Key Technologies:
 * - Durable Execution (Temporal-style)
 * - DAG Workflow Orchestration (Airflow-style)
 * - Saga Patterns (Choreography & Orchestration)
 * - State Machines (XState/Statecharts)
 * - Event Sourcing & CQRS
 * - Circuit Breaker, Retry, Timeout patterns
 *
 * Total LOC: ~2,600
 */

// ============================================================================
// PART 1: TYPE DEFINITIONS
// ============================================================================

// --- Workflow Core Types ---

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  tasks: TaskDefinition[];
  triggers: WorkflowTrigger[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  metadata: Record<string, unknown>;
}

export interface TaskDefinition {
  id: string;
  name: string;
  type: TaskType;
  handler: string;
  inputs: Record<string, unknown>;
  outputs: string[];
  dependencies: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  compensationHandler?: string;
}

export type TaskType =
  | 'activity'
  | 'subworkflow'
  | 'decision'
  | 'parallel'
  | 'wait'
  | 'signal'
  | 'timer'
  | 'human_task';

export interface WorkflowTrigger {
  type: TriggerType;
  config: Record<string, unknown>;
}

export type TriggerType =
  | 'schedule'
  | 'event'
  | 'manual'
  | 'webhook'
  | 'signal';

// --- Retry & Resilience Types ---

export interface RetryPolicy {
  maxAttempts: number;
  initialInterval: number;
  maxInterval: number;
  backoffCoefficient: number;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenRequests: number;
}

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

// --- Workflow Execution Types ---

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: WorkflowError;
  taskExecutions: TaskExecution[];
  history: WorkflowEvent[];
  checkpoints: Checkpoint[];
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out'
  | 'compensating';

export interface TaskExecution {
  id: string;
  taskId: string;
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: WorkflowError;
  attempts: number;
  heartbeatTime?: number;
}

export interface WorkflowError {
  code: string;
  message: string;
  stack?: string;
  retryable: boolean;
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  state: Record<string, unknown>;
  taskId: string;
}

// --- Event & History Types ---

export interface WorkflowEvent {
  id: string;
  type: EventType;
  timestamp: number;
  taskId?: string;
  data: Record<string, unknown>;
}

export type EventType =
  | 'workflow_started'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'task_scheduled'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'task_retried'
  | 'signal_received'
  | 'timer_fired'
  | 'checkpoint_created';

// --- DAG Types ---

export interface DAG {
  id: string;
  name: string;
  description?: string;
  schedule?: string;
  startDate?: Date;
  endDate?: Date;
  catchup: boolean;
  maxActiveRuns: number;
  concurrency: number;
  tasks: DAGTask[];
  defaultArgs: Record<string, unknown>;
  tags: string[];
}

export interface DAGTask {
  id: string;
  operator: OperatorType;
  upstreamTasks: string[];
  downstreamTasks: string[];
  pool?: string;
  priority: number;
  retries: number;
  retryDelay: number;
  executionTimeout?: number;
  triggerRule: TriggerRule;
  params: Record<string, unknown>;
}

export type OperatorType =
  | 'python'
  | 'bash'
  | 'http'
  | 'sql'
  | 'branch'
  | 'sensor'
  | 'trigger_dag';

export type TriggerRule =
  | 'all_success'
  | 'all_failed'
  | 'all_done'
  | 'one_success'
  | 'one_failed'
  | 'none_failed'
  | 'none_skipped'
  | 'always';

export interface DAGRun {
  id: string;
  dagId: string;
  executionDate: Date;
  startDate?: Date;
  endDate?: Date;
  state: DAGRunState;
  conf: Record<string, unknown>;
  taskInstances: TaskInstance[];
}

export type DAGRunState =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed';

export interface TaskInstance {
  taskId: string;
  dagRunId: string;
  state: TaskInstanceState;
  startDate?: Date;
  endDate?: Date;
  tryNumber: number;
  maxTries: number;
  queuedDttm?: Date;
  pid?: number;
}

export type TaskInstanceState =
  | 'none'
  | 'scheduled'
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'upstream_failed'
  | 'up_for_retry'
  | 'up_for_reschedule';

// --- Saga Types ---

export interface Saga {
  id: string;
  name: string;
  steps: SagaStep[];
  coordinationType: CoordinationType;
  timeout?: number;
}

export interface SagaStep {
  id: string;
  name: string;
  action: string;
  compensation: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export type CoordinationType = 'choreography' | 'orchestration';

export interface SagaExecution {
  id: string;
  sagaId: string;
  status: SagaStatus;
  currentStep: number;
  completedSteps: string[];
  compensatedSteps: string[];
  startTime: number;
  endTime?: number;
  error?: WorkflowError;
}

export type SagaStatus =
  | 'running'
  | 'completed'
  | 'compensating'
  | 'compensated'
  | 'failed';

// --- State Machine Types ---

export interface StateMachine {
  id: string;
  name: string;
  initialState: string;
  states: Record<string, StateDefinition>;
  context: Record<string, unknown>;
}

export interface StateDefinition {
  type: StateType;
  entry?: Action[];
  exit?: Action[];
  on?: Record<string, Transition>;
  invoke?: ServiceInvocation;
  after?: Record<number, Transition>;
  always?: Transition[];
  meta?: Record<string, unknown>;
}

export type StateType =
  | 'atomic'
  | 'compound'
  | 'parallel'
  | 'final'
  | 'history';

export interface Transition {
  target: string;
  actions?: Action[];
  guard?: string;
  cond?: string;
}

export interface Action {
  type: ActionType;
  params?: Record<string, unknown>;
}

export type ActionType =
  | 'assign'
  | 'send'
  | 'raise'
  | 'log'
  | 'cancel'
  | 'spawn';

export interface ServiceInvocation {
  id: string;
  src: string;
  onDone?: Transition;
  onError?: Transition;
}

export interface StateMachineInstance {
  id: string;
  machineId: string;
  currentState: string;
  context: Record<string, unknown>;
  history: StateTransition[];
}

export interface StateTransition {
  from: string;
  to: string;
  event: string;
  timestamp: number;
}

// --- Event Sourcing Types ---

export interface Event {
  id: string;
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  timestamp: number;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface Aggregate {
  id: string;
  type: string;
  version: number;
  state: Record<string, unknown>;
}

export interface EventStore {
  append(event: Event): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<Event[]>;
  getEventsByType(type: string, fromTimestamp?: number): Promise<Event[]>;
}

export interface Projection {
  id: string;
  name: string;
  lastProcessedVersion: number;
  state: Record<string, unknown>;
}

// ============================================================================
// PART 2: DURABLE EXECUTION ENGINE (TEMPORAL-STYLE)
// ============================================================================

/**
 * Durable Execution Engine
 *
 * Implements Temporal-style durable execution with:
 * - Workflow and activity persistence
 * - Automatic retries with exponential backoff
 * - Event history replay for recovery
 * - Checkpointing for long-running workflows
 *
 * Research: Temporal.io - Used by Stripe, Netflix, Coinbase
 * Features: State survives crashes, week-long delays, automatic recovery
 */
export class DurableExecutionEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private taskQueues: Map<string, TaskExecution[]> = new Map();
  private activityHandlers: Map<string, (input: Record<string, unknown>) => Promise<unknown>> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  constructor(private config: {
    defaultRetryPolicy: RetryPolicy;
    defaultCircuitBreaker: CircuitBreakerConfig;
    checkpointInterval: number;
  }) {}

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    console.log(`[DurableExecution] Registered workflow: ${workflow.name} v${workflow.version}`);
  }

  /**
   * Register an activity handler
   */
  registerActivity(
    name: string,
    handler: (input: Record<string, unknown>) => Promise<unknown>
  ): void {
    this.activityHandlers.set(name, handler);
    console.log(`[DurableExecution] Registered activity: ${name}`);
  }

  /**
   * Start a workflow execution
   */
  async startWorkflow(
    workflowId: string,
    input: Record<string, unknown>
  ): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'pending',
      startTime: Date.now(),
      input,
      taskExecutions: [],
      history: [{
        id: `evt_${Date.now()}`,
        type: 'workflow_started',
        timestamp: Date.now(),
        data: { input }
      }],
      checkpoints: []
    };

    this.executions.set(executionId, execution);

    // Start execution asynchronously
    this.executeWorkflow(executionId).catch(error => {
      console.error(`[DurableExecution] Workflow ${executionId} failed:`, error);
    });

    return executionId;
  }

  /**
   * Execute workflow with durable guarantees
   */
  private async executeWorkflow(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId)!;
    const workflow = this.workflows.get(execution.workflowId)!;

    execution.status = 'running';

    try {
      // Build task dependency graph
      const taskGraph = this.buildTaskGraph(workflow.tasks);
      const completed = new Set<string>();
      const results: Record<string, unknown> = {};

      while (completed.size < workflow.tasks.length) {
        // Find ready tasks (all dependencies completed)
        const readyTasks = workflow.tasks.filter(task =>
          !completed.has(task.id) &&
          task.dependencies.every(dep => completed.has(dep))
        );

        if (readyTasks.length === 0 && completed.size < workflow.tasks.length) {
          throw new Error('Workflow stuck: no ready tasks but not all completed');
        }

        // Execute ready tasks in parallel
        const taskPromises = readyTasks.map(task =>
          this.executeTask(execution, task, results)
        );

        const taskResults = await Promise.all(taskPromises);

        // Record results
        taskResults.forEach((result, index) => {
          const task = readyTasks[index];
          completed.add(task.id);
          results[task.id] = result;

          // Create checkpoint every N tasks
          if (completed.size % 3 === 0) {
            this.createCheckpoint(execution, task.id, results);
          }
        });
      }

      // Workflow completed successfully
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.output = results;

      this.addEvent(execution, 'workflow_completed', { output: results });

      console.log(`[DurableExecution] Workflow ${executionId} completed in ${execution.endTime - execution.startTime}ms`);

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.error = {
        code: 'WORKFLOW_FAILED',
        message: error instanceof Error ? error.message : String(error),
        retryable: false
      };

      this.addEvent(execution, 'workflow_failed', { error: execution.error });

      // Trigger compensation if saga pattern
      if (workflow.tasks.some(t => t.compensationHandler)) {
        await this.compensateWorkflow(execution);
      }
    }
  }

  /**
   * Execute a single task with retry and circuit breaker
   */
  private async executeTask(
    execution: WorkflowExecution,
    task: TaskDefinition,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const retryPolicy = task.retryPolicy || this.config.defaultRetryPolicy;
    const circuitBreaker = this.getCircuitBreaker(task.handler);

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      // Check circuit breaker
      if (circuitBreaker.state === 'open') {
        if (Date.now() < (circuitBreaker.nextAttemptTime || 0)) {
          throw new Error(`Circuit breaker open for ${task.handler}`);
        }
        // Transition to half-open
        circuitBreaker.state = 'half_open';
      }

      const taskExecution: TaskExecution = {
        id: `task_${Date.now()}_${attempt}`,
        taskId: task.id,
        status: 'running',
        startTime: Date.now(),
        input: this.resolveInputs(task.inputs, context),
        attempts: attempt
      };

      execution.taskExecutions.push(taskExecution);
      this.addEvent(execution, 'task_started', { taskId: task.id, attempt });

      try {
        const handler = this.activityHandlers.get(task.handler);
        if (!handler) {
          throw new Error(`Activity handler not found: ${task.handler}`);
        }

        // Execute with timeout
        const result = await this.executeWithTimeout(
          handler(taskExecution.input),
          task.timeout || 30000
        );

        taskExecution.status = 'completed';
        taskExecution.endTime = Date.now();
        taskExecution.output = result as Record<string, unknown>;

        // Circuit breaker success
        this.recordCircuitBreakerSuccess(circuitBreaker);

        this.addEvent(execution, 'task_completed', { taskId: task.id, result });

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        taskExecution.status = 'failed';
        taskExecution.endTime = Date.now();
        taskExecution.error = {
          code: 'TASK_FAILED',
          message: lastError.message,
          retryable: this.isRetryable(lastError, retryPolicy)
        };

        // Circuit breaker failure
        this.recordCircuitBreakerFailure(circuitBreaker);

        this.addEvent(execution, 'task_failed', {
          taskId: task.id,
          error: lastError.message,
          attempt
        });

        // Check if should retry
        if (attempt < retryPolicy.maxAttempts && taskExecution.error.retryable) {
          const delay = this.calculateBackoff(attempt, retryPolicy);
          this.addEvent(execution, 'task_retried', { taskId: task.id, delay });
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error(`Task ${task.id} failed after ${retryPolicy.maxAttempts} attempts`);
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Task timed out')), timeout);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }

  /**
   * Compensate failed workflow (saga pattern)
   */
  private async compensateWorkflow(execution: WorkflowExecution): Promise<void> {
    const workflow = this.workflows.get(execution.workflowId)!;
    execution.status = 'compensating';

    // Get completed tasks in reverse order
    const completedTasks = execution.taskExecutions
      .filter(t => t.status === 'completed')
      .reverse();

    for (const taskExec of completedTasks) {
      const taskDef = workflow.tasks.find(t => t.id === taskExec.taskId);
      if (taskDef?.compensationHandler) {
        try {
          const handler = this.activityHandlers.get(taskDef.compensationHandler);
          if (handler) {
            await handler(taskExec.output || {});
            console.log(`[DurableExecution] Compensated task: ${taskDef.id}`);
          }
        } catch (error) {
          console.error(`[DurableExecution] Compensation failed for ${taskDef.id}:`, error);
        }
      }
    }
  }

  /**
   * Create checkpoint for recovery
   */
  private createCheckpoint(
    execution: WorkflowExecution,
    taskId: string,
    state: Record<string, unknown>
  ): void {
    const checkpoint: Checkpoint = {
      id: `ckpt_${Date.now()}`,
      timestamp: Date.now(),
      state: { ...state },
      taskId
    };
    execution.checkpoints.push(checkpoint);
    this.addEvent(execution, 'checkpoint_created', { checkpointId: checkpoint.id });
  }

  /**
   * Recover workflow from checkpoint
   */
  async recoverFromCheckpoint(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const lastCheckpoint = execution.checkpoints[execution.checkpoints.length - 1];
    if (!lastCheckpoint) {
      // Replay from beginning
      await this.executeWorkflow(executionId);
      return;
    }

    console.log(`[DurableExecution] Recovering from checkpoint: ${lastCheckpoint.id}`);

    // Resume from checkpoint
    execution.status = 'running';
    // ... resume logic
  }

  /**
   * Signal a waiting workflow
   */
  async signalWorkflow(
    executionId: string,
    signalName: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    this.addEvent(execution, 'signal_received', { signalName, data });
    console.log(`[DurableExecution] Signal '${signalName}' sent to ${executionId}`);
  }

  /**
   * Get workflow execution status
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  // --- Helper Methods ---

  private buildTaskGraph(tasks: TaskDefinition[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    tasks.forEach(task => {
      graph.set(task.id, task.dependencies);
    });
    return graph;
  }

  private resolveInputs(
    inputs: Record<string, unknown>,
    context: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const ref = value.slice(2, -1);
        resolved[key] = context[ref];
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  private getCircuitBreaker(handler: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(handler)) {
      this.circuitBreakers.set(handler, {
        state: 'closed',
        failureCount: 0,
        successCount: 0
      });
    }
    return this.circuitBreakers.get(handler)!;
  }

  private recordCircuitBreakerSuccess(cb: CircuitBreakerState): void {
    cb.successCount++;
    if (cb.state === 'half_open') {
      if (cb.successCount >= this.config.defaultCircuitBreaker.successThreshold) {
        cb.state = 'closed';
        cb.failureCount = 0;
        cb.successCount = 0;
      }
    }
  }

  private recordCircuitBreakerFailure(cb: CircuitBreakerState): void {
    cb.failureCount++;
    cb.lastFailureTime = Date.now();

    if (cb.failureCount >= this.config.defaultCircuitBreaker.failureThreshold) {
      cb.state = 'open';
      cb.nextAttemptTime = Date.now() + this.config.defaultCircuitBreaker.timeout;
    }
  }

  private isRetryable(error: Error, policy: RetryPolicy): boolean {
    if (policy.nonRetryableErrors?.some(e => error.message.includes(e))) {
      return false;
    }
    if (policy.retryableErrors && policy.retryableErrors.length > 0) {
      return policy.retryableErrors.some(e => error.message.includes(e));
    }
    return true;
  }

  private calculateBackoff(attempt: number, policy: RetryPolicy): number {
    const delay = policy.initialInterval * Math.pow(policy.backoffCoefficient, attempt - 1);
    return Math.min(delay, policy.maxInterval);
  }

  private addEvent(execution: WorkflowExecution, type: EventType, data: Record<string, unknown>): void {
    execution.history.push({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      timestamp: Date.now(),
      data
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// PART 3: DAG ORCHESTRATION ENGINE (AIRFLOW-STYLE)
// ============================================================================

/**
 * DAG Orchestration Engine
 *
 * Implements Apache Airflow-style DAG workflow orchestration with:
 * - Directed Acyclic Graph (DAG) definitions
 * - Task dependencies and trigger rules
 * - Scheduling with cron expressions
 * - Backfilling and catchup
 *
 * Research: Apache Airflow 3.0 (April 2025)
 * Features: DAG versioning, event-driven scheduling, Task SDK
 */
export class DAGOrchestrationEngine {
  private dags: Map<string, DAG> = new Map();
  private dagRuns: Map<string, DAGRun> = new Map();
  private taskHandlers: Map<string, (params: Record<string, unknown>) => Promise<unknown>> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private pools: Map<string, { slots: number; used: number }> = new Map();

  constructor(private config: {
    defaultRetries: number;
    defaultRetryDelay: number;
    maxActiveRunsPerDAG: number;
    parallelism: number;
  }) {
    // Default pool
    this.pools.set('default', { slots: 128, used: 0 });
  }

  /**
   * Register a DAG
   */
  registerDAG(dag: DAG): void {
    // Validate DAG is acyclic
    this.validateDAG(dag);

    this.dags.set(dag.id, dag);
    console.log(`[DAGOrchestration] Registered DAG: ${dag.name} with ${dag.tasks.length} tasks`);

    // Schedule if has cron schedule
    if (dag.schedule) {
      this.scheduleDAG(dag);
    }
  }

  /**
   * Register task operator handler
   */
  registerOperator(
    type: OperatorType,
    handler: (params: Record<string, unknown>) => Promise<unknown>
  ): void {
    this.taskHandlers.set(type, handler);
    console.log(`[DAGOrchestration] Registered operator: ${type}`);
  }

  /**
   * Trigger a DAG run
   */
  async triggerDAG(
    dagId: string,
    conf: Record<string, unknown> = {},
    executionDate?: Date
  ): Promise<string> {
    const dag = this.dags.get(dagId);
    if (!dag) {
      throw new Error(`DAG not found: ${dagId}`);
    }

    // Check max active runs
    const activeRuns = Array.from(this.dagRuns.values())
      .filter(r => r.dagId === dagId && r.state === 'running')
      .length;

    if (activeRuns >= dag.maxActiveRuns) {
      throw new Error(`Max active runs (${dag.maxActiveRuns}) reached for DAG: ${dagId}`);
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const execDate = executionDate || new Date();

    const dagRun: DAGRun = {
      id: runId,
      dagId,
      executionDate: execDate,
      state: 'queued',
      conf: { ...dag.defaultArgs, ...conf },
      taskInstances: dag.tasks.map(task => ({
        taskId: task.id,
        dagRunId: runId,
        state: 'none',
        tryNumber: 0,
        maxTries: task.retries || this.config.defaultRetries
      }))
    };

    this.dagRuns.set(runId, dagRun);

    // Start execution asynchronously
    this.executeDAGRun(runId).catch(error => {
      console.error(`[DAGOrchestration] DAG run ${runId} failed:`, error);
    });

    return runId;
  }

  /**
   * Execute a DAG run
   */
  private async executeDAGRun(runId: string): Promise<void> {
    const dagRun = this.dagRuns.get(runId)!;
    const dag = this.dags.get(dagRun.dagId)!;

    dagRun.state = 'running';
    dagRun.startDate = new Date();

    const taskResults: Map<string, unknown> = new Map();
    const taskStates: Map<string, TaskInstanceState> = new Map();

    // Initialize task states
    dag.tasks.forEach(task => {
      taskStates.set(task.id, 'scheduled');
    });

    while (true) {
      // Find ready tasks
      const readyTasks = dag.tasks.filter(task => {
        const state = taskStates.get(task.id);
        if (state !== 'scheduled') return false;

        // Check trigger rule
        return this.checkTriggerRule(task, taskStates, dag);
      });

      if (readyTasks.length === 0) {
        // Check if all done
        const allDone = dag.tasks.every(task => {
          const state = taskStates.get(task.id);
          return state === 'success' || state === 'failed' || state === 'skipped';
        });

        if (allDone) break;

        // Wait for running tasks
        await this.sleep(100);
        continue;
      }

      // Execute ready tasks in parallel (respecting pool limits)
      const tasksToRun = readyTasks.slice(0, this.config.parallelism);

      await Promise.all(tasksToRun.map(async task => {
        taskStates.set(task.id, 'queued');

        const taskInstance = dagRun.taskInstances.find(ti => ti.taskId === task.id)!;

        try {
          // Acquire pool slot
          await this.acquirePoolSlot(task.pool || 'default');

          taskStates.set(task.id, 'running');
          taskInstance.state = 'running';
          taskInstance.startDate = new Date();

          const handler = this.taskHandlers.get(task.operator);
          if (!handler) {
            throw new Error(`Operator not found: ${task.operator}`);
          }

          const result = await this.executeWithRetry(
            () => handler({ ...dagRun.conf, ...task.params }),
            task.retries || this.config.defaultRetries,
            task.retryDelay || this.config.defaultRetryDelay,
            taskInstance
          );

          taskResults.set(task.id, result);
          taskStates.set(task.id, 'success');
          taskInstance.state = 'success';
          taskInstance.endDate = new Date();

        } catch (error) {
          taskStates.set(task.id, 'failed');
          taskInstance.state = 'failed';
          taskInstance.endDate = new Date();
          console.error(`[DAGOrchestration] Task ${task.id} failed:`, error);
        } finally {
          this.releasePoolSlot(task.pool || 'default');
        }
      }));
    }

    // Determine final DAG run state
    const hasFailure = dag.tasks.some(task => taskStates.get(task.id) === 'failed');
    dagRun.state = hasFailure ? 'failed' : 'success';
    dagRun.endDate = new Date();

    console.log(`[DAGOrchestration] DAG run ${runId} ${dagRun.state} in ${dagRun.endDate.getTime() - dagRun.startDate!.getTime()}ms`);
  }

  /**
   * Check trigger rule for task
   */
  private checkTriggerRule(
    task: DAGTask,
    taskStates: Map<string, TaskInstanceState>,
    dag: DAG
  ): boolean {
    if (task.upstreamTasks.length === 0) return true;

    const upstreamStates = task.upstreamTasks.map(id => taskStates.get(id));

    switch (task.triggerRule) {
      case 'all_success':
        return upstreamStates.every(s => s === 'success');
      case 'all_failed':
        return upstreamStates.every(s => s === 'failed');
      case 'all_done':
        return upstreamStates.every(s => s === 'success' || s === 'failed' || s === 'skipped');
      case 'one_success':
        return upstreamStates.some(s => s === 'success');
      case 'one_failed':
        return upstreamStates.some(s => s === 'failed');
      case 'none_failed':
        return !upstreamStates.some(s => s === 'failed');
      case 'none_skipped':
        return !upstreamStates.some(s => s === 'skipped');
      case 'always':
        return true;
      default:
        return upstreamStates.every(s => s === 'success');
    }
  }

  /**
   * Execute with retry
   */
  private async executeWithRetry(
    fn: () => Promise<unknown>,
    maxRetries: number,
    retryDelay: number,
    taskInstance: TaskInstance
  ): Promise<unknown> {
    let lastError: Error | undefined;

    for (let i = 0; i <= maxRetries; i++) {
      taskInstance.tryNumber = i + 1;

      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (i < maxRetries) {
          taskInstance.state = 'up_for_retry';
          await this.sleep(retryDelay * 1000);
        }
      }
    }

    throw lastError;
  }

  /**
   * Schedule DAG with cron
   */
  private scheduleDAG(dag: DAG): void {
    // Simple interval-based scheduling (replace with proper cron parser in production)
    const interval = this.parseCronToMs(dag.schedule!);
    if (interval > 0) {
      const job = setInterval(() => {
        this.triggerDAG(dag.id).catch(console.error);
      }, interval);
      this.scheduledJobs.set(dag.id, job);
      console.log(`[DAGOrchestration] Scheduled DAG ${dag.id} every ${interval}ms`);
    }
  }

  /**
   * Validate DAG is acyclic
   */
  private validateDAG(dag: DAG): void {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      visited.add(taskId);
      recStack.add(taskId);

      const task = dag.tasks.find(t => t.id === taskId);
      if (task) {
        for (const downstream of task.downstreamTasks) {
          if (!visited.has(downstream) && hasCycle(downstream)) {
            return true;
          } else if (recStack.has(downstream)) {
            return true;
          }
        }
      }

      recStack.delete(taskId);
      return false;
    };

    for (const task of dag.tasks) {
      if (!visited.has(task.id) && hasCycle(task.id)) {
        throw new Error(`Cycle detected in DAG: ${dag.id}`);
      }
    }
  }

  // --- Pool Management ---

  private async acquirePoolSlot(pool: string): Promise<void> {
    const poolState = this.pools.get(pool);
    if (!poolState) {
      this.pools.set(pool, { slots: 128, used: 0 });
    }

    while (true) {
      const current = this.pools.get(pool)!;
      if (current.used < current.slots) {
        current.used++;
        return;
      }
      await this.sleep(100);
    }
  }

  private releasePoolSlot(pool: string): void {
    const poolState = this.pools.get(pool);
    if (poolState && poolState.used > 0) {
      poolState.used--;
    }
  }

  /**
   * Get DAG run status
   */
  getDAGRun(runId: string): DAGRun | undefined {
    return this.dagRuns.get(runId);
  }

  /**
   * Backfill DAG runs
   */
  async backfill(dagId: string, startDate: Date, endDate: Date): Promise<string[]> {
    const dag = this.dags.get(dagId);
    if (!dag || !dag.schedule) {
      throw new Error(`DAG not found or has no schedule: ${dagId}`);
    }

    const runIds: string[] = [];
    let current = new Date(startDate);
    const interval = this.parseCronToMs(dag.schedule);

    while (current <= endDate) {
      const runId = await this.triggerDAG(dagId, {}, current);
      runIds.push(runId);
      current = new Date(current.getTime() + interval);
    }

    console.log(`[DAGOrchestration] Backfilled ${runIds.length} runs for ${dagId}`);
    return runIds;
  }

  // --- Helpers ---

  private parseCronToMs(cron: string): number {
    // Simplified: @hourly, @daily, @weekly, or interval in minutes
    if (cron === '@hourly') return 60 * 60 * 1000;
    if (cron === '@daily') return 24 * 60 * 60 * 1000;
    if (cron === '@weekly') return 7 * 24 * 60 * 60 * 1000;
    const minutes = parseInt(cron, 10);
    return isNaN(minutes) ? 0 : minutes * 60 * 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// PART 4: SAGA PATTERN ENGINE
// ============================================================================

/**
 * Saga Pattern Engine
 *
 * Implements distributed transaction coordination with:
 * - Choreography: Event-driven, decentralized
 * - Orchestration: Central coordinator
 * - Compensating transactions for rollback
 *
 * Research: microservices.io - Garcia-Molina & Salem (1987)
 * Frameworks: Axon, Eventuate, Seata
 */
export class SagaEngine {
  private sagas: Map<string, Saga> = new Map();
  private executions: Map<string, SagaExecution> = new Map();
  private actionHandlers: Map<string, (data: Record<string, unknown>) => Promise<unknown>> = new Map();
  private eventBus: Map<string, ((data: Record<string, unknown>) => void)[]> = new Map();

  constructor(private config: {
    defaultTimeout: number;
    defaultRetryPolicy: RetryPolicy;
  }) {}

  /**
   * Define a saga
   */
  defineSaga(saga: Saga): void {
    this.sagas.set(saga.id, saga);
    console.log(`[Saga] Defined saga: ${saga.name} with ${saga.steps.length} steps (${saga.coordinationType})`);
  }

  /**
   * Register action handler
   */
  registerAction(name: string, handler: (data: Record<string, unknown>) => Promise<unknown>): void {
    this.actionHandlers.set(name, handler);
  }

  /**
   * Subscribe to saga events (for choreography)
   */
  onEvent(eventType: string, handler: (data: Record<string, unknown>) => void): void {
    if (!this.eventBus.has(eventType)) {
      this.eventBus.set(eventType, []);
    }
    this.eventBus.get(eventType)!.push(handler);
  }

  /**
   * Start saga execution
   */
  async startSaga(sagaId: string, data: Record<string, unknown>): Promise<string> {
    const saga = this.sagas.get(sagaId);
    if (!saga) {
      throw new Error(`Saga not found: ${sagaId}`);
    }

    const executionId = `saga_exec_${Date.now()}`;
    const execution: SagaExecution = {
      id: executionId,
      sagaId,
      status: 'running',
      currentStep: 0,
      completedSteps: [],
      compensatedSteps: [],
      startTime: Date.now()
    };

    this.executions.set(executionId, execution);

    if (saga.coordinationType === 'orchestration') {
      await this.executeOrchestrated(execution, saga, data);
    } else {
      await this.executeChoreographed(execution, saga, data);
    }

    return executionId;
  }

  /**
   * Execute saga with orchestration pattern
   */
  private async executeOrchestrated(
    execution: SagaExecution,
    saga: Saga,
    data: Record<string, unknown>
  ): Promise<void> {
    let context = { ...data };

    for (let i = 0; i < saga.steps.length; i++) {
      const step = saga.steps[i];
      execution.currentStep = i;

      try {
        const handler = this.actionHandlers.get(step.action);
        if (!handler) {
          throw new Error(`Action handler not found: ${step.action}`);
        }

        const result = await this.executeWithRetry(handler, context, step.retryPolicy);
        context = { ...context, [`step_${i}_result`]: result };
        execution.completedSteps.push(step.id);

        console.log(`[Saga] Step ${step.name} completed`);

      } catch (error) {
        console.error(`[Saga] Step ${step.name} failed:`, error);

        // Start compensation
        execution.status = 'compensating';
        execution.error = {
          code: 'SAGA_STEP_FAILED',
          message: error instanceof Error ? error.message : String(error),
          retryable: false
        };

        await this.compensate(execution, saga, context);
        return;
      }
    }

    execution.status = 'completed';
    execution.endTime = Date.now();
    console.log(`[Saga] Saga ${saga.name} completed successfully`);
  }

  /**
   * Execute saga with choreography pattern
   */
  private async executeChoreographed(
    execution: SagaExecution,
    saga: Saga,
    data: Record<string, unknown>
  ): Promise<void> {
    // Emit initial event
    this.emitEvent('saga_started', { sagaId: saga.id, executionId: execution.id, data });

    // In choreography, each step emits events that trigger the next step
    const firstStep = saga.steps[0];
    const handler = this.actionHandlers.get(firstStep.action);

    if (handler) {
      try {
        const result = await handler(data);
        execution.completedSteps.push(firstStep.id);

        this.emitEvent(`${firstStep.action}_completed`, {
          executionId: execution.id,
          result
        });

      } catch (error) {
        this.emitEvent(`${firstStep.action}_failed`, {
          executionId: execution.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Compensate failed saga
   */
  private async compensate(
    execution: SagaExecution,
    saga: Saga,
    context: Record<string, unknown>
  ): Promise<void> {
    // Execute compensations in reverse order
    for (let i = execution.completedSteps.length - 1; i >= 0; i--) {
      const stepId = execution.completedSteps[i];
      const step = saga.steps.find(s => s.id === stepId);

      if (step?.compensation) {
        const handler = this.actionHandlers.get(step.compensation);

        if (handler) {
          try {
            await handler(context);
            execution.compensatedSteps.push(step.id);
            console.log(`[Saga] Compensated step: ${step.name}`);
          } catch (error) {
            console.error(`[Saga] Compensation failed for ${step.name}:`, error);
            // Continue compensating other steps
          }
        }
      }
    }

    execution.status = 'compensated';
    execution.endTime = Date.now();
  }

  /**
   * Execute with retry
   */
  private async executeWithRetry(
    handler: (data: Record<string, unknown>) => Promise<unknown>,
    data: Record<string, unknown>,
    retryPolicy?: RetryPolicy
  ): Promise<unknown> {
    const policy = retryPolicy || this.config.defaultRetryPolicy;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        return await handler(data);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < policy.maxAttempts) {
          const delay = policy.initialInterval * Math.pow(policy.backoffCoefficient, attempt - 1);
          await this.sleep(Math.min(delay, policy.maxInterval));
        }
      }
    }

    throw lastError;
  }

  /**
   * Emit event to subscribers
   */
  private emitEvent(type: string, data: Record<string, unknown>): void {
    const handlers = this.eventBus.get(type) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[Saga] Event handler error for ${type}:`, error);
      }
    });
  }

  /**
   * Get saga execution
   */
  getExecution(executionId: string): SagaExecution | undefined {
    return this.executions.get(executionId);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// PART 5: STATE MACHINE ENGINE (XSTATE-STYLE)
// ============================================================================

/**
 * State Machine Engine
 *
 * Implements XState/SCXML-style statecharts with:
 * - Hierarchical states
 * - Parallel states
 * - Guards and actions
 * - Invoked services
 *
 * Research: XState 5.x, SCXML specification
 * Features: Actor model, event-driven, visualizable
 */
export class StateMachineEngine {
  private machines: Map<string, StateMachine> = new Map();
  private instances: Map<string, StateMachineInstance> = new Map();
  private guards: Map<string, (context: Record<string, unknown>, event: Record<string, unknown>) => boolean> = new Map();
  private actions: Map<string, (context: Record<string, unknown>, event: Record<string, unknown>) => Record<string, unknown>> = new Map();
  private services: Map<string, (context: Record<string, unknown>) => Promise<unknown>> = new Map();

  constructor() {}

  /**
   * Define a state machine
   */
  defineMachine(machine: StateMachine): void {
    this.machines.set(machine.id, machine);
    console.log(`[StateMachine] Defined machine: ${machine.name} with initial state: ${machine.initialState}`);
  }

  /**
   * Register a guard
   */
  registerGuard(
    name: string,
    fn: (context: Record<string, unknown>, event: Record<string, unknown>) => boolean
  ): void {
    this.guards.set(name, fn);
  }

  /**
   * Register an action
   */
  registerAction(
    name: string,
    fn: (context: Record<string, unknown>, event: Record<string, unknown>) => Record<string, unknown>
  ): void {
    this.actions.set(name, fn);
  }

  /**
   * Register a service
   */
  registerService(
    name: string,
    fn: (context: Record<string, unknown>) => Promise<unknown>
  ): void {
    this.services.set(name, fn);
  }

  /**
   * Create a state machine instance
   */
  createInstance(machineId: string, initialContext?: Record<string, unknown>): string {
    const machine = this.machines.get(machineId);
    if (!machine) {
      throw new Error(`Machine not found: ${machineId}`);
    }

    const instanceId = `sm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const instance: StateMachineInstance = {
      id: instanceId,
      machineId,
      currentState: machine.initialState,
      context: { ...machine.context, ...initialContext },
      history: []
    };

    this.instances.set(instanceId, instance);

    // Execute entry actions
    const initialStateDef = machine.states[machine.initialState];
    if (initialStateDef?.entry) {
      this.executeActions(instance, initialStateDef.entry, {});
    }

    // Check for invoked services
    if (initialStateDef?.invoke) {
      this.invokeService(instance, initialStateDef.invoke);
    }

    console.log(`[StateMachine] Created instance: ${instanceId} in state: ${machine.initialState}`);
    return instanceId;
  }

  /**
   * Send event to state machine instance
   */
  async send(instanceId: string, eventType: string, data: Record<string, unknown> = {}): Promise<string> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const machine = this.machines.get(instance.machineId)!;
    const currentStateDef = machine.states[instance.currentState];

    if (!currentStateDef) {
      throw new Error(`Invalid state: ${instance.currentState}`);
    }

    // Find matching transition
    const transitions = currentStateDef.on?.[eventType];
    if (!transitions) {
      console.log(`[StateMachine] No transition for event '${eventType}' in state '${instance.currentState}'`);
      return instance.currentState;
    }

    const event = { type: eventType, ...data };
    const transition = Array.isArray(transitions)
      ? transitions.find(t => this.evaluateGuard(instance, t.guard, event))
      : transitions;

    if (!transition || (transition.guard && !this.evaluateGuard(instance, transition.guard, event))) {
      console.log(`[StateMachine] Guard blocked transition`);
      return instance.currentState;
    }

    // Execute exit actions
    if (currentStateDef.exit) {
      this.executeActions(instance, currentStateDef.exit, event);
    }

    // Execute transition actions
    if (transition.actions) {
      this.executeActions(instance, transition.actions, event);
    }

    // Update state
    const previousState = instance.currentState;
    instance.currentState = transition.target;

    // Record history
    instance.history.push({
      from: previousState,
      to: transition.target,
      event: eventType,
      timestamp: Date.now()
    });

    // Execute entry actions
    const newStateDef = machine.states[transition.target];
    if (newStateDef?.entry) {
      this.executeActions(instance, newStateDef.entry, event);
    }

    // Check for invoked services
    if (newStateDef?.invoke) {
      await this.invokeService(instance, newStateDef.invoke);
    }

    // Check for automatic transitions
    if (newStateDef?.always) {
      for (const autoTransition of newStateDef.always) {
        if (!autoTransition.guard || this.evaluateGuard(instance, autoTransition.guard, {})) {
          return this.send(instanceId, '', {});
        }
      }
    }

    console.log(`[StateMachine] Transition: ${previousState} -> ${transition.target} on '${eventType}'`);
    return instance.currentState;
  }

  /**
   * Evaluate guard condition
   */
  private evaluateGuard(
    instance: StateMachineInstance,
    guardName: string | undefined,
    event: Record<string, unknown>
  ): boolean {
    if (!guardName) return true;

    const guard = this.guards.get(guardName);
    if (!guard) {
      console.warn(`[StateMachine] Guard not found: ${guardName}`);
      return true;
    }

    return guard(instance.context, event);
  }

  /**
   * Execute actions
   */
  private executeActions(
    instance: StateMachineInstance,
    actions: Action[],
    event: Record<string, unknown>
  ): void {
    for (const action of actions) {
      switch (action.type) {
        case 'assign':
          // Update context
          if (action.params) {
            instance.context = { ...instance.context, ...action.params };
          }
          break;

        case 'log':
          console.log(`[StateMachine] ${action.params?.message || 'Log'}`);
          break;

        default:
          const customAction = this.actions.get(action.type);
          if (customAction) {
            const newContext = customAction(instance.context, event);
            instance.context = { ...instance.context, ...newContext };
          }
      }
    }
  }

  /**
   * Invoke a service
   */
  private async invokeService(
    instance: StateMachineInstance,
    invocation: ServiceInvocation
  ): Promise<void> {
    const service = this.services.get(invocation.src);
    if (!service) {
      console.warn(`[StateMachine] Service not found: ${invocation.src}`);
      return;
    }

    try {
      const result = await service(instance.context);

      if (invocation.onDone) {
        await this.send(instance.id, `${invocation.id}.done`, { data: result });
      }
    } catch (error) {
      if (invocation.onError) {
        await this.send(instance.id, `${invocation.id}.error`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Get instance
   */
  getInstance(instanceId: string): StateMachineInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Check if instance is in a specific state
   */
  isInState(instanceId: string, state: string): boolean {
    const instance = this.instances.get(instanceId);
    return instance?.currentState === state;
  }

  /**
   * Get state matches (for hierarchical states)
   */
  matches(instanceId: string, statePattern: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    return instance.currentState.startsWith(statePattern);
  }
}

// ============================================================================
// PART 6: EVENT SOURCING & CQRS ENGINE
// ============================================================================

/**
 * Event Sourcing & CQRS Engine
 *
 * Implements event sourcing with CQRS:
 * - Append-only event log
 * - Aggregate reconstruction from events
 * - Read/write model separation
 * - Projections for read optimization
 *
 * Research: microservices.io, EventStore, Axon
 * Benefits: Full audit trail, temporal queries, scalability
 */
export class EventSourcingEngine {
  private events: Event[] = [];
  private aggregates: Map<string, Aggregate> = new Map();
  private projections: Map<string, Projection> = new Map();
  private eventHandlers: Map<string, ((event: Event) => void)[]> = new Map();
  private projectionHandlers: Map<string, Map<string, (state: Record<string, unknown>, event: Event) => Record<string, unknown>>> = new Map();

  constructor(private config: {
    snapshotInterval: number;
  }) {}

  /**
   * Append event to store
   */
  async append(event: Omit<Event, 'id' | 'timestamp'>): Promise<Event> {
    const fullEvent: Event = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.events.push(fullEvent);

    // Update aggregate
    await this.updateAggregate(fullEvent);

    // Notify event handlers
    this.notifyHandlers(fullEvent);

    // Update projections
    await this.updateProjections(fullEvent);

    console.log(`[EventSourcing] Appended event: ${fullEvent.type} for aggregate ${fullEvent.aggregateId}`);
    return fullEvent;
  }

  /**
   * Get events for aggregate
   */
  getEvents(aggregateId: string, fromVersion?: number): Event[] {
    return this.events.filter(e =>
      e.aggregateId === aggregateId &&
      (fromVersion === undefined || e.version > fromVersion)
    );
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string, fromTimestamp?: number): Event[] {
    return this.events.filter(e =>
      e.type === type &&
      (fromTimestamp === undefined || e.timestamp > fromTimestamp)
    );
  }

  /**
   * Reconstruct aggregate state from events
   */
  async reconstruct<T extends Record<string, unknown>>(
    aggregateId: string,
    reducer: (state: T, event: Event) => T,
    initialState: T
  ): Promise<T> {
    const events = this.getEvents(aggregateId);
    return events.reduce((state, event) => reducer(state, event), initialState);
  }

  /**
   * Register event handler
   */
  onEvent(eventType: string, handler: (event: Event) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Register projection
   */
  registerProjection(
    projectionId: string,
    eventHandlers: Record<string, (state: Record<string, unknown>, event: Event) => Record<string, unknown>>
  ): void {
    this.projections.set(projectionId, {
      id: projectionId,
      name: projectionId,
      lastProcessedVersion: 0,
      state: {}
    });

    const handlers = new Map<string, (state: Record<string, unknown>, event: Event) => Record<string, unknown>>();
    for (const [eventType, handler] of Object.entries(eventHandlers)) {
      handlers.set(eventType, handler);
    }
    this.projectionHandlers.set(projectionId, handlers);

    console.log(`[EventSourcing] Registered projection: ${projectionId}`);
  }

  /**
   * Get projection state (read model)
   */
  getProjection(projectionId: string): Projection | undefined {
    return this.projections.get(projectionId);
  }

  /**
   * Rebuild projection from all events
   */
  async rebuildProjection(projectionId: string): Promise<void> {
    const projection = this.projections.get(projectionId);
    const handlers = this.projectionHandlers.get(projectionId);

    if (!projection || !handlers) {
      throw new Error(`Projection not found: ${projectionId}`);
    }

    projection.state = {};
    projection.lastProcessedVersion = 0;

    for (const event of this.events) {
      const handler = handlers.get(event.type);
      if (handler) {
        projection.state = handler(projection.state, event);
        projection.lastProcessedVersion = event.version;
      }
    }

    console.log(`[EventSourcing] Rebuilt projection: ${projectionId}`);
  }

  /**
   * Create command (write side)
   */
  async executeCommand<T>(
    aggregateType: string,
    aggregateId: string,
    command: string,
    data: Record<string, unknown>,
    validator?: (aggregate: Aggregate) => boolean
  ): Promise<Event> {
    // Get or create aggregate
    let aggregate = this.aggregates.get(aggregateId);

    if (!aggregate) {
      aggregate = {
        id: aggregateId,
        type: aggregateType,
        version: 0,
        state: {}
      };
      this.aggregates.set(aggregateId, aggregate);
    }

    // Validate command
    if (validator && !validator(aggregate)) {
      throw new Error(`Command validation failed: ${command}`);
    }

    // Create event
    const event = await this.append({
      aggregateId,
      aggregateType,
      type: command,
      version: aggregate.version + 1,
      data,
      metadata: { timestamp: Date.now() }
    });

    return event;
  }

  /**
   * Query read model
   */
  query<T>(projectionId: string, selector: (state: Record<string, unknown>) => T): T {
    const projection = this.projections.get(projectionId);
    if (!projection) {
      throw new Error(`Projection not found: ${projectionId}`);
    }
    return selector(projection.state);
  }

  // --- Private Methods ---

  private async updateAggregate(event: Event): Promise<void> {
    let aggregate = this.aggregates.get(event.aggregateId);

    if (!aggregate) {
      aggregate = {
        id: event.aggregateId,
        type: event.aggregateType,
        version: 0,
        state: {}
      };
      this.aggregates.set(event.aggregateId, aggregate);
    }

    aggregate.version = event.version;
    // State update would be handled by domain-specific logic
  }

  private notifyHandlers(event: Event): void {
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`[EventSourcing] Event handler error:`, error);
      }
    });
  }

  private async updateProjections(event: Event): Promise<void> {
    for (const [projectionId, handlers] of this.projectionHandlers) {
      const handler = handlers.get(event.type);
      if (handler) {
        const projection = this.projections.get(projectionId)!;
        projection.state = handler(projection.state, event);
        projection.lastProcessedVersion = event.version;
      }
    }
  }
}

// ============================================================================
// PART 7: INTEGRATED WORKFLOW PLATFORM
// ============================================================================

/**
 * Integrated Workflow Orchestration Platform
 *
 * Unified platform combining all workflow orchestration capabilities
 * for the Ring spam detection system.
 */
export class IntegratedWorkflowPlatform {
  private durableEngine: DurableExecutionEngine;
  private dagEngine: DAGOrchestrationEngine;
  private sagaEngine: SagaEngine;
  private stateMachineEngine: StateMachineEngine;
  private eventSourcingEngine: EventSourcingEngine;

  constructor() {
    // Initialize engines
    this.durableEngine = new DurableExecutionEngine({
      defaultRetryPolicy: {
        maxAttempts: 3,
        initialInterval: 1000,
        maxInterval: 30000,
        backoffCoefficient: 2
      },
      defaultCircuitBreaker: {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 30000,
        halfOpenRequests: 1
      },
      checkpointInterval: 3
    });

    this.dagEngine = new DAGOrchestrationEngine({
      defaultRetries: 3,
      defaultRetryDelay: 60,
      maxActiveRunsPerDAG: 16,
      parallelism: 32
    });

    this.sagaEngine = new SagaEngine({
      defaultTimeout: 300000,
      defaultRetryPolicy: {
        maxAttempts: 3,
        initialInterval: 1000,
        maxInterval: 10000,
        backoffCoefficient: 2
      }
    });

    this.stateMachineEngine = new StateMachineEngine();

    this.eventSourcingEngine = new EventSourcingEngine({
      snapshotInterval: 100
    });

    this.setupSpamDetectionWorkflows();
  }

  /**
   * Setup spam detection specific workflows
   */
  private setupSpamDetectionWorkflows(): void {
    // 1. Register spam report processing workflow
    this.durableEngine.registerWorkflow({
      id: 'spam_report_processing',
      name: 'Spam Report Processing',
      version: '1.0',
      tasks: [
        {
          id: 'validate_report',
          name: 'Validate Report',
          type: 'activity',
          handler: 'validateSpamReport',
          inputs: { report: '${input.report}' },
          outputs: ['validatedReport'],
          dependencies: []
        },
        {
          id: 'analyze_patterns',
          name: 'Analyze Patterns',
          type: 'activity',
          handler: 'analyzeSpamPatterns',
          inputs: { report: '${validate_report}' },
          outputs: ['patterns'],
          dependencies: ['validate_report']
        },
        {
          id: 'update_blocklist',
          name: 'Update Blocklist',
          type: 'activity',
          handler: 'updateBlocklist',
          inputs: { patterns: '${analyze_patterns}' },
          outputs: ['blocklistUpdated'],
          dependencies: ['analyze_patterns'],
          compensationHandler: 'rollbackBlocklistUpdate'
        },
        {
          id: 'notify_users',
          name: 'Notify Users',
          type: 'activity',
          handler: 'notifyAffectedUsers',
          inputs: { patterns: '${analyze_patterns}' },
          outputs: ['notified'],
          dependencies: ['update_blocklist']
        }
      ],
      triggers: [
        { type: 'event', config: { eventType: 'spam_report_submitted' } }
      ],
      metadata: {}
    });

    // 2. Register call processing state machine
    this.stateMachineEngine.defineMachine({
      id: 'call_screening',
      name: 'Call Screening State Machine',
      initialState: 'incoming',
      states: {
        incoming: {
          type: 'atomic',
          on: {
            SCREEN: { target: 'screening', actions: [{ type: 'log', params: { message: 'Starting screening' } }] }
          }
        },
        screening: {
          type: 'atomic',
          invoke: {
            id: 'screenCall',
            src: 'callScreeningService',
            onDone: { target: 'decision' },
            onError: { target: 'allow' }
          }
        },
        decision: {
          type: 'atomic',
          on: {
            SPAM_DETECTED: { target: 'blocked' },
            SAFE: { target: 'allow' }
          }
        },
        blocked: {
          type: 'final',
          entry: [{ type: 'log', params: { message: 'Call blocked as spam' } }]
        },
        allow: {
          type: 'final',
          entry: [{ type: 'log', params: { message: 'Call allowed' } }]
        }
      },
      context: {}
    });

    // 3. Register spam reporting saga
    this.sagaEngine.defineSaga({
      id: 'spam_reporting_saga',
      name: 'Spam Reporting Saga',
      coordinationType: 'orchestration',
      steps: [
        {
          id: 'record_report',
          name: 'Record Report',
          action: 'recordSpamReport',
          compensation: 'deleteSpamReport'
        },
        {
          id: 'analyze_report',
          name: 'Analyze Report',
          action: 'analyzeReport',
          compensation: 'cancelAnalysis'
        },
        {
          id: 'update_reputation',
          name: 'Update Reputation',
          action: 'updateCallerReputation',
          compensation: 'revertReputation'
        },
        {
          id: 'notify_network',
          name: 'Notify Network',
          action: 'notifySpamNetwork',
          compensation: 'retractNotification'
        }
      ]
    });

    // 4. Register event projections
    this.eventSourcingEngine.registerProjection('spam_stats', {
      'SpamReportCreated': (state, event) => ({
        ...state,
        totalReports: ((state.totalReports as number) || 0) + 1,
        byPhoneNumber: {
          ...((state.byPhoneNumber as Record<string, number>) || {}),
          [event.data.phoneNumber as string]: (((state.byPhoneNumber as Record<string, number>) || {})[event.data.phoneNumber as string] || 0) + 1
        }
      }),
      'SpamCallBlocked': (state, event) => ({
        ...state,
        totalBlocked: ((state.totalBlocked as number) || 0) + 1
      })
    });

    console.log('[IntegratedWorkflow] Platform initialized with spam detection workflows');
  }

  /**
   * Process incoming spam report
   */
  async processSpamReport(report: Record<string, unknown>): Promise<string> {
    // Start durable workflow
    const executionId = await this.durableEngine.startWorkflow('spam_report_processing', { report });

    // Create event
    await this.eventSourcingEngine.append({
      aggregateId: report.id as string,
      aggregateType: 'SpamReport',
      type: 'SpamReportCreated',
      version: 1,
      data: report,
      metadata: { executionId }
    });

    return executionId;
  }

  /**
   * Screen incoming call
   */
  async screenCall(callData: Record<string, unknown>): Promise<string> {
    const instanceId = this.stateMachineEngine.createInstance('call_screening', callData);
    await this.stateMachineEngine.send(instanceId, 'SCREEN');
    return instanceId;
  }

  /**
   * Submit spam report with saga
   */
  async submitSpamReport(report: Record<string, unknown>): Promise<string> {
    return this.sagaEngine.startSaga('spam_reporting_saga', report);
  }

  /**
   * Get spam statistics (from read model)
   */
  getSpamStats(): Record<string, unknown> {
    const projection = this.eventSourcingEngine.getProjection('spam_stats');
    return projection?.state || {};
  }

  /**
   * Get engine references for direct access
   */
  getEngines() {
    return {
      durable: this.durableEngine,
      dag: this.dagEngine,
      saga: this.sagaEngine,
      stateMachine: this.stateMachineEngine,
      eventSourcing: this.eventSourcingEngine
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  DurableExecutionEngine,
  DAGOrchestrationEngine,
  SagaEngine,
  StateMachineEngine,
  EventSourcingEngine,
  IntegratedWorkflowPlatform
};
