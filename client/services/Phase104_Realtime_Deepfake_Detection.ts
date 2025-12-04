/**
 * Phase 104: Real-Time Deepfake Voice Detection with Liveness Verification
 *
 * Competitive Differentiator: Real-time deepfake detection during live calls
 * Market Gap: 1 in 3 Americans got deepfake scam; 91% banks rethinking voice auth
 *
 * Key Features:
 * - Multi-layer deepfake detection (acoustic, semantic, emotional)
 * - Real-time liveness challenges (<50ms latency)
 * - Voice biometric comparison
 * - AI-generated speech detection (TTS, voice cloning)
 * - Explainable AI confidence scoring
 *
 * Research Sources:
 * - Aurigin Apollo: <50ms latency, 97.7% accuracy
 * - Pindrop: Multi-modal detection with liveness
 * - ASVspoof 5 dataset: Adversarial attack scenarios
 * - IEEE: Emotional consistency detection
 * - Applied Cognitive Psychology 2025: Facial/voice emotion analysis
 *
 * Dependencies: Phase 75, 77, 102, 51, 101
 *
 * @author Ring Platform Team
 * @date December 2025
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface AudioSample {
  data: Float32Array; // PCM audio data
  sampleRate: number; // 16kHz or 48kHz
  timestamp: number;
  duration: number; // milliseconds
}

interface AcousticFeatures {
  // Spectral features
  phaseSpectrum: Float32Array; // Phase information
  magnitude: Float32Array; // Magnitude spectrum
  mfcc: Float32Array; // Mel-frequency cepstral coefficients (13 coefficients)
  pitch: number; // F0 fundamental frequency
  spectralCentroid: number; // Center of mass of spectrum
  spectralRolloff: number; // Frequency below which 85% of energy
  zcr: number; // Zero crossing rate

  // Prosodic features
  energy: number; // RMS energy
  tempo: number; // Speech rate
  jitter: number; // Pitch variation
  shimmer: number; // Amplitude variation

  // Advanced features
  gammatoneCepstral: Float32Array; // GTCC (8 coefficients)
  formants: number[]; // F1, F2, F3 formant frequencies
}

interface DeepfakeIndicators {
  // Acoustic anomalies
  unnatural Fluctuations: boolean;
  digitalArtifacts: boolean;
  suspiciousFrequencyPatterns: boolean;
  phaseInconsistency: boolean;
  spectralAnomalies: boolean;

  // AI generation signatures
  ttsSignature: boolean; // Text-to-speech detection
  voiceCloningArtifacts: boolean;
  synthesisArtifacts: boolean;

  // Biometric mismatch
  voiceprintMismatch: boolean;
  speakerInconsistency: boolean;

  // Overall scores
  acousticScore: number; // 0-1 (1 = likely deepfake)
  semanticScore: number;
  emotionalScore: number;
  biometricScore: number;
}

interface LivenessChallenge {
  id: string;
  type: 'repeat_phrase' | 'answer_question' | 'random_word' | 'counting' | 'emotion_expression';
  prompt: string;
  expectedDuration: number; // milliseconds
  semanticContext?: string; // For question answering
  emotionalTarget?: 'joy' | 'anger' | 'surprise' | 'neutral';
  timestamp: number;
}

interface LivenessResponse {
  challengeId: string;
  audioSample: AudioSample;
  transcript: string;
  responseTime: number; // milliseconds
  acousticFeatures: AcousticFeatures;
  semanticMatch: number; // 0-1 how well response matches prompt
  emotionalMatch: number; // 0-1 if emotion expression challenge
}

interface EmotionalFeatures {
  valence: number; // -1 (negative) to +1 (positive)
  arousal: number; // 0 (calm) to 1 (excited)
  dominance: number; // 0 (submissive) to 1 (dominant)
  emotions: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
    disgust: number;
    surprise: number;
    neutral: number;
  };
  consistency: number; // 0-1 emotional consistency over time
}

interface DeepfakeDetectionResult {
  isDeepfake: boolean;
  confidence: number; // 0-1
  latency: number; // milliseconds
  indicators: DeepfakeIndicators;
  explanation: string; // Human-readable explanation
  evidence: {
    acousticAnomalies: string[];
    semanticInconsistencies: string[];
    emotionalMismatches: string[];
    biometricMismatches: string[];
  };
  livenessVerified: boolean;
  trustScore: number; // 0-1 (1 = highly trustworthy)
}

// ============================================================================
// Acoustic Feature Extractor
// ============================================================================

/**
 * Extracts comprehensive acoustic features for deepfake detection
 * Based on ASVspoof 5 dataset and DeepLASD research
 *
 * Features: Phase spectrum, MFCC, GTCC, pitch, formants, prosody
 */
export class AcousticFeatureExtractor {
  private sampleRate: number = 16000;
  private fftSize: number = 2048;
  private hopSize: number = 512;
  private melBands: number = 40;
  private mfccCoefficients: number = 13;
  private gtccCoefficients: number = 8;

  /**
   * Extract all acoustic features from audio sample
   */
  async extractFeatures(audio: AudioSample): Promise<AcousticFeatures> {
    const { data, sampleRate } = audio;
    this.sampleRate = sampleRate;

    // 1. Spectral features
    const spectrum = this.computeFFT(data);
    const phaseSpectrum = this.extractPhase(spectrum);
    const magnitude = this.extractMagnitude(spectrum);

    // 2. MFCC (Mel-frequency cepstral coefficients)
    const mfcc = this.computeMFCC(magnitude);

    // 3. GTCC (Gammatone cepstral coefficients)
    const gammatoneCepstral = this.computeGTCC(data);

    // 4. Pitch estimation
    const pitch = this.estimatePitch(data);

    // 5. Spectral characteristics
    const spectralCentroid = this.computeSpectralCentroid(magnitude);
    const spectralRolloff = this.computeSpectralRolloff(magnitude);

    // 6. Zero crossing rate
    const zcr = this.computeZCR(data);

    // 7. Energy
    const energy = this.computeRMSEnergy(data);

    // 8. Prosodic features
    const tempo = this.estimateTempo(data, pitch);
    const jitter = this.computeJitter(data, pitch);
    const shimmer = this.computeShimmer(data);

    // 9. Formants
    const formants = this.extractFormants(data, pitch);

    return {
      phaseSpectrum,
      magnitude,
      mfcc,
      pitch,
      spectralCentroid,
      spectralRolloff,
      zcr,
      energy,
      tempo,
      jitter,
      shimmer,
      gammatoneCepstral,
      formants
    };
  }

