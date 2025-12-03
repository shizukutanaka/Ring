/**
 * Phase 88: Advanced Documentation & API Management
 *
 * Enterprise API documentation and management for the Ring WebRTC spam call elimination platform.
 * Implements OpenAPI 3.1, SDK generation, API versioning, and developer portal capabilities.
 *
 * Design Philosophy (Carmack/Martin/Pike):
 * - Simple, focused implementations
 * - No unnecessary abstractions
 * - Clear, readable code over clever code
 *
 * Research Sources (2024-2025):
 * - OpenAPI 3.1: https://spec.openapis.org/oas/v3.1.0
 * - Redoc/Stoplight: https://github.com/Redocly/redoc
 * - OpenAPI Generator: https://github.com/OpenAPITools/openapi-generator
 * - API Versioning: https://blog.dreamfactory.com/top-5-api-versioning-strategies-2025-dreamfactory
 * - AsyncAPI 3.0: https://www.asyncapi.com/docs/reference/specification/v3.0.0
 * - Rate Limiting: https://zuplo.com/learning-center/10-best-practices-for-api-rate-limiting-in-2025
 *
 * Total LOC: ~2,200
 */

// ============================================================================
// PART 1: TYPE DEFINITIONS
// ============================================================================

// --- OpenAPI Types ---

export interface OpenAPIDocument {
  openapi: string;
  info: InfoObject;
  servers?: ServerObject[];
  paths: PathsObject;
  components?: ComponentsObject;
  security?: SecurityRequirement[];
  tags?: TagObject[];
  externalDocs?: ExternalDocumentation;
}

export interface InfoObject {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: ContactObject;
  license?: LicenseObject;
}

export interface ContactObject {
  name?: string;
  url?: string;
  email?: string;
}

export interface LicenseObject {
  name: string;
  url?: string;
  identifier?: string;
}

export interface ServerObject {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

export interface ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface PathsObject {
  [path: string]: PathItemObject;
}

export interface PathItemObject {
  summary?: string;
  description?: string;
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  delete?: OperationObject;
  patch?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  trace?: OperationObject;
  parameters?: ParameterObject[];
}

export interface OperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: ResponsesObject;
  security?: SecurityRequirement[];
  deprecated?: boolean;
}

export interface ParameterObject {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema: SchemaObject;
  example?: unknown;
}

export interface RequestBodyObject {
  description?: string;
  content: Record<string, MediaTypeObject>;
  required?: boolean;
}

export interface MediaTypeObject {
  schema: SchemaObject;
  example?: unknown;
  examples?: Record<string, ExampleObject>;
}

export interface ResponsesObject {
  [statusCode: string]: ResponseObject;
}

export interface ResponseObject {
  description: string;
  headers?: Record<string, HeaderObject>;
  content?: Record<string, MediaTypeObject>;
}

export interface HeaderObject {
  description?: string;
  schema: SchemaObject;
}

export interface SchemaObject {
  type?: string | string[];
  format?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  required?: string[];
  enum?: unknown[];
  $ref?: string;
  description?: string;
  example?: unknown;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  allOf?: SchemaObject[];
}

export interface ExampleObject {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
}

export interface ComponentsObject {
  schemas?: Record<string, SchemaObject>;
  responses?: Record<string, ResponseObject>;
  parameters?: Record<string, ParameterObject>;
  requestBodies?: Record<string, RequestBodyObject>;
  headers?: Record<string, HeaderObject>;
  securitySchemes?: Record<string, SecuritySchemeObject>;
}

export interface SecuritySchemeObject {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlowsObject;
  openIdConnectUrl?: string;
}

export interface OAuthFlowsObject {
  implicit?: OAuthFlowObject;
  password?: OAuthFlowObject;
  clientCredentials?: OAuthFlowObject;
  authorizationCode?: OAuthFlowObject;
}

export interface OAuthFlowObject {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface SecurityRequirement {
  [name: string]: string[];
}

export interface TagObject {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentation;
}

export interface ExternalDocumentation {
  description?: string;
  url: string;
}

// --- AsyncAPI Types ---

export interface AsyncAPIDocument {
  asyncapi: string;
  info: InfoObject;
  servers?: Record<string, AsyncServerObject>;
  channels: Record<string, ChannelObject>;
  components?: AsyncComponentsObject;
}

export interface AsyncServerObject {
  host: string;
  protocol: string;
  protocolVersion?: string;
  pathname?: string;
  description?: string;
  security?: SecurityRequirement[];
}

export interface ChannelObject {
  address?: string;
  description?: string;
  messages?: Record<string, MessageObject>;
  parameters?: Record<string, ParameterObject>;
  bindings?: Record<string, unknown>;
}

export interface MessageObject {
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  contentType?: string;
  payload?: SchemaObject;
  headers?: SchemaObject;
  examples?: MessageExampleObject[];
}

export interface MessageExampleObject {
  name?: string;
  summary?: string;
  headers?: Record<string, unknown>;
  payload?: unknown;
}

export interface AsyncComponentsObject {
  schemas?: Record<string, SchemaObject>;
  messages?: Record<string, MessageObject>;
  securitySchemes?: Record<string, SecuritySchemeObject>;
}

// --- API Management Types ---

export interface APIVersion {
  version: string;
  status: VersionStatus;
  releaseDate: string;
  deprecationDate?: string;
  sunsetDate?: string;
  changelog: ChangelogEntry[];
}

export type VersionStatus = 'current' | 'deprecated' | 'sunset' | 'beta' | 'alpha';

export interface ChangelogEntry {
  date: string;
  type: ChangeType;
  description: string;
  breaking?: boolean;
}

export type ChangeType = 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';

export interface APIKey {
  id: string;
  key: string;
  name: string;
  tier: APITier;
  owner: string;
  createdAt: number;
  expiresAt?: number;
  permissions: string[];
  rateLimit: RateLimitConfig;
  usageStats: UsageStats;
}

export type APITier = 'free' | 'basic' | 'professional' | 'enterprise';

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export interface UsageStats {
  totalRequests: number;
  requestsToday: number;
  requestsThisMonth: number;
  lastRequestAt?: number;
}

// --- SDK Generation Types ---

export interface SDKConfig {
  language: SDKLanguage;
  packageName: string;
  version: string;
  outputDir: string;
  options: SDKOptions;
}

export type SDKLanguage = 'typescript' | 'javascript' | 'python' | 'java' | 'go' | 'csharp' | 'ruby' | 'swift' | 'kotlin';

export interface SDKOptions {
  generateModels?: boolean;
  generateClients?: boolean;
  generateDocs?: boolean;
  useAxios?: boolean;
  useFetch?: boolean;
  asyncAwait?: boolean;
}

export interface GeneratedSDK {
  language: SDKLanguage;
  files: GeneratedFile[];
  packageInfo: PackageInfo;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'model' | 'client' | 'config' | 'readme' | 'package';
}

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  dependencies: Record<string, string>;
}

