/**
 * ANNY — ENVIRONMENT CONFIGURATION & VALIDATION SERVICE
 * Validates, loads, and manages runtime environment variables and system settings.
 */

export interface EnvConfig {
  nodeEnv: string;
  appName: string;
  appUrl: string;
  port: number;
  
  // AI Keys
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  deepseekApiKey?: string;
  qwenApiKey?: string;
  groqApiKey?: string;
  huggingfaceApiKey?: string;
  openrouterApiKey?: string;
  xaiApiKey?: string;
  mistralApiKey?: string;
  togetherApiKey?: string;
  fireworksApiKey?: string;
  ollamaBaseUrl: string;
  ollamaEmbeddingModel?: string;

  // Databases & Infrastructure
  databaseUrl?: string;
  postgresUser: string;
  postgresPassword?: string;
  redisUrl: string;
  qdrantUrl: string;
  qdrantApiKey?: string;
  rabbitmqUrl: string;
  minioEndpoint: string;
  minioAccessKey: string;
  minioSecretKey?: string;
  clickhouseUrl: string;

  // Security
  jwtSecret: string;
  jwtRefreshSecret: string;
  sessionSecret: string;
  encryptionKey: string;
  adminUsername: string;
  adminPassword?: string;

  // Stripe
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  viteStripePublicKey?: string;

  // System Flags
  annyHardware: boolean;
  userOnlyMode: boolean;
}

export interface EnvValidationResult {
  isValid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  activeProviders: string[];
  activeInfrastructures: string[];
}

let ephemeralJwtSecret: string | null = null;
let ephemeralRefreshSecret: string | null = null;
let ephemeralSessionSecret: string | null = null;
let ephemeralEncryptionKey: string | null = null;

function generateSecureRandomHex(bytes = 32): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const arr = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(arr);
    let hex = '';
    for (let i = 0; i < arr.length; i++) {
      hex += arr[i].toString(16).padStart(2, '0');
    }
    return hex;
  }
  throw new Error('CSPRNG_UNAVAILABLE: Secure random generation requires Web Crypto getRandomValues.');
}

function getDevSecret(cached: string | null, setCached: (v: string) => void): string {
  if (cached) return cached;
  const gen = generateSecureRandomHex(32);
  setCached(gen);
  return gen;
}

const MIN_SECRET_LENGTH = 32;

const FORBIDDEN_SECRET_SUBSTRINGS =
  /(change[-_]?me|placeholder|replace[-_]?me|your[-_]|insert[-_]|put[-_]?your|example|dummy|sample|default|password|passwd|secret|admin|qwerty|asdfgh|zxcvbn|undefined|null|test[-_]?key|dev[-_]?key|prod[-_]?key|jwt[-_]?secret|session[-_]?secret|refresh[-_]?secret|encryption[-_]?key|12345678|87654321)/i;

const PREDICTABLE_SEQUENCES = [
  '0123456789012345678901234567890123456789',
  '9876543210987654321098765432109876543210',
  '1234567890123456789012345678901234567890',
  '0987654321098765432109876543210987654321',
  'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz',
  'zyxwvutsrqponmlkjihgfedcbazyxwvutsrqponmlkjihgfedcba',
  'qwertyuiopasdfghjklzxcvbnmqwertyuiopasdfghjklzxcvbnm'
];

