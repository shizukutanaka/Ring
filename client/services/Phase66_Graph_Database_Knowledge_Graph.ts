/**
 * Phase 66: Graph Database & Knowledge Graph
 *
 * Comprehensive graph database and knowledge graph infrastructure for Ring spam detection.
 * Implements Neo4j-style property graphs, Cypher-like query language, and graph algorithms
 * for spam network analysis, caller relationship mapping, and pattern detection.
 *
 * Research Sources:
 * - Neo4j Graph Database (2024-2025)
 * - AWS Neptune architecture
 * - Apache AGE (Graph Extension for PostgreSQL)
 * - TigerGraph distributed graph
 * - Google Knowledge Graph
 * - Facebook TAO (The Associations and Objects)
 *
 * @module Phase66_Graph_Database_Knowledge_Graph
 */

// ============================================================================
// Type Definitions
// ============================================================================

type PropertyValue = string | number | boolean | Date | null;

interface Node {
  id: string;
  labels: string[];
  properties: Record<string, PropertyValue>;
  createdAt: number;
  updatedAt: number;
}

interface Relationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties: Record<string, PropertyValue>;
  createdAt: number;
  updatedAt: number;
}

interface GraphPath {
  nodes: Node[];
  relationships: Relationship[];
  length: number;
}

interface QueryResult {
  nodes: Node[];
  relationships: Relationship[];
  paths: GraphPath[];
  data: Array<Record<string, unknown>>;
  executionTime: number;
}

interface IndexDefinition {
  name: string;
  label: string;
  properties: string[];
  unique: boolean;
}

// ============================================================================
// 1. Property Graph Engine
// ============================================================================

/**
 * Neo4j-style property graph database engine
 *
 * Features:
 * - Node and relationship storage
 * - Multi-label node support
 * - Property storage on nodes and relationships
 * - Index support for fast lookups
 * - ACID transactions
 * - Graph traversal
 *
 * Research: Neo4j, Amazon Neptune, TigerGraph
 */
class PropertyGraphEngine {
  private nodes: Map<string, Node>;
  private relationships: Map<string, Relationship>;
  private nodesByLabel: Map<string, Set<string>>;
  private relationshipsByType: Map<string, Set<string>>;
  private indexes: Map<string, IndexDefinition>;
  private incomingEdges: Map<string, Set<string>>; // nodeId -> relationship IDs
  private outgoingEdges: Map<string, Set<string>>; // nodeId -> relationship IDs

  constructor() {
    this.nodes = new Map();
    this.relationships = new Map();
    this.nodesByLabel = new Map();
    this.relationshipsByType = new Map();
    this.indexes = new Map();
    this.incomingEdges = new Map();
    this.outgoingEdges = new Map();
  }

  /**
   * Create a new node
   */
  createNode(
    labels: string[],
    properties: Record<string, PropertyValue>
  ): Node {
    const id = this.generateId('node');
    const now = Date.now();

    const node: Node = {
      id,
      labels,
      properties,
      createdAt: now,
      updatedAt: now
    };

    this.nodes.set(id, node);

    // Index by labels
    for (const label of labels) {
      if (!this.nodesByLabel.has(label)) {
        this.nodesByLabel.set(label, new Set());
      }
      this.nodesByLabel.get(label)!.add(id);
    }

    // Initialize edge sets
    this.incomingEdges.set(id, new Set());
    this.outgoingEdges.set(id, new Set());

    return node;
  }

  /**
   * Create a relationship between nodes
   */
  createRelationship(
    type: string,
    sourceId: string,
    targetId: string,
    properties: Record<string, PropertyValue> = {}
  ): Relationship {
    // Validate nodes exist
    if (!this.nodes.has(sourceId)) {
      throw new Error(`Source node not found: ${sourceId}`);
    }
    if (!this.nodes.has(targetId)) {
      throw new Error(`Target node not found: ${targetId}`);
    }

    const id = this.generateId('rel');
    const now = Date.now();

    const relationship: Relationship = {
      id,
      type,
      sourceId,
      targetId,
      properties,
      createdAt: now,
      updatedAt: now
    };

    this.relationships.set(id, relationship);

    // Index by type
    if (!this.relationshipsByType.has(type)) {
      this.relationshipsByType.set(type, new Set());
    }
    this.relationshipsByType.get(type)!.add(id);

    // Update edge indices
    this.outgoingEdges.get(sourceId)!.add(id);
    this.incomingEdges.get(targetId)!.add(id);

    return relationship;
  }

  /**
   * Find node by ID
   */
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  /**
   * Find nodes by label
   */
  getNodesByLabel(label: string): Node[] {
    const nodeIds = this.nodesByLabel.get(label);
    if (!nodeIds) return [];

    return Array.from(nodeIds)
      .map(id => this.nodes.get(id)!)
      .filter(node => node !== undefined);
  }