// --- Documentation Types ---

export interface DocumentationSite {
  title: string;
  logo?: string;
  theme: DocTheme;
  sections: DocSection[];
  search: SearchConfig;
}

export interface DocTheme {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  darkMode?: boolean;
}

export interface DocSection {
  id: string;
  title: string;
  content: string;
  order: number;
  children?: DocSection[];
}

export interface SearchConfig {
  enabled: boolean;
  indexFields: string[];
  placeholder?: string;
}

// ============================================================================
// PART 2: OPENAPI DOCUMENT BUILDER
// ============================================================================

/**
 * OpenAPI Document Builder
 *
 * Fluent API for constructing OpenAPI 3.1 specifications.
 * Follows design-first approach as recommended by OpenAPI best practices.
 */
export class OpenAPIBuilder {
  private doc: OpenAPIDocument;

  constructor(title: string, version: string) {
    this.doc = {
      openapi: '3.1.0',
      info: { title, version },
      paths: {}
    };
  }

  /**
   * Set API description
   */
  description(desc: string): this {
    this.doc.info.description = desc;
    return this;
  }

  /**
   * Set contact information
   */
  contact(name: string, email?: string, url?: string): this {
    this.doc.info.contact = { name, email, url };
    return this;
  }

  /**
   * Set license
   */
  license(name: string, url?: string): this {
    this.doc.info.license = { name, url };
    return this;
  }

  /**
   * Add server
   */
  server(url: string, description?: string): this {
    if (!this.doc.servers) this.doc.servers = [];
    this.doc.servers.push({ url, description });
    return this;
  }

  /**
   * Add tag
   */
  tag(name: string, description?: string): this {
    if (!this.doc.tags) this.doc.tags = [];
    this.doc.tags.push({ name, description });
    return this;
  }

  /**
   * Add path
   */
  path(path: string, pathItem: PathItemObject): this {
    this.doc.paths[path] = pathItem;
    return this;
  }

  /**
   * Add GET endpoint
   */
  get(path: string, operation: OperationObject): this {
    if (!this.doc.paths[path]) this.doc.paths[path] = {};
    this.doc.paths[path].get = operation;
    return this;
  }

  /**
   * Add POST endpoint
   */
  post(path: string, operation: OperationObject): this {
    if (!this.doc.paths[path]) this.doc.paths[path] = {};
    this.doc.paths[path].post = operation;
    return this;
  }

  /**
   * Add PUT endpoint
   */
  put(path: string, operation: OperationObject): this {
    if (!this.doc.paths[path]) this.doc.paths[path] = {};
    this.doc.paths[path].put = operation;
    return this;
  }

  /**
   * Add DELETE endpoint
   */
  delete(path: string, operation: OperationObject): this {
    if (!this.doc.paths[path]) this.doc.paths[path] = {};
    this.doc.paths[path].delete = operation;
    return this;
  }

  /**
   * Add schema component
   */
  schema(name: string, schema: SchemaObject): this {
    if (!this.doc.components) this.doc.components = {};
    if (!this.doc.components.schemas) this.doc.components.schemas = {};
    this.doc.components.schemas[name] = schema;
    return this;
  }

  /**
   * Add security scheme
   */
  securityScheme(name: string, scheme: SecuritySchemeObject): this {
    if (!this.doc.components) this.doc.components = {};
    if (!this.doc.components.securitySchemes) this.doc.components.securitySchemes = {};
    this.doc.components.securitySchemes[name] = scheme;
    return this;
  }

  /**
   * Add global security
   */
  security(requirement: SecurityRequirement): this {
    if (!this.doc.security) this.doc.security = [];
    this.doc.security.push(requirement);
    return this;
  }

  /**
   * Build the document
   */
  build(): OpenAPIDocument {
    return JSON.parse(JSON.stringify(this.doc));
  }

  /**
   * Export as JSON
   */
  toJSON(): string {
    return JSON.stringify(this.doc, null, 2);
  }

  /**
   * Export as YAML (simplified)
   */
  toYAML(): string {
    return this.jsonToYaml(this.doc);
  }