function computeShannonEntropyBitsPerChar(input: string): number {
  const len = input.length;
  if (len === 0) return 0;
  const counts = new Map<string, number>();
  for (let i = 0; i < len; i++) {
    const ch = input[i];
    counts.set(ch, (counts.get(ch) || 0) + 1);
  }
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function hasPeriodicRepetition(input: string): boolean {
  const len = input.length;
  const maxPeriod = Math.floor(len / 2);
  for (let period = 1; period <= maxPeriod; period++) {
    const unit = input.slice(0, period);
    const repeated = unit.repeat(Math.ceil(len / period)).slice(0, len);
    if (repeated === input) {
      return true;
    }
  }
  if (/(.{2,16})\1{2,}/i.test(input)) {
    return true;
  }
  return false;
}

function hasPredictableSequenceRun(input: string): boolean {
  const lower = input.toLowerCase();
  const windowSize = 8;
  for (let i = 0; i <= lower.length - windowSize; i++) {
    const slice = lower.slice(i, i + windowSize);
    for (const seq of PREDICTABLE_SEQUENCES) {
      if (seq.includes(slice)) {
        return true;
      }
    }
  }
  return false;
}

export function isStrongSecuritySecret(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < MIN_SECRET_LENGTH) return false;

  // 1. Reject known placeholder words, composite placeholder phrases, and descriptive secret names
  if (FORBIDDEN_SECRET_SUBSTRINGS.test(trimmed)) return false;

  // Reject multi-word hyphen/underscore slug phrases composed purely of lowercase/uppercase words
  if (/^[a-z]+(?:[-_][a-z]+){2,}$/i.test(trimmed)) return false;

  // 2. Reject low character diversity (e.g., repeated single character or 4-char sets)
  const uniqueChars = new Set(trimmed).size;
  if (uniqueChars < 8) return false;

  // 3. Reject periodic repeating patterns across the string (e.g., abcdabcd..., 12345678901234567890...)
  if (hasPeriodicRepetition(trimmed)) return false;

  // 4. Reject predictable keyboard, numeric, or alphabetical sequences
  if (hasPredictableSequenceRun(trimmed)) return false;

  // 5. Evaluate Shannon entropy per character (valid 32+ char CSPRNG hex has ~3.5-4.0 bits/char; base64 has ~4.5-5.8)
  const shannonEntropy = computeShannonEntropyBitsPerChar(trimmed);
  if (shannonEntropy < 3.0) return false;

  // 6. Evaluate bigram transition diversity to prevent low-complexity repeating structures
  const bigrams = new Set<string>();
  for (let i = 0; i < trimmed.length - 1; i++) {
    bigrams.add(trimmed.slice(i, i + 2));
  }
  const bigramRatio = bigrams.size / (trimmed.length - 1);
  if (bigramRatio < 0.5) return false;

  return true;
}

export class EnvConfigService {
  private static instance: EnvConfigService;
  private config: EnvConfig;

  private constructor() {
    this.config = this.loadFromProcess();
  }

  public static getInstance(): EnvConfigService {
    if (!EnvConfigService.instance) {
      EnvConfigService.instance = new EnvConfigService();
    }
    return EnvConfigService.instance;
  }

  public refreshFromProcess(): EnvConfig {
    this.config = this.loadFromProcess();
    return this.getConfig();
  }