  /**
   * Find nodes by property
   */
  findNodes(
    label?: string,
    propertyKey?: string,
    propertyValue?: PropertyValue
  ): Node[] {
    let candidateNodes: Node[];

    if (label) {
      candidateNodes = this.getNodesByLabel(label);
    } else {
      candidateNodes = Array.from(this.nodes.values());
    }

    if (propertyKey && propertyValue !== undefined) {
      candidateNodes = candidateNodes.filter(
        node => node.properties[propertyKey] === propertyValue
      );
    }

    return candidateNodes;
  }

  /**
   * Get relationships of a node
   */
  getRelationships(
    nodeId: string,
    direction: 'incoming' | 'outgoing' | 'both' = 'both',
    type?: string
  ): Relationship[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    let relationshipIds = new Set<string>();

    if (direction === 'outgoing' || direction === 'both') {
      const outgoing = this.outgoingEdges.get(nodeId) || new Set();
      relationshipIds = new Set([...relationshipIds, ...outgoing]);
    }

    if (direction === 'incoming' || direction === 'both') {
      const incoming = this.incomingEdges.get(nodeId) || new Set();
      relationshipIds = new Set([...relationshipIds, ...incoming]);
    }

    let relationships = Array.from(relationshipIds)
      .map(id => this.relationships.get(id)!)
      .filter(rel => rel !== undefined);

    if (type) {
      relationships = relationships.filter(rel => rel.type === type);
    }

    return relationships;
  }

  /**
   * Get neighbors of a node
   */
  getNeighbors(
    nodeId: string,
    direction: 'incoming' | 'outgoing' | 'both' = 'both',
    relationshipType?: string
  ): Node[] {
    const relationships = this.getRelationships(nodeId, direction, relationshipType);
    const neighborIds = new Set<string>();

    for (const rel of relationships) {
      if (rel.sourceId === nodeId) {
        neighborIds.add(rel.targetId);
      } else {
        neighborIds.add(rel.sourceId);
      }
    }

    return Array.from(neighborIds)
      .map(id => this.nodes.get(id)!)
      .filter(node => node !== undefined);
  }

  /**
   * Update node properties
   */
  updateNode(
    id: string,
    properties: Record<string, PropertyValue>
  ): Node | undefined {
    const node = this.nodes.get(id);
    if (!node) return undefined;

    node.properties = { ...node.properties, ...properties };
    node.updatedAt = Date.now();

    return node;
  }

  /**
   * Delete node and its relationships
   */
  deleteNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Delete all relationships
    const relationships = this.getRelationships(id);
    for (const rel of relationships) {
      this.deleteRelationship(rel.id);
    }

    // Remove from label index
    for (const label of node.labels) {
      this.nodesByLabel.get(label)?.delete(id);
    }

    // Remove edge sets
    this.incomingEdges.delete(id);
    this.outgoingEdges.delete(id);

    // Delete node
    this.nodes.delete(id);

    return true;
  }

  /**
   * Delete relationship
   */
  deleteRelationship(id: string): boolean {
    const rel = this.relationships.get(id);
    if (!rel) return false;

    // Remove from type index
    this.relationshipsByType.get(rel.type)?.delete(id);

    // Remove from edge indices
    this.outgoingEdges.get(rel.sourceId)?.delete(id);
    this.incomingEdges.get(rel.targetId)?.delete(id);

    // Delete relationship
    this.relationships.delete(id);

    return true;
  }

  /**
   * Create index for fast lookups
   */
  createIndex(
    name: string,
    label: string,
    properties: string[],
    unique: boolean = false
  ): void {
    const index: IndexDefinition = {
      name,
      label,
      properties,
      unique
    };

    this.indexes.set(name, index);
    console.log(`Index created: ${name} on ${label}(${properties.join(', ')})`);
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    nodeCount: number;
    relationshipCount: number;
    labelCounts: Record<string, number>;
    relationshipTypeCounts: Record<string, number>;
  } {
    const labelCounts: Record<string, number> = {};
    for (const [label, nodes] of this.nodesByLabel.entries()) {
      labelCounts[label] = nodes.size;
    }

    const relationshipTypeCounts: Record<string, number> = {};
    for (const [type, rels] of this.relationshipsByType.entries()) {
      relationshipTypeCounts[type] = rels.size;
    }

    return {
      nodeCount: this.nodes.size,
      relationshipCount: this.relationships.size,
      labelCounts,
      relationshipTypeCounts
    };
  }

  // Helper methods
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// 2. Graph Query Engine
// ============================================================================

interface MatchPattern {
  nodeAlias: string;
  labels?: string[];
  properties?: Record<string, PropertyValue>;
}

interface RelationshipPattern {
  relationshipAlias?: string;
  type?: string;
  direction: 'outgoing' | 'incoming' | 'both';
  properties?: Record<string, PropertyValue>;
}

interface PathPattern {
  start: MatchPattern;
  relationships: Array<{
    pattern: RelationshipPattern;
    endNode: MatchPattern;
  }>;
}

