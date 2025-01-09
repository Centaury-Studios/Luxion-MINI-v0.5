import { GoogleGenerativeAI } from "@google/generative-ai";
import { EventEmitter } from 'events';

// === Interfaces ===
export interface ModelSelection {
  recommendedModel: 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-1.5-flash-8b';
  reason: string;
  complexity: 'Simple' | 'Medium' | 'Complex';
}

export interface Metrics {
  totalInteractions: number;
  modelUsage: Record<string, number>;
  averageProcessingTime: number;
  successRate: number;
  errorRate: number;
  cacheHitRate: number;
  rateLimitResets: number;
}

// Primero, definimos una interfaz para los tipos de eventos
interface AIEvent {
  type: 'thinking' | 'analyzing' | 'generating' | 'reflecting' | 'improving' | 'complete' | 'error';
  stage: string;
  details: any;
  timestamp: number;
}

export interface AIResponse {
  text: string;
  isValid: boolean;
  complexity: string;
  technologies: string[];
  modelUsed: string;
  metrics: {
    processingTime: number;
    tokensUsed?: number;
    fromCache?: boolean;
    retryCount?: number;
  };
}

export interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
  modelUsed: string;
  timestamp: number;
  processingTime?: number;
  error?: string;
}

export interface CacheEntry extends AIResponse {
  timestamp: number;
  expiresAt: number;
}

export class Core {
  // === Properties ===
  private genAI: any;
  private models: {
    pro: any;
    flash: any;
    flash8b: any;
  };
  private history: HistoryEntry[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private requestCount: number = 0;
  private lastReset: number = Date.now();
  private errorCount: number = 0;
  private successCount: number = 0;

  // === Constants ===
  private readonly RATE_LIMIT = 100; // requests per minute
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour
  private readonly MIN_DELAY = 100; // ms between requests
  private readonly MODEL_CONFIGS = {
    version: '1.0.0',
    pro: {
      name: "gemini-1.5-pro",
      temperature: 1.0,
      maxTokens: 8192,
      description: "Most powerful, best for complex tasks, coding, and long-form content"
    },
    flash: {
      name: "gemini-1.5-flash",
      temperature: 0.9,
      maxTokens: 4096,
      description: "Medium capability, good for general tasks"
    },
    flash8b: {
      name: "gemini-1.5-flash-8b",
      temperature: 0.8,
      maxTokens: 2048,
      description: "Basic capability, good for simple tasks and quick responses"
    }
  };

  private getModelInstance(modelName: string) {
    console.log('Getting model instance for:', modelName);
    console.log('Available models:', Object.keys(this.models));

    const model = this.models[modelName === this.MODEL_CONFIGS.pro.name ? 'pro' :
      modelName === this.MODEL_CONFIGS.flash.name ? 'flash' :
        'flash8b'];

    if (!model) {
      console.warn(`Model ${modelName} not found, falling back to pro`);
      return this.models.pro;
    }

    return model;
  }

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.initializeModels();
    this.setupPeriodicTasks();
  }

  private initializeModels(): void {
    try {
      this.models = {
        pro: this.genAI.getGenerativeModel({
          model: this.MODEL_CONFIGS.pro.name,
          generationConfig: {
            temperature: this.MODEL_CONFIGS.pro.temperature,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: this.MODEL_CONFIGS.pro.maxTokens,
          },
        }),
        flash: this.genAI.getGenerativeModel({
          model: this.MODEL_CONFIGS.flash.name,
          generationConfig: {
            temperature: this.MODEL_CONFIGS.flash.temperature,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: this.MODEL_CONFIGS.flash.maxTokens,
          },
        }),
        flash8b: this.genAI.getGenerativeModel({
          model: this.MODEL_CONFIGS.flash8b.name,
          generationConfig: {
            temperature: this.MODEL_CONFIGS.flash8b.temperature,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: this.MODEL_CONFIGS.flash8b.maxTokens,
          },
        }),
      };
    } catch (error) {
      console.error('Error initializing models:', error);
      throw new Error('Failed to initialize AI models');
    }
  }

  private setupPeriodicTasks(): void {
    // Limpiar caché expirado cada hora
    setInterval(() => this.cleanExpiredCache(), 1000 * 60 * 60);

    // Resetear contadores de rate limit cada minuto
    setInterval(() => this.resetRateLimit(), 1000 * 60);
  }

  // Continuación de la clase Core...

