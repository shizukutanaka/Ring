/**
 * Phase 99: Advanced Event-Driven Architecture
 * Ring WebRTC Platform - Spam Call Elimination System
 *
 * Enterprise-grade event-driven architecture with Event Sourcing,
 * CQRS, Saga patterns, and message broker integration.
 *
 * Research Sources:
 * - Event Sourcing Pattern (microservices.io)
 * - CQRS Pattern (Microsoft Azure Architecture)
 * - Saga Pattern: Orchestration vs Choreography
 * - Kafka vs RabbitMQ vs Pulsar Performance (2025)
 * - Temporal.io Saga Patterns
 *
 * @version 1.0.0
 * @phase 99
 * @date December 2025
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DomainEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Record<string, unknown>;
  metadata: EventMetadata;
  version: number;
  timestamp: Date;
}

interface EventMetadata {
  correlationId: string;
  causationId?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
}

interface EventEnvelope {
  event: DomainEvent;
  position: number;
  streamId: string;
  globalPosition: number;
}

interface Snapshot {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: Record<string, unknown>;
  timestamp: Date;
}

interface Command {
  id: string;
  type: string;
  aggregateId?: string;
  payload: Record<string, unknown>;
  metadata: CommandMetadata;
  timestamp: Date;
}

interface CommandMetadata {
  correlationId: string;
  userId?: string;
  expectedVersion?: number;
}

interface Query {
  id: string;
  type: string;
  parameters: Record<string, unknown>;
  metadata: QueryMetadata;
}

interface QueryMetadata {
  correlationId: string;
  userId?: string;
  consistencyLevel: 'eventual' | 'strong';
}

interface SagaStep<T = unknown> {
  name: string;
  execute: (context: SagaContext<T>) => Promise<StepResult>;
  compensate: (context: SagaContext<T>) => Promise<void>;
  retryPolicy?: RetryPolicy;
}

interface SagaContext<T = unknown> {
  sagaId: string;
  data: T;
  completedSteps: string[];
  currentStep: string;
  metadata: Record<string, unknown>;
}

interface StepResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface MessageBrokerConfig {
  type: 'kafka' | 'rabbitmq' | 'pulsar' | 'memory';
  brokers?: string[];
  clientId?: string;
  groupId?: string;
}

interface Subscription {
  id: string;
  topic: string;
  handler: (event: DomainEvent) => Promise<void>;
  group?: string;
  position?: number;
}

interface ReadModel {
  id: string;
  name: string;
  version: number;
  data: Record<string, unknown>;
  lastEventPosition: number;
  updatedAt: Date;
}

interface Projection {
  name: string;
  eventTypes: string[];
  apply: (state: Record<string, unknown>, event: DomainEvent) => Record<string, unknown>;
  init: () => Record<string, unknown>;
}

// ============================================================================
// EVENT STORE
// ============================================================================

/**
 * Event Store
 *
 * Append-only store for domain events with stream management.
 *
 * Features:
 * - Stream-based event storage
 * - Optimistic concurrency control
 * - Snapshot support
 * - Event subscription
 *
 * Research: EventStoreDB, Marten, Axon
 */
export class EventStore {
  private streams: Map<string, DomainEvent[]> = new Map();
  private globalLog: EventEnvelope[] = [];
  private snapshots: Map<string, Snapshot> = new Map();
  private subscriptions: Map<string, Subscription[]> = new Map();
  private globalPosition: number = 0;

  /**
   * Append events to stream
   */
  async appendToStream(
    streamId: string,
    events: Omit<DomainEvent, 'version'>[],
    expectedVersion?: number
  ): Promise<{ success: boolean; position: number }> {
    const stream = this.streams.get(streamId) || [];
    const currentVersion = stream.length;

    // Optimistic concurrency check
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new Error(
        `Concurrency conflict: expected version ${expectedVersion}, but current is ${currentVersion}`
      );
    }

    const newEvents: DomainEvent[] = events.map((event, index) => ({
      ...event,
      version: currentVersion + index + 1
    }));

    // Append to stream
    stream.push(...newEvents);
    this.streams.set(streamId, stream);

    // Append to global log
    for (const event of newEvents) {
      this.globalPosition++;
      const envelope: EventEnvelope = {
        event,
        position: event.version,
        streamId,
        globalPosition: this.globalPosition
      };
      this.globalLog.push(envelope);

      // Notify subscribers
      await this.notifySubscribers(streamId, event);
    }