  private loadFromProcess(): EnvConfig {
    const env = (typeof process !== 'undefined' && process.env) ? process.env : {};

    const getVal = (key: string, viteKey?: string) => {
      return env[key] || (viteKey ? env[viteKey] : undefined);
    };

    const nodeEnv = (getVal('NODE_ENV') || env.NODE_ENV || 'development').trim();
    const isProd = nodeEnv === 'production';
    const isBrowserRuntime = typeof window !== 'undefined' && typeof window.document !== 'undefined';

    const rawJwtSecret = !isBrowserRuntime && typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
    const rawJwtRefreshSecret = !isBrowserRuntime && typeof env.JWT_REFRESH_SECRET === 'string' ? env.JWT_REFRESH_SECRET.trim() : '';
    const rawSessionSecret = !isBrowserRuntime && typeof env.SESSION_SECRET === 'string' ? env.SESSION_SECRET.trim() : '';
    const rawEncryptionKey = !isBrowserRuntime && typeof env.ENCRYPTION_KEY === 'string' ? env.ENCRYPTION_KEY.trim() : '';

    // Never auto-generate temporary production secrets or browser secrets; only server development/test may use ephemeral CSPRNG secrets when unset.
    const jwtSecret = isBrowserRuntime ? '' : (rawJwtSecret || (isProd ? '' : getDevSecret(ephemeralJwtSecret, v => { ephemeralJwtSecret = v; })));
    const jwtRefreshSecret = isBrowserRuntime ? '' : (rawJwtRefreshSecret || (isProd ? '' : getDevSecret(ephemeralRefreshSecret, v => { ephemeralRefreshSecret = v; })));
    const sessionSecret = isBrowserRuntime ? '' : (rawSessionSecret || (isProd ? '' : getDevSecret(ephemeralSessionSecret, v => { ephemeralSessionSecret = v; })));
    const encryptionKey = isBrowserRuntime ? '' : (rawEncryptionKey || (isProd ? '' : getDevSecret(ephemeralEncryptionKey, v => { ephemeralEncryptionKey = v; })));

    return {
      nodeEnv,
      appName: getVal('APP_NAME') || 'ANNY',
      appUrl: getVal('APP_URL') || 'http://localhost:3000',
      port: parseInt(getVal('PORT') || '3000', 10),

      geminiApiKey: isBrowserRuntime ? undefined : (getVal('GEMINI_API_KEY') || getVal('GOOGLE_AI_STUDIO_KEY')),
      openaiApiKey: isBrowserRuntime ? undefined : getVal('OPENAI_API_KEY'),
      anthropicApiKey: isBrowserRuntime ? undefined : getVal('ANTHROPIC_API_KEY'),
      deepseekApiKey: isBrowserRuntime ? undefined : getVal('DEEPSEEK_API_KEY'),
      qwenApiKey: isBrowserRuntime ? undefined : getVal('QWEN_API_KEY'),
      groqApiKey: isBrowserRuntime ? undefined : getVal('GROQ_API_KEY'),
      huggingfaceApiKey: isBrowserRuntime ? undefined : getVal('HUGGINGFACE_API_KEY'),
      openrouterApiKey: isBrowserRuntime ? undefined : getVal('OPENROUTER_API_KEY'),
      xaiApiKey: isBrowserRuntime ? undefined : getVal('XAI_API_KEY'),
      mistralApiKey: isBrowserRuntime ? undefined : getVal('MISTRAL_API_KEY'),
      togetherApiKey: isBrowserRuntime ? undefined : getVal('TOGETHER_API_KEY'),
      fireworksApiKey: isBrowserRuntime ? undefined : getVal('FIREWORKS_API_KEY'),
      ollamaBaseUrl: (getVal('OLLAMA_BASE_URL') || '').trim(),
      ollamaEmbeddingModel: (getVal('OLLAMA_EMBEDDING_MODEL') || '').trim() || undefined,

      databaseUrl: env.DATABASE_URL?.trim() || undefined,
      postgresUser: env.POSTGRES_USER || 'postgres',
      postgresPassword: env.POSTGRES_PASSWORD,
      redisUrl: (env.REDIS_URL || '').trim(),
      qdrantUrl: (env.QDRANT_URL || '').trim(),
      qdrantApiKey: env.QDRANT_API_KEY,
      rabbitmqUrl: (env.RABBITMQ_URL || '').trim(),
      minioEndpoint: (env.MINIO_ENDPOINT || '').trim(),
      minioAccessKey: (env.MINIO_ACCESS_KEY || '').trim(),
      minioSecretKey: env.MINIO_SECRET_KEY,
      clickhouseUrl: (env.CLICKHOUSE_URL || '').trim(),

      jwtSecret,
      jwtRefreshSecret,
      sessionSecret,
      encryptionKey,
      adminUsername: env.ADMIN_USERNAME || '',
      adminPassword: env.ADMIN_PASSWORD || '',

      stripeSecretKey: env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      viteStripePublicKey: env.VITE_STRIPE_PUBLIC_KEY,

      annyHardware: env.ANNY_HARDWARE === 'true',
      userOnlyMode: env.VITE_USER_ONLY_MODE === 'true'
    };
  }