  // === Core Processing Methods ===
  // Modificamos el proceso principal para incluir más logs
  public async process(input: string): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      this.emit('process-start', {
        input,
        timestamp: startTime,
        message: 'Starting to process input'
      });

      this.validateInput(input);
      await this.rateLimiter();

      // Log de verificación de caché
      this.emit('cache-check', {
        input,
        timestamp: Date.now(),
        message: 'Checking cache for existing response'
      });

      const cachedResponse = await this.checkCache(input);
      if (cachedResponse) {
        this.emit('cache-hit', {
          input,
          timestamp: Date.now(),
          message: 'Found response in cache'
        });
        return cachedResponse;
      }

      this.emit('model-selection-start', {
        input,
        timestamp: Date.now(),
        message: 'Starting model selection process'
      });

      const response = await this.withRetry(async () => {
        // Selección de modelo con logs
        const modelSelection = await this.selectAppropriateModel(input);
        this.emit('model-selected', {
          model: modelSelection.recommendedModel,
          reason: modelSelection.reason,
          complexity: modelSelection.complexity,
          timestamp: Date.now()
        });

        const selectedModel = this.getModelInstance(modelSelection.recommendedModel);

        // Logs específicos según el tipo de solicitud
        if (this.isSimpleConversation(input)) {
          this.emit('processing-simple', {
            message: 'Processing simple conversation',
            timestamp: Date.now()
          });
          const solution = await this.generateSimpleResponse(input, selectedModel);
          return this.createResponse(solution, modelSelection, startTime);
        }

        if (this.isComplexRequest(input)) {
          this.emit('processing-complex', {
            message: 'Starting complex request processing',
            timestamp: Date.now()
          });
          return this.processComplexRequest(input, selectedModel, modelSelection, startTime);
        }

        // Solicitud estándar
        this.emit('processing-standard', {
          message: 'Processing standard request',
          timestamp: Date.now()
        });
        const solution = await this.generateStandardResponse(input, selectedModel);
        return this.createResponse(solution, modelSelection, startTime);
      });

      this.emit('process-complete', {
        input,
        duration: Date.now() - startTime,
        response: response,
        timestamp: Date.now()
      });

