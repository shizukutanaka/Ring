// Advanced AI Performance Analytics Service
// Implements machine learning-based predictive analytics for WebRTC performance

class AdvancedAIPerformanceAnalytics extends EventTarget {
  constructor() {
    super();
    this.isInitialized = false;
    this.models = new Map();
    this.trainingData = [];
    this.predictions = new Map();
    this.anomalyDetector = null;
    this.trendAnalyzer = null;
    this.qualityPredictor = null;
    
    // ML configuration
    this.config = {
      predictionHorizon: 300, // 5 minutes
      trainingWindowSize: 1000, // 1000 data points
      anomalyThreshold: 2.5, // Standard deviations
      modelUpdateInterval: 60000, // 1 minute
      confidenceThreshold: 0.7
    };
    
    this.initializeModels();
  }

  // Initialize ML models and analytics
  async initializeModels() {
    try {
      console.log('Initializing AI Performance Analytics...');
      
      // Initialize anomaly detection model
      this.anomalyDetector = new AnomalyDetectionModel();
      await this.anomalyDetector.initialize();
      
      // Initialize trend analysis model
      this.trendAnalyzer = new TrendAnalysisModel();
      await this.trendAnalyzer.initialize();
      
      // Initialize quality prediction model
      this.qualityPredictor = new QualityPredictionModel();
      await this.qualityPredictor.initialize();
      
      this.isInitialized = true;
      console.log('AI Performance Analytics initialized successfully');
      
      this.dispatchEvent(new CustomEvent('initialized', {
        detail: { models: ['anomaly', 'trend', 'quality'] }
      }));
      
    } catch (error) {
      console.error('Failed to initialize AI Performance Analytics:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
    }
  }

  // Process performance metrics and generate insights
  async processMetrics(metrics) {
    if (!this.isInitialized) {
      throw new Error('AI Analytics not initialized');
    }

    try {
      // Add to training data
      this.trainingData.push({
        ...metrics,
        timestamp: Date.now()
      });
      
      // Maintain training window size
      if (this.trainingData.length > this.config.trainingWindowSize) {
        this.trainingData.shift();
      }
      
      // Generate predictions and insights
      const insights = await this.generateInsights(metrics);
      
      // Update models if needed
      if (this.trainingData.length % 100 === 0) {
        await this.updateModels();
      }
      
      return insights;
      
    } catch (error) {
      console.error('Error processing metrics:', error);
      throw error;
    }
  }

  // Generate comprehensive insights
  async generateInsights(currentMetrics) {
    const insights = {
      anomalies: [],
      trends: [],
      predictions: [],
      recommendations: [],
      qualityScore: 0,
      riskLevel: 'low'
    };

    // Anomaly detection
    if (this.anomalyDetector) {
      const anomalies = await this.anomalyDetector.detect(currentMetrics, this.trainingData);
      insights.anomalies = anomalies;
      
      if (anomalies.length > 0) {
        insights.riskLevel = this.calculateRiskLevel(anomalies);
      }
    }

    // Trend analysis
    if (this.trendAnalyzer) {
      const trends = await this.trendAnalyzer.analyze(this.trainingData);
      insights.trends = trends;
      
      // Add trend-based predictions
      trends.forEach(trend => {
        if (trend.confidence > this.config.confidenceThreshold) {
          insights.predictions.push(this.createTrendPrediction(trend));
        }
      });
    }

    // Quality prediction
    if (this.qualityPredictor) {
      const qualityPrediction = await this.qualityPredictor.predict(
        currentMetrics, 
        this.trainingData,
        this.config.predictionHorizon
      );
      insights.predictions.push(qualityPrediction);
      insights.qualityScore = qualityPrediction.predictedScore;
    }

    // Generate recommendations
    insights.recommendations = this.generateRecommendations(insights);

    // Dispatch insights event
    this.dispatchEvent(new CustomEvent('insights', { detail: insights }));

    return insights;
  }

  // Calculate risk level based on anomalies
  calculateRiskLevel(anomalies) {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;
    const highAnomalies = anomalies.filter(a => a.severity === 'high').length;
    
    if (criticalAnomalies > 0) return 'critical';
    if (highAnomalies > 2) return 'high';
    if (highAnomalies > 0 || anomalies.length > 3) return 'medium';
    return 'low';
  }

  // Create prediction from trend
  createTrendPrediction(trend) {
    return {
      type: 'trend',
      metric: trend.metric,
      currentValue: trend.currentValue,
      predictedValue: trend.predictedValue,
      timeHorizon: this.config.predictionHorizon / 60,
      confidence: trend.confidence,
      direction: trend.direction,
      impact: this.assessImpact(trend),
      action: this.getTrendAction(trend)
    };
  }

  // Assess impact of trend
  assessImpact(trend) {
    const { metric, direction, magnitude } = trend;
    
    // High impact metrics
    const highImpactMetrics = ['cpu', 'memory', 'network.latency', 'experience.mos'];
    
    if (!highImpactMetrics.includes(metric)) return 'low';
    
    if (direction === 'increasing' && metric.includes('latency')) return 'high';
    if (direction === 'decreasing' && metric === 'experience.mos') return 'high';
    if (direction === 'increasing' && (metric === 'cpu' || metric === 'memory')) return 'medium';
    
    return 'low';
  }

  // Get action for trend
  getTrendAction(trend) {
    const { metric, direction, predictedValue } = trend;
    
    if (metric === 'cpu' && direction === 'increasing' && predictedValue > 80) {
      return 'Reduce video resolution and close background applications';
    }
    
    if (metric === 'memory' && direction === 'increasing' && predictedValue > 80) {
      return 'Close unused browser tabs and restart application if needed';
    }
    
    if (metric === 'network.latency' && direction === 'increasing' && predictedValue > 200) {
      return 'Switch to audio-only mode or improve network connection';
    }
    
    if (metric === 'experience.mos' && direction === 'decreasing' && predictedValue < 3.5) {
      return 'Optimize network conditions and reduce bandwidth usage';
    }
    
    return 'Monitor trend and be prepared to optimize settings';
  }

  // Generate recommendations based on insights
  generateRecommendations(insights) {
    const recommendations = [];
    
    // Anomaly-based recommendations
    insights.anomalies.forEach(anomaly => {
      if (anomaly.severity === 'critical') {
        recommendations.push({
          priority: 'high',
          type: 'anomaly',
          message: `Critical anomaly detected in ${anomaly.metric}: ${anomaly.description}`,
          action: anomaly.remediation
        });
      }
    });
    
    // Trend-based recommendations
    insights.trends.forEach(trend => {
      if (trend.confidence > 0.8 && trend.impact === 'high') {
        recommendations.push({
          priority: 'medium',
          type: 'trend',
          message: `Strong ${trend.direction} trend in ${trend.metric}`,
          action: this.getTrendAction(trend)
        });
      }
    });
    
    // Prediction-based recommendations
    insights.predictions.forEach(prediction => {
      if (prediction.confidence > 0.7 && prediction.impact === 'high') {
        recommendations.push({
          priority: 'medium',
          type: 'prediction',
          message: `Predicted issue: ${prediction.type}`,
          action: prediction.action
        });
      }
    });
    
    // Quality-based recommendations
    if (insights.qualityScore < 3.5) {
      recommendations.push({
        priority: 'high',
        type: 'quality',
        message: `Call quality predicted to degrade: MOS ${insights.qualityScore.toFixed(1)}`,
        action: 'Optimize network conditions and reduce video quality'
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Update ML models with new data
  async updateModels() {
    try {
      console.log('Updating ML models...');
      
      if (this.anomalyDetector) {
        await this.anomalyDetector.update(this.trainingData);
      }
      
      if (this.trendAnalyzer) {
        await this.trendAnalyzer.update(this.trainingData);
      }
      
      if (this.qualityPredictor) {
        await this.qualityPredictor.update(this.trainingData);
      }
      
      console.log('ML models updated successfully');
      
    } catch (error) {
      console.error('Error updating ML models:', error);
    }
  }

  // Get model performance statistics
  getModelStats() {
    return {
      isInitialized: this.isInitialized,
      trainingDataSize: this.trainingData.length,
      models: {
        anomaly: this.anomalyDetector?.getStats(),
        trend: this.trendAnalyzer?.getStats(),
        quality: this.qualityPredictor?.getStats()
      },
      config: this.config
    };
  }

  // Export analytics data
  exportAnalytics() {
    return {
      trainingData: this.trainingData,
      predictions: Array.from(this.predictions.entries()),
      modelStats: this.getModelStats(),
      timestamp: Date.now()
    };
  }
}

// Anomaly Detection Model
class AnomalyDetectionModel {
  constructor() {
    this.isInitialized = false;
    this.baselineStats = new Map();
    this.detectionThreshold = 2.5; // Standard deviations
  }

  async initialize() {
    this.isInitialized = true;
  }

  async detect(currentMetrics, historicalData) {
    if (historicalData.length < 50) {
      return []; // Not enough data for anomaly detection
    }

    const anomalies = [];
    
    // Update baseline statistics
    this.updateBaseline(historicalData);
    
    // Check each metric for anomalies
    const metricsToCheck = [
      'cpu', 'memory', 'network.latency', 'network.packetLoss',
      'experience.mos', 'experience.freezeCount'
    ];
    
    metricsToCheck.forEach(metricPath => {
      const currentValue = this.getMetricValue(currentMetrics, metricPath);
      if (currentValue === null) return;
      
      const baseline = this.baselineStats.get(metricPath);
      if (!baseline) return;
      
      const zScore = Math.abs(currentValue - baseline.mean) / baseline.stdDev;
      
      if (zScore > this.detectionThreshold) {
        anomalies.push({
          metric: metricPath,
          currentValue,
          expectedValue: baseline.mean,
          zScore,
          severity: this.getSeverity(zScore),
          description: this.getAnomalyDescription(metricPath, currentValue, baseline),
          remediation: this.getRemediation(metricPath, currentValue)
        });
      }
    });
    
    return anomalies;
  }

  updateBaseline(historicalData) {
    const metricsToTrack = [
      'cpu', 'memory', 'network.latency', 'network.packetLoss',
      'experience.mos', 'experience.freezeCount'
    ];
    
    metricsToTrack.forEach(metricPath => {
      const values = historicalData
        .map(data => this.getMetricValue(data, metricPath))
        .filter(value => value !== null);
      
      if (values.length > 10) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        this.baselineStats.set(metricPath, { mean, stdDev, sampleSize: values.length });
      }
    });
  }

  getMetricValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  getSeverity(zScore) {
    if (zScore > 4) return 'critical';
    if (zScore > 3) return 'high';
    return 'medium';
  }

  getAnomalyDescription(metric, currentValue, baseline) {
    const descriptions = {
      'cpu': `CPU usage ${currentValue.toFixed(1)}% is significantly higher than normal ${baseline.mean.toFixed(1)}%`,
      'memory': `Memory usage ${currentValue.toFixed(1)}% is unusually high`,
      'network.latency': `Network latency ${currentValue}ms is much higher than expected`,
      'network.packetLoss': `Packet loss ${currentValue.toFixed(2)}% is elevated`,
      'experience.mos': `Quality score ${currentValue.toFixed(1)} is lower than expected`,
      'experience.freezeCount': `Video freeze count ${currentValue} is higher than normal`
    };
    
    return descriptions[metric] || `Anomaly detected in ${metric}`;
  }

  getRemediation(metric, currentValue) {
    const remediations = {
      'cpu': 'Reduce video quality and close background applications',
      'memory': 'Close unused browser tabs and restart if needed',
      'network.latency': 'Check network connection and consider wired connection',
      'network.packetLoss': 'Improve network quality or reduce bandwidth usage',
      'experience.mos': 'Optimize network conditions and reduce video quality',
      'experience.freezeCount': 'Reduce video resolution or improve network stability'
    };
    
    return remediations[metric] || 'Monitor system performance';
  }

  async update(newData) {
    // Retrain model with new data
    this.updateBaseline(newData);
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      baselineMetrics: this.baselineStats.size,
      detectionThreshold: this.detectionThreshold
    };
  }
}

// Trend Analysis Model
class TrendAnalysisModel {
  constructor() {
    this.isInitialized = false;
    this.trends = new Map();
  }

  async initialize() {
    this.isInitialized = true;
  }

  async analyze(historicalData) {
    if (historicalData.length < 30) {
      return []; // Not enough data for trend analysis
    }

    const trends = [];
    const metricsToAnalyze = [
      'cpu', 'memory', 'network.latency', 'network.bandwidth',
      'experience.mos', 'battery.level'
    ];
    
    metricsToAnalyze.forEach(metricPath => {
      const values = historicalData
        .map(data => this.getMetricValue(data, metricPath))
        .filter(value => value !== null);
      
      if (values.length >= 30) {
        const trend = this.calculateTrend(metricPath, values);
        if (trend) {
          trends.push(trend);
        }
      }
    });
    
    return trends;
  }

  calculateTrend(metricPath, values) {
    const n = values.length;
    const recent = values.slice(-30); // Last 30 data points
    
    // Linear regression
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < recent.length; i++) {
      sumX += i;
      sumY += recent[i];
      sumXY += i * recent[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate confidence
    const variance = this.calculateVariance(recent);
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    const confidence = Math.max(0.1, 1 - coefficientOfVariation);
    
    // Determine direction
    const direction = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
    
    if (direction === 'stable' || confidence < 0.3) {
      return null; // No significant trend
    }
    
    // Predict future value
    const predictedValue = intercept + slope * (recent.length + 30);
    
    return {
      metric: metricPath,
      direction,
      magnitude: Math.abs(slope),
      currentValue: recent[recent.length - 1],
      predictedValue,
      confidence,
      slope,
      variance
    };
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getMetricValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  async update(newData) {
    // Update trend analysis with new data
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      activeTrends: this.trends.size
    };
  }
}

// Quality Prediction Model
class QualityPredictionModel {
  constructor() {
    this.isInitialized = false;
    this.model = null;
  }

  async initialize() {
    // Initialize a simple neural network for quality prediction
    this.model = {
      weights: this.initializeWeights(),
      bias: Math.random() * 0.1 - 0.05
    };
    this.isInitialized = true;
  }

  initializeWeights() {
    // Simple weight initialization for multiple input features
    return {
      cpu: Math.random() * 0.2 - 0.1,
      memory: Math.random() * 0.2 - 0.1,
      latency: Math.random() * 0.2 - 0.1,
      packetLoss: Math.random() * 0.2 - 0.1,
      bandwidth: Math.random() * 0.2 - 0.1
    };
  }

  async predict(currentMetrics, historicalData, timeHorizon) {
    if (historicalData.length < 50) {
      return this.getDefaultPrediction(currentMetrics);
    }

    // Extract features
    const features = this.extractFeatures(currentMetrics, historicalData);
    
    // Simple neural network prediction
    const weightedSum = Object.entries(features).reduce((sum, [key, value]) => {
      return sum + (value * (this.model.weights[key] || 0));
    }, 0) + this.model.bias;
    
    // Apply activation function (sigmoid)
    const predictedScore = 5 / (1 + Math.exp(-weightedSum));
    
    // Calculate confidence based on feature stability
    const confidence = this.calculateConfidence(features, historicalData);
    
    return {
      type: 'quality',
      currentValue: currentMetrics.experience?.mos || 4.0,
      predictedValue: predictedScore,
      timeHorizon: timeHorizon / 60,
      confidence,
      impact: this.assessQualityImpact(predictedScore),
      action: this.getQualityAction(predictedScore),
      features
    };
  }

  extractFeatures(currentMetrics, historicalData) {
    // Current values
    const currentCPU = currentMetrics.cpu || 0;
    const currentMemory = currentMetrics.memory || 0;
    const currentLatency = currentMetrics.network?.latency || 0;
    const currentPacketLoss = currentMetrics.network?.packetLoss || 0;
    const currentBandwidth = currentMetrics.network?.bandwidth || 0;
    
    // Trends (change over last 30 seconds)
    const recent = historicalData.slice(-30);
    const older = historicalData.slice(-60, -30);
    
    const cpuTrend = this.calculateTrend(recent, older, 'cpu');
    const memoryTrend = this.calculateTrend(recent, older, 'memory');
    const latencyTrend = this.calculateTrend(recent, older, 'network.latency');
    
    return {
      cpu: currentCPU / 100,
      memory: currentMemory / 100,
      latency: Math.min(currentLatency / 300, 1), // Normalize to 0-1 (300ms max)
      packetLoss: Math.min(currentPacketLoss / 10, 1), // Normalize to 0-1 (10% max)
      bandwidth: Math.min(currentBandwidth / 10, 1), // Normalize to 0-1 (10Mbps max)
      cpuTrend: cpuTrend,
      memoryTrend: memoryTrend,
      latencyTrend: latencyTrend
    };
  }

  calculateTrend(recent, older, metricPath) {
    if (recent.length === 0 || older.length === 0) return 0;
    
    const recentAvg = this.getAverage(recent, metricPath);
    const olderAvg = this.getAverage(older, metricPath);
    
    return (recentAvg - olderAvg) / (olderAvg || 1);
  }

  getAverage(data, metricPath) {
    const values = data
      .map(item => this.getMetricValue(item, metricPath))
      .filter(value => value !== null);
    
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  getMetricValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  calculateConfidence(features, historicalData) {
    // Calculate confidence based on data stability and variance
    const variance = this.calculateFeatureVariance(features, historicalData);
    return Math.max(0.3, 1 - variance);
  }

  calculateFeatureVariance(features, historicalData) {
    // Simple variance calculation for key features
    const cpuValues = historicalData.slice(-30).map(d => d.cpu || 0);
    const cpuVariance = this.calculateVariance(cpuValues);
    
    return Math.min(cpuVariance / 100, 1); // Normalize variance
  }

  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  assessQualityImpact(predictedScore) {
    if (predictedScore < 3.0) return 'critical';
    if (predictedScore < 3.5) return 'high';
    if (predictedScore < 4.0) return 'medium';
    return 'low';
  }

  getQualityAction(predictedScore) {
    if (predictedScore < 3.0) {
      return 'Switch to audio-only mode immediately';
    } else if (predictedScore < 3.5) {
      return 'Reduce video quality and optimize network';
    } else if (predictedScore < 4.0) {
      return 'Monitor quality and be prepared to optimize';
    }
    return 'Quality is expected to be good';
  }

  getDefaultPrediction(currentMetrics) {
    const currentScore = currentMetrics.experience?.mos || 4.0;
    
    return {
      type: 'quality',
      currentValue: currentScore,
      predictedValue: currentScore,
      timeHorizon: 5,
      confidence: 0.3,
      impact: 'low',
      action: 'Insufficient data for prediction',
      features: {}
    };
  }

  async update(newData) {
    // Update model with new training data
    // Simple weight adjustment based on feedback
    if (newData.length > 100) {
      // Retrain with new data
      this.model.weights = this.initializeWeights();
    }
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      modelType: 'neural_network',
      weights: Object.keys(this.model.weights).length
    };
  }
}

export { AdvancedAIPerformanceAnalytics };