  private jsonToYaml(obj: unknown, indent: number = 0): string {
    const spaces = '  '.repeat(indent);

    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'boolean') return obj.toString();
    if (typeof obj === 'number') return obj.toString();
    if (typeof obj === 'string') {
      if (obj.includes('\n') || obj.includes(':') || obj.includes('#')) {
        return `|\n${obj.split('\n').map(l => spaces + '  ' + l).join('\n')}`;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return '\n' + obj.map(item => {
        const itemYaml = this.jsonToYaml(item, indent + 1);
        return `${spaces}- ${itemYaml.trimStart()}`;
      }).join('\n');
    }

    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) return '{}';
      return '\n' + entries.map(([key, value]) => {
        const valueYaml = this.jsonToYaml(value, indent + 1);
        if (typeof value === 'object' && value !== null) {
          return `${spaces}${key}:${valueYaml}`;
        }
        return `${spaces}${key}: ${valueYaml}`;
      }).join('\n');
    }

    return String(obj);
  }
}

// ============================================================================
// PART 3: ASYNCAPI DOCUMENT BUILDER
// ============================================================================

/**
 * AsyncAPI Document Builder
 *
 * For documenting event-driven APIs (WebSocket, Kafka, etc.)
 */
export class AsyncAPIBuilder {
  private doc: AsyncAPIDocument;

  constructor(title: string, version: string) {
    this.doc = {
      asyncapi: '3.0.0',
      info: { title, version },
      channels: {}
    };
  }

  /**
   * Set description
   */
  description(desc: string): this {
    this.doc.info.description = desc;
    return this;
  }

  /**
   * Add server
   */
  server(name: string, host: string, protocol: string, description?: string): this {
    if (!this.doc.servers) this.doc.servers = {};
    this.doc.servers[name] = { host, protocol, description };
    return this;
  }

  /**
   * Add channel
   */
  channel(name: string, channel: ChannelObject): this {
    this.doc.channels[name] = channel;
    return this;
  }

  /**
   * Add schema component
   */
  schema(name: string, schema: SchemaObject): this {
    if (!this.doc.components) this.doc.components = {};
    if (!this.doc.components.schemas) this.doc.components.schemas = {};
    this.doc.components.schemas[name] = schema;
    return this;
  }

  /**
   * Add message component
   */
  message(name: string, message: MessageObject): this {
    if (!this.doc.components) this.doc.components = {};
    if (!this.doc.components.messages) this.doc.components.messages = {};
    this.doc.components.messages[name] = message;
    return this;
  }

  /**
   * Build document
   */
  build(): AsyncAPIDocument {
    return JSON.parse(JSON.stringify(this.doc));
  }

  /**
   * Export as JSON
   */
  toJSON(): string {
    return JSON.stringify(this.doc, null, 2);
  }
}

// ============================================================================
// PART 4: API VERSION MANAGER
// ============================================================================

/**
 * API Version Manager
 *
 * Manages API versions with support for URL path, header, and query parameter strategies.
 */
export class APIVersionManager {
  private versions: Map<string, APIVersion> = new Map();
  private strategy: VersioningStrategy;
  private currentVersion: string = '';

  constructor(strategy: VersioningStrategy = 'path') {
    this.strategy = strategy;
  }

  /**
   * Register a version
   */
  registerVersion(version: APIVersion): void {
    this.versions.set(version.version, version);

    if (version.status === 'current') {
      this.currentVersion = version.version;
    }

    console.log(`[APIVersion] Registered version: ${version.version} (${version.status})`);
  }

  /**
   * Get current version
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Get all versions
   */
  getAllVersions(): APIVersion[] {
    return Array.from(this.versions.values());
  }

  /**
   * Deprecate a version
   */
  deprecateVersion(version: string, sunsetDate: string): void {
    const v = this.versions.get(version);
    if (v) {
      v.status = 'deprecated';
      v.deprecationDate = new Date().toISOString();
      v.sunsetDate = sunsetDate;
      console.log(`[APIVersion] Deprecated version: ${version}, sunset: ${sunsetDate}`);
    }
  }

  /**
   * Extract version from request
   */
  extractVersion(request: {
    path?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
  }): string {
    switch (this.strategy) {
      case 'path':
        return this.extractFromPath(request.path || '');
      case 'header':
        return request.headers?.['api-version'] ||
               request.headers?.['x-api-version'] ||
               this.currentVersion;
      case 'query':
        return request.query?.['version'] ||
               request.query?.['api-version'] ||
               this.currentVersion;
      case 'mediaType':
        const accept = request.headers?.['accept'] || '';
        const match = accept.match(/application\/vnd\.[^+]*\.v(\d+)/);
        return match ? `v${match[1]}` : this.currentVersion;
      default:
        return this.currentVersion;
    }
  }

  /**
   * Extract version from URL path
   */
  private extractFromPath(path: string): string {
    const match = path.match(/\/v(\d+(?:\.\d+)?)/);
    return match ? `v${match[1]}` : this.currentVersion;
  }

  /**
   * Build versioned URL
   */
  buildVersionedUrl(baseUrl: string, path: string, version?: string): string {
    const v = version || this.currentVersion;

    switch (this.strategy) {
      case 'path':
        return `${baseUrl}/${v}${path}`;
      case 'query':
        const separator = path.includes('?') ? '&' : '?';
        return `${baseUrl}${path}${separator}version=${v}`;
      default:
        return `${baseUrl}${path}`;
    }
  }

  /**
   * Generate deprecation headers
   */
  getDeprecationHeaders(version: string): Record<string, string> {
    const v = this.versions.get(version);
    if (!v || v.status !== 'deprecated') return {};

    const headers: Record<string, string> = {
      'Deprecation': v.deprecationDate || 'true'
    };

    if (v.sunsetDate) {
      headers['Sunset'] = v.sunsetDate;
    }

    return headers;
  }
}