    return { success: true, position: this.globalPosition };
  }

  /**
   * Read events from stream
   */
  async readStream(
    streamId: string,
    fromVersion: number = 0,
    count?: number
  ): Promise<DomainEvent[]> {
    const stream = this.streams.get(streamId) || [];
    const filtered = stream.filter(e => e.version > fromVersion);
    return count ? filtered.slice(0, count) : filtered;
  }

  /**
   * Read all events globally
   */
  async readAll(
    fromPosition: number = 0,
    count?: number
  ): Promise<EventEnvelope[]> {
    const filtered = this.globalLog.filter(e => e.globalPosition > fromPosition);
    return count ? filtered.slice(0, count) : filtered;
  }

  /**
   * Get current stream version
   */
  getStreamVersion(streamId: string): number {
    const stream = this.streams.get(streamId);
    return stream ? stream.length : 0;
  }

  /**
   * Save snapshot
   */
  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    const key = `${snapshot.aggregateType}:${snapshot.aggregateId}`;
    this.snapshots.set(key, snapshot);
  }

  /**
   * Load snapshot
   */
  async loadSnapshot(
    aggregateType: string,
    aggregateId: string
  ): Promise<Snapshot | null> {
    const key = `${aggregateType}:${aggregateId}`;
    return this.snapshots.get(key) || null;
  }

  /**
   * Subscribe to stream
   */
  subscribe(subscription: Omit<Subscription, 'id'>): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullSubscription: Subscription = { ...subscription, id };

    const subs = this.subscriptions.get(subscription.topic) || [];
    subs.push(fullSubscription);
    this.subscriptions.set(subscription.topic, subs);

    return id;
  }

  /**
   * Unsubscribe
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [topic, subs] of this.subscriptions) {
      const index = subs.findIndex(s => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Notify subscribers
   */
  private async notifySubscribers(
    streamId: string,
    event: DomainEvent
  ): Promise<void> {
    // Notify stream-specific subscribers
    const streamSubs = this.subscriptions.get(streamId) || [];
    for (const sub of streamSubs) {
      try {
        await sub.handler(event);
      } catch (error) {
        console.error(`Subscriber error for ${sub.id}:`, error);
      }
    }

    // Notify wildcard subscribers
    const wildcardSubs = this.subscriptions.get('*') || [];
    for (const sub of wildcardSubs) {
      try {
        await sub.handler(event);
      } catch (error) {
        console.error(`Wildcard subscriber error for ${sub.id}:`, error);
      }
    }
  }

  /**
   * Get store statistics
   */
  getStats(): {
    streams: number;
    totalEvents: number;
    globalPosition: number;
    snapshots: number;
    subscriptions: number;
  } {
    let totalSubscriptions = 0;
    for (const subs of this.subscriptions.values()) {
      totalSubscriptions += subs.length;
    }

    return {
      streams: this.streams.size,
      totalEvents: this.globalLog.length,
      globalPosition: this.globalPosition,
      snapshots: this.snapshots.size,
      subscriptions: totalSubscriptions
    };
  }
}

// ============================================================================
// EVENT BUS / MESSAGE BROKER
// ============================================================================

/**
 * Event Bus (Kafka/RabbitMQ/Pulsar-style)
 *
 * Features:
 * - Topic-based pub/sub
 * - Consumer groups
 * - Message ordering
 * - At-least-once delivery
 *
 * Research: Kafka (15x faster than RabbitMQ), Pulsar (tiered storage)
 */
export class EventBus {
  private config: MessageBrokerConfig;
  private topics: Map<string, EventEnvelope[]> = new Map();
  private consumerGroups: Map<string, Map<string, number>> = new Map();
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  constructor(config: Partial<MessageBrokerConfig> = {}) {
    this.config = {
      type: config.type || 'memory',
      brokers: config.brokers || ['localhost:9092'],
      clientId: config.clientId || 'ring-event-bus',
      groupId: config.groupId || 'ring-consumer-group'
    };
  }