  /**
   * Compute FFT (Fast Fourier Transform)
   */
  private computeFFT(data: Float32Array): Complex[] {
    const n = this.fftSize;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);

    // Copy data with Hamming window
    for (let i = 0; i < Math.min(n, data.length); i++) {
      const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1));
      real[i] = data[i] * window;
    }

    // Simplified FFT (in production, use FFT.js or similar)
    const spectrum: Complex[] = [];
    for (let k = 0; k < n / 2; k++) {
      let realSum = 0;
      let imagSum = 0;
      for (let t = 0; t < n; t++) {
        const angle = (-2 * Math.PI * k * t) / n;
        realSum += real[t] * Math.cos(angle);
        imagSum += real[t] * Math.sin(angle);
      }
      spectrum.push({ real: realSum, imag: imagSum });
    }

    return spectrum;
  }

  /**
   * Extract phase spectrum (key for deepfake detection)
   */
  private extractPhase(spectrum: Complex[]): Float32Array {
    const phase = new Float32Array(spectrum.length);
    for (let i = 0; i < spectrum.length; i++) {
      phase[i] = Math.atan2(spectrum[i].imag, spectrum[i].real);
    }
    return phase;
  }

  /**
   * Extract magnitude spectrum
   */
  private extractMagnitude(spectrum: Complex[]): Float32Array {
    const magnitude = new Float32Array(spectrum.length);
    for (let i = 0; i < spectrum.length; i++) {
      const { real, imag } = spectrum[i];
      magnitude[i] = Math.sqrt(real * real + imag * imag);
    }
    return magnitude;
  }

  /**
   * Compute MFCC (Mel-Frequency Cepstral Coefficients)
   * Standard feature for speech recognition and deepfake detection
   */
  private computeMFCC(magnitude: Float32Array): Float32Array {
    // 1. Apply mel filterbank
    const melSpectrum = this.applyMelFilterbank(magnitude);

    // 2. Log mel spectrum
    for (let i = 0; i < melSpectrum.length; i++) {
      melSpectrum[i] = Math.log(melSpectrum[i] + 1e-10);
    }

    // 3. DCT (Discrete Cosine Transform)
    const mfcc = new Float32Array(this.mfccCoefficients);
    for (let k = 0; k < this.mfccCoefficients; k++) {
      let sum = 0;
      for (let n = 0; n < melSpectrum.length; n++) {
        sum += melSpectrum[n] * Math.cos((Math.PI * k * (n + 0.5)) / melSpectrum.length);
      }
      mfcc[k] = sum;
    }

    return mfcc;
  }

  /**
   * Apply mel filterbank
   */
  private applyMelFilterbank(magnitude: Float32Array): Float32Array {
    const melSpectrum = new Float32Array(this.melBands);
    const melMin = this.hzToMel(0);
    const melMax = this.hzToMel(this.sampleRate / 2);
    const melStep = (melMax - melMin) / (this.melBands + 1);

    for (let i = 0; i < this.melBands; i++) {
      const melCenter = melMin + (i + 1) * melStep;
      const fCenter = this.melToHz(melCenter);
      const binCenter = Math.floor((fCenter * magnitude.length) / (this.sampleRate / 2));

      // Triangular filter
      let sum = 0;
      const bandwidth = 10; // bins
      for (let j = Math.max(0, binCenter - bandwidth); j < Math.min(magnitude.length, binCenter + bandwidth); j++) {
        const weight = 1 - Math.abs(j - binCenter) / bandwidth;
        sum += magnitude[j] * weight;
      }
      melSpectrum[i] = sum;
    }

    return melSpectrum;
  }

  /**
   * Convert Hz to Mel scale
   */
  private hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700);
  }

  /**
   * Convert Mel to Hz
   */
  private melToHz(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }

  /**
   * Compute GTCC (Gammatone Cepstral Coefficients)
   * Novel feature for voice spoofing detection (2025 research)
   */
  private computeGTCC(data: Float32Array): Float32Array {
    // Simplified gammatone filterbank
    // In production, use proper ERB-spaced gammatone filters
    const gtcc = new Float32Array(this.gtccCoefficients);

    for (let i = 0; i < this.gtccCoefficients; i++) {
      const centerFreq = 200 + i * 400; // 200Hz to 3.4kHz
      let sum = 0;

      // Apply simplified gammatone filter
      for (let t = 0; t < Math.min(data.length, 1000); t++) {
        const envelope = Math.pow(t, 3) * Math.exp(-2 * Math.PI * 0.1 * t);
        const carrier = Math.cos(2 * Math.PI * centerFreq * t / this.sampleRate);
        sum += data[t] * envelope * carrier;
      }

      gtcc[i] = sum / 1000;
    }

    return gtcc;
  }

  /**
   * Estimate pitch using autocorrelation
   */
  private estimatePitch(data: Float32Array): number {
    const minPitch = 50; // Hz
    const maxPitch = 400; // Hz
    const minLag = Math.floor(this.sampleRate / maxPitch);
    const maxLag = Math.floor(this.sampleRate / minPitch);

    let bestLag = 0;
    let maxCorrelation = 0;

    // Autocorrelation
    for (let lag = minLag; lag < Math.min(maxLag, data.length / 2); lag++) {
      let correlation = 0;
      for (let i = 0; i < data.length - lag; i++) {
        correlation += data[i] * data[i + lag];
      }

      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestLag = lag;
      }
    }

    return bestLag > 0 ? this.sampleRate / bestLag : 0;
  }

  /**
   * Compute spectral centroid (brightness of sound)
   */
  private computeSpectralCentroid(magnitude: Float32Array): number {
    let weightedSum = 0;
    let sum = 0;

    for (let i = 0; i < magnitude.length; i++) {
      const frequency = (i * this.sampleRate) / (2 * magnitude.length);
      weightedSum += frequency * magnitude[i];
      sum += magnitude[i];
    }

    return sum > 0 ? weightedSum / sum : 0;
  }

  /**
   * Compute spectral rolloff (85% energy point)
   */
  private computeSpectralRolloff(magnitude: Float32Array): number {
    let totalEnergy = 0;
    for (let i = 0; i < magnitude.length; i++) {
      totalEnergy += magnitude[i] * magnitude[i];
    }

    const threshold = 0.85 * totalEnergy;
    let cumEnergy = 0;

    for (let i = 0; i < magnitude.length; i++) {
      cumEnergy += magnitude[i] * magnitude[i];
      if (cumEnergy >= threshold) {
        return (i * this.sampleRate) / (2 * magnitude.length);
      }
    }

    return this.sampleRate / 2;
  }

  /**
   * Compute zero crossing rate
   */
  private computeZCR(data: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0 && data[i - 1] < 0) || (data[i] < 0 && data[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / data.length;
  }

  /**
   * Compute RMS energy
   */
  private computeRMSEnergy(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  /**
   * Estimate speech tempo (syllables per second)
   */
  private estimateTempo(data: Float32Array, pitch: number): number {
    // Simplified: Count energy peaks
    const energy = this.computeRMSEnergy(data);
    let peaks = 0;
    const windowSize = Math.floor(this.sampleRate * 0.1); // 100ms window

    for (let i = windowSize; i < data.length - windowSize; i += windowSize) {
      const window = data.slice(i, i + windowSize);
      const windowEnergy = this.computeRMSEnergy(window);
      if (windowEnergy > energy * 0.5) {
        peaks++;
      }
    }

    return peaks / (data.length / this.sampleRate); // peaks per second
  }

  /**
   * Compute jitter (pitch variation)
   */
  private computeJitter(data: Float32Array, pitch: number): number {
    if (pitch === 0) return 0;

    const period = this.sampleRate / pitch;
    let jitterSum = 0;
    let count = 0;

    for (let i = 0; i < data.length - period * 2; i += period) {
      const period1 = this.estimatePitch(data.slice(i, i + period));
      const period2 = this.estimatePitch(data.slice(i + period, i + period * 2));

      if (period1 > 0 && period2 > 0) {
        jitterSum += Math.abs(period1 - period2) / ((period1 + period2) / 2);
        count++;
      }
    }

    return count > 0 ? jitterSum / count : 0;
  }

  /**
   * Compute shimmer (amplitude variation)
   */
  private computeShimmer(data: Float32Array): number {
    const windowSize = Math.floor(this.sampleRate * 0.01); // 10ms windows
    let shimmerSum = 0;
    let count = 0;

    for (let i = 0; i < data.length - windowSize * 2; i += windowSize) {
      const amp1 = this.computeRMSEnergy(data.slice(i, i + windowSize));
      const amp2 = this.computeRMSEnergy(data.slice(i + windowSize, i + windowSize * 2));

      if (amp1 > 0 && amp2 > 0) {
        shimmerSum += Math.abs(amp1 - amp2) / ((amp1 + amp2) / 2);
        count++;
      }
    }

    return count > 0 ? shimmerSum / count : 0;
  }

  /**
   * Extract formant frequencies (F1, F2, F3)
   */
  private extractFormants(data: Float32Array, pitch: number): number[] {
    // Simplified: Find spectral peaks
    const spectrum = this.computeFFT(data);
    const magnitude = this.extractMagnitude(spectrum);

    const formants: number[] = [];
    let lastPeak = 0;

    for (let i = 1; i < magnitude.length - 1; i++) {
      if (magnitude[i] > magnitude[i - 1] && magnitude[i] > magnitude[i + 1]) {
        const frequency = (i * this.sampleRate) / (2 * magnitude.length);
        if (frequency > lastPeak + 200 && formants.length < 3) { // At least 200Hz apart
          formants.push(frequency);
          lastPeak = frequency;
        }
      }
    }

    // Fill with zeros if not enough formants found
    while (formants.length < 3) {
      formants.push(0);
    }

    return formants;
  }
}

interface Complex {
  real: number;
  imag: number;
}

// ============================================================================
// Deepfake Acoustic Analyzer
// ============================================================================

/**
 * Analyzes acoustic features for deepfake indicators
 * Based on Aurigin Apollo (<50ms, 97.7% accuracy) and Pindrop research
 */
export class DeepfakeAcousticAnalyzer {
  private thresholds = {
    // Spectral anomalies
    phaseInconsistency: 0.3,
    spectralAnomaly: 0.4,

    // Prosodic anomalies
    jitterAnomaly: 0.05, // >5% jitter suspicious
    shimmerAnomaly: 0.06, // >6% shimmer suspicious

    // TTS/synthesis signatures
    unnaturalPitch: { min: 50, max: 400 },
    suspiciousFormants: { f1: [200, 1000], f2: [900, 3000], f3: [2000, 4000] },
    digitalArtifactEnergy: 0.01,

    // Overall deepfake threshold
    deepfakeConfidence: 0.5 // >50% = deepfake
  };

  /**
   * Analyze acoustic features for deepfake indicators
   */
  async analyze(features: AcousticFeatures): Promise<{
    indicators: DeepfakeIndicators;
    confidence: number;
    anomalies: string[];
  }> {
    const indicators: DeepfakeIndicators = {
      unnaturalFluctuations: false,
      digitalArtifacts: false,
      suspiciousFrequencyPatterns: false,
      phaseInconsistency: false,
      spectralAnomalies: false,
      ttsSignature: false,
      voiceCloningArtifacts: false,
      synthesisArtifacts: false,
      voiceprintMismatch: false,
      speakerInconsistency: false,
      acousticScore: 0,
      semanticScore: 0,
      emotionalScore: 0,
      biometricScore: 0
    };

    const anomalies: string[] = [];
    let suspicionScore = 0;

    // 1. Check phase consistency
    const phaseVariance = this.computeVariance(features.phaseSpectrum);
    if (phaseVariance > this.thresholds.phaseInconsistency) {
      indicators.phaseInconsistency = true;
      anomalies.push(`Phase inconsistency detected (variance: ${phaseVariance.toFixed(3)})`);
      suspicionScore += 0.15;
    }

    // 2. Check for digital artifacts
    if (features.energy < this.thresholds.digitalArtifactEnergy) {
      indicators.digitalArtifacts = true;
      anomalies.push('Low energy digital artifacts detected');
      suspicionScore += 0.10;
    }

    // 3. Check pitch naturalness
    if (features.pitch < this.thresholds.unnaturalPitch.min || features.pitch > this.thresholds.unnaturalPitch.max) {
      indicators.unnaturalFluctuations = true;
      anomalies.push(`Unnatural pitch detected (${features.pitch.toFixed(1)} Hz)`);
      suspicionScore += 0.10;
    }

    // 4. Check jitter and shimmer (prosodic features)
    if (features.jitter > this.thresholds.jitterAnomaly) {
      indicators.unnaturalFluctuations = true;
      anomalies.push(`Excessive jitter detected (${(features.jitter * 100).toFixed(1)}%)`);
      suspicionScore += 0.12;
    }

    if (features.shimmer > this.thresholds.shimmerAnomaly) {
      indicators.unnaturalFluctuations = true;
      anomalies.push(`Excessive shimmer detected (${(features.shimmer * 100).toFixed(1)}%)`);
      suspicionScore += 0.12;
    }

    // 5. Check formants for TTS signature
    const formantsSuspicious = this.checkFormants(features.formants);
    if (formantsSuspicious) {
      indicators.ttsSignature = true;
      anomalies.push('TTS formant signature detected');
      suspicionScore += 0.20;
    }

    // 6. Check spectral characteristics
    if (features.spectralCentroid > 4000 || features.spectralCentroid < 200) {
      indicators.spectralAnomalies = true;
      anomalies.push(`Unusual spectral centroid (${features.spectralCentroid.toFixed(0)} Hz)`);
      suspicionScore += 0.10;
    }

    // 7. Check for voice cloning artifacts
    const mfccAnomaly = this.detectMFCCAnomaly(features.mfcc);
    if (mfccAnomaly) {
      indicators.voiceCloningArtifacts = true;
      anomalies.push('MFCC pattern suggests voice cloning');
      suspicionScore += 0.18;
    }

    // 8. Check GTCC for synthesis artifacts
    const gtccAnomaly = this.detectGTCCAnomaly(features.gammatoneCepstral);
    if (gtccAnomaly) {
      indicators.synthesisArtifacts = true;
      anomalies.push('Gammatone cepstral pattern suggests synthesis');
      suspicionScore += 0.15;
    }

    indicators.acousticScore = Math.min(suspicionScore, 1.0);

    return {
      indicators,
      confidence: indicators.acousticScore,
      anomalies
    };
  }

  /**
   * Compute variance of array
   */
  private computeVariance(array: Float32Array): number {
    const mean = array.reduce((sum, val) => sum + val, 0) / array.length;
    const variance = array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / array.length;
    return variance;
  }

  /**
   * Check if formants match TTS signature
   */
  private checkFormants(formants: number[]): boolean {
    if (formants.length < 3) return false;

    // Check if formants are within typical ranges but suspiciously regular
    const [f1, f2, f3] = formants;
    const { f1: f1Range, f2: f2Range, f3: f3Range } = this.thresholds.suspiciousFormants;

    // TTS often has very regular formant spacing
    const spacing12 = Math.abs(f2 - f1);
    const spacing23 = Math.abs(f3 - f2);

    return (
      (f1 < f1Range[0] || f1 > f1Range[1]) ||
      (f2 < f2Range[0] || f2 > f2Range[1]) ||
      (f3 < f3Range[0] || f3 > f3Range[1]) ||
      Math.abs(spacing12 - spacing23) < 50 // Too regular
    );
  }

  /**
   * Detect MFCC anomalies (voice cloning signature)
   */
  private detectMFCCAnomaly(mfcc: Float32Array): boolean {
    // Voice cloning often has unnaturally smooth MFCC trajectory
    let smoothness = 0;
    for (let i = 1; i < mfcc.length; i++) {
      smoothness += Math.abs(mfcc[i] - mfcc[i - 1]);
    }
    smoothness /= mfcc.length;

    return smoothness < 0.5; // Too smooth = suspicious
  }

  /**
   * Detect GTCC anomalies (synthesis signature)
   */
  private detectGTCCAnomaly(gtcc: Float32Array): boolean {
    // Synthetic speech often has specific GTCC patterns
    const variance = this.computeVariance(gtcc);
    return variance < 0.01 || variance > 1.0; // Too uniform or too chaotic
  }
}

// ============================================================================
// Semantic Consistency Analyzer
// ============================================================================

/**
 * Analyzes semantic consistency between speech content and context
 * Based on 2025 research on multimodal deepfake detection
 */
export class SemanticConsistencyAnalyzer {
  /**
   * Analyze semantic consistency of response
   */
  async analyzeConsistency(
    prompt: string,
    response: string,
    context?: string
  ): Promise<{
    consistencyScore: number;
    inconsistencies: string[];
  }> {
    const inconsistencies: string[] = [];
    let consistencyScore = 1.0;

    // 1. Check if response is relevant to prompt
    const relevance = this.computeRelevance(prompt, response);
    if (relevance < 0.5) {
      inconsistencies.push('Response not relevant to prompt');
      consistencyScore -= 0.3;
    }

    // 2. Check for contradictions
    const hasContradiction = this.detectContradictions(response, context || '');
    if (hasContradiction) {
      inconsistencies.push('Internal contradictions detected');
      consistencyScore -= 0.25;
    }

    // 3. Check response time appropriateness
    // (Deepfakes may have delays or instant responses)
    // This would be checked by caller with response timing

    // 4. Check semantic coherence
    const coherence = this.assessCoherence(response);
    if (coherence < 0.6) {
      inconsistencies.push('Low semantic coherence');
      consistencyScore -= 0.2;
    }

    return {
      consistencyScore: Math.max(0, consistencyScore),
      inconsistencies
    };
  }

  /**
   * Compute relevance between prompt and response
   */
  private computeRelevance(prompt: string, response: string): number {
    // Simplified: Check for keyword overlap
    const promptWords = this.tokenize(prompt.toLowerCase());
    const responseWords = this.tokenize(response.toLowerCase());

    let overlap = 0;
    for (const word of promptWords) {
      if (responseWords.includes(word)) {
        overlap++;
      }
    }

    return promptWords.length > 0 ? overlap / promptWords.length : 0;
  }

  /**
   * Detect contradictions in text
   */
  private detectContradictions(text: string, context: string): boolean {
    // Simplified: Look for negation patterns
    const negationWords = ['not', 'no', 'never', 'none', 'neither', 'nor'];
    const textLower = text.toLowerCase();

    let negationCount = 0;
    for (const word of negationWords) {
      if (textLower.includes(word)) {
        negationCount++;
      }
    }

    // Too many negations might indicate confusion
    return negationCount > 3;
  }

  /**
   * Assess semantic coherence
   */
  private assessCoherence(text: string): number {
    // Simplified: Check sentence structure
    const sentences = text.split(/[.!?]+/);
    if (sentences.length === 0) return 0;

    let coherenceScore = 1.0;

    // Check for very short or very long sentences (incoherent)
    for (const sentence of sentences) {
      const words = this.tokenize(sentence);
      if (words.length < 3 || words.length > 30) {
        coherenceScore -= 0.1;
      }
    }

    return Math.max(0, coherenceScore);
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(word => word.length > 0);
  }
}

// ============================================================================
// Emotional Coherence Analyzer
// ============================================================================

/**
 * Analyzes emotional consistency in speech
 * Based on Applied Cognitive Psychology 2025 research
 * Deepfakes show lower negative emotions and inconsistent valence-arousal
 */
export class EmotionalCoherenceAnalyzer {
  /**
   * Extract emotional features from audio
   */
  async extractEmotionalFeatures(audio: AudioSample, acoustic: AcousticFeatures): Promise<EmotionalFeatures> {
    // Simplified emotion detection based on acoustic features
    // In production, use OpenSmile or similar emotion recognition

    // Valence (positive/negative) from pitch and energy
    const valence = this.estimateValence(acoustic.pitch, acoustic.energy);

    // Arousal (calm/excited) from tempo and energy
    const arousal = this.estimateArousal(acoustic.tempo, acoustic.energy);

    // Dominance from pitch and loudness
    const dominance = this.estimateDominance(acoustic.pitch, acoustic.energy);

    // Estimate emotion probabilities
    const emotions = this.estimateEmotions(valence, arousal, dominance);

    // Consistency placeholder (would track over multiple samples)
    const consistency = 0.8;

    return {
      valence,
      arousal,
      dominance,
      emotions,
      consistency
    };
  }

  /**
   * Analyze emotional coherence for deepfake detection
   * Research: Deepfakes show lower negative emotions and inconsistent patterns
   */
  async analyzeCoherence(
    emotionalFeatures: EmotionalFeatures,
    expectedEmotion?: string
  ): Promise<{
    coherenceScore: number;
    mismatches: string[];
    isDeepfakeSuspicious: boolean;
  }> {
    const mismatches: string[] = [];
    let coherenceScore = 1.0;

    // 1. Check for low negative emotion (deepfake signature)
    const negativeEmotions = emotionalFeatures.emotions.anger +
                            emotionalFeatures.emotions.sadness +
                            emotionalFeatures.emotions.fear;

    if (negativeEmotions < 0.1 && emotionalFeatures.valence < 0) {
      mismatches.push('Suspiciously low negative emotions for negative valence');
      coherenceScore -= 0.3;
    }

    // 2. Check valence-arousal consistency
    if (!this.isValenceArousalConsistent(emotionalFeatures)) {
      mismatches.push('Inconsistent valence-arousal pattern');
      coherenceScore -= 0.25;
    }

    // 3. Check expected emotion match (if provided)
    if (expectedEmotion) {
      const emotionMatch = emotionalFeatures.emotions[expectedEmotion as keyof typeof emotionalFeatures.emotions] || 0;
      if (emotionMatch < 0.3) {
        mismatches.push(`Expected emotion '${expectedEmotion}' not detected`);
        coherenceScore -= 0.35;
      }
    }

    // 4. Check emotional consistency over time
    if (emotionalFeatures.consistency < 0.5) {
      mismatches.push('Emotional inconsistency over time');
      coherenceScore -= 0.2;
    }

    const isDeepfakeSuspicious = coherenceScore < 0.6;

    return {
      coherenceScore: Math.max(0, coherenceScore),
      mismatches,
      isDeepfakeSuspicious
    };
  }

  /**
   * Estimate valence from acoustic features
   */
  private estimateValence(pitch: number, energy: number): number {
    // Higher pitch and energy generally indicate positive valence
    const pitchFactor = Math.min(pitch / 250, 1);
    const energyFactor = Math.min(energy / 0.5, 1);
    return (pitchFactor + energyFactor) / 2 * 2 - 1; // Scale to [-1, 1]
  }

  /**
   * Estimate arousal from acoustic features
   */
  private estimateArousal(tempo: number, energy: number): number {
    // Higher tempo and energy indicate higher arousal
    const tempoFactor = Math.min(tempo / 5, 1); // Normalize to 5 syllables/sec
    const energyFactor = Math.min(energy / 0.5, 1);
    return (tempoFactor + energyFactor) / 2;
  }

  /**
   * Estimate dominance from acoustic features
   */
  private estimateDominance(pitch: number, energy: number): number {
    // Lower pitch and higher energy indicate dominance
    const pitchFactor = 1 - Math.min(pitch / 300, 1);
    const energyFactor = Math.min(energy / 0.5, 1);
    return (pitchFactor + energyFactor) / 2;
  }

  /**
   * Estimate emotion probabilities from VAD space
   */
  private estimateEmotions(valence: number, arousal: number, dominance: number): EmotionalFeatures['emotions'] {
    // Map VAD to basic emotions (Russell's circumplex model)
    const emotions = {
      joy: 0,
      anger: 0,
      sadness: 0,
      fear: 0,
      disgust: 0,
      surprise: 0,
      neutral: 0
    };

    // Joy: high valence, high arousal
    emotions.joy = valence > 0 && arousal > 0.5 ? (valence + arousal) / 2 : 0;

    // Anger: low valence, high arousal, high dominance
    emotions.anger = valence < 0 && arousal > 0.5 && dominance > 0.5 ? (-valence + arousal + dominance) / 3 : 0;

    // Sadness: low valence, low arousal
    emotions.sadness = valence < 0 && arousal < 0.5 ? (-valence + (1 - arousal)) / 2 : 0;

    // Fear: low valence, high arousal, low dominance
    emotions.fear = valence < 0 && arousal > 0.5 && dominance < 0.5 ? (-valence + arousal + (1 - dominance)) / 3 : 0;

    // Disgust: low valence, medium arousal
    emotions.disgust = valence < -0.3 && arousal > 0.3 && arousal < 0.7 ? -valence * 0.5 : 0;

    // Surprise: high arousal (valence neutral)
    emotions.surprise = arousal > 0.7 && Math.abs(valence) < 0.3 ? arousal : 0;

    // Neutral: low arousal, neutral valence
    emotions.neutral = Math.abs(valence) < 0.3 && arousal < 0.3 ? (1 - arousal) : 0;

    // Normalize
    const sum = Object.values(emotions).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (const key in emotions) {
        emotions[key as keyof typeof emotions] /= sum;
      }
    }

    return emotions;
  }

  /**
   * Check if valence-arousal pattern is consistent
   */
  private isValenceArousalConsistent(features: EmotionalFeatures): boolean {
    const { valence, arousal } = features;

    // Certain combinations are inconsistent:
    // - High positive valence with very low arousal (bored happiness?)
    // - High negative valence with very high arousal and very low fear/anger

    if (valence > 0.5 && arousal < 0.2) {
      return false; // Suspiciously calm positive emotion
    }

    if (valence < -0.5 && arousal > 0.7) {
      const negativeEmotions = features.emotions.anger + features.emotions.fear;
      if (negativeEmotions < 0.3) {
        return false; // High arousal negative emotion but no anger/fear
      }
    }

    return true;
  }
}