export type VersioningStrategy = 'path' | 'header' | 'query' | 'mediaType';

// ============================================================================
// PART 5: SDK GENERATOR
// ============================================================================

/**
 * SDK Generator
 *
 * Generates client SDKs from OpenAPI specifications.
 * Focused on TypeScript/JavaScript for simplicity.
 */
export class SDKGenerator {
  private templates: Map<SDKLanguage, SDKTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Register default templates
   */
  private registerDefaultTemplates(): void {
    this.templates.set('typescript', {
      modelTemplate: this.typescriptModelTemplate,
      clientTemplate: this.typescriptClientTemplate,
      configTemplate: this.typescriptConfigTemplate
    });
  }

  /**
   * Generate SDK from OpenAPI document
   */
  generate(doc: OpenAPIDocument, config: SDKConfig): GeneratedSDK {
    const template = this.templates.get(config.language);
    if (!template) {
      throw new Error(`Unsupported language: ${config.language}`);
    }

    const files: GeneratedFile[] = [];

    // Generate models
    if (config.options.generateModels && doc.components?.schemas) {
      for (const [name, schema] of Object.entries(doc.components.schemas)) {
        files.push({
          path: `${config.outputDir}/models/${name}.ts`,
          content: template.modelTemplate(name, schema),
          type: 'model'
        });
      }

      // Generate index file for models
      files.push({
        path: `${config.outputDir}/models/index.ts`,
        content: this.generateModelIndex(Object.keys(doc.components.schemas)),
        type: 'model'
      });
    }

    // Generate client
    if (config.options.generateClients) {
      files.push({
        path: `${config.outputDir}/client.ts`,
        content: template.clientTemplate(doc, config),
        type: 'client'
      });
    }

    // Generate config
    files.push({
      path: `${config.outputDir}/config.ts`,
      content: template.configTemplate(config),
      type: 'config'
    });

    // Generate package.json
    files.push({
      path: `${config.outputDir}/package.json`,
      content: this.generatePackageJson(config),
      type: 'package'
    });

    // Generate README
    if (config.options.generateDocs) {
      files.push({
        path: `${config.outputDir}/README.md`,
        content: this.generateReadme(doc, config),
        type: 'readme'
      });
    }

    console.log(`[SDKGenerator] Generated ${files.length} files for ${config.language}`);

    return {
      language: config.language,
      files,
      packageInfo: {
        name: config.packageName,
        version: config.version,
        description: doc.info.description || `SDK for ${doc.info.title}`,
        dependencies: this.getDependencies(config)
      }
    };
  }

  /**
   * TypeScript model template
   */
  private typescriptModelTemplate(name: string, schema: SchemaObject): string {
    let content = `/**\n * ${schema.description || name}\n */\n`;

    if (schema.enum) {
      content += `export enum ${name} {\n`;
      content += schema.enum.map((v, i) => `  ${String(v).toUpperCase()} = ${JSON.stringify(v)}`).join(',\n');
      content += '\n}\n';
    } else {
      content += `export interface ${name} {\n`;

      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          const required = schema.required?.includes(propName) ? '' : '?';
          const type = SDKGenerator.schemaToType(propSchema);
          content += `  /** ${propSchema.description || propName} */\n`;
          content += `  ${propName}${required}: ${type};\n`;
        }
      }