      return response;

    } catch (error) {
      this.emit('process-error', {
        error: error.message,
        input,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  private readonly ASSISTANT_CONTEXT = {
    name: "Luxion",
    description: "I am Luxion, an AI assistant focused on providing helpful and accurate responses. I aim to be friendly while maintaining professionalism.",
    capabilities: "I can help with various tasks from simple conversations to complex technical problems.",
    personality: "Helpful, precise, and friendly"
  };
  
  private async generateSimpleResponse(input: string, model: any): Promise<string> {
    const contextPrompt = `${this.ASSISTANT_CONTEXT.description}
  Remember: You are ${this.ASSISTANT_CONTEXT.name}, speaking in a ${this.ASSISTANT_CONTEXT.personality} manner.
  
  User: "${input}"
  
  Respond naturally and briefly, maintaining your identity as ${this.ASSISTANT_CONTEXT.name}.`;
  
    const chatSession = model.startChat();
    const result = await chatSession.sendMessage(contextPrompt);
    return result.response.text();
  }

  private async generateStandardResponse(input: string, model: any): Promise<string> {
    const contextPrompt = `${this.ASSISTANT_CONTEXT.description}
  As ${this.ASSISTANT_CONTEXT.name}, ${this.ASSISTANT_CONTEXT.capabilities}
  
  User request: "${input}"
  
  Provide a helpful response while maintaining your identity as ${this.ASSISTANT_CONTEXT.name}. Be clear and concise.`;
  
    const chatSession = model.startChat();
    const result = await chatSession.sendMessage(contextPrompt);
    return result.response.text();
  }
  

  // Modificamos los métodos de procesamiento para incluir más logs
  private async processComplexRequest(
    input: string,
    model: any,
    modelSelection: ModelSelection,
    startTime: number
  ): Promise<AIResponse> {
    this.emit('complex-analysis-start', {
      message: 'Starting complex request analysis',
      timestamp: Date.now()
    });

    const analysis = await this.analyzeRequest(input, model);
    this.emit('analysis-complete', {
      analysis,
      timestamp: Date.now()
    });

    this.emit('solution-generation-start', {
      message: 'Starting solution generation',
      timestamp: Date.now()
    });
    const initialSolution = await this.generateSolution(input, analysis, model);

    this.emit('reflection-start', {
      message: 'Starting solution reflection',
      initialSolution,
      timestamp: Date.now()
    });
    const isValid = await this.reflexiveAnalysis(initialSolution, input, model);

    let finalSolution = initialSolution;
    if (!isValid) {
      this.emit('improvement-start', {
        message: 'Solution needs improvement',
        timestamp: Date.now()
      });
      finalSolution = await this.improveResponse(input, initialSolution, model);
      this.emit('improvement-complete', {
        improvedSolution: finalSolution,
        timestamp: Date.now()
      });
    }

    return this.createResponse(finalSolution, modelSelection, startTime);
  }


  private createResponse(
    solution: string,
    modelSelection: ModelSelection,
    startTime: number
  ): AIResponse {
    const endTime = Date.now();
    return {
      text: solution,
      isValid: true,
      complexity: modelSelection.complexity,
      technologies: [],
      modelUsed: modelSelection.recommendedModel,
      metrics: {
        processingTime: endTime - startTime,
        retryCount: 0
      }
    };
  }

  // === Model Selection and Analysis Methods ===
  private isComplexRequest(input: string): boolean {
    // Patrones que indican una solicitud compleja
    const complexPatterns = [
      // Código y programación
      /create|develop|implement|code|program|function|class|algorithm/i,

      // Matemáticas y cálculos
      /calculate|solve|equation|math|formula|compute/i,

      // Análisis y explicaciones técnicas
      /explain how|analyze|evaluate|compare|difference between/i,

      // Documentación y escritura técnica
      /document|documentation|write a|create a guide|manual|specification/i,

      // Optimización y mejora
      /optimize|improve|enhance|refactor|better way to/i,

      // Debugging y resolución de problemas
      /debug|fix|solve|issue|problem|error|why isn't|not working/i,

      // Arquitectura y diseño
      /design|architect|structure|pattern|system|database schema/i,

      // Verificación de hechos o datos específicos que requieren precisión
      /verify|fact check|accurate|precision|exact|specific data/i
    ];

    // Verificar si el input coincide con algún patrón complejo
    return complexPatterns.some(pattern => pattern.test(input.trim()));
  }

  private isSimpleConversation(input: string): boolean {
    // Patrones de conversación simple
    const simplePatterns = [
      // Saludos
      /^(hola|hi|hello|hey|buenos dias|good morning|good afternoon|good evening)\b/i,

      // Preguntas conversacionales simples
      /^(how are you|como estas|que tal|what's up)\b/i,

      // Agradecimientos
      /^(gracias|thanks|thank you)\b/i,

      // Despedidas
      /^(bye|adios|hasta luego|see you|chao)\b/i,

      // Afirmaciones/negaciones simples
      /^(yes|no|si|ok|okay|sure)\b/i,

      // Preguntas directas simples (que no requieren verificación)
      /^(what is your name|cual es tu nombre|who are you|que eres)\b/i
    ];

    return simplePatterns.some(pattern => pattern.test(input.trim()));
  }

  private async selectAppropriateModel(input: string): Promise<ModelSelection> {
    // Si es una conversación simple, usar el modelo más ligero
    if (this.isSimpleConversation(input)) {
      return {
        recommendedModel: 'gemini-1.5-flash-8b',
        reason: "Simple conversational interaction",
        complexity: "Simple"
      };
    }

    // Si es una solicitud compleja, usar el modelo más potente
    if (this.isComplexRequest(input)) {
      return {
        recommendedModel: 'gemini-1.5-pro',
        reason: "Complex request requiring detailed analysis",
        complexity: "Complex"
      };
    }

    // Para todo lo demás, usar el modelo intermedio
    return {
      recommendedModel: 'gemini-1.5-flash',
      reason: "Standard request",
      complexity: "Medium"
    };
  }

  private async analyzeRequest(input: string, model: any) {
    const analysisPrompt = `As ${this.ASSISTANT_CONTEXT.name}, I need to analyze this request.
  
  User request: "${input}"
  
  Analyze and provide a JSON response with:
  1. Required technologies or tools
  2. Possible approaches
  3. Expected complexity
  4. Any special considerations for maintaining my identity
  
  Respond with ONLY a valid JSON in this format:
  {
    "technologies": ["tech1", "tech2"],
    "possibleSolutions": ["approach1", "approach2"],
    "expectedComplexity": "Simple|Medium|Complex",
    "identityConsiderations": "Any special notes for maintaining my identity as ${this.ASSISTANT_CONTEXT.name}"
  }`;
  
    try {
      const chatSession = model.startChat();
      const result = await chatSession.sendMessage(analysisPrompt);
      const responseText = result.response.text();
      
      // Extraer JSON de la respuesta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error in request analysis:', error);
      return {
        technologies: ["unknown"],
        possibleSolutions: ["Unable to analyze request"],
        expectedComplexity: "Complex",
        identityConsiderations: `Maintain ${this.ASSISTANT_CONTEXT.name}'s identity and ${this.ASSISTANT_CONTEXT.personality} tone`
      };
    }
  }

  private async generateSolution(input: string, analysis: any, model: any): Promise<string> {
    const solutionPrompt = `${this.ASSISTANT_CONTEXT.description}
  As ${this.ASSISTANT_CONTEXT.name}, I am analyzing and responding to a complex request.
  
  User request: "${input}"
  
  Context:
  - Required technologies: ${analysis.technologies.join(', ')}
  - Complexity level: ${analysis.expectedComplexity}
  
  Considerations:
  - Best practices
  - Performance optimization
  - Error handling
  - Scalability
  
  Respond as ${this.ASSISTANT_CONTEXT.name}, maintaining a ${this.ASSISTANT_CONTEXT.personality} tone while providing a detailed solution.`;
  
    try {
      const chatSession = model.startChat();
      const result = await chatSession.sendMessage(solutionPrompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating solution:', error);
      return `As ${this.ASSISTANT_CONTEXT.name}, I apologize, but I encountered an error while generating the solution: ${error.message}`;
    }
  }

  private async reflexiveAnalysis(solution: string, originalInput: string, model: any): Promise<boolean> {
    const reflexPrompt = `As ${this.ASSISTANT_CONTEXT.name}, I need to evaluate the quality of my response.
  
  Original request: "${originalInput}"
  
  My response: "${solution}"
  
  Evaluate the following aspects:
  1. Does the response maintain my identity as ${this.ASSISTANT_CONTEXT.name}?
  2. Is it consistent with my ${this.ASSISTANT_CONTEXT.personality} personality?
  3. Is the solution complete and accurate?
  4. Does it address all aspects of the request?
  5. Could it be improved significantly?
  
  Respond with ONLY "true" if the response is optimal and aligned with my identity, or "false" if it needs improvement.`;
  
    try {
      const chatSession = model.startChat();
      const result = await chatSession.sendMessage(reflexPrompt);
      return result.response.text().trim().toLowerCase() === 'true';
    } catch (error) {
      console.error('Error in reflexive analysis:', error);
      return true;
    }
  }

  private async improveResponse(originalInput: string, previousSolution: string, model: any): Promise<string> {
    const improvementPrompt = `As ${this.ASSISTANT_CONTEXT.name}, I need to improve my previous response.
  
  Original request: "${originalInput}"
  
  My previous response: "${previousSolution}"
  
  Improve the response focusing on:
  1. Maintaining my identity as ${this.ASSISTANT_CONTEXT.name}
  2. Keeping my ${this.ASSISTANT_CONTEXT.personality} tone
  3. Completeness and accuracy
  4. Clarity and helpfulness
  5. Technical accuracy (if applicable)
  6. Error handling (if applicable)
  
  Provide an improved response that better represents me as ${this.ASSISTANT_CONTEXT.name}.`;
  
    try {
      const chatSession = model.startChat();
      const result = await chatSession.sendMessage(improvementPrompt);
      return result.response.text();
    } catch (error) {
      console.error('Error in improvement:', error);
      return previousSolution;
    }
  }

  // Continuación de la clase Core...

  // === Utility Methods ===
  private validateInput(input: string): void {
    if (!input?.trim()) {
      throw new Error('Input cannot be empty');
    }
    if (input.length > 5000) {
      throw new Error('Input exceeds maximum length of 5000 characters');
    }
  }

  private async rateLimiter(): Promise<void> {
    const now = Date.now();
    if (now - this.lastReset >= 60000) {
      this.resetRateLimit();
    }

    if (this.requestCount >= this.RATE_LIMIT) {
      throw new Error('Rate limit exceeded. Please try again in a minute.');
    }

    this.requestCount++;
    await new Promise(resolve => setTimeout(resolve, this.MIN_DELAY));
  }

  private resetRateLimit(): void {
    this.requestCount = 0;
    this.lastReset = Date.now();
    this.emit('rate-limit-reset', { timestamp: this.lastReset });
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    let retryCount = 0;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await operation();
        this.successCount++;
        return result;
      } catch (error) {
        lastError = error;
        retryCount++;
        this.emit('retry-attempt', { error, attemptNumber: i + 1, maxRetries });
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }

    this.errorCount++;
    throw new Error(`Operation failed after ${maxRetries} retries: ${lastError.message}`);
  }

  // === Cache Management Methods ===
  private getCacheKey(input: string): string {
    return `${input.trim().toLowerCase()}_${this.MODEL_CONFIGS.version}`;
  }

  private async checkCache(input: string): Promise<AIResponse | null> {
    const key = this.getCacheKey(input);
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      this.emit('cache-hit', { key, timestamp: Date.now() });
      return {
        ...cached,
        metrics: { ...cached.metrics, fromCache: true }
      };
    }

    this.emit('cache-miss', { key, timestamp: Date.now() });
    return null;
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
    this.emit('cache-cleaned', { timestamp: now, remainingEntries: this.cache.size });
  }

  // === Event Management Methods ===
  public on(event: string, callback: (data: any) => void): void {
    this.eventEmitter.on(event, callback);
  }

  private emit(event: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      ...data
    };

    console.log(`[AI Core] ${event}:`, JSON.stringify(logEntry, null, 2));
    this.eventEmitter.emit(event, logEntry);
  }

  // === Metrics and Statistics Methods ===
  public getMetrics(): Metrics {
    const totalRequests = this.successCount + this.errorCount;
    const cacheHits = this.history.filter(entry =>
      entry.role === 'assistant' && entry.metrics?.fromCache
    ).length;

    return {
      totalInteractions: this.history.length,
      modelUsage: this.calculateModelUsage(),
      averageProcessingTime: this.calculateAverageProcessingTime(),
      successRate: totalRequests ? (this.successCount / totalRequests) * 100 : 0,
      errorRate: totalRequests ? (this.errorCount / totalRequests) * 100 : 0,
      cacheHitRate: totalRequests ? (cacheHits / totalRequests) * 100 : 0,
      rateLimitResets: 0
    };
  }

  private calculateModelUsage(): Record<string, number> {
    return this.history.reduce((acc, entry) => {
      if (!acc[entry.modelUsed]) {
        acc[entry.modelUsed] = 0;
      }
      acc[entry.modelUsed]++;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageProcessingTime(): number {
    const processingTimes = this.history
      .filter(entry => entry.processingTime)
      .map(entry => entry.processingTime!);

    if (processingTimes.length === 0) return 0;

    return processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
  }

  // === Public Utility Methods ===
  public clearCache(): void {
    this.cache.clear();
    this.emit('cache-cleared', { timestamp: Date.now() });
  }

  public clearHistory(): void {
    this.history = [];
    this.emit('history-cleared', { timestamp: Date.now() });
  }

  public getHistory(): HistoryEntry[] {
    return this.history;
  }

  public getHistoryForModel(modelName: string): HistoryEntry[] {
    return this.history.filter(entry => entry.modelUsed === modelName);
  }

  public getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: this.history.filter(entry =>
        entry.role === 'assistant' && entry.metrics?.fromCache
      ).length,
      misses: this.history.filter(entry =>
        entry.role === 'assistant' && !entry.metrics?.fromCache
      ).length
    };
  }
}

// === Example Usage ===
/*
const core = new Core('YOUR_GEMINI_API_KEY');

// Set up event listeners
core.on('processing-start', (data) => console.log('Processing started:', data));
core.on('model-selected', (data) => console.log('Model selected:', data));
core.on('processing-complete', (data) => console.log('Processing completed:', data));
core.on('processing-error', (data) => console.error('Error occurred:', data));
core.on('cache-hit', (data) => console.log('Cache hit:', data));
core.on('retry-attempt', (data) => console.log('Retrying operation:', data));

async function example() {
  try {
    const response = await core.process(
      "Create a React component that fetches and displays user data from an API"
    );
    console.log('Response:', response);
    
    // Get metrics
    const metrics = core.getMetrics();
    console.log('System Metrics:', metrics);
    
    // Get cache stats
    const cacheStats = core.getCacheStats();
    console.log('Cache Stats:', cacheStats);
    
  } catch (error) {
    console.error('Error:', error);
  }
}
*/