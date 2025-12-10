// Blockchain-based Audit Trail Service for Call Recording
// Provides immutable verification and audit capabilities

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class BlockchainAuditService {
  constructor() {
    this.chain = [];
    this.difficulty = 4; // Mining difficulty
    this.pendingRecords = [];
    this.auditLog = [];
    this.genesisBlock = null;
    
    // Initialize blockchain
    this.initializeBlockchain();
  }

  // Initialize blockchain with genesis block
  initializeBlockchain() {
    if (!this.genesisBlock) {
      this.genesisBlock = this.createGenesisBlock();
      this.chain.push(this.genesisBlock);
      console.log('Blockchain initialized with genesis block');
    }
  }

  // Create genesis block
  createGenesisBlock() {
    return {
      index: 0,
      timestamp: Date.now(),
      records: [],
      previousHash: '0',
      hash: this.calculateHash({ index: 0, timestamp: Date.now(), records: [], previousHash: '0' }),
      nonce: 0
    };
  }

  // Calculate hash for a block
  calculateHash(block) {
    const data = JSON.stringify(block);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Mine a new block (Proof of Work)
  mineBlock(block) {
    const target = Array(this.difficulty + 1).join('0');
    
    while (block.hash.substring(0, this.difficulty) !== target) {
      block.nonce++;
      block.hash = this.calculateHash(block);
    }
    
    console.log(`Block mined: ${block.hash}`);
    return block;
  }

  // Get latest block
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  // Add audit record to pending queue
  addAuditRecord(record) {
    const auditRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: record.type, // 'call_start', 'call_end', 'recording_access', 'consent_given', etc.
      sessionId: record.sessionId,
      participantId: record.participantId,
      data: record.data,
      metadata: {
        userAgent: record.userAgent,
        ipAddress: record.ipAddress,
        location: record.location,
        device: record.device
      },
      signature: this.signRecord(record)
    };
    
    this.pendingRecords.push(auditRecord);
    
    // Mine block if we have enough pending records
    if (this.pendingRecords.length >= 10) {
      this.minePendingRecords();
    }
    
    return auditRecord.id;
  }

  // Sign audit record
  signRecord(record) {
    const data = JSON.stringify(record);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Mine pending records into a new block
  minePendingRecords() {
    if (this.pendingRecords.length === 0) return null;
    
    const newBlock = {
      index: this.chain.length,
      timestamp: Date.now(),
      records: [...this.pendingRecords],
      previousHash: this.getLatestBlock().hash,
      hash: '',
      nonce: 0
    };
    
    // Mine the block
    const minedBlock = this.mineBlock(newBlock);
    
    // Add to chain
    this.chain.push(minedBlock);
    
    // Clear pending records
    const minedRecords = [...this.pendingRecords];
    this.pendingRecords = [];
    
    // Log mining event
    this.logAuditEvent('BLOCK_MINED', {
      blockIndex: minedBlock.index,
      recordCount: minedRecords.length,
      hash: minedBlock.hash
    });
    
    return minedBlock;
  }

  // Verify blockchain integrity
  verifyChain() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      // Verify current block hash
      const recalculatedHash = this.calculateHash(currentBlock);
      if (currentBlock.hash !== recalculatedHash) {
        return {
          valid: false,
          error: `Hash mismatch at block ${i}`,
          blockIndex: i
        };
      }
      
      // Verify chain linkage
      if (currentBlock.previousHash !== previousBlock.hash) {
        return {
          valid: false,
          error: `Chain linkage broken at block ${i}`,
          blockIndex: i
        };
      }
    }
    
    return { valid: true };
  }

  // Get audit trail for a session
  getSessionAuditTrail(sessionId) {
    const trail = [];
    
    this.chain.forEach(block => {
      block.records.forEach(record => {
        if (record.sessionId === sessionId) {
          trail.push({
            ...record,
            blockIndex: block.index,
            blockHash: block.hash,
            timestamp: record.timestamp
          });
        }
      });
    });
    
    // Check pending records too
    this.pendingRecords.forEach(record => {
      if (record.sessionId === sessionId) {
        trail.push({
          ...record,
          blockIndex: 'pending',
          blockHash: 'pending',
          timestamp: record.timestamp
        });
      }
    });
    
    return trail.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Verify specific record
  verifyRecord(recordId) {
    // Search in blockchain
    for (const block of this.chain) {
      const record = block.records.find(r => r.id === recordId);
      if (record) {
        const expectedSignature = this.signRecord({
          type: record.type,
          sessionId: record.sessionId,
          participantId: record.participantId,
          data: record.data,
          userAgent: record.metadata.userAgent,
          ipAddress: record.metadata.ipAddress,
          location: record.metadata.location,
          device: record.metadata.device
        });
        
        return {
          found: true,
          valid: record.signature === expectedSignature,
          blockIndex: block.index,
          blockHash: block.hash,
          record
        };
      }
    }
    
    // Check pending records
    const pendingRecord = this.pendingRecords.find(r => r.id === recordId);
    if (pendingRecord) {
      return {
        found: true,
        valid: true, // Pending records are assumed valid
        blockIndex: 'pending',
        blockHash: 'pending',
        record: pendingRecord
      };
    }
    
    return { found: false };
  }

  // Get blockchain statistics
  getBlockchainStats() {
    const totalRecords = this.chain.reduce((sum, block) => sum + block.records.length, 0);
    const pendingCount = this.pendingRecords.length;
    
    // Calculate average block time
    let avgBlockTime = 0;
    if (this.chain.length > 1) {
      const totalTime = this.chain[this.chain.length - 1].timestamp - this.genesisBlock.timestamp;
      avgBlockTime = totalTime / (this.chain.length - 1);
    }
    
    return {
      totalBlocks: this.chain.length,
      totalRecords,
      pendingRecords: pendingCount,
      avgBlockTime,
      difficulty: this.difficulty,
      lastBlockHash: this.getLatestBlock().hash,
      chainValid: this.verifyChain().valid
    };
  }

  // Export blockchain for backup
  exportBlockchain() {
    const exportData = {
      chain: this.chain,
      pendingRecords: this.pendingRecords,
      exportedAt: Date.now(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Import blockchain from backup
  importBlockchain(exportData) {
    try {
      const data = JSON.parse(exportData);
      
      // Verify imported chain
      this.chain = data.chain;
      this.pendingRecords = data.pendingRecords || [];
      
      const verification = this.verifyChain();
      if (!verification.valid) {
        throw new Error(`Imported chain is invalid: ${verification.error}`);
      }
      
      console.log('Blockchain imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import blockchain:', error);
      return false;
    }
  }

  // Create audit report
  createAuditReport(sessionId, options = {}) {
    const trail = this.getSessionAuditTrail(sessionId);
    const stats = this.getBlockchainStats();
    
    const report = {
      sessionId,
      generatedAt: Date.now(),
      options,
      
      summary: {
        totalEvents: trail.length,
        timeRange: trail.length > 0 ? {
          start: trail[0].timestamp,
          end: trail[trail.length - 1].timestamp
        } : null,
        participants: [...new Set(trail.map(r => r.participantId))],
        eventTypes: [...new Set(trail.map(r => r.type))]
      },
      
      events: trail,
      
      verification: {
        chainValid: stats.chainValid,
        lastVerifiedBlock: this.chain.length - 1,
        verificationTimestamp: Date.now()
      },
      
      blockchain: {
        totalBlocks: stats.totalBlocks,
        totalRecords: stats.totalRecords,
        difficulty: stats.difficulty
      }
    };
    
    return report;
  }

  // Smart contract-like functionality: consent verification
  verifyConsentCompliance(sessionId) {
    const trail = this.getSessionAuditTrail(sessionId);
    
    const consentEvents = trail.filter(r => r.type === 'consent_given');
    const recordingEvents = trail.filter(r => r.type === 'recording_start');
    
    // Check if consent was given before recording started
    const compliance = {
      compliant: true,
      issues: []
    };
    
    recordingEvents.forEach(recording => {
      const priorConsent = consentEvents.find(consent => 
        consent.timestamp < recording.timestamp && 
        consent.participantId === recording.participantId
      );
      
      if (!priorConsent) {
        compliance.compliant = false;
        compliance.issues.push({
          type: 'missing_consent',
          participantId: recording.participantId,
          recordingStart: recording.timestamp,
          message: 'Recording started without proper consent'
        });
      }
    });
    
    return compliance;
  }

  // Smart contract-like functionality: data retention check
  verifyDataRetention(sessionId, maxRetentionDays = 30) {
    const trail = this.getSessionAuditTrail(sessionId);
    const now = Date.now();
    const maxRetentionMs = maxRetentionDays * 24 * 60 * 60 * 1000;
    
    const retentionIssues = [];
    
    trail.forEach(record => {
      const age = now - record.timestamp;
      if (age > maxRetentionMs) {
        retentionIssues.push({
          recordId: record.id,
          recordType: record.type,
          age: age,
          maxRetention: maxRetentionMs,
          message: 'Record exceeds maximum retention period'
        });
      }
    });
    
    return {
      compliant: retentionIssues.length === 0,
      issues: retentionIssues,
      maxRetentionDays
    };
  }

  // Log audit events
  logAuditEvent(eventType, data) {
    const event = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: eventType,
      data,
      service: 'BlockchainAuditService'
    };
    
    this.auditLog.push(event);
    
    // Keep audit log manageable
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  // Get audit log
  getAuditLog(options = {}) {
    let filtered = [...this.auditLog];
    
    if (options.eventType) {
      filtered = filtered.filter(event => event.type === options.eventType);
    }
    
    if (options.since) {
      filtered = filtered.filter(event => event.timestamp >= options.since);
    }
    
    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Advanced: Merkle tree verification for large datasets
  createMerkleTree(records) {
    if (records.length === 0) return null;
    
    const hashRecord = (record) => {
      return crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex');
    };
    
    let tree = records.map(hashRecord);
    
    while (tree.length > 1) {
      const newLevel = [];
      for (let i = 0; i < tree.length; i += 2) {
        const left = tree[i];
        const right = tree[i + 1] || left;
        const combined = crypto.createHash('sha256').update(left + right).digest('hex');
        newLevel.push(combined);
      }
      tree = newLevel;
    }
    
    return tree[0]; // Merkle root
  }

  // Verify Merkle proof
  verifyMerkleProof(record, merkleRoot, proof) {
    let hash = crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex');
    
    for (const [siblingHash, isLeft] of proof) {
      if (isLeft) {
        hash = crypto.createHash('sha256').update(siblingHash + hash).digest('hex');
      } else {
        hash = crypto.createHash('sha256').update(hash + siblingHash).digest('hex');
      }
    }
    
    return hash === merkleRoot;
  }

  // Integration with external audit systems
  exportForExternalAudit() {
    const exportData = {
      blockchain: this.exportBlockchain(),
      auditLog: this.getAuditLog(),
      statistics: this.getBlockchainStats(),
      exportedAt: Date.now(),
      integrity: this.verifyChain()
    };
    
    return exportData;
  }

  // Cleanup old data (if needed for storage management)
  cleanupOldData(maxAge = 365 * 24 * 60 * 60 * 1000) { // 1 year default
    const now = Date.now();
    const cutoffTime = now - maxAge;
    
    // Note: In a real blockchain, you wouldn't delete old blocks
    // This is for audit log cleanup only
    const originalLength = this.auditLog.length;
    this.auditLog = this.auditLog.filter(event => event.timestamp > cutoffTime);
    
    const cleaned = originalLength - this.auditLog.length;
    if (cleaned > 0) {
      this.logAuditEvent('AUDIT_CLEANUP', {
        recordsRemoved: cleaned,
        cutoffTime,
        remainingRecords: this.auditLog.length
      });
    }
    
    return cleaned;
  }
}

module.exports = new BlockchainAuditService();