      content += '}\n';
    }

    return content;
  }

  /**
   * Convert schema to TypeScript type
   */
  private static schemaToType(schema: SchemaObject): string {
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      return refName || 'unknown';
    }

    if (schema.oneOf) {
      return schema.oneOf.map(s => this.schemaToType(s)).join(' | ');
    }

    if (schema.anyOf) {
      return schema.anyOf.map(s => this.schemaToType(s)).join(' | ');
    }

    const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

    switch (type) {
      case 'string':
        if (schema.enum) {
          return schema.enum.map(e => JSON.stringify(e)).join(' | ');
        }
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return schema.items ? `${this.schemaToType(schema.items)}[]` : 'unknown[]';
      case 'object':
        if (schema.properties) {
          const props = Object.entries(schema.properties)
            .map(([k, v]) => `${k}: ${this.schemaToType(v)}`)
            .join('; ');
          return `{ ${props} }`;
        }
        return 'Record<string, unknown>';
      default:
        return 'unknown';
    }
  }

  /**
   * TypeScript client template
   */
  private typescriptClientTemplate(doc: OpenAPIDocument, config: SDKConfig): string {
    let content = `import { ApiConfig, createApiConfig } from './config';\n\n`;

    // Generate client class
    content += `export class ${this.toPascalCase(config.packageName)}Client {\n`;
    content += `  private config: ApiConfig;\n\n`;
    content += `  constructor(config?: Partial<ApiConfig>) {\n`;
    content += `    this.config = createApiConfig(config);\n`;
    content += `  }\n\n`;

    // Generate methods for each path
    for (const [path, pathItem] of Object.entries(doc.paths)) {
      for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
        const operation = pathItem[method];
        if (!operation) continue;

        const methodName = operation.operationId || this.generateMethodName(method, path);
        content += this.generateMethod(methodName, method.toUpperCase(), path, operation, config);
      }
    }

    // Add request method
    content += this.generateRequestMethod(config);

    content += '}\n';

    return content;
  }

  /**
   * Generate method for operation
   */
  private generateMethod(
    name: string,
    method: string,
    path: string,
    operation: OperationObject,
    config: SDKConfig
  ): string {
    const params = operation.parameters || [];
    const hasBody = !!operation.requestBody;

    let content = `  /**\n   * ${operation.summary || name}\n`;
    if (operation.description) {
      content += `   * ${operation.description}\n`;
    }
    content += `   */\n`;

    // Build method signature
    const paramsList: string[] = [];
    for (const param of params) {
      paramsList.push(`${param.name}${param.required ? '' : '?'}: ${SDKGenerator.schemaToType(param.schema)}`);
    }
    if (hasBody) {
      paramsList.push('body: unknown');
    }

    content += `  async ${name}(${paramsList.join(', ')}): Promise<unknown> {\n`;

    // Build URL with path parameters
    let urlExpr = `'${path}'`;
    for (const param of params.filter(p => p.in === 'path')) {
      urlExpr = urlExpr.replace(`{${param.name}}`, `' + encodeURIComponent(String(${param.name})) + '`);
    }
    urlExpr = urlExpr.replace(/'' \+ /g, '').replace(/ \+ ''$/g, '');

    // Build query string
    const queryParams = params.filter(p => p.in === 'query');
    if (queryParams.length > 0) {
      content += `    const query = new URLSearchParams();\n`;
      for (const param of queryParams) {
        content += `    if (${param.name} !== undefined) query.set('${param.name}', String(${param.name}));\n`;
      }
      content += `    const queryStr = query.toString();\n`;
      content += `    const url = ${urlExpr} + (queryStr ? '?' + queryStr : '');\n`;
    } else {
      content += `    const url = ${urlExpr};\n`;
    }

    content += `    return this.request('${method}', url${hasBody ? ', body' : ''});\n`;
    content += `  }\n\n`;

    return content;
  }

  /**
   * Generate base request method
   */
  private generateRequestMethod(config: SDKConfig): string {
    if (config.options.useFetch) {
      return `
  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = this.config.baseUrl + path;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers
    };

    if (this.config.apiKey) {
      headers['Authorization'] = \`Bearer \${this.config.apiKey}\`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(\`API error: \${response.status} \${response.statusText}\`);
    }

    return response.json();
  }
`;
    }

    return `
  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    // Implementation depends on HTTP client choice
    throw new Error('Not implemented');
  }
`;
  }

  /**
   * TypeScript config template
   */
  private typescriptConfigTemplate(config: SDKConfig): string {
    return `export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export function createApiConfig(config?: Partial<ApiConfig>): ApiConfig {
  return {
    baseUrl: config?.baseUrl || '',
    apiKey: config?.apiKey,
    timeout: config?.timeout || 30000,
    headers: config?.headers || {}
  };
}
`;
  }

  /**
   * Generate model index
   */
  private generateModelIndex(names: string[]): string {
    return names.map(name => `export * from './${name}';`).join('\n') + '\n';
  }

  /**
   * Generate package.json
   */
  private generatePackageJson(config: SDKConfig): string {
    return JSON.stringify({
      name: config.packageName,
      version: config.version,
      main: 'client.js',
      types: 'client.d.ts',
      scripts: {
        build: 'tsc',
        test: 'jest'
      },
      dependencies: this.getDependencies(config)
    }, null, 2);
  }

  /**
   * Generate README
   */
  private generateReadme(doc: OpenAPIDocument, config: SDKConfig): string {
    return `# ${config.packageName}

${doc.info.description || ''}

## Installation

\`\`\`bash
npm install ${config.packageName}
\`\`\`

## Usage

\`\`\`typescript
import { ${this.toPascalCase(config.packageName)}Client } from '${config.packageName}';

const client = new ${this.toPascalCase(config.packageName)}Client({
  baseUrl: '${doc.servers?.[0]?.url || 'https://api.example.com'}',
  apiKey: 'your-api-key'
});

// Example usage
const result = await client.someMethod();
\`\`\`

## API Documentation

See [API Reference](${doc.externalDocs?.url || '#'})

## License

${doc.info.license?.name || 'MIT'}
`;
  }

  /**
   * Get dependencies
   */
  private getDependencies(config: SDKConfig): Record<string, string> {
    const deps: Record<string, string> = {};

    if (config.language === 'typescript') {
      deps['typescript'] = '^5.0.0';
    }

    return deps;
  }

  /**
   * Generate method name from path
   */
  private generateMethodName(method: string, path: string): string {
    const parts = path.split('/').filter(p => p && !p.startsWith('{'));
    return method + parts.map(p => this.toPascalCase(p)).join('');
  }

  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join('');
  }
}

interface SDKTemplate {
  modelTemplate: (name: string, schema: SchemaObject) => string;
  clientTemplate: (doc: OpenAPIDocument, config: SDKConfig) => string;
  configTemplate: (config: SDKConfig) => string;
}

// ============================================================================
// PART 6: API KEY MANAGER
// ============================================================================

/**
 * API Key Manager
 *
 * Manages API keys with rate limiting tiers.
 */
export class APIKeyManager {
  private keys: Map<string, APIKey> = new Map();
  private tierLimits: Map<APITier, RateLimitConfig> = new Map();

  constructor() {
    this.initializeTiers();
  }

  /**
   * Initialize tier rate limits
   */
  private initializeTiers(): void {
    this.tierLimits.set('free', {
      requestsPerSecond: 1,
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    });

    this.tierLimits.set('basic', {
      requestsPerSecond: 10,
      requestsPerMinute: 300,
      requestsPerHour: 10000,
      requestsPerDay: 100000
    });

    this.tierLimits.set('professional', {
      requestsPerSecond: 50,
      requestsPerMinute: 1000,
      requestsPerHour: 50000,
      requestsPerDay: 500000
    });

    this.tierLimits.set('enterprise', {
      requestsPerSecond: 200,
      requestsPerMinute: 5000,
      requestsPerHour: 200000,
      requestsPerDay: 2000000
    });
  }