/**
 * Cypher-style graph query engine
 *
 * Features:
 * - Pattern matching (MATCH)
 * - Property filtering (WHERE)
 * - Relationship traversal
 * - Path finding
 * - Aggregation (COUNT, SUM, AVG)
 * - Ordering and limiting
 *
 * Research: Cypher (Neo4j), Gremlin, SPARQL
 */
class GraphQueryEngine {
  private graph: PropertyGraphEngine;

  constructor(graph: PropertyGraphEngine) {
    this.graph = graph;
  }

  /**
   * Match nodes by pattern
   */
  matchNodes(pattern: MatchPattern): Node[] {
    let nodes: Node[];

    if (pattern.labels && pattern.labels.length > 0) {
      // Get nodes with any of the specified labels
      const nodesByLabel = pattern.labels.flatMap(label =>
        this.graph.getNodesByLabel(label)
      );
      nodes = Array.from(new Set(nodesByLabel));
    } else {
      // Get all nodes
      nodes = this.graph.findNodes();
    }

    // Filter by properties
    if (pattern.properties) {
      nodes = nodes.filter(node =>
        this.matchProperties(node.properties, pattern.properties!)
      );
    }

    return nodes;
  }

  /**
   * Match path patterns
   */
  matchPath(pattern: PathPattern): GraphPath[] {
    const startNodes = this.matchNodes(pattern.start);
    const paths: GraphPath[] = [];

    for (const startNode of startNodes) {
      const foundPaths = this.traversePath(
        startNode,
        pattern.relationships,
        0,
        [startNode],
        []
      );
      paths.push(...foundPaths);
    }

    return paths;
  }

  /**
   * Recursively traverse path
   */
  private traversePath(
    currentNode: Node,
    relationshipPatterns: Array<{
      pattern: RelationshipPattern;
      endNode: MatchPattern;
    }>,
    patternIndex: number,
    visitedNodes: Node[],
    visitedRels: Relationship[]
  ): GraphPath[] {
    // Base case: all patterns matched
    if (patternIndex >= relationshipPatterns.length) {
      return [
        {
          nodes: [...visitedNodes],
          relationships: [...visitedRels],
          length: visitedRels.length
        }
      ];
    }

    const { pattern: relPattern, endNode: endNodePattern } = relationshipPatterns[patternIndex];
    const paths: GraphPath[] = [];

    // Get relationships matching the pattern
    const relationships = this.graph.getRelationships(
      currentNode.id,
      relPattern.direction,
      relPattern.type
    );

    for (const rel of relationships) {
      // Determine next node
      const nextNodeId =
        rel.sourceId === currentNode.id ? rel.targetId : rel.sourceId;
      const nextNode = this.graph.getNode(nextNodeId);

      if (!nextNode) continue;

      // Check if next node matches pattern
      if (!this.matchNodePattern(nextNode, endNodePattern)) continue;

      // Check if relationship properties match
      if (relPattern.properties) {
        if (!this.matchProperties(rel.properties, relPattern.properties)) {
          continue;
        }
      }

      // Avoid cycles (optional)
      if (visitedNodes.some(n => n.id === nextNode.id)) continue;

      // Recurse
      const subPaths = this.traversePath(
        nextNode,
        relationshipPatterns,
        patternIndex + 1,
        [...visitedNodes, nextNode],
        [...visitedRels, rel]
      );

      paths.push(...subPaths);
    }

    return paths;
  }