// ============================================================================
// Liveness Challenge System
// ============================================================================

/**
 * Generates and verifies liveness challenges
 * Prevents replay attacks and pre-recorded deepfakes
 */
export class LivenessChallengeSystem {
  private challenges: Map<string, LivenessChallenge> = new Map();
  private usedPhrases: Set<string> = new Set();

  /**
   * Generate randomized liveness challenge
   */
  generateChallenge(type?: LivenessChallenge['type']): LivenessChallenge {
    const challengeType = type || this.selectRandomType();
    const id = this.generateChallengeId();

    let challenge: LivenessChallenge;

    switch (challengeType) {
      case 'repeat_phrase':
        challenge = this.generateRepeatChallenge(id);
        break;
      case 'answer_question':
        challenge = this.generateQuestionChallenge(id);
        break;
      case 'random_word':
        challenge = this.generateRandomWordChallenge(id);
        break;
      case 'counting':
        challenge = this.generateCountingChallenge(id);
        break;
      case 'emotion_expression':
        challenge = this.generateEmotionChallenge(id);
        break;
    }

    this.challenges.set(id, challenge);
    return challenge;
  }

  /**
   * Verify liveness response
   */
  async verifyResponse(
    response: LivenessResponse,
    biometricMatch: number // From Phase 77 voice biometrics
  ): Promise<{
    verified: boolean;
    confidence: number;
    issues: string[];
  }> {
    const challenge = this.challenges.get(response.challengeId);
    if (!challenge) {
      return { verified: false, confidence: 0, issues: ['Challenge not found'] };
    }

    const issues: string[] = [];
    let confidence = 1.0;

    // 1. Check response time (should be human-like)
    if (response.responseTime < 500) {
      issues.push('Response too fast (< 500ms)');
      confidence -= 0.3;
    } else if (response.responseTime > 10000) {
      issues.push('Response too slow (> 10s)');
      confidence -= 0.2;
    }

    // 2. Check semantic match
    if (response.semanticMatch < 0.6) {
      issues.push(`Low semantic match (${(response.semanticMatch * 100).toFixed(0)}%)`);
      confidence -= 0.25;
    }

    // 3. Check biometric match
    if (biometricMatch < 0.7) {
      issues.push(`Biometric mismatch (${(biometricMatch * 100).toFixed(0)}%)`);
      confidence -= 0.30;
    }

    // 4. Check for replay attack (repeated phrase)
    if (this.usedPhrases.has(response.transcript)) {
      issues.push('Possible replay attack (phrase reuse)');
      confidence -= 0.40;
    }

    // 5. Check acoustic naturalness
    const acousticScore = await this.checkAcousticNaturalness(response.acousticFeatures);
    if (acousticScore < 0.6) {
      issues.push('Unnatural acoustic patterns');
      confidence -= 0.25;
    }

    // 6. Type-specific verification
    switch (challenge.type) {
      case 'emotion_expression':
        if (challenge.emotionalTarget && response.emotionalMatch && response.emotionalMatch < 0.5) {
          issues.push(`Expected emotion '${challenge.emotionalTarget}' not detected`);
          confidence -= 0.20;
        }
        break;

      case 'answer_question':
        // Semantic match already checked above
        break;

      case 'repeat_phrase':
      case 'random_word':
      case 'counting':
        // Transcript match checked via semantic match
        break;
    }

    // Mark phrase as used
    this.usedPhrases.add(response.transcript);

    // Clean up old challenge
    this.challenges.delete(response.challengeId);

    const verified = confidence >= 0.6;

    return {
      verified,
      confidence: Math.max(0, confidence),
      issues
    };
  }