  /**
   * Create new API key
   */
  createKey(name: string, owner: string, tier: APITier, permissions: string[] = ['read']): APIKey {
    const key = this.generateKey();
    const id = `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const apiKey: APIKey = {
      id,
      key,
      name,
      tier,
      owner,
      createdAt: Date.now(),
      permissions,
      rateLimit: this.tierLimits.get(tier)!,
      usageStats: {
        totalRequests: 0,
        requestsToday: 0,
        requestsThisMonth: 0
      }
    };

    this.keys.set(key, apiKey);
    console.log(`[APIKey] Created key: ${name} (${tier})`);

    return apiKey;
  }

  /**
   * Validate API key
   */
  validateKey(key: string): { valid: boolean; apiKey?: APIKey; error?: string } {
    const apiKey = this.keys.get(key);

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
      return { valid: false, error: 'API key expired' };
    }

    return { valid: true, apiKey };
  }

  /**
   * Check rate limit
   */
  checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
    const apiKey = this.keys.get(key);
    if (!apiKey) {
      return { allowed: false };
    }

    const now = Date.now();
    const stats = apiKey.usageStats;

    // Simple rate limiting check (per minute)
    // In production, use proper sliding window or token bucket
    if (stats.lastRequestAt) {
      const timeSinceLastRequest = now - stats.lastRequestAt;
      const minInterval = 60000 / apiKey.rateLimit.requestsPerMinute;

      if (timeSinceLastRequest < minInterval) {
        return { allowed: false, retryAfter: Math.ceil((minInterval - timeSinceLastRequest) / 1000) };
      }
    }

    return { allowed: true };
  }

  /**
   * Record request
   */
  recordRequest(key: string): void {
    const apiKey = this.keys.get(key);
    if (apiKey) {
      apiKey.usageStats.totalRequests++;
      apiKey.usageStats.requestsToday++;
      apiKey.usageStats.requestsThisMonth++;
      apiKey.usageStats.lastRequestAt = Date.now();
    }
  }

  /**
   * Get usage stats
   */
  getUsageStats(key: string): UsageStats | undefined {
    return this.keys.get(key)?.usageStats;
  }

  /**
   * Revoke key
   */
  revokeKey(key: string): boolean {
    return this.keys.delete(key);
  }

  /**
   * Generate secure key
   */
  private generateKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'rng_'; // Ring prefix
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }
}

// ============================================================================
// PART 7: DOCUMENTATION GENERATOR
// ============================================================================

/**
 * Documentation Generator
 *
 * Generates HTML documentation from OpenAPI specs (Redoc-style).
 */
export class DocumentationGenerator {
  /**
   * Generate HTML documentation
   */
  generateHTML(doc: OpenAPIDocument, options?: { theme?: Partial<DocTheme> }): string {
    const theme = {
      primaryColor: options?.theme?.primaryColor || '#0066cc',
      secondaryColor: options?.theme?.secondaryColor || '#f5f5f5',
      fontFamily: options?.theme?.fontFamily || 'system-ui, sans-serif'
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.info.title} - API Documentation</title>
  <style>
    :root {
      --primary: ${theme.primaryColor};
      --secondary: ${theme.secondaryColor};
      --font: ${theme.fontFamily};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font); line-height: 1.6; color: #333; }
    .container { display: flex; min-height: 100vh; }
    .sidebar { width: 300px; background: var(--secondary); padding: 20px; overflow-y: auto; }
    .content { flex: 1; padding: 40px; max-width: 900px; }
    h1 { color: var(--primary); margin-bottom: 10px; }
    h2 { color: #444; border-bottom: 2px solid var(--primary); padding-bottom: 10px; margin: 30px 0 20px; }
    h3 { color: #555; margin: 20px 0 10px; }
    .method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-right: 10px; }
    .get { background: #61affe; color: white; }
    .post { background: #49cc90; color: white; }
    .put { background: #fca130; color: white; }
    .delete { background: #f93e3e; color: white; }
    .patch { background: #50e3c2; color: white; }
    .endpoint { background: #f8f8f8; padding: 15px; margin: 15px 0; border-radius: 8px; border: 1px solid #e0e0e0; }
    .path { font-family: monospace; font-size: 14px; }
    .description { color: #666; margin: 10px 0; }
    .nav-item { padding: 8px 0; cursor: pointer; }
    .nav-item:hover { color: var(--primary); }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 8px; overflow-x: auto; }
    code { font-family: 'Monaco', 'Menlo', monospace; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; border: 1px solid #e0e0e0; text-align: left; }
    th { background: var(--secondary); }
    .tag { display: inline-block; background: var(--primary); color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin: 2px; }
  </style>
</head>
<body>
  <div class="container">
    <nav class="sidebar">
      <h1>${doc.info.title}</h1>
      <p>Version: ${doc.info.version}</p>
      ${this.generateNavigation(doc)}
    </nav>
    <main class="content">
      ${this.generateContent(doc)}
    </main>
  </div>
</body>
</html>`;
  }

  /**
   * Generate navigation
   */
  private generateNavigation(doc: OpenAPIDocument): string {
    let nav = '<div style="margin-top: 20px;">';

    if (doc.tags) {
      for (const tag of doc.tags) {
        nav += `<div class="nav-item"><strong>${tag.name}</strong></div>`;
      }
    }

    for (const [path, pathItem] of Object.entries(doc.paths)) {
      for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
        const operation = pathItem[method];
        if (operation) {
          nav += `<div class="nav-item"><span class="method ${method}">${method.toUpperCase()}</span> ${path}</div>`;
        }
      }
    }