  public getConfig(): EnvConfig {
    return { ...this.config };
  }

  public validateSecuritySecrets(): { isValid: boolean; invalidOrMissing: string[] } {
    this.config = this.loadFromProcess();
    const invalidOrMissing: string[] = [];

    if (!isStrongSecuritySecret(this.config.jwtSecret)) {
      invalidOrMissing.push('JWT_SECRET');
    }
    if (!isStrongSecuritySecret(this.config.jwtRefreshSecret)) {
      invalidOrMissing.push('JWT_REFRESH_SECRET');
    }
    if (!isStrongSecuritySecret(this.config.sessionSecret)) {
      invalidOrMissing.push('SESSION_SECRET');
    }
    if (!isStrongSecuritySecret(this.config.encryptionKey)) {
      invalidOrMissing.push('ENCRYPTION_KEY');
    }

    return {
      isValid: invalidOrMissing.length === 0,
      invalidOrMissing
    };
  }

  public assertMandatorySecuritySecrets(): void {
    const check = this.validateSecuritySecrets();
    if (!check.isValid) {
      throw new Error(
        `CRITICAL_SECURITY_CONFIGURATION_ERROR: Mandatory security secret(s) missing, empty, or insufficiently strong (minimum ${MIN_SECRET_LENGTH} chars required): ${check.invalidOrMissing.join(', ')}`
      );
    }
  }

  public validate(): EnvValidationResult {
    this.config = this.loadFromProcess();
    const missingRequired: string[] = [];
    const missingOptional: string[] = [];
    const activeProviders: string[] = [];
    const activeInfrastructures: string[] = [];

    const secretCheck = this.validateSecuritySecrets();
    if (this.config.nodeEnv === 'production' || !secretCheck.isValid) {
      for (const key of secretCheck.invalidOrMissing) {
        if (!missingRequired.includes(key)) {
          missingRequired.push(key);
        }
      }
    }
    if (this.config.nodeEnv === 'production' && !this.config.databaseUrl) {
      missingOptional.push('DATABASE_URL');
    }

    // AI Providers Check
    if (this.config.geminiApiKey) activeProviders.push('Gemini');
    if (this.config.openaiApiKey) activeProviders.push('OpenAI');
    if (this.config.anthropicApiKey) activeProviders.push('Anthropic Claude');
    if (this.config.deepseekApiKey) activeProviders.push('DeepSeek');
    if (this.config.qwenApiKey) activeProviders.push('Qwen');
    if (this.config.groqApiKey) activeProviders.push('Groq');
    if (this.config.huggingfaceApiKey) activeProviders.push('HuggingFace');
    if (this.config.openrouterApiKey) activeProviders.push('OpenRouter');
    activeProviders.push('Ollama (Local)');

    if (activeProviders.length === 1 && !this.config.geminiApiKey) {
      missingOptional.push('GEMINI_API_KEY or other Cloud AI Keys');
    }

    // Databases & Services Check
    if (this.config.databaseUrl) activeInfrastructures.push('PostgreSQL');
    else if (!missingOptional.includes('DATABASE_URL')) missingOptional.push('DATABASE_URL');

    if (this.config.redisUrl) activeInfrastructures.push('Redis Cache');
    if (this.config.qdrantUrl) activeInfrastructures.push('Qdrant Vector DB');
    if (this.config.rabbitmqUrl) activeInfrastructures.push('RabbitMQ Task Queue');
    if (this.config.minioEndpoint) activeInfrastructures.push('MinIO Object Storage');
    if (this.config.clickhouseUrl) activeInfrastructures.push('ClickHouse Analytics');

    return {
      isValid: missingRequired.length === 0,
      missingRequired,
      missingOptional,
      activeProviders,
      activeInfrastructures
    };
  }
}

export const envConfigService = EnvConfigService.getInstance();