  /**
   * Select random challenge type
   */
  private selectRandomType(): LivenessChallenge['type'] {
    const types: LivenessChallenge['type'][] = [
      'repeat_phrase',
      'answer_question',
      'random_word',
      'counting',
      'emotion_expression'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Generate unique challenge ID
   */
  private generateChallengeId(): string {
    return `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate repeat phrase challenge
   */
  private generateRepeatChallenge(id: string): LivenessChallenge {
    const phrases = [
      'Please repeat after me: apple orange banana',
      'Say this phrase: the quick brown fox jumps',
      'Repeat these words: mountain river forest',
      'Can you say: sunshine rainbow butterfly',
      'Please say: computer keyboard mouse'
    ];

    const prompt = phrases[Math.floor(Math.random() * phrases.length)];

    return {
      id,
      type: 'repeat_phrase',
      prompt,
      expectedDuration: 3000, // 3 seconds
      timestamp: Date.now()
    };
  }

  /**
   * Generate question challenge
   */
  private generateQuestionChallenge(id: string): LivenessChallenge {
    const questions = [
      'What color is the sky?',
      'What is two plus two?',
      'What day comes after Monday?',
      'How many legs does a dog have?',
      'What season comes after winter?'
    ];

    const prompt = questions[Math.floor(Math.random() * questions.length)];

    return {
      id,
      type: 'answer_question',
      prompt,
      expectedDuration: 2000, // 2 seconds
      semanticContext: this.getExpectedAnswer(prompt),
      timestamp: Date.now()
    };
  }

  /**
   * Get expected answer for question
   */
  private getExpectedAnswer(question: string): string {
    const answerMap: Record<string, string> = {
      'What color is the sky?': 'blue',
      'What is two plus two?': 'four',
      'What day comes after Monday?': 'Tuesday',
      'How many legs does a dog have?': 'four',
      'What season comes after winter?': 'spring'
    };
    return answerMap[question] || '';
  }

  /**
   * Generate random word challenge
   */
  private generateRandomWordChallenge(id: string): LivenessChallenge {
    const words = [
      'elephant', 'telescope', 'symphony', 'adventure', 'whisper',
      'cascade', 'harmony', 'serenity', 'velocity', 'luminous'
    ];

    const word = words[Math.floor(Math.random() * words.length)];
    const prompt = `Please say this word: ${word}`;

    return {
      id,
      type: 'random_word',
      prompt,
      expectedDuration: 1500, // 1.5 seconds
      timestamp: Date.now()
    };
  }

  /**
   * Generate counting challenge
   */
  private generateCountingChallenge(id: string): LivenessChallenge {
    const start = Math.floor(Math.random() * 10) + 1;
    const end = start + 3;
    const prompt = `Please count from ${start} to ${end}`;

    return {
      id,
      type: 'counting',
      prompt,
      expectedDuration: 2000, // 2 seconds
      timestamp: Date.now()
    };
  }

  /**
   * Generate emotion expression challenge
   */
  private generateEmotionChallenge(id: string): LivenessChallenge {
    const emotions: Array<'joy' | 'anger' | 'surprise' | 'neutral'> = ['joy', 'anger', 'surprise', 'neutral'];
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];

    const prompts = {
      joy: 'Please say "I am so happy!" with joy',
      anger: 'Please say "This is unacceptable!" with anger',
      surprise: 'Please say "Wow, really?" with surprise',
      neutral: 'Please say "I understand" in a neutral tone'
    };

    return {
      id,
      type: 'emotion_expression',
      prompt: prompts[emotion],
      expectedDuration: 2500, // 2.5 seconds
      emotionalTarget: emotion,
      timestamp: Date.now()
    };
  }

  /**
   * Check acoustic naturalness
   */
  private async checkAcousticNaturalness(features: AcousticFeatures): number {
    let score = 1.0;

    // Check for synthetic patterns
    if (features.jitter > 0.05) score -= 0.2;
    if (features.shimmer > 0.06) score -= 0.2;
    if (features.pitch < 50 || features.pitch > 400) score -= 0.3;

    return Math.max(0, score);
  }
}

// ============================================================================
// Real-Time Deepfake Detector (Main Integration)
// ============================================================================

/**
 * Main class for real-time deepfake detection
 * Integrates acoustic, semantic, emotional analysis + liveness verification
 *
 * Target Performance: <50ms latency, 97.7% accuracy (Aurigin Apollo benchmark)
 */
export class RealTimeDeepfakeDetector {
  private acousticExtractor: AcousticFeatureExtractor;
  private acousticAnalyzer: DeepfakeAcousticAnalyzer;
  private semanticAnalyzer: SemanticConsistencyAnalyzer;
  private emotionalAnalyzer: EmotionalCoherenceAnalyzer;
  private livenessSystem: LivenessChallengeSystem;

  private detectionCount: number = 0;
  private averageLatency: number = 0;

  constructor() {
    this.acousticExtractor = new AcousticFeatureExtractor();
    this.acousticAnalyzer = new DeepfakeAcousticAnalyzer();
    this.semanticAnalyzer = new SemanticConsistencyAnalyzer();
    this.emotionalAnalyzer = new EmotionalCoherenceAnalyzer();
    this.livenessSystem = new LivenessChallengeSystem();
  }

  /**
   * Detect deepfake in real-time audio
   * Target: <50ms latency, 97.7% accuracy
   */
  async detectDeepfake(
    audio: AudioSample,
    transcript?: string,
    context?: string
  ): Promise<DeepfakeDetectionResult> {
    const startTime = performance.now();

    // 1. Extract acoustic features
    const acousticFeatures = await this.acousticExtractor.extractFeatures(audio);

    // 2. Analyze acoustic indicators
    const acousticResult = await this.acousticAnalyzer.analyze(acousticFeatures);

    // 3. Analyze semantic consistency (if transcript available)
    let semanticScore = 0;
    const semanticInconsistencies: string[] = [];
    if (transcript && context) {
      const semanticResult = await this.semanticAnalyzer.analyzeConsistency(
        context,
        transcript
      );
      semanticScore = 1 - semanticResult.consistencyScore; // Invert for suspicion score
      semanticInconsistencies.push(...semanticResult.inconsistencies);
    }

    // 4. Analyze emotional coherence
    const emotionalFeatures = await this.emotionalAnalyzer.extractEmotionalFeatures(audio, acousticFeatures);
    const emotionalResult = await this.emotionalAnalyzer.analyzeCoherence(emotionalFeatures);
    const emotionalScore = 1 - emotionalResult.coherenceScore; // Invert for suspicion score

    // 5. Compute overall confidence
    const acousticWeight = 0.4;
    const semanticWeight = transcript ? 0.3 : 0;
    const emotionalWeight = 0.3;
    const remainingWeight = 1 - (acousticWeight + semanticWeight + emotionalWeight);

    const overallConfidence =
      acousticResult.confidence * acousticWeight +
      semanticScore * semanticWeight +
      emotionalScore * emotionalWeight;

    const isDeepfake = overallConfidence > 0.5;

    // 6. Build explanation
    const explanation = this.buildExplanation(
      isDeepfake,
      overallConfidence,
      acousticResult.anomalies,
      semanticInconsistencies,
      emotionalResult.mismatches
    );

    // 7. Calculate trust score
    const trustScore = 1 - overallConfidence;

    const latency = performance.now() - startTime;
    this.updateLatencyStats(latency);

    console.log(`🔍 Deepfake detection: ${isDeepfake ? 'DEEPFAKE' : 'AUTHENTIC'} (${(overallConfidence * 100).toFixed(1)}%) - ${latency.toFixed(1)}ms`);

    return {
      isDeepfake,
      confidence: overallConfidence,
      latency,
      indicators: {
        ...acousticResult.indicators,
        semanticScore,
        emotionalScore
      },
      explanation,
      evidence: {
        acousticAnomalies: acousticResult.anomalies,
        semanticInconsistencies,
        emotionalMismatches: emotionalResult.mismatches,
        biometricMismatches: [] // Would come from Phase 77 integration
      },
      livenessVerified: false, // Requires explicit liveness challenge
      trustScore
    };
  }

  /**
   * Perform liveness verification
   */
  async performLivenessCheck(
    challengeType?: LivenessChallenge['type']
  ): Promise<LivenessChallenge> {
    return this.livenessSystem.generateChallenge(challengeType);
  }

  /**
   * Verify liveness response
   */
  async verifyLiveness(
    response: LivenessResponse,
    biometricMatch: number
  ): Promise<{
    verified: boolean;
    confidence: number;
    issues: string[];
  }> {
    return await this.livenessSystem.verifyResponse(response, biometricMatch);
  }

  /**
   * Build human-readable explanation
   */
  private buildExplanation(
    isDeepfake: boolean,
    confidence: number,
    acousticAnomalies: string[],
    semanticInconsistencies: string[],
    emotionalMismatches: string[]
  ): string {
    if (!isDeepfake) {
      return `Voice authenticated as authentic human speech (${(confidence * 100).toFixed(1)}% confidence). No significant anomalies detected.`;
    }

    const reasons: string[] = [];

    if (acousticAnomalies.length > 0) {
      reasons.push(`Acoustic anomalies: ${acousticAnomalies.slice(0, 2).join(', ')}`);
    }

    if (semanticInconsistencies.length > 0) {
      reasons.push(`Semantic issues: ${semanticInconsistencies[0]}`);
    }

    if (emotionalMismatches.length > 0) {
      reasons.push(`Emotional inconsistencies: ${emotionalMismatches[0]}`);
    }

    return `Deepfake detected with ${(confidence * 100).toFixed(1)}% confidence. ${reasons.join('. ')}.`;
  }

  /**
   * Update latency statistics
   */
  private updateLatencyStats(latency: number): void {
    this.detectionCount++;
    this.averageLatency = (this.averageLatency * (this.detectionCount - 1) + latency) / this.detectionCount;
  }

  /**
   * Get detection statistics
   */
  getStatistics() {
    return {
      detectionCount: this.detectionCount,
      averageLatency: this.averageLatency,
      targetLatency: 50, // ms (Aurigin Apollo benchmark)
      targetAccuracy: 0.977 // 97.7% (Aurigin Apollo benchmark)
    };
  }
}

// ============================================================================
// Export Public API
// ============================================================================

export {
  AcousticFeatureExtractor,
  DeepfakeAcousticAnalyzer,
  SemanticConsistencyAnalyzer,
  EmotionalCoherenceAnalyzer,
  LivenessChallengeSystem,
  type AudioSample,
  type AcousticFeatures,
  type DeepfakeIndicators,
  type LivenessChallenge,
  type LivenessResponse,
  type EmotionalFeatures,
  type DeepfakeDetectionResult
};

/**
 * Phase 104 Summary:
 *
 * Lines of Code: ~1,700
 *
 * Components:
 * 1. AcousticFeatureExtractor - MFCC, GTCC, pitch, formants, prosody
 * 2. DeepfakeAcousticAnalyzer - Anomaly detection, TTS signature
 * 3. SemanticConsistencyAnalyzer - Response relevance, coherence
 * 4. EmotionalCoherenceAnalyzer - VAD space, emotion detection
 * 5. LivenessChallengeSystem - Randomized challenges, replay prevention
 * 6. RealTimeDeepfakeDetector - Main integration, <50ms target
 *
 * Performance Targets:
 * - Latency: <50ms (Aurigin Apollo benchmark)
 * - Accuracy: 97.7% (state-of-the-art)
 * - Real-time: Live audio stream processing
 *
 * Competitive Advantages:
 * vs Truecaller/RoboKiller: No deepfake detection
 * vs Hiya: Basic detection, no liveness verification
 * vs Banks: 91% rethinking voice auth - Ring provides solution
 *
 * Research Citations:
 * - Aurigin Apollo: <50ms latency, 97.7% accuracy
 * - ASVspoof 5: Largest anti-spoofing dataset with adversarial attacks
 * - Applied Cognitive Psychology 2025: Emotional consistency detection
 * - IEEE Spectrum 2025: Real-time audio deepfake threats
 *
 * Market Impact: 1 in 3 Americans got deepfake scam call (2025)
 */