    nav += '</div>';
    return nav;
  }

  /**
   * Generate main content
   */
  private generateContent(doc: OpenAPIDocument): string {
    let content = '';

    // Info section
    content += `<section>
      <h2>Overview</h2>
      <p>${doc.info.description || ''}</p>
      ${doc.info.contact ? `<p>Contact: ${doc.info.contact.name} (${doc.info.contact.email})</p>` : ''}
      ${doc.info.license ? `<p>License: ${doc.info.license.name}</p>` : ''}
    </section>`;

    // Servers
    if (doc.servers && doc.servers.length > 0) {
      content += '<section><h2>Servers</h2>';
      for (const server of doc.servers) {
        content += `<div class="endpoint">
          <code>${server.url}</code>
          <p class="description">${server.description || ''}</p>
        </div>`;
      }
      content += '</section>';
    }

    // Endpoints
    content += '<section><h2>Endpoints</h2>';

    for (const [path, pathItem] of Object.entries(doc.paths)) {
      for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
        const operation = pathItem[method];
        if (operation) {
          content += this.generateEndpoint(path, method, operation);
        }
      }
    }

    content += '</section>';

    // Schemas
    if (doc.components?.schemas) {
      content += '<section><h2>Schemas</h2>';
      for (const [name, schema] of Object.entries(doc.components.schemas)) {
        content += this.generateSchema(name, schema);
      }
      content += '</section>';
    }

    return content;
  }

  /**
   * Generate endpoint documentation
   */
  private generateEndpoint(path: string, method: string, operation: OperationObject): string {
    let html = `<div class="endpoint">
      <div>
        <span class="method ${method}">${method.toUpperCase()}</span>
        <span class="path">${path}</span>
      </div>
      <h3>${operation.summary || ''}</h3>
      <p class="description">${operation.description || ''}</p>`;

    // Tags
    if (operation.tags) {
      html += '<div>' + operation.tags.map(t => `<span class="tag">${t}</span>`).join('') + '</div>';
    }

    // Parameters
    if (operation.parameters && operation.parameters.length > 0) {
      html += '<h4>Parameters</h4><table><tr><th>Name</th><th>In</th><th>Required</th><th>Type</th><th>Description</th></tr>';
      for (const param of operation.parameters) {
        html += `<tr>
          <td><code>${param.name}</code></td>
          <td>${param.in}</td>
          <td>${param.required ? 'Yes' : 'No'}</td>
          <td>${param.schema.type || 'string'}</td>
          <td>${param.description || ''}</td>
        </tr>`;
      }
      html += '</table>';
    }

    // Request body
    if (operation.requestBody) {
      html += '<h4>Request Body</h4>';
      html += `<p>${operation.requestBody.description || ''}</p>`;
    }

    // Responses
    html += '<h4>Responses</h4><table><tr><th>Status</th><th>Description</th></tr>';
    for (const [status, response] of Object.entries(operation.responses)) {
      html += `<tr><td>${status}</td><td>${response.description}</td></tr>`;
    }
    html += '</table>';

    html += '</div>';
    return html;
  }

  /**
   * Generate schema documentation
   */
  private generateSchema(name: string, schema: SchemaObject): string {
    let html = `<div class="endpoint">
      <h3>${name}</h3>
      <p class="description">${schema.description || ''}</p>`;

    if (schema.properties) {
      html += '<table><tr><th>Property</th><th>Type</th><th>Required</th><th>Description</th></tr>';
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const required = schema.required?.includes(propName) ? 'Yes' : 'No';
        html += `<tr>
          <td><code>${propName}</code></td>
          <td>${propSchema.type || propSchema.$ref?.split('/').pop() || 'unknown'}</td>
          <td>${required}</td>
          <td>${propSchema.description || ''}</td>
        </tr>`;
      }
      html += '</table>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Generate Markdown documentation
   */
  generateMarkdown(doc: OpenAPIDocument): string {
    let md = `# ${doc.info.title}\n\n`;
    md += `Version: ${doc.info.version}\n\n`;
    md += `${doc.info.description || ''}\n\n`;

    // Endpoints
    md += '## Endpoints\n\n';

    for (const [path, pathItem] of Object.entries(doc.paths)) {
      for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
        const operation = pathItem[method];
        if (operation) {
          md += `### ${method.toUpperCase()} ${path}\n\n`;
          md += `${operation.summary || ''}\n\n`;
          md += `${operation.description || ''}\n\n`;

          if (operation.parameters && operation.parameters.length > 0) {
            md += '**Parameters:**\n\n';
            md += '| Name | In | Required | Type | Description |\n';
            md += '|------|-----|----------|------|-------------|\n';
            for (const param of operation.parameters) {
              md += `| ${param.name} | ${param.in} | ${param.required ? 'Yes' : 'No'} | ${param.schema.type} | ${param.description || ''} |\n`;
            }
            md += '\n';
          }

          md += '**Responses:**\n\n';
          md += '| Status | Description |\n';
          md += '|--------|-------------|\n';
          for (const [status, response] of Object.entries(operation.responses)) {
            md += `| ${status} | ${response.description} |\n`;
          }
          md += '\n---\n\n';
        }
      }
    }

    return md;
  }
}

// ============================================================================
// PART 8: INTEGRATED API PLATFORM
// ============================================================================