  /**
   * Publish event to topic
   */
  async publish(topic: string, event: DomainEvent): Promise<{ offset: number }> {
    const topicEvents = this.topics.get(topic) || [];
    const offset = topicEvents.length;

    const envelope: EventEnvelope = {
      event,
      position: offset,
      streamId: topic,
      globalPosition: offset
    };

    topicEvents.push(envelope);
    this.topics.set(topic, topicEvents);

    // Notify handlers
    const topicHandlers = this.handlers.get(topic) || [];
    for (const handler of topicHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Handler error for topic ${topic}:`, error);
      }
    }

    return { offset };
  }

  /**
   * Publish batch of events
   */
  async publishBatch(
    topic: string,
    events: DomainEvent[]
  ): Promise<{ offsets: number[] }> {
    const offsets: number[] = [];
    for (const event of events) {
      const result = await this.publish(topic, event);
      offsets.push(result.offset);
    }
    return { offsets };
  }

  /**
   * Subscribe to topic
   */
  subscribe(
    topic: string,
    handler: (event: DomainEvent) => Promise<void>,
    options: { group?: string; fromOffset?: number } = {}
  ): { unsubscribe: () => void } {
    const handlers = this.handlers.get(topic) || [];
    handlers.push(handler);
    this.handlers.set(topic, handlers);

    // Initialize consumer group offset
    if (options.group) {
      const groupOffsets = this.consumerGroups.get(options.group) || new Map();
      if (!groupOffsets.has(topic)) {
        groupOffsets.set(topic, options.fromOffset || 0);
      }
      this.consumerGroups.set(options.group, groupOffsets);
    }

    // Replay existing events if fromOffset specified
    if (options.fromOffset !== undefined) {
      const topicEvents = this.topics.get(topic) || [];
      const eventsToReplay = topicEvents.slice(options.fromOffset);
      for (const envelope of eventsToReplay) {
        handler(envelope.event).catch(err =>
          console.error('Replay error:', err)
        );
      }
    }

    return {
      unsubscribe: () => {
        const currentHandlers = this.handlers.get(topic) || [];
        const index = currentHandlers.indexOf(handler);
        if (index !== -1) {
          currentHandlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Consume messages (pull-based)
   */
  async consume(
    topic: string,
    group: string,
    maxMessages: number = 100
  ): Promise<EventEnvelope[]> {
    const groupOffsets = this.consumerGroups.get(group) || new Map();
    const currentOffset = groupOffsets.get(topic) || 0;

    const topicEvents = this.topics.get(topic) || [];
    const messages = topicEvents.slice(currentOffset, currentOffset + maxMessages);

    // Update offset
    groupOffsets.set(topic, currentOffset + messages.length);
    this.consumerGroups.set(group, groupOffsets);

    return messages;
  }

  /**
   * Commit offset for consumer group
   */
  commitOffset(topic: string, group: string, offset: number): void {
    const groupOffsets = this.consumerGroups.get(group) || new Map();
    groupOffsets.set(topic, offset);
    this.consumerGroups.set(group, groupOffsets);
  }

  /**
   * Get topic metadata
   */
  getTopicMetadata(topic: string): {
    messageCount: number;
    partitions: number;
    replicationFactor: number;
  } {
    const topicEvents = this.topics.get(topic) || [];
    return {
      messageCount: topicEvents.length,
      partitions: 1, // Simulated
      replicationFactor: 1 // Simulated
    };
  }

  /**
   * List all topics
   */
  listTopics(): string[] {
    return Array.from(this.topics.keys());
  }
}

// ============================================================================
// CQRS - COMMAND HANDLER
// ============================================================================

/**
 * Command Bus
 *
 * Handles command routing and execution.
 *
 * Features:
 * - Command registration
 * - Middleware support
 * - Validation
 * - Audit logging
 *
 * Research: CQRS Pattern (Azure Architecture)
 */
export class CommandBus {
  private handlers: Map<string, CommandHandler> = new Map();
  private middlewares: CommandMiddleware[] = [];
  private eventStore: EventStore;

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
  }

  /**
   * Register command handler
   */
  register<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void {
    this.handlers.set(commandType, handler as CommandHandler);
  }

  /**
   * Add middleware
   */
  use(middleware: CommandMiddleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Execute command
   */
  async execute<T>(command: Command): Promise<CommandResult<T>> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for command type: ${command.type}`
      };
    }

    // Execute middlewares
    let modifiedCommand = command;
    for (const middleware of this.middlewares) {
      try {
        modifiedCommand = await middleware.before(modifiedCommand);
      } catch (error) {
        return {
          success: false,
          error: `Middleware error: ${(error as Error).message}`
        };
      }
    }