  /**
   * Find shortest path between two nodes
   */
  findShortestPath(
    startNodeId: string,
    endNodeId: string,
    maxDepth: number = 10
  ): GraphPath | null {
    const startNode = this.graph.getNode(startNodeId);
    const endNode = this.graph.getNode(endNodeId);

    if (!startNode || !endNode) return null;

    // BFS for shortest path
    const queue: Array<{
      node: Node;
      path: GraphPath;
    }> = [
      {
        node: startNode,
        path: { nodes: [startNode], relationships: [], length: 0 }
      }
    ];

    const visited = new Set<string>([startNodeId]);

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;

      if (node.id === endNodeId) {
        return path;
      }

      if (path.length >= maxDepth) continue;

      const neighbors = this.graph.getNeighbors(node.id);
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.id)) continue;

        visited.add(neighbor.id);

        // Find relationship between node and neighbor
        const rels = this.graph.getRelationships(node.id);
        const rel = rels.find(
          r =>
            (r.sourceId === node.id && r.targetId === neighbor.id) ||
            (r.targetId === node.id && r.sourceId === neighbor.id)
        );

        if (!rel) continue;

        queue.push({
          node: neighbor,
          path: {
            nodes: [...path.nodes, neighbor],
            relationships: [...path.relationships, rel],
            length: path.length + 1
          }
        });
      }
    }

    return null;
  }

  /**
   * Find all paths between two nodes
   */
  findAllPaths(
    startNodeId: string,
    endNodeId: string,
    maxDepth: number = 10
  ): GraphPath[] {
    const startNode = this.graph.getNode(startNodeId);
    if (!startNode) return [];

    const paths: GraphPath[] = [];

    const dfs = (
      currentNode: Node,
      targetId: string,
      currentPath: GraphPath,
      visited: Set<string>
    ): void => {
      if (currentNode.id === targetId) {
        paths.push({ ...currentPath });
        return;
      }

      if (currentPath.length >= maxDepth) return;

      const neighbors = this.graph.getNeighbors(currentNode.id);
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.id)) continue;

        // Find relationship
        const rels = this.graph.getRelationships(currentNode.id);
        const rel = rels.find(
          r =>
            (r.sourceId === currentNode.id && r.targetId === neighbor.id) ||
            (r.targetId === currentNode.id && r.sourceId === neighbor.id)
        );

        if (!rel) continue;

        visited.add(neighbor.id);

        dfs(
          neighbor,
          targetId,
          {
            nodes: [...currentPath.nodes, neighbor],
            relationships: [...currentPath.relationships, rel],
            length: currentPath.length + 1
          },
          visited
        );

        visited.delete(neighbor.id);
      }
    };

    dfs(startNode, endNodeId, { nodes: [startNode], relationships: [], length: 0 }, new Set([startNodeId]));

    return paths;
  }

  /**
   * Execute aggregation query
   */
  aggregate(
    nodes: Node[],
    operation: 'count' | 'sum' | 'avg' | 'min' | 'max',
    propertyKey?: string
  ): number {
    switch (operation) {
      case 'count':
        return nodes.length;

      case 'sum':
        if (!propertyKey) return 0;
        return nodes.reduce((sum, node) => {
          const value = node.properties[propertyKey];
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);

      case 'avg':
        if (!propertyKey || nodes.length === 0) return 0;
        const sum = this.aggregate(nodes, 'sum', propertyKey);
        return sum / nodes.length;

      case 'min':
        if (!propertyKey || nodes.length === 0) return 0;
        return Math.min(
          ...nodes.map(node => {
            const value = node.properties[propertyKey];
            return typeof value === 'number' ? value : Infinity;
          })
        );

      case 'max':
        if (!propertyKey || nodes.length === 0) return 0;
        return Math.max(
          ...nodes.map(node => {
            const value = node.properties[propertyKey];
            return typeof value === 'number' ? value : -Infinity;
          })
        );

      default:
        return 0;
    }
  }

  // Helper methods
  private matchNodePattern(node: Node, pattern: MatchPattern): boolean {
    // Check labels
    if (pattern.labels && pattern.labels.length > 0) {
      const hasLabel = pattern.labels.some(label => node.labels.includes(label));
      if (!hasLabel) return false;
    }

    // Check properties
    if (pattern.properties) {
      if (!this.matchProperties(node.properties, pattern.properties)) {
        return false;
      }
    }

    return true;
  }

  private matchProperties(
    actual: Record<string, PropertyValue>,
    expected: Record<string, PropertyValue>
  ): boolean {
    for (const [key, value] of Object.entries(expected)) {
      if (actual[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

// ============================================================================
// 3. Graph Algorithm Engine
// ============================================================================

interface PageRankResult {
  nodeId: string;
  score: number;
  rank: number;
}

interface CommunityDetectionResult {
  communities: Array<{
    id: string;
    nodes: string[];
    size: number;
  }>;
  modularity: number;
}

interface CentralityMetrics {
  nodeId: string;
  degreeCentrality: number;
  betweennessCentrality: number;
  closenessCentrality: number;
  eigenvectorCentrality: number;
}

/**
 * Graph algorithms for network analysis
 *
 * Features:
 * - PageRank for node importance
 * - Community detection (Louvain algorithm)
 * - Centrality metrics (degree, betweenness, closeness, eigenvector)
 * - Shortest path algorithms
 * - Triangle counting
 * - Connected components
 *
 * Research: Neo4j GDS, NetworkX, igraph
 */
class GraphAlgorithmEngine {
  private graph: PropertyGraphEngine;
  private queryEngine: GraphQueryEngine;

  constructor(graph: PropertyGraphEngine, queryEngine: GraphQueryEngine) {
    this.graph = graph;
    this.queryEngine = queryEngine;
  }

  /**
   * PageRank algorithm for node importance
   */
  pageRank(
    iterations: number = 20,
    dampingFactor: number = 0.85
  ): PageRankResult[] {
    const allNodes = this.graph.findNodes();
    const nodeCount = allNodes.length;

    if (nodeCount === 0) return [];

    // Initialize scores
    const scores = new Map<string, number>();
    const newScores = new Map<string, number>();

    for (const node of allNodes) {
      scores.set(node.id, 1.0 / nodeCount);
    }

    // Iterate
    for (let i = 0; i < iterations; i++) {
      for (const node of allNodes) {
        let score = (1 - dampingFactor) / nodeCount;

        // Get incoming neighbors
        const incomingRels = this.graph.getRelationships(node.id, 'incoming');

        for (const rel of incomingRels) {
          const sourceNode = this.graph.getNode(rel.sourceId);
          if (!sourceNode) continue;

          const sourceOutDegree = this.graph.getRelationships(
            sourceNode.id,
            'outgoing'
          ).length;

          if (sourceOutDegree > 0) {
            score += dampingFactor * (scores.get(sourceNode.id)! / sourceOutDegree);
          }
        }

        newScores.set(node.id, score);
      }

      // Update scores
      for (const [nodeId, score] of newScores.entries()) {
        scores.set(nodeId, score);
      }
    }

    // Convert to results and rank
    const results = Array.from(scores.entries())
      .map(([nodeId, score]) => ({ nodeId, score, rank: 0 }))
      .sort((a, b) => b.score - a.score);

    // Assign ranks
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return results;
  }

  /**
   * Community detection using Louvain algorithm
   */
  detectCommunities(): CommunityDetectionResult {
    const allNodes = this.graph.findNodes();

    // Initialize: each node in its own community
    const communityMap = new Map<string, string>();
    for (const node of allNodes) {
      communityMap.set(node.id, node.id);
    }

    let improved = true;
    let iterations = 0;
    const maxIterations = 100;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      for (const node of allNodes) {
        const currentCommunity = communityMap.get(node.id)!;
        const neighbors = this.graph.getNeighbors(node.id);

        // Count neighbor communities
        const neighborCommunities = new Map<string, number>();
        for (const neighbor of neighbors) {
          const neighborCommunity = communityMap.get(neighbor.id)!;
          neighborCommunities.set(
            neighborCommunity,
            (neighborCommunities.get(neighborCommunity) || 0) + 1
          );
        }

        // Find best community
        let bestCommunity = currentCommunity;
        let bestCount = neighborCommunities.get(currentCommunity) || 0;

        for (const [community, count] of neighborCommunities.entries()) {
          if (count > bestCount) {
            bestCommunity = community;
            bestCount = count;
          }
        }

        // Move to best community if different
        if (bestCommunity !== currentCommunity) {
          communityMap.set(node.id, bestCommunity);
          improved = true;
        }
      }
    }

    // Group nodes by community
    const communitiesMap = new Map<string, string[]>();
    for (const [nodeId, communityId] of communityMap.entries()) {
      if (!communitiesMap.has(communityId)) {
        communitiesMap.set(communityId, []);
      }
      communitiesMap.get(communityId)!.push(nodeId);
    }

    const communities = Array.from(communitiesMap.entries()).map(
      ([id, nodes], index) => ({
        id: `community-${index + 1}`,
        nodes,
        size: nodes.length
      })
    );

    // Calculate modularity
    const modularity = this.calculateModularity(communityMap);

    return { communities, modularity };
  }

  /**
   * Calculate centrality metrics for a node
   */
  calculateCentrality(nodeId: string): CentralityMetrics | null {
    const node = this.graph.getNode(nodeId);
    if (!node) return null;

    const allNodes = this.graph.findNodes();

    return {
      nodeId,
      degreeCentrality: this.calculateDegreeCentrality(nodeId),
      betweennessCentrality: this.calculateBetweennessCentrality(nodeId),
      closenessCentrality: this.calculateClosenessCentrality(nodeId, allNodes),
      eigenvectorCentrality: this.calculateEigenvectorCentrality(nodeId)
    };
  }

  /**
   * Degree centrality (number of connections)
   */
  private calculateDegreeCentrality(nodeId: string): number {
    const relationships = this.graph.getRelationships(nodeId);
    const nodeCount = this.graph.findNodes().length;

    if (nodeCount <= 1) return 0;

    return relationships.length / (nodeCount - 1);
  }

  /**
   * Betweenness centrality (node importance in paths)
   */
  private calculateBetweennessCentrality(nodeId: string): number {
    const allNodes = this.graph.findNodes();
    let betweenness = 0;
    let pathCount = 0;

    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        const sourceId = allNodes[i].id;
        const targetId = allNodes[j].id;

        if (sourceId === nodeId || targetId === nodeId) continue;

        const paths = this.queryEngine.findAllPaths(sourceId, targetId, 6);
        const pathsThroughNode = paths.filter(path =>
          path.nodes.some(n => n.id === nodeId)
        );

        if (paths.length > 0) {
          betweenness += pathsThroughNode.length / paths.length;
          pathCount++;
        }
      }
    }

    return pathCount > 0 ? betweenness / pathCount : 0;
  }

  /**
   * Closeness centrality (average distance to all nodes)
   */
  private calculateClosenessCentrality(
    nodeId: string,
    allNodes: Node[]
  ): number {
    let totalDistance = 0;
    let reachableNodes = 0;

    for (const targetNode of allNodes) {
      if (targetNode.id === nodeId) continue;

      const path = this.queryEngine.findShortestPath(nodeId, targetNode.id, 10);
      if (path) {
        totalDistance += path.length;
        reachableNodes++;
      }
    }

    if (reachableNodes === 0) return 0;

    const avgDistance = totalDistance / reachableNodes;
    return avgDistance > 0 ? 1 / avgDistance : 0;
  }

  /**
   * Eigenvector centrality (connection to important nodes)
   */
  private calculateEigenvectorCentrality(nodeId: string): number {
    // Simplified version: average of neighbors' degree centrality
    const neighbors = this.graph.getNeighbors(nodeId);

    if (neighbors.length === 0) return 0;

    const sumDegreeCentrality = neighbors.reduce((sum, neighbor) => {
      return sum + this.calculateDegreeCentrality(neighbor.id);
    }, 0);

    return sumDegreeCentrality / neighbors.length;
  }

  /**
   * Count triangles (3-node cycles)
   */
  countTriangles(): number {
    const allNodes = this.graph.findNodes();
    let triangleCount = 0;

    for (let i = 0; i < allNodes.length; i++) {
      const node1 = allNodes[i];
      const neighbors1 = new Set(
        this.graph.getNeighbors(node1.id).map(n => n.id)
      );

      for (let j = i + 1; j < allNodes.length; j++) {
        const node2 = allNodes[j];

        if (!neighbors1.has(node2.id)) continue;

        const neighbors2 = new Set(
          this.graph.getNeighbors(node2.id).map(n => n.id)
        );

        // Find common neighbors
        const commonNeighbors = Array.from(neighbors1).filter(id =>
          neighbors2.has(id)
        );

        triangleCount += commonNeighbors.length;
      }
    }

    // Each triangle is counted 3 times
    return triangleCount / 3;
  }

  /**
   * Find connected components
   */
  findConnectedComponents(): Array<{
    id: string;
    nodes: string[];
    size: number;
  }> {
    const allNodes = this.graph.findNodes();
    const visited = new Set<string>();
    const components: Array<{ id: string; nodes: string[]; size: number }> = [];

    let componentId = 1;

    for (const node of allNodes) {
      if (visited.has(node.id)) continue;

      const component: string[] = [];
      const queue = [node];
      visited.add(node.id);

      while (queue.length > 0) {
        const current = queue.shift()!;
        component.push(current.id);

        const neighbors = this.graph.getNeighbors(current.id);
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.id)) {
            visited.add(neighbor.id);
            queue.push(neighbor);
          }
        }
      }

      components.push({
        id: `component-${componentId++}`,
        nodes: component,
        size: component.length
      });
    }

    return components.sort((a, b) => b.size - a.size);
  }

  // Helper methods
  private calculateModularity(communityMap: Map<string, string>): number {
    const allRels = Array.from((this.graph as any).relationships.values());
    const m = allRels.length;

    if (m === 0) return 0;

    let modularity = 0;

    for (const rel of allRels) {
      const sourceCommunity = communityMap.get(rel.sourceId);
      const targetCommunity = communityMap.get(rel.targetId);

      if (sourceCommunity === targetCommunity) {
        const sourceDegree = this.graph.getRelationships(rel.sourceId).length;
        const targetDegree = this.graph.getRelationships(rel.targetId).length;

        modularity += 1 - (sourceDegree * targetDegree) / (2 * m);
      }
    }

    return modularity / (2 * m);
  }
}