/**
 * Integrated API Documentation & Management Platform
 *
 * Unified platform for Ring spam detection API.
 */
export class IntegratedAPIPlatform {
  public openAPIBuilder: OpenAPIBuilder;
  public asyncAPIBuilder: AsyncAPIBuilder;
  public versionManager: APIVersionManager;
  public sdkGenerator: SDKGenerator;
  public keyManager: APIKeyManager;
  public docGenerator: DocumentationGenerator;

  constructor() {
    this.openAPIBuilder = new OpenAPIBuilder('Ring Spam Detection API', '1.0.0');
    this.asyncAPIBuilder = new AsyncAPIBuilder('Ring WebRTC Events', '1.0.0');
    this.versionManager = new APIVersionManager('path');
    this.sdkGenerator = new SDKGenerator();
    this.keyManager = new APIKeyManager();
    this.docGenerator = new DocumentationGenerator();

    this.setupRingAPI();
  }

  /**
   * Setup Ring spam detection API
   */
  private setupRingAPI(): void {
    // Build OpenAPI spec
    this.openAPIBuilder
      .description('Ring WebRTC spam call elimination platform API')
      .contact('Ring API Team', 'api@ring.example.com', 'https://ring.example.com')
      .license('MIT', 'https://opensource.org/licenses/MIT')
      .server('https://api.ring.example.com/v1', 'Production')
      .server('https://staging-api.ring.example.com/v1', 'Staging')
      .tag('spam', 'Spam detection and reporting')
      .tag('calls', 'Call management')
      .tag('blocklist', 'Blocklist management')
      .schema('SpamReport', {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Report ID' },
          phoneNumber: { type: 'string', description: 'Reported phone number' },
          reason: { type: 'string', enum: ['scam', 'telemarketing', 'robocall', 'other'] },
          description: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['phoneNumber', 'reason']
      })
      .schema('SpamScore', {
        type: 'object',
        properties: {
          phoneNumber: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 1 },
          isSpam: { type: 'boolean' },
          confidence: { type: 'number' }
        }
      })
      .securityScheme('apiKey', {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API key for authentication'
      })
      .security({ apiKey: [] })
      .post('/spam/check', {
        operationId: 'checkSpam',
        summary: 'Check spam score for a phone number',
        tags: ['spam'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  phoneNumber: { type: 'string' }
                },
                required: ['phoneNumber']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Spam score result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SpamScore' }
              }
            }
          }
        }
      })
      .post('/spam/report', {
        operationId: 'reportSpam',
        summary: 'Report a spam call',
        tags: ['spam'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SpamReport' }
            }
          }
        },
        responses: {
          '201': { description: 'Report created' },
          '400': { description: 'Invalid request' }
        }
      })
      .get('/blocklist', {
        operationId: 'getBlocklist',
        summary: 'Get user blocklist',
        tags: ['blocklist'],
        responses: {
          '200': {
            description: 'Blocklist entries',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      });

    // Build AsyncAPI spec for WebRTC events
    this.asyncAPIBuilder
      .description('Ring WebRTC real-time events for spam detection')
      .server('production', 'wss://ws.ring.example.com', 'websocket', 'Production WebSocket server')
      .channel('calls/incoming', {
        description: 'Incoming call events',
        messages: {
          incomingCall: {
            name: 'IncomingCall',
            summary: 'New incoming call notification',
            payload: {
              type: 'object',
              properties: {
                callId: { type: 'string' },
                callerNumber: { type: 'string' },
                spamScore: { type: 'number' },
                timestamp: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      })
      .channel('spam/detection', {
        description: 'Real-time spam detection events',
        messages: {
          spamDetected: {
            name: 'SpamDetected',
            summary: 'Spam call detected',
            payload: {
              type: 'object',
              properties: {
                callId: { type: 'string' },
                score: { type: 'number' },
                action: { type: 'string', enum: ['block', 'warn', 'allow'] }
              }
            }
          }
        }
      });

    // Register API versions
    this.versionManager.registerVersion({
      version: 'v1',
      status: 'current',
      releaseDate: '2025-01-01',
      changelog: [
        { date: '2025-01-01', type: 'added', description: 'Initial release' }
      ]
    });

    console.log('[APIPlatform] Ring API platform initialized');
  }

  /**
   * Get OpenAPI specification
   */
  getOpenAPISpec(): OpenAPIDocument {
    return this.openAPIBuilder.build();
  }

  /**
   * Get AsyncAPI specification
   */
  getAsyncAPISpec(): AsyncAPIDocument {
    return this.asyncAPIBuilder.build();
  }

  /**
   * Generate SDK
   */
  generateSDK(language: SDKLanguage = 'typescript'): GeneratedSDK {
    return this.sdkGenerator.generate(this.getOpenAPISpec(), {
      language,
      packageName: 'ring-api-client',
      version: '1.0.0',
      outputDir: './sdk',
      options: {
        generateModels: true,
        generateClients: true,
        generateDocs: true,
        useFetch: true,
        asyncAwait: true
      }
    });
  }

  /**
   * Generate HTML documentation
   */
  generateDocs(): string {
    return this.docGenerator.generateHTML(this.getOpenAPISpec());
  }

  /**
   * Create API key
   */
  createAPIKey(name: string, owner: string, tier: APITier = 'free'): APIKey {
    return this.keyManager.createKey(name, owner, tier, ['read', 'write']);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  OpenAPIBuilder,
  AsyncAPIBuilder,
  APIVersionManager,
  SDKGenerator,
  APIKeyManager,
  DocumentationGenerator,
  IntegratedAPIPlatform
};