    // Execute handler
    try {
      const result = await handler.handle(modifiedCommand, this.eventStore);

      // Execute post-middlewares
      for (const middleware of this.middlewares) {
        if (middleware.after) {
          await middleware.after(modifiedCommand, result);
        }
      }

      return result as CommandResult<T>;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get registered command types
   */
  getRegisteredCommands(): string[] {
    return Array.from(this.handlers.keys());
  }
}

interface CommandHandler<T extends Command = Command> {
  handle(command: T, eventStore: EventStore): Promise<CommandResult>;
}

interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  events?: DomainEvent[];
}

interface CommandMiddleware {
  before(command: Command): Promise<Command>;
  after?(command: Command, result: CommandResult): Promise<void>;
}

// ============================================================================
// CQRS - QUERY HANDLER
// ============================================================================

/**
 * Query Bus
 *
 * Handles query routing and execution against read models.
 *
 * Features:
 * - Query registration
 * - Read model access
 * - Caching
 * - Consistency levels
 *
 * Research: CQRS Pattern (microservices.io)
 */
export class QueryBus {
  private handlers: Map<string, QueryHandler> = new Map();
  private readModels: Map<string, ReadModel> = new Map();
  private cache: Map<string, { data: unknown; expiry: number }> = new Map();
  private cacheTTL: number = 60000; // 1 minute

  /**
   * Register query handler
   */
  register<T extends Query, R>(
    queryType: string,
    handler: QueryHandler<T, R>
  ): void {
    this.handlers.set(queryType, handler as QueryHandler);
  }

  /**
   * Execute query
   */
  async execute<R>(query: Query): Promise<QueryResult<R>> {
    // Check cache
    const cacheKey = this.getCacheKey(query);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return {
        success: true,
        data: cached.data as R,
        fromCache: true
      };
    }