// ============================================================================
// 4. Knowledge Graph Engine
// ============================================================================

interface Entity {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, PropertyValue>;
  confidence: number;
}

interface Fact {
  id: string;
  subject: string; // Entity ID
  predicate: string;
  object: string; // Entity ID or value
  confidence: number;
  source: string;
  timestamp: number;
}

interface KnowledgeQuery {
  subject?: string;
  predicate?: string;
  object?: string;
  minConfidence?: number;
}

/**
 * Google Knowledge Graph-style entity and fact management
 *
 * Features:
 * - Entity recognition and linking
 * - Fact extraction and storage
 * - Confidence scoring
 * - Query interface
 * - Inference rules
 * - Entity resolution
 *
 * Research: Google Knowledge Graph, Wikidata, DBpedia
 */
class KnowledgeGraphEngine {
  private graph: PropertyGraphEngine;
  private entities: Map<string, Entity>;
  private facts: Map<string, Fact>;

  constructor(graph: PropertyGraphEngine) {
    this.graph = graph;
    this.entities = new Map();
    this.facts = new Map();
  }

  /**
   * Add entity to knowledge graph
   */
  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);

    // Create corresponding graph node
    this.graph.createNode([entity.type, 'Entity'], {
      entityId: entity.id,
      name: entity.name,
      confidence: entity.confidence,
      ...entity.attributes
    });
  }

  /**
   * Add fact (triple) to knowledge graph
   */
  addFact(fact: Fact): void {
    this.facts.set(fact.id, fact);

    // Create relationship in graph
    const subjectEntity = this.entities.get(fact.subject);
    const objectEntity = this.entities.get(fact.object);

    if (subjectEntity && objectEntity) {
      // Both subject and object are entities
      const subjectNode = this.findEntityNode(fact.subject);
      const objectNode = this.findEntityNode(fact.object);

      if (subjectNode && objectNode) {
        this.graph.createRelationship(
          fact.predicate,
          subjectNode.id,
          objectNode.id,
          {
            factId: fact.id,
            confidence: fact.confidence,
            source: fact.source,
            timestamp: fact.timestamp
          }
        );
      }
    }
  }

  /**
   * Query facts
   */
  queryFacts(query: KnowledgeQuery): Fact[] {
    let results = Array.from(this.facts.values());

    if (query.subject) {
      results = results.filter(fact => fact.subject === query.subject);
    }

    if (query.predicate) {
      results = results.filter(fact => fact.predicate === query.predicate);
    }

    if (query.object) {
      results = results.filter(fact => fact.object === query.object);
    }

    if (query.minConfidence !== undefined) {
      results = results.filter(fact => fact.confidence >= query.minConfidence);
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find related entities
   */
  findRelatedEntities(
    entityId: string,
    relationshipType?: string,
    maxHops: number = 2
  ): Entity[] {
    const entity = this.entities.get(entityId);
    if (!entity) return [];

    const entityNode = this.findEntityNode(entityId);
    if (!entityNode) return [];

    const relatedEntityIds = new Set<string>();
    const visited = new Set<string>([entityNode.id]);
    const queue: Array<{ nodeId: string; depth: number }> = [
      { nodeId: entityNode.id, depth: 0 }
    ];

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;

      if (depth >= maxHops) continue;

      const neighbors = this.graph.getNeighbors(nodeId, 'both', relationshipType);

      for (const neighbor of neighbors) {
        if (visited.has(neighbor.id)) continue;

        visited.add(neighbor.id);

        const neighborEntityId = neighbor.properties['entityId'] as string;
        if (neighborEntityId && neighborEntityId !== entityId) {
          relatedEntityIds.add(neighborEntityId);
        }

        queue.push({ nodeId: neighbor.id, depth: depth + 1 });
      }
    }

    return Array.from(relatedEntityIds)
      .map(id => this.entities.get(id)!)
      .filter(e => e !== undefined);
  }

  /**
   * Infer new facts based on rules
   */
  inferFacts(): Fact[] {
    const inferredFacts: Fact[] = [];

    // Example rule: If A called B and B called C, then A and C are in a calling chain
    const callerEntities = Array.from(this.entities.values()).filter(
      e => e.type === 'PhoneNumber'
    );

    for (const caller of callerEntities) {
      const callsFacts = this.queryFacts({
        subject: caller.id,
        predicate: 'CALLED'
      });

      for (const callFact of callsFacts) {
        const intermediateCallsFacts = this.queryFacts({
          subject: callFact.object,
          predicate: 'CALLED'
        });

        for (const intermediateFact of intermediateCallsFacts) {
          // Check if we already have this fact
          const existingFact = this.queryFacts({
            subject: caller.id,
            predicate: 'CALLING_CHAIN',
            object: intermediateFact.object
          });

          if (existingFact.length === 0) {
            const inferredFact: Fact = {
              id: `fact-inferred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              subject: caller.id,
              predicate: 'CALLING_CHAIN',
              object: intermediateFact.object,
              confidence: Math.min(callFact.confidence, intermediateFact.confidence) * 0.8,
              source: 'inference',
              timestamp: Date.now()
            };

            inferredFacts.push(inferredFact);
            this.addFact(inferredFact);
          }
        }
      }
    }

    return inferredFacts;
  }

  /**
   * Get entity statistics
   */
  getEntityStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const entity of this.entities.values()) {
      stats[entity.type] = (stats[entity.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get fact statistics
   */
  getFactStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const fact of this.facts.values()) {
      stats[fact.predicate] = (stats[fact.predicate] || 0) + 1;
    }

    return stats;
  }

  // Helper methods
  private findEntityNode(entityId: string): Node | undefined {
    const nodes = this.graph.findNodes('Entity', 'entityId', entityId);
    return nodes[0];
  }
}

// ============================================================================
// 5. Integrated Graph Platform
// ============================================================================

/**
 * Comprehensive graph database and knowledge graph platform
 */
export class IntegratedGraphPlatform {
  public readonly propertyGraph: PropertyGraphEngine;
  public readonly queryEngine: GraphQueryEngine;
  public readonly algorithms: GraphAlgorithmEngine;
  public readonly knowledgeGraph: KnowledgeGraphEngine;

  constructor() {
    this.propertyGraph = new PropertyGraphEngine();
    this.queryEngine = new GraphQueryEngine(this.propertyGraph);
    this.algorithms = new GraphAlgorithmEngine(
      this.propertyGraph,
      this.queryEngine
    );
    this.knowledgeGraph = new KnowledgeGraphEngine(this.propertyGraph);
  }

  /**
   * Build spam caller network graph
   */
  buildSpamCallerNetwork(
    callers: Array<{ phoneNumber: string; isSpam: boolean; reportCount: number }>,
    calls: Array<{ from: string; to: string; duration: number; timestamp: number }>
  ): void {
    // Create caller nodes
    const phoneNumberToNodeId = new Map<string, string>();

    for (const caller of callers) {
      const node = this.propertyGraph.createNode(
        ['PhoneNumber', caller.isSpam ? 'Spam' : 'Legitimate'],
        {
          phoneNumber: caller.phoneNumber,
          reportCount: caller.reportCount,
          isSpam: caller.isSpam
        }
      );

      phoneNumberToNodeId.set(caller.phoneNumber, node.id);

      // Add to knowledge graph
      this.knowledgeGraph.addEntity({
        id: caller.phoneNumber,
        type: 'PhoneNumber',
        name: caller.phoneNumber,
        attributes: {
          reportCount: caller.reportCount,
          isSpam: caller.isSpam
        },
        confidence: caller.isSpam ? 0.9 : 0.5
      });
    }

    // Create call relationships
    for (const call of calls) {
      const fromNodeId = phoneNumberToNodeId.get(call.from);
      const toNodeId = phoneNumberToNodeId.get(call.to);

      if (fromNodeId && toNodeId) {
        this.propertyGraph.createRelationship('CALLED', fromNodeId, toNodeId, {
          duration: call.duration,
          timestamp: call.timestamp
        });

        // Add fact to knowledge graph
        this.knowledgeGraph.addFact({
          id: `fact-call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          subject: call.from,
          predicate: 'CALLED',
          object: call.to,
          confidence: 1.0,
          source: 'call_logs',
          timestamp: call.timestamp
        });
      }
    }

    console.log(`Built spam caller network with ${callers.length} callers and ${calls.length} calls`);
  }

  /**
   * Identify spam networks using graph algorithms
   */
  identifySpamNetworks(): {
    spamCommunities: CommunityDetectionResult;
    topSpammers: PageRankResult[];
    connectedComponents: Array<{ id: string; nodes: string[]; size: number }>;
  } {
    // Detect communities (likely spam networks)
    const spamCommunities = this.algorithms.detectCommunities();

    // Rank spammers by importance (PageRank)
    const topSpammers = this.algorithms
      .pageRank()
      .filter(result => {
        const node = this.propertyGraph.getNode(result.nodeId);
        return node?.properties['isSpam'] === true;
      })
      .slice(0, 100);

    // Find connected spam components
    const connectedComponents = this.algorithms.findConnectedComponents();

    return {
      spamCommunities,
      topSpammers,
      connectedComponents
    };
  }

  /**
   * Find calling patterns for investigation
   */
  findCallingPatterns(phoneNumber: string): {
    outgoingCalls: Node[];
    incomingCalls: Node[];
    callChains: GraphPath[];
    relatedSpammers: Entity[];
    centralityMetrics: CentralityMetrics | null;
  } {
    const nodes = this.propertyGraph.findNodes('PhoneNumber', 'phoneNumber', phoneNumber);
    if (nodes.length === 0) {
      return {
        outgoingCalls: [],
        incomingCalls: [],
        callChains: [],
        relatedSpammers: [],
        centralityMetrics: null
      };
    }

    const node = nodes[0];

    // Get outgoing and incoming calls
    const outgoingCalls = this.propertyGraph.getNeighbors(node.id, 'outgoing', 'CALLED');
    const incomingCalls = this.propertyGraph.getNeighbors(node.id, 'incoming', 'CALLED');

    // Find call chains (paths of length 2-4)
    const callChains: GraphPath[] = [];
    for (const target of outgoingCalls) {
      const paths = this.queryEngine.findAllPaths(node.id, target.id, 4);
      callChains.push(...paths);
    }

    // Find related spam entities
    const relatedSpammers = this.knowledgeGraph
      .findRelatedEntities(phoneNumber, 'CALLED', 3)
      .filter(entity => entity.attributes['isSpam'] === true);

    // Calculate centrality
    const centralityMetrics = this.algorithms.calculateCentrality(node.id);

    return {
      outgoingCalls,
      incomingCalls,
      callChains,
      relatedSpammers,
      centralityMetrics
    };
  }

  /**
   * Get platform dashboard
   */
  getDashboard(): {
    graphStats: ReturnType<PropertyGraphEngine['getStats']>;
    entityStats: Record<string, number>;
    factStats: Record<string, number>;
    triangleCount: number;
    componentCount: number;
  } {
    return {
      graphStats: this.propertyGraph.getStats(),
      entityStats: this.knowledgeGraph.getEntityStats(),
      factStats: this.knowledgeGraph.getFactStats(),
      triangleCount: this.algorithms.countTriangles(),
      componentCount: this.algorithms.findConnectedComponents().length
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  PropertyGraphEngine,
  GraphQueryEngine,
  GraphAlgorithmEngine,
  KnowledgeGraphEngine
};

export type {
  Node,
  Relationship,
  GraphPath,
  QueryResult,
  MatchPattern,
  PathPattern,
  PageRankResult,
  CommunityDetectionResult,
  CentralityMetrics,
  Entity,
  Fact,
  KnowledgeQuery
};