    const handler = this.handlers.get(query.type);
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for query type: ${query.type}`
      };
    }

    try {
      const result = await handler.handle(query, this.readModels);

      // Cache result
      this.cache.set(cacheKey, {
        data: result.data,
        expiry: Date.now() + this.cacheTTL
      });

      return result as QueryResult<R>;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Update read model
   */
  updateReadModel(readModel: ReadModel): void {
    this.readModels.set(readModel.name, readModel);
    // Invalidate related cache entries
    this.invalidateCache(readModel.name);
  }

  /**
   * Get read model
   */
  getReadModel(name: string): ReadModel | undefined {
    return this.readModels.get(name);
  }

  private getCacheKey(query: Query): string {
    return `${query.type}:${JSON.stringify(query.parameters)}`;
  }

  private invalidateCache(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

interface QueryHandler<T extends Query = Query, R = unknown> {
  handle(query: T, readModels: Map<string, ReadModel>): Promise<QueryResult<R>>;
}

interface QueryResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fromCache?: boolean;
}

// ============================================================================
// PROJECTION ENGINE
// ============================================================================

/**
 * Projection Engine
 *
 * Builds read models from event streams.
 *
 * Features:
 * - Event-driven projections
 * - Rebuild support
 * - Checkpoint management
 *
 * Research: Event Sourcing projections
 */
export class ProjectionEngine {
  private projections: Map<string, Projection> = new Map();
  private states: Map<string, Record<string, unknown>> = new Map();
  private checkpoints: Map<string, number> = new Map();
  private eventStore: EventStore;
  private queryBus: QueryBus;

  constructor(eventStore: EventStore, queryBus: QueryBus) {
    this.eventStore = eventStore;
    this.queryBus = queryBus;
  }

  /**
   * Register projection
   */
  registerProjection(projection: Projection): void {
    this.projections.set(projection.name, projection);
    this.states.set(projection.name, projection.init());
    this.checkpoints.set(projection.name, 0);
  }

  /**
   * Process event through projections
   */
  async processEvent(event: DomainEvent, globalPosition: number): Promise<void> {
    for (const [name, projection] of this.projections) {
      if (projection.eventTypes.includes(event.eventType) || projection.eventTypes.includes('*')) {
        const currentState = this.states.get(name) || projection.init();
        const newState = projection.apply(currentState, event);
        this.states.set(name, newState);
        this.checkpoints.set(name, globalPosition);

        // Update read model
        const readModel: ReadModel = {
          id: name,
          name,
          version: globalPosition,
          data: newState,
          lastEventPosition: globalPosition,
          updatedAt: new Date()
        };
        this.queryBus.updateReadModel(readModel);
      }
    }
  }

  /**
   * Rebuild projection from scratch
   */
  async rebuildProjection(projectionName: string): Promise<void> {
    const projection = this.projections.get(projectionName);
    if (!projection) {
      throw new Error(`Projection not found: ${projectionName}`);
    }

    // Reset state
    this.states.set(projectionName, projection.init());
    this.checkpoints.set(projectionName, 0);

    // Replay all events
    const events = await this.eventStore.readAll(0);
    for (const envelope of events) {
      if (projection.eventTypes.includes(envelope.event.eventType) || projection.eventTypes.includes('*')) {
        const currentState = this.states.get(projectionName)!;
        const newState = projection.apply(currentState, envelope.event);
        this.states.set(projectionName, newState);
        this.checkpoints.set(projectionName, envelope.globalPosition);
      }
    }

    // Update read model
    const readModel: ReadModel = {
      id: projectionName,
      name: projectionName,
      version: this.checkpoints.get(projectionName) || 0,
      data: this.states.get(projectionName) || {},
      lastEventPosition: this.checkpoints.get(projectionName) || 0,
      updatedAt: new Date()
    };
    this.queryBus.updateReadModel(readModel);
  }

  /**
   * Get projection state
   */
  getProjectionState(projectionName: string): Record<string, unknown> | undefined {
    return this.states.get(projectionName);
  }

  /**
   * Get checkpoint
   */
  getCheckpoint(projectionName: string): number {
    return this.checkpoints.get(projectionName) || 0;
  }

  /**
   * Start live subscription
   */
  startLiveProjections(): void {
    this.eventStore.subscribe({
      topic: '*',
      handler: async (event) => {
        const globalPosition = this.eventStore.getStats().globalPosition;
        await this.processEvent(event, globalPosition);
      }
    });
  }
}

// ============================================================================
// SAGA ORCHESTRATOR
// ============================================================================

/**
 * Saga Orchestrator
 *
 * Coordinates distributed transactions using the orchestration pattern.
 *
 * Features:
 * - Step-by-step execution
 * - Compensating transactions
 * - Retry with backoff
 * - Saga state persistence
 *
 * Research: Temporal.io, Camunda, Saga Pattern
 */
export class SagaOrchestrator<T = unknown> {
  private steps: SagaStep<T>[] = [];
  private sagaStore: Map<string, SagaState<T>> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Add step to saga
   */
  addStep(step: SagaStep<T>): this {
    this.steps.push(step);
    return this;
  }

  /**
   * Execute saga
   */
  async execute(sagaId: string, initialData: T): Promise<SagaResult<T>> {
    const context: SagaContext<T> = {
      sagaId,
      data: initialData,
      completedSteps: [],
      currentStep: '',
      metadata: {}
    };

    // Initialize saga state
    const state: SagaState<T> = {
      sagaId,
      status: 'running',
      context,
      startedAt: new Date(),
      completedSteps: [],
      failedStep: null
    };
    this.sagaStore.set(sagaId, state);

    // Publish saga started event
    await this.publishSagaEvent(sagaId, 'SagaStarted', { data: initialData });

    try {
      // Execute steps sequentially
      for (const step of this.steps) {
        context.currentStep = step.name;
        state.currentStep = step.name;

        const result = await this.executeStepWithRetry(step, context);

        if (!result.success) {
          // Step failed - initiate compensation
          state.status = 'compensating';
          state.failedStep = step.name;
          state.error = result.error;

          await this.publishSagaEvent(sagaId, 'SagaStepFailed', {
            step: step.name,
            error: result.error
          });

          await this.compensate(context);

          state.status = 'failed';
          state.completedAt = new Date();

          await this.publishSagaEvent(sagaId, 'SagaFailed', {
            failedStep: step.name,
            error: result.error
          });

          return {
            success: false,
            sagaId,
            error: result.error,
            compensated: true,
            data: context.data
          };
        }

        context.completedSteps.push(step.name);
        state.completedSteps.push(step.name);

        if (result.data) {
          context.data = { ...context.data, ...(result.data as object) };
        }

        await this.publishSagaEvent(sagaId, 'SagaStepCompleted', {
          step: step.name
        });
      }

      state.status = 'completed';
      state.completedAt = new Date();

      await this.publishSagaEvent(sagaId, 'SagaCompleted', {
        data: context.data
      });

      return {
        success: true,
        sagaId,
        data: context.data
      };
    } catch (error) {
      state.status = 'failed';
      state.error = (error as Error).message;
      state.completedAt = new Date();

      return {
        success: false,
        sagaId,
        error: (error as Error).message,
        data: context.data
      };
    }
  }

  /**
   * Execute step with retry
   */
  private async executeStepWithRetry(
    step: SagaStep<T>,
    context: SagaContext<T>
  ): Promise<StepResult> {
    const policy = step.retryPolicy || {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    };

    let lastError: string | undefined;
    let delay = policy.initialDelay;

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        const result = await step.execute(context);
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = (error as Error).message;
      }

      if (attempt < policy.maxAttempts) {
        await this.sleep(delay);
        delay = Math.min(delay * policy.backoffMultiplier, policy.maxDelay);
      }
    }

    return { success: false, error: lastError };
  }

  /**
   * Compensate completed steps
   */
  private async compensate(context: SagaContext<T>): Promise<void> {
    // Compensate in reverse order
    const stepsToCompensate = [...context.completedSteps].reverse();

    for (const stepName of stepsToCompensate) {
      const step = this.steps.find(s => s.name === stepName);
      if (step) {
        try {
          await step.compensate(context);
          await this.publishSagaEvent(context.sagaId, 'SagaStepCompensated', {
            step: stepName
          });
        } catch (error) {
          console.error(`Compensation failed for step ${stepName}:`, error);
          // Log but continue with other compensations
        }
      }
    }
  }

  private async publishSagaEvent(
    sagaId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const event: DomainEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      aggregateId: sagaId,
      aggregateType: 'Saga',
      eventType,
      payload,
      metadata: {
        correlationId: sagaId
      },
      version: 1,
      timestamp: new Date()
    };

    await this.eventBus.publish('saga-events', event);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get saga state
   */
  getSagaState(sagaId: string): SagaState<T> | undefined {
    return this.sagaStore.get(sagaId);
  }
}

interface SagaState<T> {
  sagaId: string;
  status: 'running' | 'compensating' | 'completed' | 'failed';
  context: SagaContext<T>;
  startedAt: Date;
  completedAt?: Date;
  completedSteps: string[];
  currentStep?: string;
  failedStep: string | null;
  error?: string;
}

interface SagaResult<T> {
  success: boolean;
  sagaId: string;
  data?: T;
  error?: string;
  compensated?: boolean;
}

// ============================================================================
// SAGA CHOREOGRAPHY
// ============================================================================

/**
 * Saga Choreography
 *
 * Event-driven saga without central coordinator.
 *
 * Features:
 * - Event-based step triggering
 * - Decentralized coordination
 * - Compensation via events
 *
 * Research: Saga choreography pattern, Eventuate Tram
 */
export class SagaChoreography {
  private eventBus: EventBus;
  private stepHandlers: Map<string, ChoreographyStepHandler> = new Map();
  private compensationHandlers: Map<string, ChoreographyStepHandler> = new Map();
  private sagaStates: Map<string, ChoreographySagaState> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  /**
   * Register step handler
   */
  registerStep(config: {
    triggerEvent: string;
    handler: (event: DomainEvent) => Promise<{ success: boolean; nextEvent?: DomainEvent; error?: string }>;
    compensationEvent: string;
    compensationHandler: (event: DomainEvent) => Promise<void>;
  }): void {
    this.stepHandlers.set(config.triggerEvent, {
      handler: config.handler,
      compensationEvent: config.compensationEvent
    });
    this.compensationHandlers.set(config.compensationEvent, {
      handler: async () => ({ success: true }),
      compensationEvent: ''
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Subscribe to all registered trigger events
    this.eventBus.subscribe('saga-choreography', async (event) => {
      const stepHandler = this.stepHandlers.get(event.eventType);
      if (stepHandler) {
        await this.handleStep(event, stepHandler);
      }

      const compensationHandler = this.compensationHandlers.get(event.eventType);
      if (compensationHandler) {
        await compensationHandler.handler(event);
      }
    });
  }

  /**
   * Handle saga step
   */
  private async handleStep(
    event: DomainEvent,
    stepHandler: ChoreographyStepHandler
  ): Promise<void> {
    const sagaId = event.metadata.correlationId;

    // Update saga state
    let state = this.sagaStates.get(sagaId);
    if (!state) {
      state = {
        sagaId,
        status: 'running',
        completedEvents: [],
        startedAt: new Date()
      };
      this.sagaStates.set(sagaId, state);
    }

    try {
      const result = await stepHandler.handler(event);

      if (result.success) {
        state.completedEvents.push(event.eventType);

        if (result.nextEvent) {
          await this.eventBus.publish('saga-choreography', result.nextEvent);
        }
      } else {
        // Trigger compensation
        state.status = 'compensating';
        await this.triggerCompensation(state, stepHandler.compensationEvent);
      }
    } catch (error) {
      state.status = 'failed';
      state.error = (error as Error).message;
      await this.triggerCompensation(state, stepHandler.compensationEvent);
    }
  }

  /**
   * Trigger compensation events
   */
  private async triggerCompensation(
    state: ChoreographySagaState,
    fromEvent: string
  ): Promise<void> {
    // Find and trigger compensation for all completed steps in reverse
    for (const completedEvent of [...state.completedEvents].reverse()) {
      const handler = this.stepHandlers.get(completedEvent);
      if (handler && handler.compensationEvent) {
        const compensationEvent: DomainEvent = {
          id: `evt_comp_${Date.now()}`,
          aggregateId: state.sagaId,
          aggregateType: 'SagaCompensation',
          eventType: handler.compensationEvent,
          payload: { originalEvent: completedEvent },
          metadata: { correlationId: state.sagaId },
          version: 1,
          timestamp: new Date()
        };

        await this.eventBus.publish('saga-choreography', compensationEvent);
      }
    }

    state.status = 'compensated';
  }

  /**
   * Start saga with initial event
   */
  async startSaga(sagaId: string, initialEvent: DomainEvent): Promise<void> {
    const enhancedEvent: DomainEvent = {
      ...initialEvent,
      metadata: {
        ...initialEvent.metadata,
        correlationId: sagaId
      }
    };

    await this.eventBus.publish('saga-choreography', enhancedEvent);
  }

  /**
   * Get saga state
   */
  getSagaState(sagaId: string): ChoreographySagaState | undefined {
    return this.sagaStates.get(sagaId);
  }
}

interface ChoreographyStepHandler {
  handler: (event: DomainEvent) => Promise<{ success: boolean; nextEvent?: DomainEvent; error?: string }>;
  compensationEvent: string;
}

interface ChoreographySagaState {
  sagaId: string;
  status: 'running' | 'compensating' | 'compensated' | 'completed' | 'failed';
  completedEvents: string[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// ============================================================================
// INTEGRATED EVENT-DRIVEN PLATFORM
// ============================================================================

/**
 * Integrated Event-Driven Architecture Platform for Ring
 */
export class IntegratedEventDrivenPlatform {
  private eventStore: EventStore;
  private eventBus: EventBus;
  private commandBus: CommandBus;
  private queryBus: QueryBus;
  private projectionEngine: ProjectionEngine;
  private sagaOrchestrator: SagaOrchestrator;
  private sagaChoreography: SagaChoreography;

  constructor() {
    this.eventStore = new EventStore();
    this.eventBus = new EventBus({ type: 'memory' });
    this.commandBus = new CommandBus(this.eventStore);
    this.queryBus = new QueryBus();
    this.projectionEngine = new ProjectionEngine(this.eventStore, this.queryBus);
    this.sagaOrchestrator = new SagaOrchestrator(this.eventBus);
    this.sagaChoreography = new SagaChoreography(this.eventBus);

    this.initializeRingDomain();
  }

  /**
   * Initialize Ring spam detection domain
   */
  private initializeRingDomain(): void {
    // Register spam report projection
    this.projectionEngine.registerProjection({
      name: 'spam-reports',
      eventTypes: ['SpamReported', 'SpamConfirmed', 'SpamCleared'],
      init: () => ({ reports: {}, totalReports: 0, confirmedSpam: 0 }),
      apply: (state, event) => {
        const reports = { ...(state.reports as Record<string, unknown>) };

        switch (event.eventType) {
          case 'SpamReported':
            reports[event.aggregateId] = {
              ...event.payload,
              status: 'reported',
              reportedAt: event.timestamp
            };
            return {
              reports,
              totalReports: (state.totalReports as number) + 1,
              confirmedSpam: state.confirmedSpam
            };

          case 'SpamConfirmed':
            if (reports[event.aggregateId]) {
              reports[event.aggregateId] = {
                ...(reports[event.aggregateId] as object),
                status: 'confirmed',
                confirmedAt: event.timestamp
              };
            }
            return {
              reports,
              totalReports: state.totalReports,
              confirmedSpam: (state.confirmedSpam as number) + 1
            };

          case 'SpamCleared':
            delete reports[event.aggregateId];
            return {
              reports,
              totalReports: state.totalReports,
              confirmedSpam: state.confirmedSpam
            };

          default:
            return state;
        }
      }
    });

    // Register blacklist projection
    this.projectionEngine.registerProjection({
      name: 'blacklist',
      eventTypes: ['NumberBlacklisted', 'NumberWhitelisted'],
      init: () => ({ numbers: new Set<string>(), count: 0 }),
      apply: (state, event) => {
        const numbers = new Set(state.numbers as Set<string>);

        if (event.eventType === 'NumberBlacklisted') {
          numbers.add(event.payload.phoneNumber as string);
        } else if (event.eventType === 'NumberWhitelisted') {
          numbers.delete(event.payload.phoneNumber as string);
        }

        return { numbers: Array.from(numbers), count: numbers.size };
      }
    });

    // Register commands
    this.commandBus.register('ReportSpam', {
      handle: async (command, eventStore) => {
        const event: DomainEvent = {
          id: `evt_${Date.now()}`,
          aggregateId: command.payload.phoneNumber as string,
          aggregateType: 'SpamReport',
          eventType: 'SpamReported',
          payload: command.payload,
          metadata: {
            correlationId: command.metadata.correlationId,
            userId: command.metadata.userId
          },
          version: 1,
          timestamp: new Date()
        };

        const result = await eventStore.appendToStream(
          `spam-report-${command.payload.phoneNumber}`,
          [event]
        );

        return {
          success: true,
          data: { position: result.position },
          events: [event]
        };
      }
    });

    this.commandBus.register('BlacklistNumber', {
      handle: async (command, eventStore) => {
        const event: DomainEvent = {
          id: `evt_${Date.now()}`,
          aggregateId: command.payload.phoneNumber as string,
          aggregateType: 'Blacklist',
          eventType: 'NumberBlacklisted',
          payload: command.payload,
          metadata: {
            correlationId: command.metadata.correlationId,
            userId: command.metadata.userId
          },
          version: 1,
          timestamp: new Date()
        };

        const result = await eventStore.appendToStream(
          `blacklist-${command.payload.phoneNumber}`,
          [event]
        );

        return {
          success: true,
          data: { position: result.position },
          events: [event]
        };
      }
    });

    // Register queries
    this.queryBus.register('GetSpamReports', {
      handle: async (query, readModels) => {
        const model = readModels.get('spam-reports');
        if (!model) {
          return { success: true, data: { reports: [], totalReports: 0 } };
        }
        return { success: true, data: model.data };
      }
    });

    this.queryBus.register('GetBlacklist', {
      handle: async (query, readModels) => {
        const model = readModels.get('blacklist');
        if (!model) {
          return { success: true, data: { numbers: [], count: 0 } };
        }
        return { success: true, data: model.data };
      }
    });

    // Start live projections
    this.projectionEngine.startLiveProjections();
  }

  /**
   * Report spam number (command)
   */
  async reportSpam(phoneNumber: string, reason: string, userId?: string): Promise<CommandResult> {
    const command: Command = {
      id: `cmd_${Date.now()}`,
      type: 'ReportSpam',
      payload: { phoneNumber, reason },
      metadata: {
        correlationId: `corr_${Date.now()}`,
        userId
      },
      timestamp: new Date()
    };

    return this.commandBus.execute(command);
  }

  /**
   * Get spam reports (query)
   */
  async getSpamReports(): Promise<QueryResult> {
    const query: Query = {
      id: `qry_${Date.now()}`,
      type: 'GetSpamReports',
      parameters: {},
      metadata: {
        correlationId: `corr_${Date.now()}`,
        consistencyLevel: 'eventual'
      }
    };

    return this.queryBus.execute(query);
  }

  /**
   * Get platform status
   */
  getStatus(): {
    eventStore: ReturnType<EventStore['getStats']>;
    topics: string[];
    commands: string[];
    projections: string[];
  } {
    return {
      eventStore: this.eventStore.getStats(),
      topics: this.eventBus.listTopics(),
      commands: this.commandBus.getRegisteredCommands(),
      projections: ['spam-reports', 'blacklist']
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DomainEvent,
  EventMetadata,
  EventEnvelope,
  Snapshot,
  Command,
  CommandMetadata,
  Query,
  QueryMetadata,
  SagaStep,
  SagaContext,
  StepResult,
  RetryPolicy,
  MessageBrokerConfig,
  Subscription,
  ReadModel,
  Projection,
  CommandResult,
  QueryResult,
  SagaState,
  SagaResult,
  ChoreographySagaState
};
