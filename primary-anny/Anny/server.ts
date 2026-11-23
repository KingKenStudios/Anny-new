import express from "express";
import http from "http";
import cors from "cors";
import crypto from "crypto";
import os from "os";
import dns from "dns/promises";
import net from "net";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";
import { attachLiveVisionGateway } from './src/services/liveVisionGateway.ts';
import { creativeGenerationService } from './src/services/creativeGenerationService.ts';
import { materializeWebsiteMediaAssets } from './src/creative/websiteMediaAssetPipeline.ts';
import { discoverRegisteredModels } from './src/core/modelRegistry.ts';
import { aiProviderPlatform } from './src/services/aiProviderPlatform.ts';
import { providerRegistryService } from './src/services/providerRegistryService.ts';
import { ollamaDiscoveryService } from './src/services/ollamaService.ts';
import { envConfigService } from './src/services/envConfigService.ts';
import { enterpriseModelRouter } from './src/services/enterpriseModelRouter.ts';
import {
  attachVerifiedIdentity,
  requireAuth,
  requireAdmin,
  verifyServerAdminCredentials,
  resolveVerifiedIdentity,
  isServerConfiguredAdminEmail,
  AuthenticatedRequest,
  ADMIN_COOKIE_NAME,
  USER_COOKIE_NAME
} from './src/services/serverAuthService.ts';
import { postgresPlatform } from './src/services/postgresPlatform.ts';
import { redisPlatform } from './src/services/redisPlatform.ts';
import { qdrantPlatform } from './src/services/qdrantPlatform.ts';
import { rabbitMQPlatform } from './src/services/rabbitmqPlatform.ts';
import { clickHouseAnalytics } from './src/services/clickhouseAnalytics.ts';
import { authSecurityPlatform } from './src/services/authSecurityPlatform.ts';
import { enterpriseSystemGateway } from './src/services/enterpriseSystemGateway.ts';
import { minioStorageService } from './src/services/minioStorage.ts';
import { auditService } from './src/services/auditService.ts';
import { rabbitWorkerService } from './src/services/rabbitWorkerService.ts';
import { redisRateLimiter } from './src/middleware/rateLimiter.ts';
import { validateDocumentBatch, extractSafeTextForRag, MAX_DOCUMENT_FILE_BYTES, MAX_RAG_TEXT_BYTES, validateRagSearchQuery, normalizeRagSearchLimit, sanitizeDownloadFilename } from './src/services/uploadPolicy.ts';
import { databaseMonitor } from './src/services/databaseMonitor.ts';
import { annyEcosystemService } from './src/services/annyEcosystemService.ts';
import { akinwumiCore } from './src/core/akinwumiCore.ts';
import { toolPermissionSystem } from './src/core/toolPermissionSystem.ts';
import { memoryEngine } from './src/core/memoryEngine.ts';
import { annyCorePipeline } from './src/core/specialistWorkers.ts';
import { formatNaturalConversation } from './src/utils/chatHelpers.ts';
import { scanFilesWithWatchdog, analyzeUrlWithWatchdog } from './src/services/watchdogSecurityService.ts';
import {
  calculateElectricalAndSolar,
  calculateRoboticsMechatronics,
  calculateAerospacePreliminary,
  calculateVehicleEvPreliminary,
  searchSafetyChecklists,
} from './src/core/engineeringSafetyEngine.ts';
import { generateArchitecturePlan } from './src/core/architectureDesignEngine.ts';
import {
  generateBroadcastPlan,
  validateAndPrepareMusicRelease,
  generateVideoStreamingPipeline,
} from './src/core/broadcastMediaEngine.ts';
import {
  projectPersistenceService,
  isValidProjectId,
} from './src/services/projectPersistenceService.ts';
import {
  previewRuntimeService,
  STANDALONE_TAB_SANDBOX_CSP,
} from './src/services/previewRuntimeService.ts';
import {
  localSttService,
  parseBase64AudioPayload,
} from './src/services/localSttService.ts';
import {
  voiceNoteService,
  isValidVoiceNoteId,
} from './src/services/voiceNoteService.ts';
import { annyOrganizationGovernance } from './src/core/AnnyOrganizationGovernanceLayer.ts';
import { AnnyOrganizationExecutionController } from './src/core/AnnyOrganizationExecutionContext.ts';
import {
  generateUniversalLanguageMatrix,
  selectOptimalLanguageModel,
  extractProtectedTokens,
  analyzeLanguageWithCodeSwitching,
  runLivePhase38Certification,
  type RuntimeCapabilitySnapshot,
} from './src/core/AnnyUniversalLanguageFabric.ts';
import { ANNY_MASTER_IDENTITY as ANNY_IDENTITY } from './src/core/annyIdentity.ts';
import { annyCapabilityTruthRegistry } from './src/core/annyCapabilityTruthRegistry.ts';
import { runAnnyLiveCapabilityProbes } from './src/services/annyLiveCapabilityProbes.ts';

import FormData from "form-data";
import { Readable } from "stream";
import multer from "multer";
import JSZip from "jszip";

const modlyUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

dotenv.config();

// Persist local development signing secrets across dev server restarts so existing
// browser sessions do not lose ownership of their projects after a server reload.
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  try {
    const devSecretsDir = process.env.ANNY_DATA_DIR
      ? path.resolve(process.env.ANNY_DATA_DIR)
      : path.join(process.cwd(), '.anny-data');
    const devSecretsFile = path.join(devSecretsDir, '.dev-runtime-secrets.json');
    const secretKeys = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET', 'ENCRYPTION_KEY'] as const;
    const needsAny = secretKeys.some((k) => !process.env[k] || !String(process.env[k]).trim());
    if (needsAny) {
      let stored: Record<string, string> = {};
      if (fs.existsSync(devSecretsFile)) {
        try {
          stored = JSON.parse(fs.readFileSync(devSecretsFile, 'utf8')) || {};
        } catch {
          stored = {};
        }
      }
      let dirty = false;
      for (const key of secretKeys) {
        if (!process.env[key] || !String(process.env[key]).trim()) {
          if (typeof stored[key] === 'string' && stored[key].length >= 64) {
            process.env[key] = stored[key];
          } else {
            const generated = crypto.randomBytes(32).toString('hex');
            stored[key] = generated;
            process.env[key] = generated;
            dirty = true;
          }
        }
      }
      if (dirty) {
        fs.mkdirSync(devSecretsDir, { recursive: true });
        fs.writeFileSync(devSecretsFile, JSON.stringify(stored, null, 2), { mode: 0o600 });
      }
    }
  } catch (secretBootstrapErr: any) {
    console.warn('[ANNY] Local dev secret persistence notice:', secretBootstrapErr?.message || secretBootstrapErr);
  }
}

envConfigService.refreshFromProcess();

async function startServer() {
  console.log("ANNY Server Initializing...");
  // Fail closed before registering routes or accepting requests if mandatory security secrets are missing/invalid
  envConfigService.assertMandatorySecuritySecrets();
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Configure proxy trust explicitly (never trust raw X-Forwarded-For unless TRUST_PROXY is set)
  const rawTrustProxy = (process.env.TRUST_PROXY || '').trim();
  if (!rawTrustProxy || rawTrustProxy === 'false' || rawTrustProxy === '0') {
    app.set('trust proxy', false);
  } else if (rawTrustProxy === 'true') {
    app.set('trust proxy', true);
  } else if (/^\d+$/.test(rawTrustProxy)) {
    app.set('trust proxy', parseInt(rawTrustProxy, 10));
  } else {
    app.set('trust proxy', rawTrustProxy);
  }

  // Strict CORS allowlist (same-origin + explicitly configured ALLOWED_ORIGINS; never wildcard with credentials)
  const configuredAllowedOrigins = new Set(
    String(process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean)
  );
  app.use(cors((req, callback) => {
    const origin = String(req.headers.origin || '').trim().replace(/\/+$/, '');
    const host = String(req.headers.host || '').trim();
    const sameOriginHttp = host ? `http://${host}` : '';
    const sameOriginHttps = host ? `https://${host}` : '';
    if (!origin || origin === sameOriginHttp || origin === sameOriginHttps || configuredAllowedOrigins.has(origin)) {
      callback(null, { origin: origin || true, credentials: true });
    } else {
      callback(null, { origin: false, credentials: false });
    }
  }));

  // Safe HTTP security headers (iframe-compatible for AI Studio preview: no X-Frame-Options: DENY)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize Background Services (optional services skip probing when unconfigured)
  databaseMonitor.startMonitoring();
  const rabbitInitialization = rabbitWorkerService.initialize().catch((err) => { console.warn('RabbitWorker init warning:', err); return false; });
  // Non-blocking startup Ollama & provider discovery (never blocks or crashes boot)
  void providerRegistryService.auditAndRefreshHealth()
    .then(async ({ ollamaDiscovery }) => {
      console.log(`[Startup Discovery] Ollama reachable=${ollamaDiscovery.reachable}, models=${ollamaDiscovery.discoveredModels.length}, inferenceTestPassed=${ollamaDiscovery.inferenceTestPassed}`);
      await rabbitInitialization;
      void runAnnyLiveCapabilityProbes(ollamaDiscovery).catch((err) => {
        console.warn('[Capability Probes] Live service verification warning:', err?.message || err);
      });
    })
    .catch((err) => {
      console.warn('[Startup Discovery] Provider audit warning:', err?.message || err);
    });

  // Resolve verified identity (never trusts spoofed headers) before tiered rate limiting
  app.use('/api', attachVerifiedIdentity);
  app.use('/api', redisRateLimiter.middleware);

  // Tiered rate limiters by operational class
  app.use(['/api/auth/guest', '/api/auth/refresh', '/api/auth/logout', '/api/admin/verify', '/api/admin/logout', '/api/v1/anny/keys', '/api/anny/keys'], redisRateLimiter.authMiddleware);
  app.use(['/api/admin', '/api/database', '/api/infrastructure/readiness', '/api/infrastructure/analytics'], redisRateLimiter.adminMiddleware);
  app.use(['/api/documents', '/api/upload', '/api/storage', '/api/anny/source/rebuild-upload'], redisRateLimiter.uploadStorageMiddleware);
  app.use([
    '/api/anny/pipeline',
    '/api/brain',
    '/api/router',
    '/api/vision/analyze',
    '/api/sahara',
    '/api/modly/generate',
    '/api/v1/anny/intelligence',
    '/api/anny/intelligence',
    '/api/workers'
  ], redisRateLimiter.aiGenerationMiddleware);

  // Hardware detection simulation
  let isHardwareActive = false;
  try {
    isHardwareActive = process.env.ANNY_HARDWARE === "true";
  } catch (e) {
    isHardwareActive = false;
  }

  function sanitizeObjectKeyForUser(rawName: string, uid: string, isAdmin: boolean): string {
    const cleaned = String(rawName || 'artifact.bin').replace(/\0/g, '').trim();
    if (!cleaned || cleaned.includes('..') || cleaned.startsWith('/') || cleaned.startsWith('\\')) {
      throw new Error('INVALID_OBJECT_PATH: Path traversal or absolute path rejected.');
    }
    if (isAdmin) return cleaned;
    const expectedPrefix = `users/${uid}/`;
    return cleaned.startsWith(expectedPrefix) ? cleaned : `${expectedPrefix}${cleaned}`;
  }

  // MinIO Pre-signed URL endpoints for authenticated user artifacts and media
  app.get("/api/storage/presigned-url", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const objectName = sanitizeObjectKeyForUser(
        String(req.query.objectName || 'artifact.bin'),
        uid,
        req.authUser!.isAdmin
      );
      const url = await minioStorageService.getPresignedUrl(objectName);
      res.json({ objectName, presignedUrl: url, expirySeconds: 86400 });
    } catch (err: any) {
      const status = String(err?.message || '').includes('INVALID_OBJECT_PATH') ? 400 : 500;
      res.status(status).json({ error: err.message });
    }
  });

  app.get("/api/storage/presigned-upload", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const objectName = sanitizeObjectKeyForUser(
        String(req.query.objectName || `upload_${Date.now()}.bin`),
        uid,
        req.authUser!.isAdmin
      );
      const uploadUrl = await minioStorageService.getPresignedPutUrl(objectName);
      res.json({ objectName, uploadUrl, expirySeconds: 3600 });
    } catch (err: any) {
      const status = String(err?.message || '').includes('INVALID_OBJECT_PATH') ? 400 : 500;
      res.status(status).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------
  // PUBLIC SOURCE UNDERSTANDING — URL → EVIDENCE SNAPSHOT
  // Only public pages are fetched. Private/local network targets are rejected
  // to prevent SSRF. ANNY analyzes the evidence and produces a clean-room
  // rebuild plan; it does not copy credentials, private data, or proprietary
  // server-side code.
  // ---------------------------------------------------------------------
  const sourceUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }
  });

  function isBlockedAddress(address: string): boolean {
    const cleaned = String(address || '').trim().toLowerCase();
    // Handle IPv4-mapped IPv6 addresses such as ::ffff:127.0.0.1 or ::ffff:7f00:1
    if (cleaned.startsWith('::ffff:')) {
      const mappedPart = cleaned.slice(7);
      if (net.isIPv4(mappedPart)) {
        return isBlockedAddress(mappedPart);
      }
      const hexMatch = mappedPart.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (hexMatch) {
        const hi = parseInt(hexMatch[1], 16);
        const lo = parseInt(hexMatch[2], 16);
        const ipv4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
        return isBlockedAddress(ipv4);
      }
      return true;
    }

    if (net.isIPv4(cleaned)) {
      const [a, b] = cleaned.split('.').map(Number);
      return (
        a === 10 ||
        a === 127 ||
        a === 0 ||
        (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
        (a === 169 && b === 254) || // Link-local & cloud metadata 169.254.0.0/16
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19)) || // Benchmark network
        a >= 224
      );
    }
    if (net.isIPv6(cleaned)) {
      return (
        cleaned === '::' ||
        cleaned === '::1' ||
        cleaned.startsWith('fc') ||
        cleaned.startsWith('fd') ||
        cleaned.startsWith('fe80:') ||
        cleaned.startsWith('ff')
      );
    }
    return true;
  }

  async function validatePublicUrl(rawUrl: string): Promise<URL> {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) throw new Error('A public HTTP(S) URL is required.');
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(normalized);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) URLs are supported.');
    if (url.username || url.password) throw new Error('URLs containing credentials are not allowed.');
    const hostLower = url.hostname.toLowerCase();
    if (hostLower === 'localhost' || hostLower.endsWith('.localhost') || hostLower.endsWith('.local') || hostLower.endsWith('.internal')) {
      throw new Error('The target resolves to a private, local, or otherwise blocked network address.');
    }
    if (net.isIP(hostLower)) {
      if (isBlockedAddress(hostLower)) {
        throw new Error('The target resolves to a private, local, or otherwise blocked network address.');
      }
      return url;
    }
    const addresses = await dns.lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some(entry => isBlockedAddress(entry.address))) {
      throw new Error('The target resolves to a private, local, or otherwise blocked network address.');
    }
    return url;
  }

  async function safePublicFetch(
    rawUrl: string,
    options: { timeoutMs?: number; headers?: Record<string, string>; maxBytes?: number; maxHops?: number } = {}
  ) {
    const maxHops = options.maxHops ?? 5;
    let currentUrl = String(rawUrl || '');

    for (let hop = 0; hop <= maxHops; hop++) {
      const validated = await validatePublicUrl(currentUrl);
      const response = await axios.get(validated.toString(), {
        timeout: options.timeoutMs ?? 12000,
        maxRedirects: 0,
        maxContentLength: options.maxBytes ?? 5 * 1024 * 1024,
        maxBodyLength: options.maxBytes ?? 5 * 1024 * 1024,
        responseType: 'text',
        validateStatus: (status) => status >= 200 && status < 400,
        headers: options.headers || { 'User-Agent': 'ANNY-Public-Source-Analyzer/1.0' }
      });

      if (response.status >= 300 && response.status < 400 && response.headers?.location) {
        if (hop === maxHops) {
          throw new Error('Too many redirects while fetching public URL.');
        }
        currentUrl = new URL(String(response.headers.location), validated.toString()).toString();
        continue;
      }

      return { response, finalUrl: validated.toString() };
    }

    throw new Error('Unable to resolve public URL.');
  }

  app.post('/api/anny/source/inspect-url', requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const { response, finalUrl } = await safePublicFetch(String(req.body?.url || ''), {
        timeoutMs: 15000,
        headers: { 'User-Agent': 'ANNY-Public-Source-Analyzer/1.0' }
      });
      const html = String(response.data || '');
      const $ = cheerio.load(html);
      const links = $('a[href]').map((_, el) => $(el).attr('href') || '').get().filter(Boolean).slice(0, 200);
      const assets = $('img[src],script[src],link[href],video[src],source[src]')
        .map((_, el) => ($(el).attr('src') || $(el).attr('href') || '')).get().filter(Boolean).slice(0, 200);
      const snapshot = {
        url: finalUrl,
        title: $('title').first().text().trim(),
        html: html.slice(0, 50000),
        links,
        assets,
        capturedAt: new Date().toISOString()
      };
      const { annyLinkUnderstandingEngine } = await import('./src/core/annyLinkUnderstandingEngine.ts');
      const report = await annyLinkUnderstandingEngine.inspectUrl(finalUrl, snapshot);
      res.json({ success: true, report, source: { status: response.status, contentType: response.headers['content-type'] || '' } });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Unable to inspect public URL' });
    }
  });

  app.post('/api/anny/source/rebuild-upload', requireAuth(), sourceUpload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'A project ZIP file is required.' });
      const zip = await JSZip.loadAsync(req.file.buffer);
      const entries = Object.keys(zip.files);
      const MAX_ARCHIVE_ENTRIES = 200;
      const MAX_SOURCE_FILES = 100;
      const MAX_SOURCE_FILE_BYTES = 1_000_000;
      const MAX_TOTAL_SOURCE_BYTES = 5_000_000;
      if (entries.length > MAX_ARCHIVE_ENTRIES) {
        return res.status(413).json({ success: false, error: 'Archive contains too many entries. Limit: 200.' });
      }

      const sourceFiles: Record<string, string> = {};
      const allowedText = /\.(tsx?|jsx?|css|html|json|md|sql|ya?ml|toml)$/i;
      let totalSourceBytes = 0;
      let selectedSourceCount = 0;

      for (const name of entries) {
        const entry = zip.files[name];
        if (entry.dir) continue;
        const normalizedName = name.replace(/\\/g, '/');
        const pathSegments = normalizedName.split('/');
        if (normalizedName.startsWith('/') || /^[a-z]:/i.test(normalizedName) ||
            pathSegments.includes('..') || normalizedName.includes('\0')) {
          return res.status(400).json({ success: false, error: 'Archive contains an unsafe path.' });
        }
        if (pathSegments.some(part => part === 'node_modules' || part === '.git')) continue;
        const basename = pathSegments[pathSegments.length - 1].toLowerCase();
        // Never ingest environment files: example files may have been populated with secrets.
        if (basename === '.env' || basename.startsWith('.env.')) continue;
        if (!allowedText.test(normalizedName)) continue;

        if (selectedSourceCount >= MAX_SOURCE_FILES) {
          return res.status(413).json({ success: false, error: 'Archive contains too many source files. Limit: 100.' });
        }
        const reportedSize = Number((entry as any)._data?.uncompressedSize);
        if (!Number.isSafeInteger(reportedSize) || reportedSize < 0) {
          return res.status(400).json({ success: false, error: 'Unable to validate archive entry size.' });
        }
        if (reportedSize > MAX_SOURCE_FILE_BYTES) {
          return res.status(413).json({ success: false, error: 'A source file exceeds the 1 MB limit.' });
        }
        if (totalSourceBytes + reportedSize > MAX_TOTAL_SOURCE_BYTES) {
          return res.status(413).json({ success: false, error: 'Extracted source exceeds the 5 MB total limit.' });
        }

        const text = await entry.async('text');
        const actualBytes = Buffer.byteLength(text, 'utf8');
        if (actualBytes > MAX_SOURCE_FILE_BYTES || totalSourceBytes + actualBytes > MAX_TOTAL_SOURCE_BYTES) {
          return res.status(413).json({ success: false, error: 'Extracted source exceeds configured size limits.' });
        }
        sourceFiles['/' + normalizedName] = text;
        totalSourceBytes += actualBytes;
        selectedSourceCount += 1;
      }
      if (!Object.keys(sourceFiles).length) return res.status(400).json({ success: false, error: 'No supported source files were found in the uploaded archive.' });
      const manifest = {
        fileCount: entries.length,
        sourceFileCount: Object.keys(sourceFiles).length,
        entryCandidates: Object.keys(sourceFiles).filter(name => /(^|\/)(App|main|index|server)\.(tsx?|jsx?|js|mjs)$/i.test(name)),
        packageJson: sourceFiles['/package.json'] || null,
        files: Object.keys(sourceFiles)
      };
      const { modelRouter } = await import('./src/core/modelRouter.ts');
      const response = await modelRouter.executeRoutedChat([
        { role: 'system', content: 'You are ANNY. Analyze an uploaded application for a clean-room rebuild. Identify architecture, features, routes, data models, APIs, UI structure, and missing production pieces. Do not reproduce proprietary source code, credentials, secrets, private data, or malware. Return concise JSON.' },
        { role: 'user', content: JSON.stringify({ manifest, source: sourceFiles }) }
      ], { taskCategory: 'coding' });
      let analysis: any = {};
      try { analysis = JSON.parse(String(response.content || '').replace(/```json|```/g, '').trim()); } catch { analysis = { summary: response.content }; }
      res.json({ success: true, analysis, cleanRoom: { sourceCodeCopied: false, credentialsCopied: false, privateDataCopied: false } });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Uploaded application analysis failed' });
    }
  });

  // Centralized Audit Event Endpoint (identity strictly bound to verified token)
  app.post("/api/audit/event", requireAuth(), async (req: AuthenticatedRequest, res) => {
    const { action, details, severity } = req.body || {};
    try {
      const logId = await auditService.logEvent({
        action,
        details,
        severity,
        userId: req.authUser!.uid,
        userEmail: req.authUser!.email || undefined,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1'
      });
      res.json({ success: true, logId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // RabbitMQ Worker Task Triggers
  app.post("/api/workers/embeddings", requireAuth(), async (req: AuthenticatedRequest, res) => {
    const { documentId, content } = req.body;
    if (!documentId || !content) return res.status(400).json({ error: "documentId and content required" });
    try {
      const jobId = await rabbitWorkerService.publishEmbeddingTask(documentId, content);
      res.json({ success: true, jobId, message: "AI document embedding task queued in RabbitMQ worker." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/workers/transpile", requireAuth(), async (req: AuthenticatedRequest, res) => {
    const { taskId, sourceCode } = req.body;
    if (!taskId || !sourceCode) return res.status(400).json({ error: "taskId and sourceCode required" });
    try {
      const jobId = await rabbitWorkerService.publishTranspileTask(taskId, sourceCode);
      res.json({ success: true, jobId, message: "Code transpilation task queued in RabbitMQ worker." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Database Monitor Probe Endpoint (Admin only)
  app.get("/api/database/status", requireAdmin, (req, res) => {
    res.json(databaseMonitor.getMonitorStatus());
  });

  // API Routes
  app.get("/api/config", (req, res) => {
    res.json({
      brandName: "ANNY",
      isHardwareMode: isHardwareActive,
      status: "ONLINE",
      version: "2.5.0-SOVEREIGN"
    });
  });

  app.get("/api/health", (req, res) => {
    const geminiConfigured = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY);
    const groqConfigured = !!process.env.GROQ_API_KEY;
    const hfConfigured = !!process.env.HUGGINGFACE_API_KEY;
    const storageConfigured = Boolean(minioStorageService.getConfiguredEndpoint());
    const ollamaConfigured = Boolean(process.env.OLLAMA_BASE_URL);
    const execPolicy = providerRegistryService.getExecutionPolicy();

    res.json({
      status: "ONLINE",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      brand: "ANNY",
      executionMode: execPolicy.mode,
      hardware: isHardwareActive,
      keys: {
        gemini: geminiConfigured,
        groq: groqConfigured,
        huggingface: hfConfigured
      },
      capabilities: {
        coreWorkspace: "available_offline",
        localInference: ollamaConfigured ? "requires_optional_provider" : "not_configured",
        cloudInference: (geminiConfigured || groqConfigured || hfConfigured) ? "available_online" : "not_configured",
        objectStorage: storageConfigured ? "available_online" : "not_configured",
        postgres: process.env.DATABASE_URL ? "available_online" : "not_configured",
        redis: (process.env.REDIS_URL || process.env.REDIS_HOST) ? "available_online" : "not_configured"
      }
    });
  });

  app.get("/api/system/capabilities", async (_req, res) => {
    const execPolicy = providerRegistryService.getExecutionPolicy();
    const ollamaDiscovery = ollamaDiscoveryService.getLastDiscovery();
    const minioHealth = await minioStorageService.checkHealth();
    const dbHealth = await postgresPlatform.checkHealth();
    const hasCloudAi = Boolean(
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_STUDIO_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.OPENROUTER_API_KEY
    );

    res.json({
      brand: "ANNY",
      executionMode: execPolicy.mode,
      timestamp: new Date().toISOString(),
      capabilities: [
        { id: "ui_workspace", label: "ANNY Workspace & Local Tools", status: "available_offline" },
        {
          id: "auth_sessions",
          label: "Server-Signed Session Auth & RBAC",
          status: dbHealth.status === "CONNECTED"
            ? "available_online"
            : (process.env.NODE_ENV === "production" ? "unavailable" : "available_volatile_development")
        },
        { id: "document_policy", label: "Upload & RAG Sanitization Engine", status: "available_offline" },
        {
          id: "local_llm_ollama",
          label: "Local Model Inference (Ollama)",
          status: ollamaDiscovery?.reachable
            ? (ollamaDiscovery.discoveredModels.length > 0 ? "available_offline" : "unavailable")
            : (process.env.OLLAMA_BASE_URL ? "unavailable" : "not_configured"),
          models: ollamaDiscovery?.discoveredModels?.length || 0
        },
        {
          id: "cloud_llm",
          label: "Cloud AI Providers (Gemini / Multi-Provider)",
          status: execPolicy.mode === "OFFLINE_ONLY"
            ? "unavailable"
            : (hasCloudAi ? "available_online" : "requires_optional_provider")
        },
        {
          id: "object_storage_s3",
          label: "S3 / MinIO Object Storage",
          status: minioHealth.status === "CONNECTED"
            ? "available_online"
            : (minioHealth.status === "NOT_CONFIGURED" ? "not_configured" : "unavailable")
        },
        {
          id: "postgres_db",
          label: "PostgreSQL Durable Database",
          status: dbHealth.status === "CONNECTED"
            ? "available_online"
            : (dbHealth.status === "NOT_CONFIGURED" ? "not_configured" : "unavailable")
        }
      ]
    });
  });

  // Secure ANNY → Keda control bridge. Credentials stay server-side.
  app.post("/api/v1/anny/integrations/keda/command", async (req, res) => {
    const authHeader = String(req.headers.authorization || '');
    const presentedToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    let session: Awaited<ReturnType<typeof authSecurityPlatform.verifyTokenPersistent>> = null;
    try {
      session = presentedToken ? await authSecurityPlatform.verifyTokenPersistent(presentedToken) : null;
    } catch {
      return res.status(503).json({ ok: false, error: 'AUTH_SESSION_STORE_UNAVAILABLE' });
    }
    if (!session || !authSecurityPlatform.hasPermission(session.role, 'CODE_GEN')) {
      return res.status(401).json({ ok: false, error: 'ANNY_AUTHENTICATION_REQUIRED' });
    }

    const { action, payload, requestId } = req.body || {};
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ ok: false, error: 'action is required' });
    }
    const allowedActions = String(process.env.KEDA_ALLOWED_ACTIONS || '')
      .split(',').map(v => v.trim()).filter(Boolean);
    if (allowedActions.length === 0 || !allowedActions.includes(action)) {
      return res.status(403).json({ ok: false, error: 'KEDA_ACTION_NOT_AUTHORIZED' });
    }
    try {
      const { callKeda } = await import('./src/services/kedaIntegrationService.ts');
      const result = await callKeda({ action, payload, requestId });
      return res.status(result.status).json(result);
    } catch (error: any) {
      return res.status(500).json({ ok: false, error: error?.message || 'KEDA integration failed' });
    }
  });

  app.get("/api/v1/anny/integrations/keda/status", async (_req, res) => {
    const configured = Boolean(process.env.KEDA_API_URL && process.env.KEDA_API_TOKEN);
    res.json({ configured, provider: 'Keda', transport: 'server-to-server', credentialsInBrowser: false });
  });

  // ---------------------------------------------------------------------
  // Guest / Operator Session Provisioning (Server-Signed HMAC Session)
  // Issues an isolated per-session OPERATOR token (never admin) for guest workspaces
  // so API calls succeed reliably even in iframe/unauthenticated guest mode.
  // ---------------------------------------------------------------------
  app.post("/api/auth/guest", async (req: AuthenticatedRequest, res) => {
    try {
      const existing = req.authUser || (await resolveVerifiedIdentity(req, { allowApiKey: false }));
      if (existing && existing.authMethod === 'anny-session' && !existing.isAdmin) {
        const authHeader = String(req.headers.authorization || '').trim();
        const existingBearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const existingToken = existingBearer || req.headers.cookie?.match(new RegExp(`${USER_COOKIE_NAME}=([^;]+)`))?.[1];
        if (existingToken) {
          const decodedToken = existingBearer ? existingToken : decodeURIComponent(existingToken);
          return res.json({
            success: true,
            authenticated: true,
            uid: existing.uid,
            role: existing.role,
            isAdmin: false,
            token: decodedToken,
            expiresAt: existing.tokenExpiresAt
          });
        }
      }

      const guestUid = `guest_${crypto.randomBytes(12).toString('hex')}`;
      const session = await authSecurityPlatform.createPersistentToken(guestUid, 'Guest Operator', 'OPERATOR');
      const isSecure = req.secure || req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';

      res.cookie(USER_COOKIE_NAME, session.token, {
        httpOnly: true,
        sameSite: isSecure ? 'none' : 'lax',
        secure: isSecure,
        ...(isSecure ? { partitioned: true } : {}),
        path: '/',
        maxAge: 24 * 3600 * 1000
      } as any);

      return res.json({
        success: true,
        authenticated: true,
        uid: guestUid,
        role: session.role,
        isAdmin: false,
        token: session.token,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Unable to establish guest session'
      });
    }
  });

  app.post("/api/auth/refresh", async (req: AuthenticatedRequest, res) => {
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken.trim() : '';
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'REFRESH_TOKEN_REQUIRED' });
    }
    let rotated;
    try {
      rotated = await authSecurityPlatform.refreshSessionPersistent(refreshToken);
    } catch {
      return res.status(503).json({ success: false, error: 'AUTH_SESSION_STORE_UNAVAILABLE' });
    }
    if (!rotated) {
      return res.status(401).json({ success: false, error: 'INVALID_OR_REVOKED_REFRESH_TOKEN' });
    }

    const isSecure = req.secure || req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
    const targetCookie = rotated.role === 'SOVEREIGN_ADMIN' ? ADMIN_COOKIE_NAME : USER_COOKIE_NAME;
    res.cookie(targetCookie, rotated.token, {
      httpOnly: true,
      sameSite: isSecure ? 'none' : 'lax',
      secure: isSecure,
      ...(isSecure ? { partitioned: true } : {}),
      path: '/',
      maxAge: rotated.role === 'SOVEREIGN_ADMIN' ? 3600 * 1000 : 24 * 3600 * 1000
    } as any);

    return res.json({
      success: true,
      authenticated: true,
      uid: rotated.userId,
      role: rotated.role,
      isAdmin: rotated.role === 'SOVEREIGN_ADMIN',
      token: rotated.token,
      refreshToken: rotated.refreshToken,
      expiresAt: rotated.expiresAt
    });
  });

  app.post("/api/auth/logout", async (req: AuthenticatedRequest, res) => {
    const authHeader = String(req.headers.authorization || '');
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken.trim() : '';
    const cookieHeader = String(req.headers.cookie || '');
    const userMatch = cookieHeader.match(new RegExp(`${USER_COOKIE_NAME}=([^;]+)`));
    let revocationFailed = false;
    try {
      if (bearer) await authSecurityPlatform.revokeSessionPersistent(bearer);
      if (refreshToken) await authSecurityPlatform.revokeRefreshTokenPersistent(refreshToken);
      if (userMatch?.[1]) await authSecurityPlatform.revokeSessionPersistent(decodeURIComponent(userMatch[1]));
    } catch {
      revocationFailed = true;
    }
    const isSecure = req.secure || req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
    res.clearCookie(USER_COOKIE_NAME, {
      httpOnly: true,
      sameSite: isSecure ? 'none' : 'lax',
      secure: isSecure,
      path: '/'
    });
    if (revocationFailed) {
      return res.status(503).json({ success: false, error: 'SESSION_REVOCATION_UNAVAILABLE' });
    }
    res.json({ success: true });
  });

  // ---------------------------------------------------------------------
  // Server-Side Administrator Session Verification (No client bypasses)
  // ---------------------------------------------------------------------
  app.get("/api/admin/session", async (req: AuthenticatedRequest, res) => {
    let identity: Awaited<ReturnType<typeof resolveVerifiedIdentity>>;
    try {
      identity = req.authUser || (await resolveVerifiedIdentity(req, { allowApiKey: false }));
    } catch {
      return res.status(503).json({ authenticated: false, isAdmin: false, error: 'AUTH_SESSION_STORE_UNAVAILABLE' });
    }
    if (!identity) {
      return res.json({ authenticated: false, isAdmin: false });
    }
    return res.json({
      authenticated: true,
      isAdmin: identity.isAdmin,
      role: identity.role,
      uid: identity.uid,
      email: identity.email
    });
  });

  app.post("/api/admin/verify", async (req: AuthenticatedRequest, res) => {
    try {
      const { username, password } = req.body || {};
      const existingIdentity = req.authUser || (await resolveVerifiedIdentity(req, { allowApiKey: false }));

      let authorized = false;
      let subjectUid = '';
      let subjectName = '';

      // Path A: Valid Firebase ID token whose email is verified and server-listed in ADMIN_EMAILS
      if (existingIdentity && existingIdentity.isAdmin) {
        authorized = true;
        subjectUid = existingIdentity.uid;
        subjectName = existingIdentity.email || existingIdentity.uid;
      } else if (existingIdentity?.email && existingIdentity?.emailVerified && isServerConfiguredAdminEmail(existingIdentity.email)) {
        authorized = true;
        subjectUid = existingIdentity.uid;
        subjectName = existingIdentity.email;
      }

      // Path B: Server-configured ADMIN_USERNAME + ADMIN_PASSWORD / ADMIN_PASSWORD_HASH (timing-safe)
      if (!authorized && username && password) {
        if (verifyServerAdminCredentials(String(username), String(password))) {
          authorized = true;
          subjectUid = existingIdentity?.uid || `admin:${String(username).trim().toLowerCase()}`;
          subjectName = String(username).trim();
        }
      }

      if (!authorized) {
        await auditService.logEvent({
          action: 'ADMIN_VERIFY_DENIED',
          severity: 'warning',
          userId: existingIdentity?.uid || 'unauthenticated',
          userEmail: existingIdentity?.email,
          ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1',
          details: 'Rejected server admin verification attempt'
        }).catch(() => {});
        return res.status(401).json({
          authenticated: false,
          isAdmin: false,
          error: 'ADMIN_VERIFICATION_FAILED'
        });
      }

      const session = await authSecurityPlatform.createPersistentToken(subjectUid, subjectName, 'SOVEREIGN_ADMIN');
      const isSecure = req.secure || req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
      res.cookie(ADMIN_COOKIE_NAME, session.token, {
        httpOnly: true,
        sameSite: isSecure ? 'none' : 'lax',
        secure: isSecure,
        ...(isSecure ? { partitioned: true } : {}),
        path: '/',
        maxAge: 3600 * 1000
      } as any);

      await auditService.logEvent({
        action: 'ADMIN_SESSION_VERIFIED',
        severity: 'critical',
        userId: subjectUid,
        userEmail: existingIdentity?.email || subjectName,
        ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1',
        details: `Server verified SOVEREIGN_ADMIN session for ${subjectName}`
      }).catch(() => {});

      return res.json({
        authenticated: true,
        isAdmin: true,
        role: session.role,
        uid: subjectUid,
        expiresAt: session.expiresAt
      });
    } catch (err: any) {
      return res.status(500).json({ authenticated: false, error: err?.message || 'Admin verification error' });
    }
  });

  app.post("/api/admin/logout", async (req: AuthenticatedRequest, res) => {
    const authHeader = String(req.headers.authorization || '');
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken.trim() : '';
    const cookieHeader = String(req.headers.cookie || '');
    const match = cookieHeader.match(new RegExp(`${ADMIN_COOKIE_NAME}=([^;]+)`));
    let revocationFailed = false;
    try {
      if (bearer) await authSecurityPlatform.revokeSessionPersistent(bearer);
      if (refreshToken) await authSecurityPlatform.revokeRefreshTokenPersistent(refreshToken);
      if (match?.[1]) await authSecurityPlatform.revokeSessionPersistent(decodeURIComponent(match[1]));
    } catch {
      revocationFailed = true;
    }
    const isSecure = req.secure || req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
    res.clearCookie(ADMIN_COOKIE_NAME, {
      httpOnly: true,
      sameSite: isSecure ? 'none' : 'lax',
      secure: isSecure,
      path: '/'
    });
    if (revocationFailed) {
      return res.status(503).json({ success: false, error: 'SESSION_REVOCATION_UNAVAILABLE' });
    }
    res.json({ success: true });
  });

  // ---------------------------------------------------------------------
  // ANNY Universal Ecosystem & Enterprise Gateway API Platform (/api/v1/anny/*)
  // Powers AIOS, KEDA, KenPay Bank, Voom Telematics, King Ken Studio, Mechatronics,
  // Aerospace, Motor/Automotive, and Future Companies via secure APIs.
  // ---------------------------------------------------------------------
  app.get("/api/v1/anny/memory/context", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const prompt = String(req.query.prompt || '');
      const projectId = String(req.query.projectId || 'default_project');
      const { annyLearningMemory } = await import('./src/core/AnnyLearningMemory.ts');
      const memories = await annyLearningMemory.retrieveUserContext(req.authUser!.uid, prompt, projectId);
      res.json({ success: true, memories });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Memory retrieval failed' });
    }
  });

  app.post("/api/v1/anny/memory/feedback", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId, projectId, feedback, taskType = 'conversation', success = true, manualRule, topic } = req.body || {};
      if (!feedback && !manualRule) return res.status(400).json({ success: false, error: 'feedback or manualRule is required' });
      const { annyLearningMemory } = await import('./src/core/AnnyLearningMemory.ts');
      if (manualRule) {
        const record = await annyLearningMemory.addManualMemory(req.authUser!.uid, String(manualRule), String(topic || 'Custom Rule'), projectId || 'default_project');
        return res.json({ success: true, record });
      }
      await annyLearningMemory.learnOutcome({ userId: req.authUser!.uid, sessionId: sessionId || 'api_session', projectId: projectId || 'default_project', taskType, success: Boolean(success), feedback, source: 'feedback' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Learning update failed' });
    }
  });

  app.delete("/api/v1/anny/memory/:id", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const { annyLearningMemory } = await import('./src/core/AnnyLearningMemory.ts');
      const deleted = await annyLearningMemory.deletePrivateMemory(req.authUser!.uid, req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Memory item not found or not owned by current user.' });
      }
      res.json({ success: true, deletedId: req.params.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Memory deletion failed' });
    }
  });

  type LivePipelineStageId =
    | 'understanding'
    | 'planning'
    | 'generating'
    | 'validating'
    | 'installing'
    | 'starting_preview'
    | 'testing'
    | 'completed'
    | 'failed';

  interface LivePipelineStatusRecord {
    execId: string;
    ownerUserId: string;
    projectId: string;
    projectName: string;
    stage: LivePipelineStageId;
    message: string;
    progressPct: number;
    files: string[];
    status: 'running' | 'completed' | 'failed';
    error?: string;
    startedAt: number;
    updatedAt: number;
  }

  const livePipelineProgressMap = new Map<string, LivePipelineStatusRecord>();

  const updateLivePipelineProgress = (
    execId: string,
    ownerUserId: string,
    patch: Partial<LivePipelineStatusRecord>
  ) => {
    if (!execId) return;
    const now = Date.now();
    // Prune stale entries older than 10 minutes
    if (livePipelineProgressMap.size > 100) {
      for (const [k, v] of livePipelineProgressMap.entries()) {
        if (now - v.updatedAt > 10 * 60 * 1000) {
          livePipelineProgressMap.delete(k);
        }
      }
    }
    const existing = livePipelineProgressMap.get(execId);
    const next: LivePipelineStatusRecord = {
      execId,
      ownerUserId,
      projectId: patch.projectId ?? existing?.projectId ?? '',
      projectName: patch.projectName ?? existing?.projectName ?? '',
      stage: patch.stage ?? existing?.stage ?? 'understanding',
      message: patch.message ?? existing?.message ?? 'Understanding request...',
      progressPct: typeof patch.progressPct === 'number' ? patch.progressPct : (existing?.progressPct ?? 10),
      files: Array.isArray(patch.files) ? patch.files : (existing?.files ?? []),
      status: patch.status ?? existing?.status ?? 'running',
      error: patch.error !== undefined ? patch.error : existing?.error,
      startedAt: existing?.startedAt ?? now,
      updatedAt: now,
    };
    livePipelineProgressMap.set(execId, next);
  };

  app.get("/api/anny/pipeline/status/:execId", requireAuth(), (req: AuthenticatedRequest, res) => {
    const execId = String(req.params.execId || '').trim();
    const record = livePipelineProgressMap.get(execId);
    if (!record) {
      return res.status(404).json({ success: false, error: 'PIPELINE_EXEC_NOT_FOUND' });
    }
    if (!req.authUser!.isAdmin && record.ownerUserId !== req.authUser!.uid) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN_PIPELINE_STATUS' });
    }
    return res.json({
      success: true,
      execId: record.execId,
      projectId: record.projectId,
      projectName: record.projectName,
      stage: record.stage,
      message: record.message,
      progressPct: record.progressPct,
      files: record.files,
      status: record.status,
      error: record.error,
      elapsedSec: Math.max(0, Math.round((Date.now() - record.startedAt) / 100) / 10),
    });
  });

  app.post("/api/anny/pipeline", requireAuth(), async (req: AuthenticatedRequest, res) => {
    const reqExecId = String(req.body?.execId || req.body?.generationId || `exec_${Date.now().toString(36)}`).trim();
    try {
      const {
        prompt: reqPrompt,
        projectId,
        projectName: reqProjectName,
        sessionId,
        existingVfs,
        history,
        images,
        files,
        generationId,
        contextOverride,
        url,
        sourceContext,
        visionContext,
        webSearch,
        proTools
      } = req.body;
      if (!reqPrompt) return res.status(400).json({ error: "prompt is required" });
      const promptStr = String(reqPrompt);
      const verifiedUserId = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const initialProjectLabel = typeof reqProjectName === 'string' && reqProjectName.trim() ? reqProjectName.trim().slice(0, 140) : '';

      if (req.body.requestType === 'build') {
        updateLivePipelineProgress(reqExecId, verifiedUserId, {
          projectId: typeof projectId === 'string' ? projectId : '',
          projectName: initialProjectLabel,
          stage: 'understanding',
          message: initialProjectLabel ? `Understanding request for ${initialProjectLabel}...` : 'Understanding build request...',
          progressPct: 8,
          status: 'running',
        });
      }

      const reqType = req.body.requestType || 'chat';
      let effectiveRequestProjectId =
        typeof projectId === 'string' && projectId.trim() ? projectId.trim() : 'default_project';
      let effectiveExistingVfs = existingVfs && typeof existingVfs === 'object' ? existingVfs : {};

      if (effectiveRequestProjectId !== 'default_project') {
        let isForeignProject = false;
        const persisted = await projectPersistenceService.getProjectById(effectiveRequestProjectId);
        if (persisted) {
          if (!isAdmin && persisted.ownerUserId && persisted.ownerUserId !== verifiedUserId) {
            isForeignProject = true;
          } else if (
            Object.keys(effectiveExistingVfs).length === 0 &&
            contextOverride?.updateExisting &&
            persisted.files &&
            Object.keys(persisted.files).length > 0
          ) {
            effectiveExistingVfs = persisted.files;
          }
        }
        if (!isForeignProject) {
          const existingMatches = await postgresPlatform.query<any>('projects', (p: any) =>
            p.projectId === effectiveRequestProjectId || p.project_id === effectiveRequestProjectId || p.id === effectiveRequestProjectId
          ).catch(() => []);
          if (existingMatches.length > 0) {
            const existingOwner = existingMatches[0].ownerUserId || existingMatches[0].userId;
            if (!isAdmin && existingOwner && existingOwner !== verifiedUserId) {
              isForeignProject = true;
            }
          }
        }
        if (isForeignProject) {
          // Never read or overwrite another user's persisted project.
          // Detach stale client projectId cleanly so chat and fresh/forked builds continue uninterrupted.
          effectiveRequestProjectId =
            reqType === 'build'
              ? `proj_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`
              : 'default_project';
        }
      }

      const { annyCognitiveKernel } = await import('./src/core/AnnyCognitiveKernel.ts');
      const kernelOutput = await annyCognitiveKernel.executePipeline({
        userPrompt: promptStr,
        sessionId: sessionId || 'pipeline_session',
        projectId: effectiveRequestProjectId,
        existingVfs: effectiveExistingVfs,
        history: history || [],
        images: Array.isArray(images) ? images : [],
        files: Array.isArray(files) ? files : [],
        generationId,
        url: typeof url === 'string' ? url : undefined,
        webSearch: Boolean(webSearch),
        proTools: proTools && typeof proTools === 'object' ? proTools : undefined,
        contextOverride: {
          ...(contextOverride || {}),
          ...(sourceContext ? { sourceContext } : {}),
          ...(typeof visionContext === 'string' && visionContext.trim() ? { visionContext: visionContext.slice(0, 3000) } : {}),
          // Enforce verified server user identity (never trust spoofed contextOverride.userId)
          userId: verifiedUserId
        },
        execId: reqExecId,
        requestType: reqType as 'chat' | 'build',
        onProgress: reqType === 'build'
          ? (update) => {
              updateLivePipelineProgress(reqExecId, verifiedUserId, {
                stage: update.stage,
                message: update.message,
                progressPct: update.progressPct,
                ...(update.projectName ? { projectName: update.projectName } : {}),
                ...(Array.isArray(update.files) ? { files: update.files } : {}),
                status: 'running',
              });
            }
          : undefined,
      });

      const pipelineLog = kernelOutput.pipelineLog;
      let synthesizedFiles = pipelineLog?.coding?.filesSynthesized || {};
      let primaryAppArtifact: any = null;
      if (kernelOutput.artifacts) {
        for (const art of kernelOutput.artifacts) {
          if (art.files && typeof art.files === 'object') {
            if (!primaryAppArtifact) primaryAppArtifact = art;
            if (Object.keys(synthesizedFiles).length === 0) {
              synthesizedFiles = { ...synthesizedFiles, ...art.files };
            }
          }
        }
      }
      const isBuildRequest = reqType === 'build';
      let websiteMediaResult: { generated: Array<{ id: string; kind: 'image' | 'video'; mimeType: string; provider: string }>; warnings: string[] } | undefined;
      if (isBuildRequest && (synthesizedFiles['/anny-media-manifest.json'] || synthesizedFiles['/public/anny-media-manifest.json'])) {
        updateLivePipelineProgress(reqExecId, verifiedUserId, {
          stage: 'generating',
          message: 'Generating and validating requested website visuals...',
          progressPct: 82,
          status: 'running',
        });
        const materialized = await materializeWebsiteMediaAssets(synthesizedFiles, {
          ownerUserId: verifiedUserId,
          ownerOrgId: req.authUser?.companyId || 'personal',
          offlineOnly: providerRegistryService.getExecutionPolicy().mode === 'OFFLINE_ONLY',
          onProgress: (message) => updateLivePipelineProgress(reqExecId, verifiedUserId, {
            stage: 'generating', message, progressPct: 84, status: 'running',
          }),
        });
        synthesizedFiles = materialized.files;
        websiteMediaResult = { generated: materialized.generated, warnings: materialized.warnings };
        if (materialized.generated.length || materialized.warnings.length) {
          console.info('[AnnyWebsiteMedia]', JSON.stringify(websiteMediaResult));
        }
      }
      const hasSynthesizedFiles = Object.keys(synthesizedFiles).length > 0;
      if (isBuildRequest && !hasSynthesizedFiles) {
        const detailedReason =
          (kernelOutput as any)?.error ||
          (kernelOutput as any)?.failureReason ||
          (typeof kernelOutput.response === 'string' && kernelOutput.response.includes('FAILURE')
            ? kernelOutput.response.replace(/^ANNY EXECUTION FAILURE:\s*/i, '').trim()
            : '') ||
          'PROJECT_GENERATION_FAILED: no valid project files were produced.';
        const formattedError = detailedReason.startsWith('PROJECT_GENERATION_FAILED:')
          ? detailedReason
          : `PROJECT_GENERATION_FAILED: ${detailedReason}`;
        console.warn('[AnnyCorePipeline] Build produced no valid files:', formattedError);
        if (effectiveRequestProjectId !== 'default_project' && isValidProjectId(effectiveRequestProjectId)) {
          await projectPersistenceService.upsertProject({
            projectId: effectiveRequestProjectId,
            ownerUserId: verifiedUserId,
            isAdmin,
            sessionId: typeof sessionId === 'string' ? sessionId : undefined,
            name: String(req.body.projectName || effectiveRequestProjectId).slice(0, 140),
            buildStatus: 'FAILED',
            previewStatus: 'ERROR',
            lastError: formattedError,
          }).catch(() => {});
        }
        updateLivePipelineProgress(reqExecId, verifiedUserId, {
          stage: 'failed',
          message: formattedError,
          progressPct: 0,
          status: 'failed',
          error: formattedError,
        });
        return res.status(422).json({
          success: false,
          error: formattedError,
          diagnostics: (kernelOutput as any)?.diagnostics || formattedError,
          stages: (kernelOutput as any)?.stages || [],
          taskId: pipelineLog?.taskId || kernelOutput.executionId || `task_${Date.now()}`,
          pipelineLog,
          verificationStatus: 'FAILED'
        });
      }

      let persistedProjectRecord: any = null;
      let previewSummary: any = null;
      const effectiveProjectId =
        hasSynthesizedFiles && (!effectiveRequestProjectId || effectiveRequestProjectId === 'default_project')
          ? `proj_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`
          : effectiveRequestProjectId;

      if (hasSynthesizedFiles && isValidProjectId(effectiveProjectId) && effectiveProjectId !== 'default_project') {
        const projectName = String(
          primaryAppArtifact?.manifest?.projectName || req.body.projectName || effectiveProjectId
        ).slice(0, 140);
        const projectDesc = String(
          primaryAppArtifact?.manifest?.description || pipelineLog?.coding?.summary || 'ANNY Build Project'
        ).slice(0, 500);
        const projectCategory = String(primaryAppArtifact?.projectType || 'Website').slice(0, 64);

        const rawLogs: string[] = Array.isArray(pipelineLog?.executionSteps)
          ? pipelineLog.executionSteps.map((s: any) => String(s))
          : [];

        persistedProjectRecord = await projectPersistenceService.upsertProject({
          projectId: effectiveProjectId,
          ownerUserId: verifiedUserId,
          isAdmin,
          sessionId: typeof sessionId === 'string' ? sessionId : undefined,
          name: projectName,
          description: projectDesc,
          projectType: projectCategory,
          category: projectCategory,
          model: String(pipelineLog?.modelsExecuted?.[0] || 'Anny Core'),
          status: 'Active',
          files: synthesizedFiles,
          manifest: primaryAppArtifact?.manifest || null,
          buildStatus: 'READY',
          previewStatus: 'STARTING',
          buildLogs: rawLogs,
          lastError: null,
          bumpVersion: true,
        });

        try {
          updateLivePipelineProgress(reqExecId, verifiedUserId, {
            projectId: effectiveProjectId,
            projectName,
            stage: 'starting_preview',
            message: `Starting isolated live preview for ${projectName}...`,
            progressPct: 92,
            files: Object.keys(synthesizedFiles),
            status: 'running',
          });
          const previewSession = await previewRuntimeService.createOrRefreshPreviewSession({
            projectId: effectiveProjectId,
            ownerUserId: verifiedUserId,
            isAdmin,
            name: projectName,
            files: synthesizedFiles,
            version: persistedProjectRecord.version,
          });
          previewSummary = previewRuntimeService.getPublicSessionSummary(previewSession);
          persistedProjectRecord = await projectPersistenceService.getProjectById(effectiveProjectId) || persistedProjectRecord;
          updateLivePipelineProgress(reqExecId, verifiedUserId, {
            projectId: effectiveProjectId,
            projectName,
            stage: 'completed',
            message: `${projectName} verified and ready in live preview.`,
            progressPct: 100,
            files: Object.keys(synthesizedFiles),
            status: 'completed',
          });
        } catch (previewErr: any) {
          const cleanDiag = String(previewErr?.message || 'PREVIEW_BUNDLE_FAILED')
            .replace(/\bERROR:\s*/gi, '')
            .replace(/\r?\n/g, ' | ')
            .slice(0, 300);
          persistedProjectRecord =
            (await projectPersistenceService.getProjectById(effectiveProjectId)) || persistedProjectRecord;
          previewSummary = {
            previewId: null,
            projectId: effectiveProjectId,
            name: projectName,
            version: persistedProjectRecord.version,
            status: 'ERROR',
            previewUrl: null,
            runtimeMode: 'ISOLATED_OPQ_ORIGIN_SANDBOX',
            entryFile: primaryAppArtifact?.manifest?.entryPoint || '/src/App.tsx',
            lastError: cleanDiag,
          };
        }

        const existingMatches = await postgresPlatform.query<any>('projects', (p: any) =>
          p.projectId === effectiveProjectId || p.project_id === effectiveProjectId || p.id === effectiveProjectId
        ).catch(() => []);
        if (existingMatches.length === 0) {
          await postgresPlatform.insert<any>('projects', {
            projectId: effectiveProjectId,
            project_id: effectiveProjectId,
            ownerUserId: verifiedUserId,
            userId: verifiedUserId,
            name: projectName,
            description: projectDesc,
            category: projectCategory,
            model: 'Anny Core',
            status: 'Active',
            files_count: Object.keys(synthesizedFiles).length
          }).catch(() => {});
        } else {
          const target = existingMatches[0];
          const existingOwner = target.ownerUserId || target.userId;
          if (isAdmin || existingOwner === verifiedUserId) {
            await postgresPlatform.update<any>('projects', target.id, {
              files_count: Object.keys(synthesizedFiles).length,
              status: 'Active'
            }).catch(() => {});
          }
        }
      }

      const normalizedResponse = formatNaturalConversation(kernelOutput.response || pipelineLog?.coding?.summary || 'Request completed.');
      const mediaSummary = websiteMediaResult && (websiteMediaResult.generated.length || websiteMediaResult.warnings.length)
        ? `\n\nWebsite media: ${websiteMediaResult.generated.length} asset(s) generated${websiteMediaResult.warnings.length ? `; ${websiteMediaResult.warnings.join(' ')}` : '.'}`
        : '';
      const responseWithMediaSummary = normalizedResponse + mediaSummary;
      const groundingSources = Array.isArray((kernelOutput as any)?.groundingSources)
        ? (kernelOutput as any).groundingSources
        : [];
      return res.json({
        success: true,
        taskId: pipelineLog?.taskId || kernelOutput.executionId || `task_${Date.now()}`,
        projectId: effectiveProjectId || projectId,
        files: synthesizedFiles,
        summary: primaryAppArtifact?.manifest?.description || pipelineLog?.coding?.summary || 'ANNY Core Synthesis Complete',
        manifest: primaryAppArtifact?.manifest,
        projectType: primaryAppArtifact?.projectType,
        verification: primaryAppArtifact?.verification,
        repairAttempts: primaryAppArtifact?.repairAttempts ?? 0,
        stages: primaryAppArtifact?.stages || [],
        pipelineLog,
        evaluation: pipelineLog?.evaluation,
        modelsExecuted: pipelineLog?.modelsExecuted,
        distinctModelCount: pipelineLog?.distinctModelCount,
        response: responseWithMediaSummary,
        sources: groundingSources,
        verificationStatus: kernelOutput.verificationStatus,
        project: persistedProjectRecord
          ? {
              projectId: persistedProjectRecord.projectId,
              name: persistedProjectRecord.name,
              version: persistedProjectRecord.version,
              buildStatus: persistedProjectRecord.buildStatus,
              previewStatus: persistedProjectRecord.previewStatus,
              projectType: persistedProjectRecord.projectType,
              files_count: persistedProjectRecord.files_count,
              updatedAt: persistedProjectRecord.updatedAt,
            }
          : undefined,
        preview: previewSummary || undefined,
        websiteMedia: websiteMediaResult,
      });
    } catch (err: any) {
      console.error("[AnnyCorePipeline] Execution failed:", err.message);
      const message = String(err?.message || 'Pipeline execution failed');
      return res.status(message === 'FORBIDDEN_PROJECT_OWNERSHIP' ? 403 : 500).json({
        success: false,
        error: message
      });
    }
  });

  app.get("/api/anny/tasks", requireAuth(), (_req, res) => {
    // Return active tasks
    res.json({ success: true, tasks: [] });
  });

  app.get("/api/anny/projects", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const durableProjects = await projectPersistenceService.listProjects(uid, isAdmin);
      const legacyProjects = await postgresPlatform.query('projects', (p: any) =>
        isAdmin || p.ownerUserId === uid || p.userId === uid
      ).catch(() => []);

      const byId = new Map<string, any>();
      for (const lp of legacyProjects as any[]) {
        const key = String(lp.projectId || lp.project_id || lp.id || '');
        if (key) byId.set(key, lp);
      }
      for (const dp of durableProjects) {
        const { files: _omitFiles, ...summary } = dp;
        byId.set(dp.projectId, summary);
      }
      const projects = Array.from(byId.values()).sort((a, b) =>
        String(b.updatedAt || b.updated_at || '').localeCompare(String(a.updatedAt || a.updated_at || ''))
      );
      res.json({ success: true, projects });
    } catch (err: any) {
      const msg = String(err?.message || 'Unable to fetch projects');
      console.error("Failed to fetch projects:", msg);
      res.status(500).json({ error: msg });
    }
  });

  app.get("/api/anny/projects/:projectId", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const rawId = String(req.params.projectId || '').trim();
      if (!isValidProjectId(rawId)) {
        return res.status(400).json({ success: false, error: 'INVALID_PROJECT_ID' });
      }
      const project = await projectPersistenceService.getProjectById(rawId);
      if (!project) {
        return res.status(404).json({ success: false, error: 'PROJECT_NOT_FOUND' });
      }
      if (!isAdmin && project.ownerUserId !== uid) {
        return res.status(403).json({ success: false, error: 'FORBIDDEN_PROJECT_OWNERSHIP' });
      }
      return res.json({ success: true, project });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to load project' });
    }
  });

  app.post("/api/anny/projects", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const rawId = req.body?.projectId || req.body?.id;
      if (!isValidProjectId(rawId)) {
        return res.status(400).json({ success: false, error: 'INVALID_PROJECT_ID' });
      }
      const cleanId = rawId.trim();
      const existing = await projectPersistenceService.getProjectById(cleanId);
      if (existing && !isAdmin && existing.ownerUserId !== uid) {
        return res.status(403).json({ success: false, error: 'FORBIDDEN_PROJECT_OWNERSHIP' });
      }

      const saved = await projectPersistenceService.upsertProject({
        projectId: cleanId,
        ownerUserId: existing?.ownerUserId || uid,
        isAdmin,
        sessionId: typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined,
        name: typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : existing?.name || cleanId,
        description: typeof req.body?.description === 'string' ? req.body.description : existing?.description,
        projectType: typeof req.body?.projectType === 'string' ? req.body.projectType : existing?.projectType,
        category: typeof req.body?.category === 'string' ? req.body.category : existing?.category,
        files: req.body?.files && typeof req.body.files === 'object' ? req.body.files : undefined,
        manifest: req.body?.manifest && typeof req.body.manifest === 'object' ? req.body.manifest : undefined,
        buildStatus: req.body?.files && Object.keys(req.body.files).length > 0 ? 'READY' : existing?.buildStatus,
      });

      const matches = await postgresPlatform.query<any>('projects', (p: any) =>
        p.projectId === cleanId || p.project_id === cleanId || p.id === cleanId
      ).catch(() => []);
      if (matches.length === 0) {
        await postgresPlatform.insert<any>('projects', {
          projectId: cleanId,
          project_id: cleanId,
          ownerUserId: saved.ownerUserId,
          userId: saved.ownerUserId,
          name: saved.name,
          description: saved.description,
          category: saved.category,
          model: saved.model,
          status: saved.status,
          files_count: saved.files_count,
        }).catch(() => {});
      }

      return res.json({ success: true, project: saved });
    } catch (err: any) {
      const message = String(err?.message || 'Failed to register project');
      return res.status(message === 'FORBIDDEN_PROJECT_OWNERSHIP' ? 403 : 500).json({ success: false, error: message });
    }
  });

  app.put("/api/anny/projects/:projectId/files", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const cleanId = String(req.params.projectId || '').trim();
      if (!isValidProjectId(cleanId)) {
        return res.status(400).json({ success: false, error: 'INVALID_PROJECT_ID' });
      }
      const files = req.body?.files;
      if (!files || typeof files !== 'object' || Array.isArray(files)) {
        return res.status(400).json({ success: false, error: 'INVALID_FILES_MAP' });
      }
      const updated = await projectPersistenceService.updateProjectFiles(cleanId, uid, files, {
        isAdmin,
        name: typeof req.body?.name === 'string' ? req.body.name : undefined,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to update project files');
      return res.status(msg === 'FORBIDDEN_PROJECT_OWNERSHIP' ? 403 : 500).json({ success: false, error: msg });
    }
  });

  app.delete("/api/anny/projects/:projectId", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const cleanId = String(req.params.projectId || '').trim();
      if (!isValidProjectId(cleanId)) {
        return res.status(400).json({ success: false, error: 'INVALID_PROJECT_ID' });
      }
      const deleted = await projectPersistenceService.deleteProject(cleanId, uid, isAdmin);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'PROJECT_NOT_FOUND' });
      }
      return res.json({ success: true, projectId: cleanId });
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to delete project');
      return res.status(msg === 'FORBIDDEN_PROJECT_OWNERSHIP' ? 403 : 500).json({ success: false, error: msg });
    }
  });

  app.get("/api/anny/projects/:projectId/authorize", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const rawProjectId = String(req.params.projectId || '').trim();
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(rawProjectId)) {
        return res.status(400).json({ authorized: false, error: 'INVALID_PROJECT_ID' });
      }

      let ownerUid: string | undefined;
      const persisted = await projectPersistenceService.getProjectById(rawProjectId);
      if (persisted) {
        ownerUid = persisted.ownerUserId;
      } else {
        const matches = await postgresPlatform.query<any>('projects', (p: any) =>
          p.projectId === rawProjectId || p.project_id === rawProjectId || p.id === rawProjectId
        ).catch(() => []);
        if (matches.length === 0) {
          return res.status(404).json({ authorized: false, error: 'PROJECT_NOT_FOUND' });
        }
        const target = matches[0];
        ownerUid = target.ownerUserId || target.userId;
      }

      if (!ownerUid || typeof ownerUid !== 'string') {
        return res.status(403).json({ authorized: false, error: 'PROJECT_OWNER_UNBOUND' });
      }
      if (!isAdmin && ownerUid !== uid) {
        return res.status(403).json({ authorized: false, error: 'FORBIDDEN_PROJECT_OWNERSHIP' });
      }

      return res.json({
        authorized: true,
        projectId: rawProjectId,
        ownershipMode: 'cloud',
        ownerUserId: ownerUid,
        verifiedUid: uid,
        isAdmin,
        authMethod: req.authUser!.authMethod
      });
    } catch (err: any) {
      return res.status(500).json({ authorized: false, error: err?.message || 'Project authorization error' });
    }
  });

  // =========================================================================
  // OFFLINE-FIRST ISOLATED PREVIEW RUNTIME & MANAGED PREVIEW SESSION ROUTES
  // =========================================================================
  app.get("/api/preview/runtime/react-vendor.js", (_req, res) => {
    try {
      const bundle = previewRuntimeService.getReactVendorBundle();
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.send(bundle);
    } catch (err: any) {
      return res.status(500).send(`/* Preview vendor runtime unavailable: ${String(err?.message || 'error')} */`);
    }
  });

  app.post("/api/preview/runtime/compile-css", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const files = req.body?.files;
      if (!files || typeof files !== 'object' || Array.isArray(files)) {
        return res.status(400).json({ success: false, error: 'INVALID_FILES_MAP' });
      }
      const css = await previewRuntimeService.compileTailwindCssFromSources(files);
      return res.json({ success: true, css });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Tailwind CSS compilation failed' });
    }
  });

  app.post("/api/preview/sessions", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const rawProjId = String(req.body?.projectId || '').trim();
      if (!isValidProjectId(rawProjId)) {
        return res.status(400).json({ success: false, error: 'INVALID_PROJECT_ID' });
      }
      const session = await previewRuntimeService.createOrRefreshPreviewSession({
        projectId: rawProjId,
        ownerUserId: uid,
        isAdmin,
        name: typeof req.body?.name === 'string' ? req.body.name : undefined,
        files: req.body?.files && typeof req.body.files === 'object' ? req.body.files : undefined,
      });
      return res.json({
        success: true,
        preview: previewRuntimeService.getPublicSessionSummary(session),
      });
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to start preview session');
      const status = msg === 'FORBIDDEN_PROJECT_OWNERSHIP' ? 403 : msg === 'PROJECT_NOT_FOUND' ? 404 : 422;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  app.get("/api/preview/sessions/:previewId/status", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const session = await previewRuntimeService.getPreviewSessionStatus(
        String(req.params.previewId || ''),
        req.authUser!.uid,
        req.authUser!.isAdmin
      );
      return res.json({
        success: true,
        preview: previewRuntimeService.getPublicSessionSummary(session),
      });
    } catch (err: any) {
      const msg = String(err?.message || 'Preview status unavailable');
      const status = msg === 'FORBIDDEN_PREVIEW_OWNERSHIP' ? 403 : msg === 'PREVIEW_SESSION_NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  app.post("/api/preview/sessions/:previewId/refresh", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const existing = await previewRuntimeService.getPreviewSessionStatus(
        String(req.params.previewId || ''),
        req.authUser!.uid,
        req.authUser!.isAdmin
      );
      const updated = await previewRuntimeService.createOrRefreshPreviewSession({
        projectId: existing.projectId,
        ownerUserId: req.authUser!.uid,
        isAdmin: req.authUser!.isAdmin,
        files: req.body?.files && typeof req.body.files === 'object' ? req.body.files : undefined,
      });
      return res.json({
        success: true,
        preview: previewRuntimeService.getPublicSessionSummary(updated),
      });
    } catch (err: any) {
      const msg = String(err?.message || 'Preview refresh failed');
      const status = msg === 'FORBIDDEN_PREVIEW_OWNERSHIP' || msg === 'FORBIDDEN_PROJECT_OWNERSHIP' ? 403 : 422;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  app.post("/api/preview/sessions/:previewId/stop", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const stopped = await previewRuntimeService.stopPreviewSession(
        String(req.params.previewId || ''),
        req.authUser!.uid,
        req.authUser!.isAdmin
      );
      return res.json({
        success: true,
        preview: previewRuntimeService.getPublicSessionSummary(stopped),
      });
    } catch (err: any) {
      const msg = String(err?.message || 'Preview stop failed');
      const status = msg === 'FORBIDDEN_PREVIEW_OWNERSHIP' ? 403 : msg === 'PREVIEW_SESSION_NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  app.get("/api/preview/sessions/:previewId/app", async (req, res) => {
    try {
      const previewId = String(req.params.previewId || '');
      const token = String(req.query.token || '');
      const { html } = await previewRuntimeService.serveIsolatedPreviewHtml(previewId, token);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', STANDALONE_TAB_SANDBOX_CSP);
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(html);
    } catch (err: any) {
      const msg = String(err?.message || 'Preview unavailable');
      const status =
        msg === 'UNAUTHORIZED_PREVIEW_CAPABILITY'
          ? 403
          : msg === 'PREVIEW_SESSION_STOPPED'
            ? 410
            : 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline';");
      return res.status(status).send(
        `<!doctype html><html><body style="background:#050817;color:#fda4af;font-family:monospace;padding:32px;"><h3>ANNY Preview Unavailable (${status})</h3><p>${msg.replace(/[<>&]/g, '')}</p></body></html>`
      );
    }
  });

  app.get("/api/anny/sessions", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const sessions = await postgresPlatform.query('conversations', (s: any) =>
        isAdmin || s.ownerUserId === uid || s.userId === uid
      );
      res.json({ success: true, sessions });
    } catch (err: any) {
      console.error("Failed to fetch sessions:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/anny/sessions", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const { id, title, prompt, model } = req.body || {};

      if (id) {
        const existingMatches = await postgresPlatform.query<any>('conversations', (s: any) =>
          s.id === id || s.clientSessionId === id
        );
        if (existingMatches.length > 0) {
          const existing = existingMatches[0];
          const existingOwner = existing.ownerUserId || existing.userId;
          if (!isAdmin && existingOwner && existingOwner !== uid) {
            return res.status(403).json({ success: false, error: 'FORBIDDEN_SESSION_OWNERSHIP' });
          }
          const updated = await postgresPlatform.update<any>('conversations', existing.id, {
            title: title || existing.title,
            prompt: prompt ?? existing.prompt,
            model: model || existing.model
          });
          return res.json({ success: true, session: updated });
        }
      }

      const created = await postgresPlatform.insert<any>('conversations', {
        clientSessionId: id,
        ownerUserId: uid,
        userId: uid,
        title: title || 'New Session',
        prompt: prompt || '',
        model: model || 'Anny Core'
      });
      res.json({ success: true, session: created });
    } catch (err: any) {
      console.error("Failed to create session:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/anny/sessions/:id", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const { id } = req.params;

      const byPk = await postgresPlatform.findById<any>('conversations', id);
      const matches = byPk
        ? [byPk]
        : await postgresPlatform.query<any>('conversations', (s: any) => s.clientSessionId === id || s.id === id);

      if (matches.length === 0) {
        return res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' });
      }

      const target = matches[0];
      const targetOwner = target.ownerUserId || target.userId;
      if (!isAdmin && targetOwner !== uid) {
        return res.status(403).json({ success: false, error: 'FORBIDDEN_SESSION_OWNERSHIP' });
      }

      await postgresPlatform.delete('conversations', target.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to delete session:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // LOCAL SPEECH-TO-TEXT & SESSION VOICE NOTES API (Authenticated)
  // =========================================================================
  app.get("/api/anny/voice-notes/status", requireAuth(), async (_req: AuthenticatedRequest, res) => {
    try {
      const status = await localSttService.getStatus();
      return res.json({ success: true, ...status });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Unable to check local STT status.' });
    }
  });

  app.get("/api/anny/sessions/:sessionId/voice-notes", requireAuth(), (req: AuthenticatedRequest, res) => {
    try {
      const notes = voiceNoteService.listSessionVoiceNotes(
        String(req.params.sessionId || ''),
        req.authUser!.uid,
        req.authUser!.isAdmin
      );
      return res.json({
        success: true,
        voiceNotes: notes.map((n) => voiceNoteService.toPublicSummary(n)),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Unable to list voice notes.' });
    }
  });

  app.post("/api/anny/voice-notes", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const { audio, mimeType, sessionId, language, name, promptHint } = req.body || {};
      const parsedAudio = parseBase64AudioPayload(audio, mimeType);
      const localResult = await localSttService.transcribeAudioLocally({
        audioBuffer: parsedAudio.buffer,
        mimeType: parsedAudio.mimeType,
        extension: parsedAudio.extension,
        language: typeof language === 'string' ? language : 'auto',
        promptHint: typeof promptHint === 'string' ? promptHint : undefined,
      });

      const saved = voiceNoteService.saveVoiceNote({
        ownerUserId: req.authUser!.uid,
        sessionId: typeof sessionId === 'string' ? sessionId : 'workspace_session',
        name: typeof name === 'string' ? name : undefined,
        mimeType: parsedAudio.mimeType,
        audioBuffer: parsedAudio.buffer,
        durationSec: localResult.durationSec,
        transcript: localResult.text,
        transcriptionEngine: localResult.engine,
        transcribed: localResult.transcribed,
      });

      return res.status(201).json({
        success: true,
        voiceNote: voiceNoteService.toPublicSummary(saved),
        localStt: {
          transcribed: localResult.transcribed,
          text: localResult.text,
          engine: localResult.engine,
          modelUsed: localResult.modelUsed || null,
          durationSec: localResult.durationSec,
          error: localResult.error || null,
          guidance: localResult.guidance || null,
        },
      });
    } catch (err: any) {
      const msg = String(err?.message || 'Voice note save failed');
      const status =
        msg.startsWith('UNSUPPORTED_AUDIO_MIME_TYPE') ||
        msg === 'AUDIO_PAYLOAD_MISSING' ||
        msg === 'INVALID_AUDIO_BASE64' ||
        msg === 'AUDIO_TOO_SHORT'
          ? 400
          : msg === 'AUDIO_TOO_LARGE'
            ? 413
            : 500;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  app.post("/api/anny/voice-notes/:noteId/transcribe", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const noteId = String(req.params.noteId || '');
      if (!isValidVoiceNoteId(noteId)) {
        return res.status(400).json({ success: false, error: 'INVALID_VOICE_NOTE_ID' });
      }
      const existing = voiceNoteService.getVoiceNoteById(noteId);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'VOICE_NOTE_NOT_FOUND' });
      }
      if (!req.authUser!.isAdmin && existing.ownerUserId !== req.authUser!.uid) {
        return res.status(403).json({ success: false, error: 'FORBIDDEN_VOICE_NOTE_OWNERSHIP' });
      }

      const { buffer } = voiceNoteService.getVoiceNoteAudioBuffer(noteId, {
        requesterUid: req.authUser!.uid,
        isAdmin: req.authUser!.isAdmin,
      });
      const ext = existing.fileName.split('.').pop() || 'webm';
      const localResult = await localSttService.transcribeAudioLocally({
        audioBuffer: buffer,
        mimeType: existing.mimeType,
        extension: ext,
        language: typeof req.body?.language === 'string' ? req.body.language : 'auto',
        promptHint: typeof req.body?.promptHint === 'string' ? req.body.promptHint : undefined,
      });

      const updated = localResult.transcribed
        ? voiceNoteService.updateTranscript(noteId, req.authUser!.uid, req.authUser!.isAdmin, {
            transcript: localResult.text,
            transcriptionEngine: localResult.engine,
            transcribed: true,
          })
        : existing;

      return res.json({
        success: true,
        voiceNote: voiceNoteService.toPublicSummary(updated),
        localStt: {
          transcribed: localResult.transcribed,
          text: localResult.text,
          engine: localResult.engine,
          modelUsed: localResult.modelUsed || null,
          durationSec: localResult.durationSec,
          error: localResult.error || null,
          guidance: localResult.guidance || null,
        },
      });
    } catch (err: any) {
      const msg = String(err?.message || 'Voice note transcription failed');
      const status = msg === 'FORBIDDEN_VOICE_NOTE_OWNERSHIP' ? 403 : msg === 'VOICE_NOTE_NOT_FOUND' ? 404 : 500;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  app.patch("/api/anny/voice-notes/:noteId", requireAuth(), (req: AuthenticatedRequest, res) => {
    try {
      const noteId = String(req.params.noteId || '');
      if (!isValidVoiceNoteId(noteId)) {
        return res.status(400).json({ success: false, error: 'INVALID_VOICE_NOTE_ID' });
      }
      const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript : '';
      const updated = voiceNoteService.updateTranscript(noteId, req.authUser!.uid, req.authUser!.isAdmin, {
        transcript,
        transcriptionEngine: typeof req.body?.transcriptionEngine === 'string' ? req.body.transcriptionEngine : 'manual',
        transcribed: Boolean(transcript.trim()),
      });
      return res.json({ success: true, voiceNote: voiceNoteService.toPublicSummary(updated) });
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to update voice note transcript');
      const status = msg === 'FORBIDDEN_VOICE_NOTE_OWNERSHIP' ? 403 : msg === 'VOICE_NOTE_NOT_FOUND' ? 404 : 500;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  app.get("/api/anny/voice-notes/:noteId/audio", (req: AuthenticatedRequest, res) => {
    try {
      const noteId = String(req.params.noteId || '');
      if (!isValidVoiceNoteId(noteId)) {
        return res.status(400).json({ success: false, error: 'INVALID_VOICE_NOTE_ID' });
      }
      const token = typeof req.query.token === 'string' ? req.query.token : undefined;
      const { record, buffer } = voiceNoteService.getVoiceNoteAudioBuffer(noteId, {
        token,
        requesterUid: req.authUser?.uid,
        isAdmin: req.authUser?.isAdmin,
      });

      res.setHeader('Content-Type', record.mimeType || 'audio/webm');
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.status(200).send(buffer);
    } catch (err: any) {
      const msg = String(err?.message || 'Unable to load voice note audio');
      const status =
        msg === 'UNAUTHORIZED_VOICE_NOTE_ACCESS'
          ? 403
          : msg === 'VOICE_NOTE_NOT_FOUND' || msg === 'VOICE_NOTE_AUDIO_MISSING'
            ? 404
            : 500;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  app.delete("/api/anny/voice-notes/:noteId", requireAuth(), (req: AuthenticatedRequest, res) => {
    try {
      const noteId = String(req.params.noteId || '');
      if (!isValidVoiceNoteId(noteId)) {
        return res.status(400).json({ success: false, error: 'INVALID_VOICE_NOTE_ID' });
      }
      const deleted = voiceNoteService.deleteVoiceNote(noteId, req.authUser!.uid, req.authUser!.isAdmin);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'VOICE_NOTE_NOT_FOUND' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to delete voice note');
      const status = msg === 'FORBIDDEN_VOICE_NOTE_OWNERSHIP' ? 403 : 500;
      return res.status(status).json({ success: false, error: msg });
    }
  });

  app.get(["/api/v1/anny/enterprises", "/api/anny/enterprises"], requireAuth({ allowApiKey: true }), (_req, res) => {
    res.json({
      success: true,
      enterprises: annyEcosystemService.getEnterprises(),
      timestamp: new Date().toISOString()
    });
  });

  app.post(["/api/v1/anny/enterprises", "/api/anny/enterprises"], requireAdmin, (req, res) => {
    try {
      const newEnterprise = annyEcosystemService.registerEnterprise(req.body);
      res.json({ success: true, enterprise: newEnterprise });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post(["/api/v1/anny/enterprises/:companyId/capability-pack", "/api/anny/enterprises/:companyId/capability-pack"], requireAuth({ allowApiKey: true, requiredScope: 'capability:execute' }), async (req: AuthenticatedRequest, res) => {
    const { companyId } = req.params;
    const { packName, action, params } = req.body || {};
    try {
      const result = await annyEcosystemService.executeCapabilityPackAction({
        companyId,
        packName: packName || 'CorePack',
        action: action || 'status',
        params: params || {},
        requestedBy: req.authUser!.email || req.authUser!.uid
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get(["/api/v1/anny/control-hierarchy", "/api/anny/control-hierarchy"], requireAuth({ allowApiKey: true }), (_req, res) => {
    res.json({
      success: true,
      levels: annyEcosystemService.getControlHierarchy(),
      timestamp: new Date().toISOString()
    });
  });

  app.post(["/api/v1/anny/control-hierarchy", "/api/anny/control-hierarchy"], requireAdmin, (req, res) => {
    const { level, status, lotoStatus } = req.body || {};
    if (!level) return res.status(400).json({ error: "Level number is required (1 to 6)." });
    try {
      const updated = annyEcosystemService.setControlLevelStatus(Number(level), status, lotoStatus);
      res.json({ success: true, level: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get(["/api/v1/anny/agents", "/api/anny/agents"], requireAuth({ allowApiKey: true }), (_req, res) => {
    res.json({
      success: true,
      agents: annyEcosystemService.getSystemAgents(),
      orchestratorStatus: "ACTIVE_HYBRID_MULTI_AGENT"
    });
  });

  app.get(["/api/v1/anny/keys", "/api/anny/keys"], requireAdmin, (_req, res) => {
    const redactedKeys = annyEcosystemService.getApiKeys().map(({ keySecretHash: _hidden, ...rest }) => rest);
    res.json({
      success: true,
      keys: redactedKeys
    });
  });

  app.post(["/api/v1/anny/keys/generate", "/api/anny/keys/generate"], requireAdmin, (req, res) => {
    const { companyId, companyName, scopes } = req.body || {};
    if (!companyId || !companyName) {
      return res.status(400).json({ error: "companyId and companyName are required." });
    }
    const result = annyEcosystemService.generateApiKey(companyId, companyName, scopes || []);
    const { keySecretHash: _hidden, ...safeDetails } = result.keyDetails;
    res.json({ success: true, apiKey: result.apiKey, keyDetails: safeDetails });
  });

  app.post(["/api/v1/anny/intelligence", "/api/anny/intelligence"], requireAuth({ allowApiKey: true }), async (req, res) => {
    const { query, companyId, category } = req.body || {};
    if (!query && !req.body?.prompt) return res.status(400).json({ error: "Query prompt is required." });
    try {
      const { modelRouter } = await import('./src/core/modelRouter.ts');
      const aiResponse = await modelRouter.executeRoutedChat([{ role: 'user', content: req.body.prompt || req.body.query }], { taskCategory: 'general' });
      const result = { response: aiResponse.content };

      res.json({
        success: true,
        companyId: companyId || 'universal',
        category: category || 'general_intelligence',
        intelligenceResult: result
      });
    } catch (err: any) {
      console.error("[Intelligence] Error:", err.message);
      res.status(503).json({
        success: false,
        companyId: companyId || 'universal',
        category: category || 'general_intelligence',
        error: err.message || 'Intelligence provider unavailable.'
      });
    }
  });

  app.get(["/api/v1/anny/offline-matrix", "/api/anny/offline-matrix"], requireAuth({ allowApiKey: true }), async (_req, res) => {
    const [ollamaDiscovery, pgHealth, providerHealth] = await Promise.all([
      ollamaDiscoveryService.discoverAndTest().catch(() => ({ reachable: false, discoveredModels: [], inferenceTestPassed: false, latencyMs: 0 })),
      postgresPlatform.checkHealth().catch(() => ({ status: 'NOT_CONFIGURED' })),
      aiProviderPlatform.refreshHealthChecks().catch(() => ({})),
    ]);

    const ggufModels = Array.isArray(ollamaDiscovery?.discoveredModels)
      ? ollamaDiscovery.discoveredModels.map((m: any) => String(m?.name || m)).filter(Boolean)
      : [];

    const ollamaUrl = (process.env.OLLAMA_BASE_URL || '').trim();
    const pgConnected = pgHealth?.status === 'CONNECTED';

    res.json({
      offlineStatus: ollamaDiscovery?.reachable ? "OLLAMA_LOCAL_ACTIVE" : "OFFLINE_FIRST_DETERMINISTIC_READY",
      localCores: {
        akinwumiCore: "DETERMINISTIC_LOCAL_ENGINE",
        ollama: ollamaDiscovery?.reachable ? (ollamaUrl || "http://127.0.0.1:11434 (CONNECTED)") : (ollamaUrl ? `${ollamaUrl} (UNREACHABLE)` : "NOT_CONFIGURED"),
        ollamaReachable: Boolean(ollamaDiscovery?.reachable),
        ggufModels,
        onnxInference: "BROWSER_WEBGPU_WASM_CAPABLE",
        localEmbeddings: process.env.QDRANT_URL ? "QDRANT_CONFIGURED" : "LOCAL_MEMORY_INDEX",
        localDatabase: pgConnected ? "POSTGRES_CONNECTED" : "IN_MEMORY_FALLBACK"
      },
      onlineFallbacks: {
        gemini: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || process.env.GOOGLE_API_KEY),
        openai: !!process.env.OPENAI_API_KEY,
        groq: !!process.env.GROQ_API_KEY,
        huggingface: !!process.env.HUGGINGFACE_API_KEY,
        claude: !!process.env.ANTHROPIC_API_KEY,
        deepseek: !!process.env.DEEPSEEK_API_KEY,
        openrouter: !!process.env.OPENROUTER_API_KEY,
      },
      providerHealth
    });
  });

  app.get(["/api/v1/anny/sdk/typescript", "/api/anny/sdk/typescript"], requireAuth({ allowApiKey: true }), (_req, res) => {
    res.type('text/plain').send(annyEcosystemService.generateTypeScriptSDKCode());
  });

  app.get(["/api/v1/anny/sdk/python", "/api/anny/sdk/python"], requireAuth({ allowApiKey: true }), (_req, res) => {
    res.type('text/plain').send(annyEcosystemService.generatePythonSDKCode());
  });

  app.get(["/api/v1/anny/tool-permissions", "/api/anny/tool-permissions"], requireAuth({ allowApiKey: true }), (_req, res) => {
    res.json({
      success: true,
      tools: toolPermissionSystem.getAllTools()
    });
  });

  app.post(["/api/v1/anny/rag/ingest", "/api/anny/rag/ingest"], requireAuth({ allowApiKey: true }), async (req: AuthenticatedRequest, res) => {
    const { title, content, documentType } = req.body || {};
    if (typeof content !== 'string' || content.length === 0) return res.status(400).json({ error: 'Document content is required.' });
    if (Buffer.byteLength(content, 'utf8') > MAX_RAG_TEXT_BYTES) return res.status(413).json({ error: 'Document exceeds the 2 MiB ingestion limit.' });
    try {
      const doc = await memoryEngine.ingestDocument(
        String(title || 'Ingested Document').slice(0, 255),
        content,
        String(documentType || 'knowledge_base').slice(0, 64),
        req.authUser!.uid
      );
      res.json({ success: true, document: doc });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post(["/api/v1/anny/rag/search", "/api/anny/rag/search"], requireAuth({ allowApiKey: true }), async (req: AuthenticatedRequest, res) => {
    const { query, limit } = req.body || {};
    const queryValidation = validateRagSearchQuery(query);
    if (!queryValidation.valid) return res.status(queryValidation.error?.includes('10,000') ? 413 : 400).json({ error: queryValidation.error });
    const resultLimit = normalizeRagSearchLimit(limit);
    try {
      const results = await memoryEngine.retrieveRAGContext(query, resultLimit, req.authUser!.isAdmin ? undefined : req.authUser!.uid);
      res.json({ success: true, results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------
  // Universal Document & Media Upload Backend Platform (Owner-isolated)
  // ---------------------------------------------------------------------
  const uploadedDocumentsStore = new Map<string, {
    id: string;
    ownerUserId: string;
    name: string;
    mimeType: string;
    size: number;
    sizeFormatted: string;
    isImage: boolean;
    buffer: Buffer;
    url?: string;
    dataUrl?: string;
    data?: string;
    textSnippet?: string;
    ragIngested?: boolean;
    uploadedAt: string;
  }>();
  const MAX_STORED_DOCUMENTS = 100;
  const MAX_ESTIMATED_DOCUMENT_MEMORY_BYTES = 128 * 1024 * 1024;
  const DOCUMENT_STORE_TTL_MS = 60 * 60 * 1000;
  let estimatedDocumentMemoryBytes = 0;

  const estimateDocumentMemory = (doc: any): number =>
    Buffer.byteLength(doc.buffer || Buffer.alloc(0)) +
    Buffer.byteLength(String(doc.data || '')) +
    Buffer.byteLength(String(doc.dataUrl || '')) +
    Buffer.byteLength(String(doc.name || '')) +
    Buffer.byteLength(String(doc.textSnippet || ''));

  const removeStoredDocument = (id: string) => {
    const existing = uploadedDocumentsStore.get(id);
    if (!existing) return;
    estimatedDocumentMemoryBytes = Math.max(0, estimatedDocumentMemoryBytes - estimateDocumentMemory(existing));
    uploadedDocumentsStore.delete(id);
  };

  const pruneExpiredDocuments = () => {
    const now = Date.now();
    for (const [id, doc] of uploadedDocumentsStore) {
      const uploadedAt = Date.parse(doc.uploadedAt);
      if (!Number.isFinite(uploadedAt) || now - uploadedAt > DOCUMENT_STORE_TTL_MS) removeStoredDocument(id);
    }
  };

  const storeUploadedDocument = (doc: any) => {
    pruneExpiredDocuments();
    const weight = estimateDocumentMemory(doc);
    while (uploadedDocumentsStore.size >= MAX_STORED_DOCUMENTS ||
      estimatedDocumentMemoryBytes + weight > MAX_ESTIMATED_DOCUMENT_MEMORY_BYTES) {
      const oldestId = uploadedDocumentsStore.keys().next().value;
      if (!oldestId) break;
      removeStoredDocument(oldestId);
    }
    if (weight > MAX_ESTIMATED_DOCUMENT_MEMORY_BYTES) {
      throw new Error('Document exceeds the in-memory storage capacity.');
    }
    uploadedDocumentsStore.set(doc.id, doc);
    estimatedDocumentMemoryBytes += weight;
  };

  const docUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024, files: 5 } // bounded in-memory batch
  });

  app.post(["/api/documents/upload", "/api/upload"], requireAuth(), docUpload.array("files", 5), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0 && !req.body.data) {
        return res.status(400).json({ error: "No files or data provided for upload." });
      }

      const uploadedDocs: any[] = [];

      if (files.length > 0) {
        const batchValidation = validateDocumentBatch(files);
        if (!batchValidation.valid) return res.status(413).json({ error: batchValidation.error });
        for (const file of files) {
          const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
          const isImage = file.mimetype.startsWith("image/");
          const sizeMB = file.size / (1024 * 1024);
          const sizeFormatted = sizeMB >= 1 ? sizeMB.toFixed(1) + ' MB' : Math.round(file.size / 1024) + ' KB';

          let textSnippet = "";
          let ragIngested = false;
          const safeText = extractSafeTextForRag(file.originalname, file.buffer);

          if (isImage) {
            textSnippet = '[Uploaded Image: ' + file.originalname + ' (' + file.mimetype + ', ' + sizeFormatted + ')]';
          } else if (safeText !== null) {
            textSnippet = safeText.slice(0, 500);
            try {
              await memoryEngine.ingestDocument(file.originalname, safeText, 'user_upload', uid);
              ragIngested = true;
            } catch (rErr) {
              console.warn("[Upload] RAG Ingestion warning:", rErr);
            }
          } else {
            textSnippet = '[Uploaded file: ' + file.originalname + ' (' + file.mimetype + ', ' + sizeFormatted + '). Binary/unsupported content was not ingested into text memory.]';
          }

          const base64Str = file.buffer.toString("base64");
          const dataUrl = `data:${file.mimetype};base64,${base64Str}`;

          const docObj = {
            id: docId,
            ownerUserId: uid,
            name: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            sizeFormatted,
            isImage,
            buffer: file.buffer,
            dataUrl,
            data: base64Str,
            textSnippet,
            ragIngested,
            url: `/api/documents/file/${docId}`,
            uploadedAt: new Date().toISOString()
          };

          storeUploadedDocument(docObj);

          uploadedDocs.push({
            id: docObj.id,
            name: docObj.name,
            mimeType: docObj.mimeType,
            size: docObj.size,
            sizeFormatted: docObj.sizeFormatted,
            isImage: docObj.isImage,
            url: docObj.url,
            dataUrl: docObj.dataUrl,
            data: docObj.data,
            textSnippet: docObj.textSnippet,
            ragIngested: docObj.ragIngested,
            uploadedAt: docObj.uploadedAt
          });
        }
      } else if (req.body.data && req.body.name) {
        if (typeof req.body.data !== 'string' || req.body.data.length > Math.ceil(MAX_DOCUMENT_FILE_BYTES * 4 / 3) + 16) {
          return res.status(413).json({ error: 'Base64 upload exceeds the 15 MiB limit.' });
        }
        const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        const name = String(req.body.name || 'uploaded_file').slice(0, 255);
        const mimeType = String(req.body.mimeType || 'application/octet-stream').slice(0, 128);
        const isImage = mimeType.startsWith('image/');
        const buffer = Buffer.from(req.body.data, 'base64');
        if (buffer.length > MAX_DOCUMENT_FILE_BYTES) {
          return res.status(413).json({ error: 'Base64 upload exceeds the 15 MiB limit.' });
        }
        const sizeMB = buffer.length / (1024 * 1024);
        const sizeFormatted = sizeMB >= 1 ? sizeMB.toFixed(1) + ' MB' : Math.round(buffer.length / 1024) + ' KB';

        let textSnippet = req.body.textSnippet ? String(req.body.textSnippet).slice(0, 500) : '';
        let ragIngested = false;
        const safeText = extractSafeTextForRag(name, buffer);

        if (!isImage && safeText !== null && !textSnippet) {
          textSnippet = safeText.slice(0, 500);
          try {
            await memoryEngine.ingestDocument(name, safeText, 'user_upload', uid);
            ragIngested = true;
          } catch (e) {}
        } else if (!isImage && safeText === null && !textSnippet) {
          textSnippet = '[Uploaded file: ' + name + '. Binary/unsupported content was not ingested into text memory.]';
        }

        const dataUrl = `data:${mimeType};base64,${req.body.data}`;

        const docObj = {
          id: docId,
          ownerUserId: uid,
          name,
          mimeType,
          size: buffer.length,
          sizeFormatted,
          isImage,
          buffer,
          dataUrl,
          data: req.body.data,
          textSnippet,
          ragIngested,
          url: `/api/documents/file/${docId}`,
          uploadedAt: new Date().toISOString()
        };

        storeUploadedDocument(docObj);
        uploadedDocs.push({ ...docObj, buffer: undefined });
      }

      res.json({
        success: true,
        count: uploadedDocs.length,
        documents: uploadedDocs,
        document: uploadedDocs[0]
      });
    } catch (err: any) {
      console.error("[Upload] Document Upload Failed:", err);
      res.status(500).json({ error: err.message || "Failed to process document upload" });
    }
  });

  app.get("/api/documents/file/:id", requireAuth(), (req: AuthenticatedRequest, res) => {
    pruneExpiredDocuments();
    const doc = uploadedDocumentsStore.get(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document file not found" });
    }
    if (!req.authUser!.isAdmin && doc.ownerUserId !== req.authUser!.uid) {
      return res.status(403).json({ error: "FORBIDDEN_DOCUMENT_OWNERSHIP" });
    }
    const safeFilename = sanitizeDownloadFilename(doc.name);
    // User-supplied file bytes are never served inline as active content.
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment; filename=\"" + safeFilename + "\"");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "sandbox");
    res.send(doc.buffer);
  });

  app.get("/api/documents/list", requireAuth(), (req: AuthenticatedRequest, res) => {
    pruneExpiredDocuments();
    const uid = req.authUser!.uid;
    const isAdmin = req.authUser!.isAdmin;
    const docs = Array.from(uploadedDocumentsStore.values())
      .filter(d => isAdmin || d.ownerUserId === uid)
      .map(d => ({
        id: d.id,
        name: d.name,
        mimeType: d.mimeType,
        sizeFormatted: d.sizeFormatted,
        isImage: d.isImage,
        url: d.url,
        uploadedAt: d.uploadedAt
      }));
    res.json({ success: true, count: docs.length, documents: docs });
  });

  // Real server system metrics (replaces the previous client-side fake random-walk
  // "CPU/GPU/RAM" gauges, which were never connected to anything real).
  app.get("/api/system/metrics", requireAuth(), (_req, res) => {
    const cpuCount = os.cpus().length || 1;
    const load1 = os.loadavg()[0];
    const cpuPercent = Math.min(100, Math.round((load1 / cpuCount) * 100));
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const ramPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

    res.json({
      cpu: cpuPercent,
      ram: ramPercent,
      ramUsedMB: Math.round((totalMem - freeMem) / 1024 / 1024),
      ramTotalMB: Math.round(totalMem / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
      cpuCount,
      // No GPU metrics are available from Node's os module — honestly omitted
      // rather than faked. A real GPU reading would need a native binding
      // (e.g. nvidia-smi shellout), which isn't wired up.
      gpu: null,
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/system/ollama", requireAuth(), async (_req, res) => {
    try {
      const discovery = await ollamaDiscoveryService.discoverAndTest();
      res.json(discovery);
    } catch (err: any) {
      res.status(500).json({
        reachable: false,
        discoveredModels: [],
        inferenceTestPassed: false,
        latencyMs: 0,
        error: err?.message || 'Ollama discovery error'
      });
    }
  });

  // ---------------------------------------------------------------------
  // Watchdog Defensive Security & URL Inspection Endpoints
  // ---------------------------------------------------------------------
  app.post("/api/watchdog/scan", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const { files, text, targetName } = req.body || {};
      let targetFiles: Record<string, string> = {};
      if (files && typeof files === 'object' && !Array.isArray(files)) {
        for (const [k, v] of Object.entries(files)) {
          targetFiles[String(k).slice(0, 260)] = String(v ?? '').slice(0, 250000);
        }
      } else if (typeof text === 'string' && text.trim()) {
        targetFiles[String(targetName || 'pasted_artifact.ts').slice(0, 260)] = text.slice(0, 250000);
      } else {
        return res.status(400).json({ error: 'Provide either files ({ path: content }) or non-empty text for Watchdog scanning.' });
      }

      const report = scanFilesWithWatchdog(targetFiles);
      const criticalCount = report.findings.filter((f) => f.severity === 'critical' || f.severity === 'high').length;
      if (criticalCount > 0) {
        await auditService.logEvent({
          action: 'security_alert',
          severity: 'warning',
          userId: req.authUser?.uid,
          userEmail: req.authUser?.email || undefined,
          details: `Watchdog scan ${report.scanId} flagged ${criticalCount} high/critical finding(s) across ${report.targetCount} target(s).`,
        });
      }
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Watchdog static scan failed' });
    }
  });

  app.post("/api/watchdog/url-check", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const rawUrl = req.body?.url;
      if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
        return res.status(400).json({ error: 'url is required for inspection.' });
      }
      const inspection = analyzeUrlWithWatchdog(rawUrl);
      if (inspection.riskLevel === 'HIGH' || inspection.riskLevel === 'CRITICAL') {
        await auditService.logEvent({
          action: 'security_alert',
          severity: 'warning',
          userId: req.authUser?.uid,
          details: `Watchdog URL check flagged ${inspection.riskLevel} risk on host inspection.`,
        });
      }
      res.json({ success: true, inspection });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Watchdog URL inspection failed' });
    }
  });

  app.get("/api/watchdog/status", requireAuth(), (_req, res) => {
    const cpuCount = os.cpus().length || 1;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    res.json({
      success: true,
      mode: 'DEFENSIVE_STATIC_AND_AUDIT',
      liveHostFirewallHooked: false,
      activeSessionsCount: authSecurityPlatform.getActiveSessionCount(),
      recentAuditEvents: auditService.getRecentLocalLogs(25).reverse(),
      hostSummary: {
        cpuCount,
        ramUsedMB: Math.round((totalMem - freeMem) / 1024 / 1024),
        ramTotalMB: Math.round(totalMem / 1024 / 1024),
        uptimeSeconds: Math.round(process.uptime()),
      },
      scopeNotice: 'Watchdog performs real static secret/code scanning, phishing URL inspection, and application audit logging. It does NOT claim kernel firewall interception or external CVE feed immunity.',
    });
  });

  // ---------------------------------------------------------------------
  // Engineering, Safety Checklists & Honest Robotics Bridge Status
  // ---------------------------------------------------------------------
  app.post("/api/engineering/calculate", requireAuth(), (req, res) => {
    try {
      const { discipline, params } = req.body || {};
      const inputParams = (params && typeof params === 'object') ? params : {};
      let result;
      switch (discipline) {
        case 'electrical_power':
          result = calculateElectricalAndSolar(inputParams);
          break;
        case 'robotics_mechatronics':
          result = calculateRoboticsMechatronics(inputParams);
          break;
        case 'aerospace_preliminary':
          result = calculateAerospacePreliminary(inputParams);
          break;
        case 'vehicle_ev':
          result = calculateVehicleEvPreliminary(inputParams);
          break;
        default:
          return res.status(400).json({
            error: "Unsupported discipline. Use 'electrical_power', 'robotics_mechatronics', 'aerospace_preliminary', or 'vehicle_ev'."
          });
      }
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Engineering calculation failed' });
    }
  });

  app.get("/api/safety/checklists", requireAuth(), (req, res) => {
    const queryText = String(req.query.q || '');
    const checklists = searchSafetyChecklists(queryText);
    res.json({
      success: true,
      offlineCapable: true,
      autoEmergencyDialerSupported: false,
      checklists,
    });
  });

  app.get("/api/robotics/status", requireAuth(), (_req, res) => {
    const bridgeUrl = (process.env.ROS2_BRIDGE_URL || '').trim();
    res.json({
      success: true,
      connected: false,
      bridgeConfigured: Boolean(bridgeUrl),
      bridgeUrl: bridgeUrl ? '[CONFIGURED]' : null,
      simulationOnly: true,
      status: bridgeUrl ? 'BRIDGE_CONFIGURED_UNVERIFIED' : 'DISCONNECTED_NO_LIVE_BRIDGE',
      nodes: [],
      message: bridgeUrl
        ? 'ROS2_BRIDGE_URL is configured, but no active WebSocket/rosbridge session is verified in this runtime.'
        : 'No ROS 2 rosbridge/DDS hardware endpoint is configured. Hardware robotics control remains in simulation sandbox only.',
      timestamp: new Date().toISOString(),
    });
  });

  // ---------------------------------------------------------------------
  // Enterprise Model Router — multi-provider AI (Gemini, OpenAI, Anthropic,
  // DeepSeek, Groq, OpenRouter, local Ollama) with automatic task-based
  // routing, rate-limit cooldown tracking, and real failover. Previously
  // built but never exposed over HTTP — these routes make it reachable.
  // ---------------------------------------------------------------------
  app.get("/api/router/health", requireAuth(), async (_req, res) => {
    try {
      const policy = providerRegistryService.getExecutionPolicy();
      if (policy.mode === 'OFFLINE_ONLY') {
        const audit = await providerRegistryService.auditAndRefreshHealth();
        return res.json({
          mode: policy.mode,
          ollama: audit.ollamaDiscovery,
          providers: audit.providers.map((p) => ({ provider: p.providerId, status: p.healthStatus, latencyMs: p.latencyMs, error: p.lastError }))
        });
      }
      const [health] = await Promise.all([
        aiProviderPlatform.refreshHealthChecks(),
        providerRegistryService.auditAndRefreshHealth()
      ]);
      res.json(health);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/router/models", requireAuth(), async (_req, res) => {
    const listing = await aiProviderPlatform.modelListing();
    const ollamaProv = providerRegistryService.getProvider('ollama');
    const ollamaModels = ollamaProv ? [...ollamaProv.availableModels] : [];
    listing.ollama = ollamaModels;
    const execPolicy = providerRegistryService.getExecutionPolicy();
    const registry = discoverRegisteredModels({
      executionMode: execPolicy.mode,
      ollamaModels,
    });
    res.json({
      ...listing,
      executionMode: execPolicy.mode,
      registry,
    });
  });

  app.post("/api/router/chat", requireAuth(), async (req, res) => {
    const { messages, taskCategory, preferOffline, hardwareTier, provider, model, temperature, maxTokens, systemPrompt } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages[] is required" });
    }
    try {
      const policy = providerRegistryService.getExecutionPolicy();
      if (policy.mode === 'OFFLINE_ONLY') {
        if (provider && provider !== 'ollama') {
          return res.status(503).json({ error: `OFFLINE_UNAVAILABLE: Provider "${provider}" is disabled in OFFLINE_ONLY mode.` });
        }
        const result = await enterpriseModelRouter.executeRoutedChat(
          messages,
          { taskCategory: taskCategory || 'general', preferOffline: true, hardwareTier },
          { model, temperature, maxTokens, systemPrompt }
        );
        return res.json(result);
      }
      if (taskCategory) {
        const result = await enterpriseModelRouter.executeRoutedChat(
          messages,
          { taskCategory, preferOffline, hardwareTier },
          { model, temperature, maxTokens, systemPrompt }
        );
        return res.json(result);
      }
      const result = await aiProviderPlatform.chat(messages, { model, temperature, maxTokens, systemPrompt }, provider);
      res.json(result);
    } catch (err: any) {
      console.error("[Model Router] chat failed:", err.message);
      res.status(503).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------
  // AI Brain — the full reasoning pipeline (security audit -> intent
  // classification -> task analysis -> model routing -> pre-execution
  // reasoning -> real synthesis call -> quality evaluation -> post-execution
  // reflection). Distinct from the simpler /api/brain/think used by the main
  // chat UI. Previously built but never reachable from any route.
  // ---------------------------------------------------------------------
  app.post("/api/brain/reason", requireAuth(), async (req, res) => {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    try {
      
      const { modelRouter } = await import('./src/core/modelRouter.ts');
      const aiResponse = await modelRouter.executeRoutedChat([{ role: 'user', content: req.body.prompt || req.body.query }], { taskCategory: 'general' });
      const result = { response: aiResponse.content };

      res.json(result);
    } catch (err: any) {
      console.error("[AI Brain] Unexpected failure:", err.message);
      res.status(503).json({ success: false, error: err.message || 'Reasoning provider unavailable.' });
    }
  });

  app.get("/api/creative/providers", requireAuth(), (_req, res) => {
    const execPolicy = providerRegistryService.getExecutionPolicy();
    const providers = creativeGenerationService.getCreativeProviders().map((p) => {
      if (execPolicy.mode === 'OFFLINE_ONLY' && !p.offlineCapable) {
        return {
          ...p,
          configured: false,
          status: 'UNCONFIGURED' as const,
          detail: 'Disabled while ANNY is in OFFLINE_ONLY execution policy.',
        };
      }
      return p;
    });
    res.json({
      executionMode: execPolicy.mode,
      providers,
    });
  });

  app.post("/api/creative/image", requireAuth(), async (req: AuthenticatedRequest, res) => {
    const body = req.body || {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > 4000) {
      return res.status(400).json({ success: false, error: 'A valid prompt (1-4000 characters) is required.' });
    }

    const execPolicy = providerRegistryService.getExecutionPolicy();
    const providerPreference =
      execPolicy.mode === 'OFFLINE_ONLY' ? 'local-vector-svg' : body.providerPreference || 'auto';
    const requestedCount =
      typeof body.count === 'number' && Number.isFinite(body.count)
        ? Math.min(4, Math.max(1, Math.floor(body.count)))
        : undefined;

    try {
      const result = await creativeGenerationService.generateCreativeImage({
        prompt,
        aspectRatio: typeof body.aspectRatio === 'string' ? body.aspectRatio : undefined,
        count: requestedCount,
        highResolution: Boolean(body.highResolution),
        providerPreference,
        referenceImages: Array.isArray(body.referenceImages) ? body.referenceImages.slice(0, 6) : undefined,
        activeContext: body.activeContext,
        previousLogoPlan: body.previousLogoPlan,
        parentArtifactId: typeof body.parentArtifactId === 'string' ? body.parentArtifactId : undefined,
        previousHashes: Array.isArray(body.previousHashes) ? body.previousHashes.slice(0, 30) : undefined,
        enableVisionQa: body.enableVisionQa !== false,
        ownerUserId: req.authUser?.uid || req.user?.userId || req.user?.id || 'anonymous',
        ownerOrgId: req.authUser?.companyId || 'personal',
      });

      if (!result.success) {
        return res.status(503).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(503).json({
        success: false,
        error: err?.message || 'Creative image generation failed.',
      });
    }
  });

  app.get("/api/creative/image/asset/:assetKey", requireAuth(), (req: AuthenticatedRequest, res) => {
    const assetKey = String(req.params.assetKey || '').trim();
    if (!/^[a-zA-Z0-9_-]{4,128}$/.test(assetKey)) {
      return res.status(400).json({ success: false, error: 'Invalid image asset identifier.' });
    }
    const requester = {
      userId: req.authUser?.uid || req.user?.userId || req.user?.id,
      orgId: req.authUser?.companyId || 'personal',
      isAdmin: req.authUser?.isAdmin === true || req.user?.isAdmin === true,
    };
    const asset = creativeGenerationService.getImageAsset(assetKey, requester);
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Image asset not found or access denied.' });
    }
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (asset.mimeType === 'image/svg+xml') {
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    }
    const safeFilename = asset.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"`);
    return res.status(200).send(Buffer.from(asset.bytes));
  });

  app.post("/api/creative/video/plan", requireAuth(), async (req, res) => {
    const body = req.body || {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > 4000) {
      return res.status(400).json({ success: false, error: 'A valid video prompt is required.' });
    }
    const execPolicy = providerRegistryService.getExecutionPolicy();
    try {
      const plan = await creativeGenerationService.createVideoProductionPlan({
        prompt,
        category: body.category,
        aspectRatio: body.aspectRatio === '9:16' ? '9:16' : '16:9',
        durationSeconds: Number(body.durationSeconds) || 8,
        resolution: body.resolution === '1080p' ? '1080p' : '720p',
        providerOverride: execPolicy.mode === 'OFFLINE_ONLY' ? 'offline' : 'auto',
      });
      return res.json({ success: true, status: 'STORYBOARD_PLAN_ONLY', plan });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Video planning failed.' });
    }
  });

  app.post("/api/creative/video/jobs", requireAuth(), async (req: AuthenticatedRequest, res) => {
    const body = req.body || {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > 4000) {
      return res.status(400).json({ success: false, error: 'A valid video prompt is required.' });
    }

    const execPolicy = providerRegistryService.getExecutionPolicy();
    const resolution =
      body.resolution === '360p' || body.resolution === '1080p' || body.resolution === '4k'
        ? body.resolution
        : '720p';
    try {
      const job = await creativeGenerationService.startVideoJob({
        prompt,
        mode: body.mode,
        category: body.category,
        aspectRatio: body.aspectRatio === '9:16' ? '9:16' : '16:9',
        durationSeconds: Number(body.durationSeconds) || 8,
        resolution,
        referenceImages: Array.isArray(body.referenceImages) ? body.referenceImages.slice(0, 6) : undefined,
        referenceVideo: body.referenceVideo,
        parentJobId: typeof body.parentJobId === 'string' ? body.parentJobId : undefined,
        previousInteractionId: typeof body.previousInteractionId === 'string' ? body.previousInteractionId : undefined,
        planOnly: Boolean(body.planOnly),
        providerOverride: execPolicy.mode === 'OFFLINE_ONLY' ? 'offline' : 'auto',
        ownerUserId: req.authUser?.uid || req.user?.userId || req.user?.id || 'anonymous',
        ownerOrgId: req.authUser?.companyId || 'personal',
      });

      const statusCode =
        job.status === 'PROVIDER_UNCONFIGURED' || job.status === 'STORYBOARD_PLAN_ONLY' ? 200 : 202;
      return res.status(statusCode).json(job);
    } catch (err: any) {
      return res.status(503).json({
        success: false,
        status: 'FAILED',
        error: err?.message || 'Video job creation failed.',
      });
    }
  });

  app.get("/api/creative/video/jobs", requireAuth(), (req: AuthenticatedRequest, res) => {
    const requester = {
      userId: req.authUser?.uid || req.user?.userId || req.user?.id,
      orgId: req.authUser?.companyId || 'personal',
      isAdmin: req.authUser?.isAdmin === true || req.user?.isAdmin === true,
    };
    return res.json({ jobs: creativeGenerationService.listVideoJobs(requester) });
  });

  app.get("/api/creative/video/jobs/:jobId", requireAuth(), (req: AuthenticatedRequest, res) => {
    const jobId = String(req.params.jobId || '');
    const requester = {
      userId: req.authUser?.uid || req.user?.userId || req.user?.id,
      orgId: req.authUser?.companyId || 'personal',
      isAdmin: req.authUser?.isAdmin === true || req.user?.isAdmin === true,
    };
    const job = creativeGenerationService.getVideoJob(jobId, requester);
    if (!job) {
      return res.status(404).json({ error: 'Video job not found or access denied.' });
    }
    return res.json(job);
  });

  app.post("/api/creative/video/jobs/:jobId/cancel", requireAuth(), (req: AuthenticatedRequest, res) => {
    const jobId = String(req.params.jobId || '');
    const requester = {
      userId: req.authUser?.uid || req.user?.userId || req.user?.id,
      orgId: req.authUser?.companyId || 'personal',
      isAdmin: req.authUser?.isAdmin === true || req.user?.isAdmin === true,
    };
    const cancelled = creativeGenerationService.cancelVideoJob(jobId, requester);
    if (!cancelled) {
      return res.status(404).json({ error: 'Video job not found or access denied.' });
    }
    return res.json(cancelled);
  });

  app.get("/api/creative/video/jobs/:jobId/media", requireAuth(), (req: AuthenticatedRequest, res) => {
    const jobId = String(req.params.jobId || '');
    const requester = {
      userId: req.authUser?.uid || req.user?.userId || req.user?.id,
      orgId: req.authUser?.companyId || 'personal',
      isAdmin: req.authUser?.isAdmin === true || req.user?.isAdmin === true,
    };
    const job = creativeGenerationService.getVideoJob(jobId, requester);
    const media = creativeGenerationService.getVideoMediaBuffer(jobId, requester);
    if (!job || !media || job.status !== 'COMPLETED' || !job.playableValidated) {
      return res.status(404).json({ error: 'Verified playable video media not available for this job.' });
    }
    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Length', String(media.bytes.byteLength));
    res.setHeader('Content-Disposition', `inline; filename="${sanitizeDownloadFilename(jobId)}.mp4"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(Buffer.from(media.bytes));
  });

  app.post("/api/creative/audio", requireAuth(), async (req: AuthenticatedRequest, res) => {
    const body = req.body || {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > 2000) {
      return res.status(400).json({ success: false, error: 'A valid music/audio prompt is required.' });
    }
    const rawType = typeof body.type === 'string' ? body.type.trim().toUpperCase() : 'MUSIC';
    const audioType =
      rawType === 'INSTRUMENTAL' || rawType === 'BEAT' || rawType === 'SFX' || rawType === 'VOICE'
        ? rawType
        : 'MUSIC';
    const execPolicy = providerRegistryService.getExecutionPolicy();
    if (execPolicy.mode === 'OFFLINE_ONLY' && audioType === 'VOICE') {
      return res.status(503).json({
        success: false,
        provider: 'offline',
        model: 'none',
        errorCode: 'AUDIO_RENDERER_NOT_CONFIGURED',
        error: 'Cloud Voice TTS generation is disabled while ANNY is in OFFLINE_ONLY mode.',
      });
    }
    const ownerUserId = req.authUser?.uid || req.user?.userId || req.user?.id || 'anonymous';
    const ownerOrgId = req.authUser?.companyId || 'personal';
    const requestedMode =
      execPolicy.mode === 'OFFLINE_ONLY'
        ? 'offline'
        : body.mode === 'cloud' || body.mode === 'offline' || body.mode === 'auto'
          ? body.mode
          : 'auto';

    const result = await creativeGenerationService.generateCreativeAudio({
      prompt,
      type: audioType,
      fullTrack: Boolean(body.fullTrack),
      mode: requestedMode,
      voiceName: typeof body.voiceName === 'string' ? body.voiceName.trim() : undefined,
      ownerUserId,
      ownerOrgId,
    });
    return res.status(result.success ? 200 : 503).json(result);
  });

  app.get("/api/creative/audio/asset/:assetKey", requireAuth(), (req: AuthenticatedRequest, res) => {
    const assetKey = String(req.params.assetKey || '').trim();
    if (!/^[a-zA-Z0-9_-]{4,128}$/.test(assetKey)) {
      return res.status(400).json({ success: false, error: 'Invalid audio asset identifier.' });
    }
    const requester = {
      userId: req.authUser?.uid || req.user?.userId || req.user?.id,
      orgId: req.authUser?.companyId || 'personal',
      isAdmin: req.authUser?.isAdmin === true || req.user?.isAdmin === true,
    };
    const asset = creativeGenerationService.getAudioAsset(assetKey, requester);
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Audio asset not found or access denied.' });
    }
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Length', String(asset.bytes.byteLength));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const safeFilename = asset.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"`);
    return res.status(200).send(Buffer.from(asset.bytes));
  });

  app.post("/api/router/image", requireAuth(), async (req, res) => {
    const { prompt, aspectRatio, referenceImages, previousLogoPlan, activeContext } = req.body || {};
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: "prompt is required" });
    const execPolicy = providerRegistryService.getExecutionPolicy();
    try {
      const result = await creativeGenerationService.generateCreativeImage({
        prompt,
        aspectRatio,
        providerPreference: execPolicy.mode === 'OFFLINE_ONLY' ? 'local-vector-svg' : 'auto',
        referenceImages,
        previousLogoPlan,
        activeContext,
      });
      if (!result.success) {
        return res.status(503).json({
          error: result.error || 'IMAGE_PROVIDER_UNAVAILABLE',
          errorCode: result.errorCode || 'IMAGE_GENERATION_FAILED',
          recoveryGuidance: result.recoveryGuidance,
          classification: result.classification,
        });
      }
      return res.json({
        ...result,
        imageUrl: result.primaryImageUrl,
        url: result.primaryImageUrl,
      });
    } catch (err: any) {
      return res.status(503).json({
        error: 'IMAGE_PROVIDER_UNAVAILABLE',
        errorCode: 'IMAGE_GENERATION_FAILED',
        message: err?.message || 'No configured image generation provider succeeded.'
      });
    }
  });

  // Enterprise Infrastructure Verification & Readiness Report (Admin only)
  app.get("/api/infrastructure/readiness", requireAdmin, async (req, res) => {
    try {
      const report = await enterpriseSystemGateway.executeStartupVerification();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/infrastructure/analytics", requireAdmin, async (req, res) => {
    try {
      const auditLogs = await postgresPlatform.getAuditLogsAsync(20);
      res.json({
        summary: clickHouseAnalytics.getMetricsSummary(),
        auditLogs
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Analytics unavailable' });
    }
  });

  app.get("/api/infrastructure/openapi", (req, res) => {
    res.json(enterpriseSystemGateway.getOpenApiSpec());
  });

  app.get("/api/admin/health", requireAdmin, (req, res) => {
    // Only return presence of keys, not the keys themselves!
    res.json({
      gemini: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY),
      groq: !!process.env.GROQ_API_KEY,
      google: !!(process.env.GOOGLE_AI_STUDIO_KEY || process.env.GEMINI_API_KEY),
      huggingface: !!process.env.HUGGINGFACE_API_KEY,
      hardware: isHardwareActive,
      status: (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || process.env.GROQ_API_KEY || process.env.HUGGINGFACE_API_KEY || process.env.ANTHROPIC_API_KEY) ? "ONLINE_CAPABILITIES_CONFIGURED" : "LOCAL_ONLY"
    });
  });

  app.get("/api/vision/capabilities", requireAuth(), async (_req, res) => {
    const execPolicy = providerRegistryService.getExecutionPolicy();
    const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY);
    const ollamaProvider = providerRegistryService.getProvider('ollama');
    const ollamaHealthy = Boolean(
      ollamaProvider && (ollamaProvider.healthStatus === 'HEALTHY' || ollamaProvider.healthStatus === 'CONNECTED')
    );
    const isOfflineOnly = execPolicy.mode === 'OFFLINE_ONLY';
    const limitations: string[] = [];
    if (isOfflineOnly) {
      limitations.push('Server execution policy is OFFLINE_ONLY; cloud live vision is disabled.');
    } else if (!hasGemini) {
      limitations.push('Server GEMINI_API_KEY is not configured; online live vision and frame analysis are unavailable.');
    }
    if (!ollamaHealthy) {
      limitations.push('Local Ollama vision model is not currently reachable.');
    }

    res.json({
      liveStreamAvailable: !isOfflineOnly && hasGemini,
      liveModel: !isOfflineOnly && hasGemini ? 'gemini-3.8-live' : null,
      frameAnalysisAvailable: (!isOfflineOnly && hasGemini) || ollamaHealthy,
      frameAnalysisModel: !isOfflineOnly && hasGemini ? 'gemini-4-hydrogen' : (ollamaHealthy ? 'ollama-local' : null),
      localVlmAvailable: ollamaHealthy,
      executionMode: execPolicy.mode,
      limitations,
    });
  });

  app.post("/api/vision/analyze", requireAuth(), async (req, res) => {
    const { image, prompt, mimeType, temporalContext, mode, structured } = req.body || {};
    if (!image || typeof image !== 'string') return res.status(400).json({ error: "Image payload missing" });

    const cleanBase64 = image.includes(",") ? image.split(",")[1] : image;
    if (!cleanBase64 || cleanBase64.length > 8_000_000) {
      return res.status(400).json({ error: "Invalid or oversized image payload" });
    }
    const type = typeof mimeType === 'string' && /^image\/(jpeg|png|webp)$/i.test(mimeType) ? mimeType : "image/jpeg";
    const safePrompt =
      typeof prompt === 'string' && prompt.trim()
        ? prompt.trim().slice(0, 1500)
        : "Analyze this frame concisely for objects, UI elements, text, technical telemetry, hazards, and visual context.";
    const safeTemporal =
      typeof temporalContext === 'string' && temporalContext.trim()
        ? `\n\nTemporal visual context from recent frames:\n${temporalContext.trim().slice(0, 1800)}`
        : "";
    const analysisMode = mode === 'continuous_frame_analysis' ? 'continuous_frame_analysis' : 'snapshot';
    const wantStructured = Boolean(structured);

    const execPolicy = providerRegistryService.getExecutionPolicy();
    if (execPolicy.mode === 'OFFLINE_ONLY') {
      try {
        const localRes = await aiProviderPlatform.chat(
          [
            {
              role: 'user',
              content: [
                { text: `${safePrompt}${safeTemporal}` },
                { inlineData: { mimeType: type, data: cleanBase64 } }
              ]
            }
          ],
          { systemPrompt: 'You are ANNY Vision Sensor. Describe only what is actually visible in the attached image accurately and concisely.' },
          'ollama'
        );
        if (localRes?.content) {
          return res.json({
            analysis: formatNaturalConversation(localRes.content),
            sceneSummary: formatNaturalConversation(localRes.content),
            objects: [],
            provider: localRes.provider || 'Ollama Local Vision',
            model: localRes.model || 'ollama-local',
            mode: analysisMode,
          });
        }
      } catch (offlineErr: any) {
        return res.status(503).json({
          error: offlineErr?.message || "OFFLINE_UNAVAILABLE: Local Ollama vision model is unavailable."
        });
      }
      return res.status(503).json({ error: "OFFLINE_UNAVAILABLE: No local vision result was returned." });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY;
    if (!geminiKey) {
      return res.status(503).json({ error: "Vision provider is not configured. No simulated vision result is returned." });
    }

    try {
      const genAI = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const visionModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
      let analysisText = '';
      let parsedObjects: Array<{ label: string; confidence: number; box?: { x: number; y: number; w: number; h: number } }> = [];
      let usedModel = visionModels[0];
      const retryDelays = [800, 1800];

      const effectivePrompt = wantStructured
        ? `${safePrompt}${safeTemporal}\n\nRespond ONLY with valid JSON matching this schema:\n{"description": "concise factual description of visible scene and changes", "objects": [{"label": "object name", "confidence": 0.85, "box": {"x": 0.1, "y": 0.2, "w": 0.3, "h": 0.4}}]}\nUse normalized coordinates [0..1] for box (x=left, y=top, w=width, h=height). Omit box if uncertain. List only genuinely visible objects.`
        : `${safePrompt}${safeTemporal}`;

      for (const vModel of visionModels) {
        for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
          try {
            const result = await genAI.models.generateContent({
              model: vModel,
              contents: [
                {
                  role: 'user',
                  parts: [
                    { inlineData: { mimeType: type, data: cleanBase64 } },
                    { text: effectivePrompt }
                  ]
                }
              ],
              ...(wantStructured ? { config: { responseMimeType: 'application/json' } } : {})
            });
            if (result && result.text) {
              usedModel = vModel;
              if (wantStructured) {
                try {
                  const parsed = JSON.parse(result.text.trim());
                  analysisText = String(parsed?.description || result.text).trim();
                  if (Array.isArray(parsed?.objects)) {
                    parsedObjects = parsed.objects
                      .filter((o: any) => o && typeof o.label === 'string' && o.label.trim().length > 0)
                      .slice(0, 12);
                  }
                } catch {
                  analysisText = result.text;
                }
              } else {
                analysisText = result.text;
              }
              break;
            }
          } catch (vErr: any) {
            const msg = String(vErr?.message || '').toLowerCase();
            const isTransient = vErr?.status === 503 || vErr?.status === 429 || msg.includes('503') || msg.includes('429') || msg.includes('unavailable') || msg.includes('high demand') || msg.includes('resource_exhausted');
            if (isTransient && attempt < retryDelays.length) {
              await new Promise(r => setTimeout(r, retryDelays[attempt] + Math.floor(Math.random() * 300)));
              continue;
            }
            console.warn(`[Vision Sensor] Model ${vModel} failed:`, vErr?.message || vErr);
            break;
          }
        }
        if (analysisText) break;
      }

      if (!analysisText) {
        return res.status(503).json({
          error: "Vision analysis models are temporarily unavailable. Please retry in a moment or switch to Local Offline perception."
        });
      }

      const formatted = formatNaturalConversation(analysisText);
      res.json({
        analysis: formatted,
        sceneSummary: formatted,
        objects: parsedObjects,
        provider: "ANNY Vision Core",
        model: usedModel,
        mode: analysisMode,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Vision analysis failed" });
    }
  });

  // Sahara specialized endpoints (Authenticated)
  app.post("/api/sahara/stt", requireAuth(), async (req, res) => {
    const { audio, model, language, mimeType } = req.body || {}; // base64 audio
    if (!audio || typeof audio !== 'string') {
      return res.status(400).json({ error: "Audio payload missing" });
    }

    // Prioritize Local Speech-to-Text service (works even in OFFLINE_ONLY mode)
    try {
      const parsedAudio = parseBase64AudioPayload(audio, mimeType);
      const localResult = await localSttService.transcribeAudioLocally({
        audioBuffer: parsedAudio.buffer,
        mimeType: parsedAudio.mimeType,
        extension: parsedAudio.extension,
        language: typeof language === 'string' ? language : 'auto',
      });
      if (localResult.transcribed && localResult.text) {
        return res.json({
          text: localResult.text,
          modelUsed: localResult.modelUsed || localResult.engine,
          provider: `Local STT (${localResult.engine})`,
          durationSec: localResult.durationSec,
        });
      }
    } catch (localSttErr: any) {
      if (String(localSttErr?.message || '').startsWith('UNSUPPORTED_AUDIO_MIME_TYPE') || localSttErr?.message === 'INVALID_AUDIO_BASE64') {
        return res.status(400).json({ error: localSttErr.message });
      }
    }

    const execPolicy = providerRegistryService.getExecutionPolicy();
    if (execPolicy.mode === 'OFFLINE_ONLY') {
      return res.status(503).json({
        error: "OFFLINE_ONLY mode active and no local STT service (LOCAL_STT_URL / WHISPER_CPP_URL / whisper-cli) is configured.",
      });
    }

    const cleanAudioBase64 = audio.includes(',') ? audio.split(',').pop() || '' : audio;
    const audioMimeType = typeof mimeType === 'string' && mimeType.trim() ? mimeType.split(';')[0].trim() : 'audio/webm';
    const hfKey = process.env.HUGGINGFACE_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY;

    if (!hfKey && !groqKey && !geminiKey) {
      return res.status(503).json({ error: "No speech transcription provider is configured." });
    }

    let lastError = "";

    // 1. Prioritize Groq for general/high-speed Whisper detection when configured
    if (groqKey && (language === "auto" || !language || language === "pidgin" || language === "english")) {
      try {
        console.log("[Sahara Neural Router] Using Groq Unified STT");
        const audioBuffer = Buffer.from(cleanAudioBase64, "base64");
        const form = new FormData();

        const stream = new Readable();
        stream.push(audioBuffer);
        stream.push(null);

        const ext = audioMimeType.includes('mp4') ? 'm4a' : audioMimeType.includes('ogg') ? 'ogg' : audioMimeType.includes('wav') ? 'wav' : 'webm';
        form.append("file", stream, { filename: `audio.${ext}`, contentType: audioMimeType });
        form.append("model", "whisper-large-v3");
        form.append("temperature", "0");

        const saharaPrompt = "Anny System. Direct Operator uplink. Focused on English, Nigerian English, Lagos Pidgin, Yoruba, Igbo, Hausa, software engineering, and technical workflows.";
        form.append("prompt", saharaPrompt);

        if (language && language !== "auto") form.append("language", language === "pidgin" ? "en" : (language === "yoruba" ? "yo" : (language === "hausa" ? "ha" : "ig")));

        const groqResponse = await axios.post("https://api.groq.com/openai/v1/audio/transcriptions", form, {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${groqKey}`
          }
        });

        if (groqResponse.data?.text) {
          return res.json({
            text: String(groqResponse.data.text).trim(),
            modelUsed: "groq/whisper-large-v3",
            provider: "Sahara Unified (Groq Core)"
          });
        }
      } catch (err: any) {
        lastError = err.response?.data?.error?.message || err.message;
        console.warn("[Sahara Neural Router] Groq STT failed:", err.response?.data || err.message);
      }
    }

    // 2. Gemini Multimodal Audio Transcription Fallback (works with GEMINI_API_KEY out of the box)
    if (geminiKey) {
      const genAI = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const sttModels = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
      for (const mName of sttModels) {
        try {
          const langHint = language && language !== 'auto'
            ? `Primary spoken language hint: ${language}.`
            : 'Detect the spoken language automatically (including English, Nigerian Pidgin, Yoruba, Igbo, Hausa, or other languages).';
          const result = await genAI.models.generateContent({
            model: mName,
            contents: [
              {
                role: 'user',
                parts: [
                  { inlineData: { mimeType: audioMimeType, data: cleanAudioBase64 } },
                  { text: `Transcribe the spoken audio verbatim into clean plain text only. Do not add commentary, timestamps, or speaker labels. If there is no intelligible speech, return an empty string. ${langHint}` }
                ]
              }
            ]
          });
          const transcript = String(result?.text || '').trim();
          if (transcript) {
            return res.json({
              text: transcript,
              modelUsed: mName,
              provider: "Sahara Multimodal Speech"
            });
          }
        } catch (gErr: any) {
          lastError = gErr?.message || String(gErr);
          console.warn(`[Sahara Neural Router] Gemini STT model ${mName} failed:`, lastError);
        }
      }
    }

    // 3. HF Specialized Routing (Sahara Core)
    const modelsData = {
      yoruba: ["NCAIR1/Yoruba-ASR", "facebook/wav2vec2-large-xlsr-53-yoruba", "openai/whisper-large-v3"],
      hausa: ["NCAIR1/Hausa-ASR", "facebook/wav2vec2-large-xlsr-53-hausa", "openai/whisper-large-v3"],
      igbo: ["NCAIR1/Igbo-ASR", "facebook/wav2vec2-large-xlsr-53-igbo", "openai/whisper-large-v3"],
      pidgin: ["NCAIR1/NigerianAccentedEnglish", "openai/whisper-large-v3"],
      english: ["NCAIR1/NigerianAccentedEnglish", "openai/whisper-large-v3"]
    };

    let selectedModels: string[] = ["openai/whisper-large-v3", "openai/whisper-medium", "distil-whisper/distil-large-v3"];

    if (language && language !== 'auto' && modelsData[language as keyof typeof modelsData]) {
      selectedModels = [...modelsData[language as keyof typeof modelsData], ...selectedModels];
    }

    if (model) selectedModels = [model, ...selectedModels];
    selectedModels = [...new Set(selectedModels)];

    let finalTranscription = "";
    let modelUsed = "";

    if (hfKey) {
      for (const modelId of selectedModels) {
        try {
          console.log(`[Sahara Neural Router] HF Routing: ${modelId}`);
          const response = await axios.post(`https://api-inference.huggingface.co/models/${modelId}`,
            Buffer.from(cleanAudioBase64, "base64"),
            {
              headers: {
                Authorization: `Bearer ${hfKey}`,
                "Content-Type": audioMimeType
              },
              params: { wait_for_model: true },
              timeout: 30000
            }
          );

          finalTranscription = response.data.text || response.data[0]?.generated_text || response.data[0]?.text;

          if (finalTranscription) {
            modelUsed = modelId;
            break;
          }
        } catch (err: any) {
          lastError = err.response?.data?.error || err.message;
          console.warn(`[Sahara Neural Router] HF Path ${modelId} congested: ${lastError}`);
          continue;
        }
      }
    }

    if (finalTranscription) {
      return res.json({
        text: finalTranscription,
        modelUsed,
        provider: "Sahara Unified (HF Neural Hub)"
      });
    }

    res.status(503).json({ error: `Speech transcription unavailable. ${lastError || 'No speech detected.'}` });
  });

  // Live Web Search & Public URL Grounding Endpoint (Authenticated + SSRF protected)
  app.post("/api/web/search", requireAuth(), async (req, res) => {
    const { query, url } = req.body || {};
    const searchStr = typeof query === 'string' ? query.trim() : '';
    const urlStr = typeof url === 'string' ? url.trim() : '';
    if (!searchStr && !urlStr) {
      return res.status(400).json({ error: "A search query or public URL is required." });
    }

    const execPolicy = providerRegistryService.getExecutionPolicy();
    if (execPolicy.mode === 'OFFLINE_ONLY') {
      return res.status(503).json({ error: "OFFLINE_ONLY mode active: live web search is disabled." });
    }

    const targetUrl = urlStr || (/^https?:\/\/\S+$/i.test(searchStr) ? searchStr : '');
    if (targetUrl) {
      try {
        const { response, finalUrl } = await safePublicFetch(targetUrl, {
          timeoutMs: 12000,
          headers: { 'User-Agent': 'ANNY-Web-Explorer/1.0' }
        });
        const $ = cheerio.load(String(response.data || ''));
        $('script, style, noscript').remove();
        const pageTitle = $('title').first().text().trim() || finalUrl;
        const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';
        const bodyText = $('main, article, body').text().replace(/\s+/g, ' ').trim().slice(0, 6000);
        return res.json({
          success: true,
          answer: formatNaturalConversation(
            `Fetched **${pageTitle}** (${finalUrl}).\n\n${metaDesc ? `${metaDesc}\n\n` : ''}${bodyText.slice(0, 1200)}`
          ),
          excerpt: bodyText,
          sources: [{ title: pageTitle, url: finalUrl }]
        });
      } catch (fetchErr: any) {
        return res.status(400).json({ error: fetchErr?.message || "Failed to fetch target public URL." });
      }
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY;
    if (!geminiKey) {
      return res.status(503).json({ error: "Web search grounding provider is not configured." });
    }

    try {
      const genAI = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const models = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
      for (const mName of models) {
        try {
          const result: any = await genAI.models.generateContent({
            model: mName,
            contents: searchStr,
            config: {
              systemInstruction: 'You are ANNY Live Web Intelligence. Use Google Search results to provide an accurate, up-to-date, concise answer with concrete facts.',
              tools: [{ googleSearch: {} }]
            }
          });
          const answerText = String(result?.text || '').trim();
          const rawChunks = result?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const sources: Array<{ title: string; url: string }> = [];
          const seen = new Set<string>();
          for (const chunk of rawChunks) {
            const u = chunk?.web?.uri;
            if (u && !seen.has(u)) {
              seen.add(u);
              sources.push({ title: chunk.web.title || u, url: u });
            }
          }
          if (answerText) {
            return res.json({
              success: true,
              answer: formatNaturalConversation(answerText),
              sources
            });
          }
        } catch (sErr: any) {
          console.warn(`[Web Search] Model ${mName} search failed:`, sErr?.message || sErr);
        }
      }
      return res.status(503).json({ error: "Live web search is temporarily unavailable." });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Web search failed." });
    }
  });

  app.post("/api/sahara/translate", requireAuth(), async (req, res) => {
    const { text, from, to } = req.body;
    
    // Preference order: 1. Specialized Nigerian Llama-70b (Free on Groq), 2. Meta MMS pattern
    const key = process.env.GROQ_API_KEY;
    
    try {
      if (key) {
        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
          model: "llama-3.3-70b-versatile",
          messages: [
            { 
              role: "system", 
              content: `You are Sahara Neural Translate v2. Specialized in Nigerian languages (Pidgin, Yoruba, Igbo, Hausa). 
              Source: ${from || 'Detect'}
              Target: ${to || 'English'}
              Reference Data: Google WAXAL, N-ATLAS patterns.
              Only return the clean translation.` 
            },
            { role: "user", content: text }
          ]
        }, {
          headers: { Authorization: `Bearer ${key}` }
        });
        return res.json({ translatedText: response.data.choices[0].message.content, engine: "sahara-llama" });
      }
      
      // Fallback or explicit Google pattern mentioned by user
      res.status(500).json({ error: "Translation brain unavailable" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sahara/tts", requireAuth(), async (req, res) => {
    const { text, model, language } = req.body || {};
    const key = process.env.HUGGINGFACE_API_KEY;
    if (!text || typeof text !== 'string') return res.status(400).json({ error: "text is required" });

    // Preferred production path: a locally hosted WazobiaVoice-compatible HTTP
    // service. This keeps Nigerian speech on the user's infrastructure and avoids
    // pretending that browser WebSpeech voices are native Nigerian voices.
    if (process.env.WAZOBIA_TTS_URL) {
      try {
        const localResponse = await axios.post(process.env.WAZOBIA_TTS_URL, {
          text,
          language,
          voiceRole: req.body?.voiceRole || 'female'
        }, { responseType: 'arraybuffer', timeout: 60000 });
        const contentType = String(localResponse.headers?.['content-type'] || 'audio/wav');
        if (localResponse.data?.byteLength) {
          res.set('Content-Type', contentType);
          return res.send(Buffer.from(localResponse.data));
        }
      } catch (localError: any) {
        console.warn('[Sahara TTS] Local Nigerian TTS adapter unavailable:', localError?.message || localError);
      }
    }

    if (!key) return res.status(503).json({ error: "Nigerian TTS provider is not configured. Set WAZOBIA_TTS_URL for a local high-quality Nigerian TTS service or HUGGINGFACE_API_KEY for a configured remote model." });

    const languageModels: Record<string, string[]> = {
      yo: ["Shinzmann/soro-tts-yor", "Axiveri/WazobiaVoice", "facebook/mms-tts-yor"],
      ha: ["Shinzmann/soro-tts-hau", "Axiveri/WazobiaVoice", "facebook/mms-tts-hau"],
      ig: ["Shinzmann/soro-tts-ibo", "Axiveri/WazobiaVoice", "facebook/mms-tts-ibo"],
      pcm: ["Axiveri/WazobiaVoice"],
      "en-ng": ["Axiveri/WazobiaVoice", "facebook/mms-tts-eng"]
    };

    let selectedModels = languageModels[language] || ["facebook/mms-tts-eng"];
    if (model) selectedModels = [model, ...selectedModels];
    selectedModels = [...new Set(selectedModels)];

    let lastError = "";
    for (const modelId of selectedModels) {
      try {
        console.log(`[Sahara TTS] Attempting ${language || 'generic'} model: ${modelId}`);
        const response = await axios.post(
          `https://api-inference.huggingface.co/models/${modelId}`,
          { inputs: text },
          {
            headers: { Authorization: `Bearer ${key}` },
            responseType: "arraybuffer",
            timeout: 30000
          }
        );
        res.set("Content-Type", String(response.headers?.["content-type"] || "audio/wav"));
        return res.send(Buffer.from(response.data));
      } catch (err: any) {
        let errorMsg = err.message || 'TTS provider error';
        if (err.response?.data) {
          try {
            const decoded = JSON.parse(Buffer.from(err.response.data).toString());
            errorMsg = decoded.error || errorMsg;
          } catch {}
        }
        lastError = errorMsg;
        console.warn(`[Sahara TTS] Model ${modelId} failed: ${lastError}`);
      }
    }

    return res.status(502).json({ error: `Voice synthesis failed: ${lastError}` });
  });

  app.get("/api/anny/telemetry", requireAdmin, async (req, res) => {
    try {
      const { annyTelemetry } = await import('./src/core/annyTelemetry.ts');
      return res.json({
        success: true,
        records: annyTelemetry.getRecords()
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/anny/acceptance-test", requireAdmin, async (req, res) => {
    try {
      const { annyAcceptanceTestSuite } = await import('./src/core/annyAcceptanceTestSuite.ts');
      const report = await annyAcceptanceTestSuite.runSuite();
      return res.json({
        success: true,
        report
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // =========================================================================
  // SOVEREIGN RUNTIME HOST, UNIVERSAL LANGUAGE FABRIC, AIOS CONTROL PLANE,
  // MULTI-ORG GOVERNANCE, COLLECTIVE LEARNING, IDENTITY & MASTER REALITY APIs
  // =========================================================================
  const buildLiveRuntimeSnapshot = async (): Promise<RuntimeCapabilitySnapshot> => {
    const ollama =
      ollamaDiscoveryService.getLastDiscovery() ||
      (await ollamaDiscoveryService.discoverAndTest().catch(() => ({ reachable: false, discoveredModels: [] as any[] })));
    const sttStatus = await localSttService.getStatus().catch(() => ({ available: false }));
    return {
      hasGemini: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 8),
      hasOpenAI: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 8),
      hasAnthropic: Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 8),
      hasSahara: Boolean((process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || '').trim().length > 8),
      hasLocalStt: Boolean((sttStatus as any)?.available || (sttStatus as any)?.ready),
      hasOllama: Boolean((ollama as any)?.reachable),
      totalRamBytes: os.totalmem(),
      freeRamBytes: os.freemem(),
      cpuCores: os.cpus()?.length || 1,
      platform: os.platform(),
      arch: os.arch(),
    };
  };

  const aiosAuditTrail: Array<{
    id: string;
    timestamp: string;
    domain: string;
    action: string;
    callerId: string;
    status: string;
    summary: string;
  }> = [];

  const activatedLanguages = new Set<string>(['en', 'yo', 'ig', 'ha', 'pcm']);

  app.get("/api/runtime/health", requireAuth(), (_req, res) => {
    return res.json({
      success: true,
      status: "RUNTIME_HOST_ONLINE",
      owner: ANNY_IDENTITY.owner,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/runtime/hardware", requireAuth(), async (_req, res) => {
    try {
      const snap = await buildLiveRuntimeSnapshot();
      const cpus = os.cpus() || [];
      return res.json({
        success: true,
        hardware: {
          platform: snap.platform,
          arch: snap.arch,
          release: os.release(),
          hostname: os.hostname(),
          cpuModel: cpus[0]?.model || 'Host CPU',
          cpuCores: snap.cpuCores,
          totalMemoryBytes: snap.totalRamBytes,
          freeMemoryBytes: snap.freeRamBytes,
          totalMemoryGb: Number((snap.totalRamBytes / 1024 ** 3).toFixed(2)),
          freeMemoryGb: Number((snap.freeRamBytes / 1024 ** 3).toFixed(2)),
          uptimeSeconds: Math.round(os.uptime()),
          nodeVersion: process.version,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Hardware inspection failed' });
    }
  });

  app.get("/api/runtime/capabilities", requireAuth(), async (_req, res) => {
    try {
      const snap = await buildLiveRuntimeSnapshot();
      return res.json({
        success: true,
        capabilities: {
          ASR: snap.hasLocalStt ? "LOCAL_NEURAL" : snap.hasSahara ? "CLOUD_NEURAL_SAHARA" : "BROWSER_ONLY",
          TTS: snap.hasSahara ? "CLOUD_NEURAL_TTS" : "BROWSER_TTS",
          TRANSLATION: snap.hasGemini || snap.hasOpenAI || snap.hasAnthropic ? "LIVE_NEURAL_CODE_PRESERVING" : "UNAVAILABLE",
          LID: "LOCAL_DETERMINISTIC_AND_DIACRITIC",
          LLM: snap.hasGemini || snap.hasOpenAI || snap.hasAnthropic ? "HYBRID_SOVEREIGN" : snap.hasOllama ? "LOCAL_OLLAMA" : "OFFLINE_LIMITED",
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Capability query failed' });
    }
  });

  app.get("/api/runtime/providers", requireAuth(), async (_req, res) => {
    try {
      const snap = await buildLiveRuntimeSnapshot();
      return res.json({
        success: true,
        providers: [
          { id: 'gemini', name: 'Google Gemini Multimodal', available: snap.hasGemini, mode: 'cloud', role: 'Primary Reasoning, Code Synthesis & Translation' },
          { id: 'openai', name: 'OpenAI GPT', available: snap.hasOpenAI, mode: 'cloud', role: 'Secondary Fallback Reasoning' },
          { id: 'anthropic', name: 'Anthropic Claude', available: snap.hasAnthropic, mode: 'cloud', role: 'Secondary Architecture & Code Review' },
          { id: 'sahara', name: 'Sahara / HuggingFace African Speech', available: snap.hasSahara, mode: 'cloud', role: 'African ASR / TTS' },
          { id: 'local_stt', name: 'Local Whisper STT Runtime', available: snap.hasLocalStt, mode: 'local', role: 'Offline Speech-to-Text' },
          { id: 'ollama', name: 'Local Ollama Daemon', available: snap.hasOllama, mode: 'local', role: 'Offline Local LLM Inference' },
        ],
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Provider probe failed' });
    }
  });

  app.get("/api/runtime/status", requireAuth(), async (_req, res) => {
    try {
      const snap = await buildLiveRuntimeSnapshot();
      const matrix = generateUniversalLanguageMatrix(snap);
      return res.json({
        success: true,
        status: "ONLINE",
        owner: ANNY_IDENTITY.owner,
        host: {
          platform: snap.platform,
          arch: snap.arch,
          cpuCores: snap.cpuCores,
          totalRamGb: Number((snap.totalRamBytes / 1024 ** 3).toFixed(2)),
          freeRamGb: Number((snap.freeRamBytes / 1024 ** 3).toFixed(2)),
          nodeVersion: process.version,
          uptimeSeconds: Math.round(os.uptime()),
        },
        providers: {
          gemini: snap.hasGemini,
          openai: snap.hasOpenAI,
          anthropic: snap.hasAnthropic,
          sahara: snap.hasSahara,
          localStt: snap.hasLocalStt,
          ollama: snap.hasOllama,
        },
        languages: matrix.summary,
        activatedLanguages: Array.from(activatedLanguages),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Runtime status failed' });
    }
  });

  app.get("/api/runtime/languages/matrix", requireAuth(), async (_req, res) => {
    try {
      const snap = await buildLiveRuntimeSnapshot();
      const matrix = generateUniversalLanguageMatrix(snap);
      return res.json({ success: true, ...matrix });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Matrix generation failed' });
    }
  });

  app.post("/api/runtime/languages/select-model", requireAuth(), async (req, res) => {
    try {
      const { language, task, dialect } = req.body || {};
      if (!language || !task) {
        return res.status(400).json({ success: false, error: "language and task are required" });
      }
      const snap = await buildLiveRuntimeSnapshot();
      const selection = selectOptimalLanguageModel({ language, task, dialect }, snap);
      return res.json({ success: true, selection });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Model selection failed' });
    }
  });

  app.post("/api/runtime/languages/pack", requireAuth(), async (req, res) => {
    try {
      const { language, tier } = req.body || {};
      if (!language) return res.status(400).json({ success: false, error: "language is required" });
      const snap = await buildLiveRuntimeSnapshot();
      const cleanTier = String(tier || 'SPEECH').toUpperCase();
      const sel = selectOptimalLanguageModel({ language, task: cleanTier === 'MINIMAL' ? 'LID' : 'ASR' }, snap);
      return res.json({
        success: true,
        pack: {
          language: sel.language,
          languageName: sel.languageName,
          tier: cleanTier,
          activated: activatedLanguages.has(sel.language),
          estimatedBytes: cleanTier === 'MINIMAL' ? 1_000_000 : cleanTier === 'FULL' ? 3_200_000_000 : sel.selectedModel.expectedSizeBytes,
          model: sel.selectedModel,
          provider: sel.recommendedProvider,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Language pack query failed' });
    }
  });

  app.post("/api/runtime/languages/activate", requireAuth(), async (req, res) => {
    try {
      const { language, tier } = req.body || {};
      if (!language) return res.status(400).json({ success: false, error: "language is required" });
      const code = String(language).trim().toLowerCase();
      activatedLanguages.add(code);
      return res.json({
        success: true,
        result: {
          language: code,
          tier: String(tier || 'SPEECH').toUpperCase(),
          status: 'ACTIVATED',
          activatedLanguages: Array.from(activatedLanguages),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Language activation failed' });
    }
  });

  app.post("/api/runtime/languages/lid", requireAuth(), (req, res) => {
    try {
      const { text } = req.body || {};
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ success: false, error: "text is required" });
      }
      const detection = analyzeLanguageWithCodeSwitching(text);
      return res.json({ success: true, detection });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'LID analysis failed' });
    }
  });

  app.post("/api/runtime/languages/translate", requireAuth(), async (req, res) => {
    try {
      const { text, sourceLanguage, targetLanguage } = req.body || {};
      if (!text || !sourceLanguage || !targetLanguage) {
        return res.status(400).json({
          success: false,
          error: "text, sourceLanguage, and targetLanguage are required",
        });
      }
      const protectedResult = extractProtectedTokens(String(text));
      const geminiKey = process.env.GEMINI_API_KEY?.trim();
      let translatedMasked = protectedResult.maskedText;
      let strategy = 'CODE_PRESERVING_DIRECT_NEURAL';

      if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const prompt = [
          `Translate the following text directly from ${sourceLanguage} to ${targetLanguage}.`,
          `CRITICAL RULES:`,
          `1. Keep EVERY placeholder token like __ANNY_TOKEN_0__, __ANNY_TOKEN_1__ completely unchanged and in its proper grammatical position.`,
          `2. Return ONLY the translated text without quotes, markdown fences, or explanations.`,
          ``,
          protectedResult.maskedText,
        ].join('\n');
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { temperature: 0.1 },
        });
        const candidate = (response.text || '').trim();
        if (candidate) {
          translatedMasked = candidate;
          strategy = 'GEMINI_DIRECT_NEURAL_TOKEN_SAFE';
        }
      } else {
        const llm = await aiProviderPlatform.chat(
          [
            {
              role: 'system',
              content: `Translate directly from ${sourceLanguage} to ${targetLanguage}. Preserve every __ANNY_TOKEN_N__ placeholder verbatim. Return ONLY the translation.`,
            },
            { role: 'user', content: protectedResult.maskedText },
          ],
          { temperature: 0.1, preserveStructured: true }
        );
        if (llm?.content?.trim()) {
          translatedMasked = llm.content.trim();
          strategy = `${String(llm.provider || 'AI').toUpperCase()}_DIRECT_TOKEN_SAFE`;
        } else {
          return res.status(503).json({
            success: false,
            error: 'No live neural translation provider is configured in server environment.',
          });
        }
      }

      const finalTranslation = protectedResult.restore(translatedMasked);
      return res.json({
        success: true,
        translation: {
          sourceLanguage,
          targetLanguage,
          originalText: String(text),
          translatedText: finalTranslation,
          translationStrategy: strategy,
          isDirect: true,
          preservedTokens: protectedResult.tokens,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Translation failed' });
    }
  });

  app.post("/api/runtime/certify-phase38", requireAuth(), async (_req, res) => {
    try {
      const snap = await buildLiveRuntimeSnapshot();
      const audit = runLivePhase38Certification(snap);
      return res.json({ success: true, ...audit });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Phase 38 certification failed' });
    }
  });

  // AIOS Control Plane Endpoints
  app.get("/api/anny/aios/capabilities", requireAuth(), async (_req, res) => {
    try {
      const snap = await buildLiveRuntimeSnapshot();
      const truthEntries = annyCapabilityTruthRegistry.getAll();
      const toolPerms = toolPermissionSystem.getAllTools ? toolPermissionSystem.getAllTools() : [];
      const capabilities = [
        { id: 'cap_web_app_builder', domain: 'engineering', action: 'synthesize_app', name: 'Full-Stack App & Website Builder', status: snap.hasGemini ? 'ACTIVE' : 'DEGRADED', permission: 'EXECUTE', provider: 'Gemini + VFS + Vite Preview' },
        { id: 'cap_universal_languages', domain: 'languages', action: 'translate_and_lid', name: 'Universal Language Intelligence (70 Languages)', status: 'ACTIVE', permission: 'EXECUTE', provider: 'LID + Code-Preserving Translation' },
        { id: 'cap_watchdog_security', domain: 'cybersecurity', action: 'scan_workspace', name: 'Watchdog Security & URL Inspector', status: 'ACTIVE', permission: 'EXECUTE', provider: 'Deterministic Scanner + SSRF Guard' },
        { id: 'cap_engineering_safety', domain: 'engineering', action: 'calculate_safety', name: 'Electrical, Solar, Robotics & Aerospace Safety Engine', status: 'ACTIVE', permission: 'EXECUTE', provider: 'Deterministic Physics & Code Standards' },
        { id: 'cap_creative_studio', domain: 'creative', action: 'generate_media', name: 'King Ken Creative Studio (Image, Audio, Video Plan)', status: snap.hasGemini ? 'ACTIVE' : 'PARTIAL', permission: 'EXECUTE', provider: 'CreativeGenerationService' },
        { id: 'cap_org_governance', domain: 'governance', action: 'resolve_context', name: 'Multi-Organization Operational Governance', status: 'ACTIVE', permission: 'EXECUTE', provider: 'AnnyOrganizationGovernanceLayer' },
        { id: 'cap_voice_notes', domain: 'voice', action: 'transcribe_audio', name: 'Voice Notes & Local/Cloud Speech Transcription', status: snap.hasLocalStt || snap.hasSahara ? 'ACTIVE' : 'BROWSER_ONLY', permission: 'EXECUTE', provider: 'LocalSttService / Sahara' },
      ];
      return res.json({
        success: true,
        capabilities,
        truthSummary: annyCapabilityTruthRegistry.getStats(),
        truthEntriesCount: truthEntries.length,
        registeredToolsCount: Array.isArray(toolPerms) ? toolPerms.length : 0,
        stats: {
          totalCapabilities: capabilities.length,
          activeCapabilities: capabilities.filter((c) => c.status === 'ACTIVE').length,
          totalExecutions: aiosAuditTrail.length,
        },
        auditTrail: aiosAuditTrail.slice(0, 25),
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || 'Failed to load AIOS capabilities' });
    }
  });

  app.post("/api/anny/aios/execute", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const { domain, action, parameters, userConfirmed } = req.body || {};
      if (!domain || !action) {
        return res.status(400).json({ success: false, error: 'domain and action are required' });
      }
      const callerId = req.authUser?.uid || 'authenticated_user';
      const promptForContext = String(parameters?.prompt || `${domain} ${action}`);
      const orgExec = AnnyOrganizationExecutionController.executeAction(promptForContext, {
        userAuthorized: Boolean(userConfirmed),
      });
      const entry = {
        id: `aios_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: new Date().toISOString(),
        domain: String(domain),
        action: String(action),
        callerId,
        status: orgExec.success ? 'COMPLETED' : 'PENDING_AUTHORIZATION',
        summary: orgExec.success
          ? `Executed ${domain}.${action} under ${orgExec.context.executingOrganization || 'akinwumi_group'}`
          : orgExec.actionOutput,
      };
      aiosAuditTrail.unshift(entry);
      if (aiosAuditTrail.length > 100) aiosAuditTrail.length = 100;

      return res.json({
        success: orgExec.success,
        execution: entry,
        organizationContext: orgExec.context,
        output: orgExec.actionOutput,
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || 'AIOS execution failed' });
    }
  });

  app.get("/api/anny/aios/apps", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const persistedProjects = await projectPersistenceService.listProjects(uid, isAdmin).catch(() => []);
      const coreApps = [
        { id: 'app_anny_builder', name: 'ANNY Full-Stack Builder', publisher: 'Akinwumi Group', category: 'Engineering', status: 'ACTIVE', route: 'chats' },
        { id: 'app_king_ken_studios', name: 'King Ken Creative Studios', publisher: 'King Ken Studios', category: 'Creative Media', status: 'ACTIVE', route: 'creative-studio' },
        { id: 'app_universal_languages', name: 'Universal Language Studio (70 Languages)', publisher: 'Akinwumi Group', category: 'Linguistics', status: 'ACTIVE', route: 'languages' },
        { id: 'app_watchdog_security', name: 'Watchdog Cybersecurity Command', publisher: 'Cybersecurity', category: 'Security', status: 'ACTIVE', route: 'watchdog' },
        { id: 'app_engineering_safety', name: 'Engineering & Industrial Safety Suite', publisher: 'Mechatronics', category: 'Industrial', status: 'ACTIVE', route: 'engineering-safety' },
        { id: 'app_media_architecture', name: 'Architecture & Broadcast Studio', publisher: 'King Ken Studios', category: 'Architecture & Media', status: 'ACTIVE', route: 'media-arch-studio' },
      ];
      const userProjectApps = (persistedProjects || []).slice(0, 20).map((p: any) => ({
        id: p.projectId,
        name: p.name || p.projectId,
        publisher: ANNY_IDENTITY.owner,
        category: p.projectType || 'Generated App',
        status: 'DEPLOYED_IN_VFS',
        version: p.version || 1,
        updatedAt: p.updatedAt,
      }));
      return res.json({
        success: true,
        apps: [...coreApps, ...userProjectApps],
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || 'Failed to list AIOS apps' });
    }
  });

  // Multi-Tenant Organization Governance Endpoints
  app.get("/api/anny/orgs", requireAuth(), (_req, res) => {
    try {
      return res.json({
        success: true,
        organizations: annyOrganizationGovernance.listCanonicalRecords(),
        relationships: annyOrganizationGovernance.listAllRelationships(),
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || 'Failed to load organizations' });
    }
  });

  app.post("/api/anny/orgs/register", requireAuth(), (req: AuthenticatedRequest, res) => {
    try {
      const { orgId, canonicalName, identityRole, primaryIndustry, domains, aliases } = req.body || {};
      const result = annyOrganizationGovernance.registerOrganization(
        String(orgId || ''),
        String(canonicalName || ''),
        String(identityRole || 'Registered Tenant Organization'),
        String(primaryIndustry || 'Technology'),
        Array.isArray(domains) ? domains.map(String) : [],
        Array.isArray(aliases) ? aliases.map(String) : [],
        {
          identitySource: 'AUTHENTICATED_WORKSPACE_ADMIN',
          identityConfidence: 1.0,
          verifiedAt: new Date().toISOString(),
          verifiedBy: req.authUser?.email || req.authUser?.uid || 'AKINWUMI_GROUP',
        }
      );
      if (!result.valid) {
        return res.status(409).json({
          success: false,
          error: result.reason || 'Organization registration rejected by governance policy.',
          errorCode: result.errorCode,
        });
      }
      return res.json({
        success: true,
        organization: annyOrganizationGovernance.getCanonicalRecord(
          String(orgId).toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '_')
        ),
        organizations: annyOrganizationGovernance.listCanonicalRecords(),
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || 'Organization registration failed' });
    }
  });

  app.post("/api/anny/orgs/resolve-context", requireAuth(), (req, res) => {
    try {
      const { prompt, userAuthorized } = req.body || {};
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: 'prompt is required' });
      }
      const execution = AnnyOrganizationExecutionController.executeAction(prompt, {
        userAuthorized: Boolean(userAuthorized),
      });
      return res.json({
        success: true,
        execution,
      });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e?.message || 'Context resolution failed' });
    }
  });

  // Collective Learning & Memory Sync Endpoints
  app.get("/api/anny/learning/knowledge", requireAuth(), (_req, res) => {
    try {
      const memStats = memoryEngine.getSummaryStats();
      const totalRecords =
        memStats.workingMemoryCount +
        memStats.sessionMemoryCount +
        memStats.projectMemoryCount +
        memStats.longTermCount +
        memStats.keywordIndexChunks;
      return res.json({
        success: true,
        knowledge: [
          { id: 'working', tier: 'Working Memory', count: memStats.workingMemoryCount },
          { id: 'session', tier: 'Session Memory', count: memStats.sessionMemoryCount },
          { id: 'project', tier: 'Project Memory', count: memStats.projectMemoryCount },
          { id: 'long_term', tier: 'Long-Term Memory', count: memStats.longTermCount },
          { id: 'rag_index', tier: 'BM25 / RAG Chunks', count: memStats.keywordIndexChunks },
        ],
        stats: {
          ...memStats,
          totalRecords,
          owner: ANNY_IDENTITY.owner,
          lastCheckedAt: new Date().toISOString(),
        },
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || 'Failed to read learning knowledge' });
    }
  });

  app.get("/api/anny/learning/events", requireAuth(), (_req, res) => {
    return res.json({
      success: true,
      queuedEvents: aiosAuditTrail.slice(0, 25),
      stats: {
        queuedCount: aiosAuditTrail.length,
        syncMode: 'LIVE_REALTIME',
      },
    });
  });

  app.post("/api/anny/learning/sync", requireAuth(), (_req, res) => {
    try {
      const memStats = memoryEngine.getSummaryStats();
      const syncedRecords =
        memStats.workingMemoryCount +
        memStats.sessionMemoryCount +
        memStats.projectMemoryCount +
        memStats.longTermCount +
        memStats.keywordIndexChunks;
      return res.json({
        success: true,
        syncResult: {
          syncedRecords,
          breakdown: memStats,
          status: 'SYNCHRONIZED',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || 'Sync failed' });
    }
  });

  // Sovereign Instance Identity & Trust Endpoint
  app.get("/api/anny/identity", requireAuth(), (_req, res) => {
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${ANNY_IDENTITY.owner}:${os.hostname()}:${os.platform()}:${os.arch()}`)
      .digest('hex')
      .slice(0, 24);
    return res.json({
      success: true,
      identity: {
        ...ANNY_IDENTITY,
        instanceId: `anny_${fingerprint}`,
        hostname: os.hostname(),
        runtime: `Node ${process.version} (${os.platform()}/${os.arch()})`,
        verifiedAt: new Date().toISOString(),
      },
      peers: [
        {
          id: 'primary-host',
          name: 'ANNY Primary Cloud/Local Host',
          status: 'ONLINE',
          trustLevel: 'SOVEREIGN_OWNER',
        },
      ],
    });
  });

  // Portable Runtime Contract Status Endpoint
  app.get("/api/anny/portable/status", requireAuth(), async (_req, res) => {
    try {
      const snap = await buildLiveRuntimeSnapshot();
      const totalGb = Number((snap.totalRamBytes / 1024 ** 3).toFixed(2));
      const freeGb = Number((snap.freeRamBytes / 1024 ** 3).toFixed(2));
      const currentProfile = {
        id: `host_${snap.platform}_${snap.arch}`,
        platform: snap.platform,
        arch: snap.arch,
        cpuCores: snap.cpuCores,
        totalRamGb: totalGb,
        freeRamGb: freeGb,
        nodeVersion: process.version,
        capabilities: {
          cloudAI: snap.hasGemini || snap.hasOpenAI || snap.hasAnthropic,
          localOllama: snap.hasOllama,
          localStt: snap.hasLocalStt,
          saharaSpeech: snap.hasSahara,
        },
      };
      return res.json({
        success: true,
        currentPlatform: `${snap.platform}/${snap.arch}`,
        currentProfile,
        allProfiles: [
          currentProfile,
          { id: 'web_browser_pwa', platform: 'browser', arch: 'wasm', description: 'Interactive Client VFS & WebSpeech Studio', active: true },
          { id: 'desktop_sovereign_node', platform: 'linux/win32/darwin', arch: 'x64/arm64', description: 'Full-Stack Node + Ollama + Local Whisper Host', active: snap.hasOllama || snap.hasLocalStt },
        ],
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || 'Portable status failed' });
    }
  });

  // Master Reality Suite Endpoint (Live System Verification)
  app.get("/api/anny/master-reality-suite", requireAuth(), async (_req, res) => {
    try {
      const snap = await buildLiveRuntimeSnapshot();
      const langAudit = runLivePhase38Certification(snap);
      const { annyAcceptanceTestSuite } = await import('./src/core/annyAcceptanceTestSuite.ts');
      const acceptance = await annyAcceptanceTestSuite.runSuite().catch((err: any) => ({
        error: err?.message || 'Acceptance suite unavailable',
        results: [],
      }));
      const orgs = annyOrganizationGovernance.listCanonicalRecords();
      const truthStats = annyCapabilityTruthRegistry.getStats();

      return res.json({
        success: true,
        report: {
          owner: ANNY_IDENTITY.owner,
          timestamp: new Date().toISOString(),
          runtime: {
            platform: `${snap.platform}/${snap.arch}`,
            cpuCores: snap.cpuCores,
            totalRamGb: Number((snap.totalRamBytes / 1024 ** 3).toFixed(2)),
            providersOnline: [
              snap.hasGemini && 'Gemini',
              snap.hasOpenAI && 'OpenAI',
              snap.hasAnthropic && 'Anthropic',
              snap.hasSahara && 'Sahara',
              snap.hasOllama && 'Ollama',
              snap.hasLocalStt && 'LocalSTT',
            ].filter(Boolean),
          },
          languageCertification: langAudit.summary,
          organizationGovernance: {
            canonicalOrganizations: orgs.length,
            relationships: annyOrganizationGovernance.listAllRelationships().length,
            forbiddenMergeProtection: 'ENFORCED',
          },
          capabilityTruth: truthStats,
          acceptanceSuite: acceptance,
        },
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || 'Master reality suite failed' });
    }
  });

  // Online Brain Proxy — Centralized Anny Chat Endpoint
  const geminiCooldownMap = new Map<string, number>();

  app.post("/api/brain/think", requireAuth(), async (req, res) => {
    const { prompt, api, model, temperature, systemPrompt, isSaharaMode, history, images, webSearch } = req.body;

    const extractGroundingSources = (result: any): Array<{ title: string; url: string }> => {
      const rawChunks = result?.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (!Array.isArray(rawChunks)) return [];
      const seen = new Set<string>();
      const sources: Array<{ title: string; url: string }> = [];
      for (const chunk of rawChunks) {
        const uri = chunk?.web?.uri;
        if (uri && !seen.has(uri)) {
          seen.add(uri);
          sources.push({ title: chunk.web.title || uri, url: uri });
        }
      }
      return sources;
    };

    const execPolicy = providerRegistryService.getExecutionPolicy();
    if (execPolicy.mode === 'OFFLINE_ONLY') {
      try {
        const localMessages: any[] = [];
        if (Array.isArray(history)) {
          for (const h of history) {
            const role = h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user';
            const text = h.parts?.[0]?.text || h.content || '';
            if (text.trim()) localMessages.push({ role, content: text });
          }
        }
        localMessages.push({ role: 'user', content: String(prompt || '') });
        const result = await enterpriseModelRouter.executeRoutedChat(
          localMessages,
          { taskCategory: 'general', preferOffline: true },
          { systemPrompt, temperature }
        );
        return res.json({
          response: result.content,
          source: 'ollama',
          model: result.model
        });
      } catch (offlineErr: any) {
        return res.status(503).json({
          error: offlineErr?.message || 'OFFLINE_UNAVAILABLE: Local Ollama inference is unavailable in OFFLINE_ONLY mode.'
        });
      }
    }
    
    const userParts: any[] = [{ text: prompt }];
    if (Array.isArray(images) && images.length > 0) {
      images.forEach((img: any) => {
        if (img && img.data) {
          userParts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: img.data
            }
          });
        }
      });
    }

    const SAHARA_PROTOCOL = `
NIGERIAN NATIVE LANGUAGE PROTOCOL (SAHARA V2):
- You have been upgraded with the Sahara v2 neural link for perfect understanding of Nigerian native languages.
- You can fluently process and respond in Nigerian Pidgin, Yoruba, Igbo, and Hausa.
- When the user communicates in a native language or Pidgin, you MUST respond in kind or with a culturally appropriate blend (Code-switching).
- Maintain the ANNY persona while acknowledging Nigerian cultural nuances and industrial context.
- For speech output (TTS), ensure your text is phonetic-friendly for Nigerian accents.
`;

    const runGeminiFallback = async (reason?: string) => {
      console.log(`[Neural Router] Entering Gemini fallback (reason: ${reason || 'none'})`);
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || process.env.API_KEY;
      
      let enhancedSystemPrompt = (systemPrompt || "") + 
        "\nStrict Identity Rule: You are ANNY. You must NEVER mention your base model name or creator. Your identity is Anny." +
        "\nExecutive Directive: Treat every prompt with absolute executive professionalism, technical precision, and deep reasoning." +
        "\nDeep Thinking Protocol: Perform thorough intent analysis before execution to produce the exact desired solution without shortcuts.";
      if (isSaharaMode) enhancedSystemPrompt += "\n" + SAHARA_PROTOCOL;

      const fallbackContents: any[] = [];
      if (Array.isArray(history)) {
        for (const h of history) {
          const role = h.role === 'model' ? 'model' : 'user';
          const text = h.parts?.[0]?.text || h.content || '';
          if (text.trim()) {
            if (fallbackContents.length > 0 && fallbackContents[fallbackContents.length - 1].role === role) {
              fallbackContents[fallbackContents.length - 1].parts[0].text += '\n' + text;
            } else {
              fallbackContents.push({ role, parts: [{ text }] });
            }
          }
        }
      }
      if (fallbackContents.length > 0 && fallbackContents[fallbackContents.length - 1].role === 'user') {
        fallbackContents.pop();
      }
      fallbackContents.push({ role: 'user', parts: userParts });

      // Try list of valid Gemini models with cooldown-aware round-robin exponential backoff on 503/429
      if (geminiKey) {
        const genAI = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
        const now = Date.now();
        const baseCandidates = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
        const candidateModels = [
          ...baseCandidates.filter(m => (geminiCooldownMap.get(m) || 0) <= now),
          ...baseCandidates.filter(m => (geminiCooldownMap.get(m) || 0) > now)
        ];
        const retryDelays = [900, 2200];

        for (let round = 0; round <= retryDelays.length; round++) {
          if (round > 0) {
            const waitMs = retryDelays[round - 1] + Math.floor(Math.random() * 350);
            console.warn(`[Neural Router] Gemini fallback round ${round + 1}/${retryDelays.length + 1} waiting ${waitMs}ms...`);
            await new Promise(r => setTimeout(r, waitMs));
          }
          let hadTransient = false;
          for (const mName of candidateModels) {
            try {
              const result: any = await genAI.models.generateContent({
                model: mName,
                contents: fallbackContents,
                config: {
                  systemInstruction: enhancedSystemPrompt,
                  ...(webSearch ? { tools: [{ googleSearch: {} }] } : {})
                }
              });
              if (result && result.text) {
                geminiCooldownMap.delete(mName);
                let responseText = result.text.replace(/\b(Google|Gemini|Mistral|Llama|GPT|OpenAI|Meta|Groq|Phi|Zephyr|Claude|Anthropic|DuckDuckGo)\b/gi, "ANNY");
                const sources = extractGroundingSources(result);
                return {
                  response: responseText,
                  source: "google-fallback",
                  model: `${mName} (Neural Fallback)`,
                  ...(sources.length > 0 ? { sources } : {})
                };
              }
            } catch (mErr: any) {
              const msg = String(mErr?.message || '').toLowerCase();
              const is503 = mErr?.status === 503 || msg.includes('503') || msg.includes('unavailable') || msg.includes('high demand');
              const is429 = mErr?.status === 429 || msg.includes('429') || msg.includes('resource_exhausted');
              if (is503 || is429) {
                hadTransient = true;
                geminiCooldownMap.set(mName, Date.now() + 60000);
                console.warn(`[Neural Router] Gemini fallback model ${mName} ${is503 ? 'experiencing high demand (503)' : 'rate limited (429)'}. Switching to next candidate...`);
              } else {
                console.warn(`[Neural Router] Gemini fallback model ${mName} error:`, mErr?.message || mErr);
              }
            }
          }
          if (!hadTransient) break;
        }
      } else {
        console.warn("[Neural Router] No GEMINI_API_KEY or GOOGLE_AI_STUDIO_KEY found in environment!");
      }

      // Try Groq as secondary neural provider if available
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        try {
          console.log(`[Neural Router] Trying Groq fallback with llama-3.3-70b-versatile...`);
          const groqFallbackMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            { role: "system", content: enhancedSystemPrompt }
          ];
          if (Array.isArray(history)) {
            for (const h of history) {
              const role = h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user';
              const text = h.parts?.[0]?.text || h.content || '';
              if (typeof text === 'string' && text.trim()) {
                if (groqFallbackMessages.length > 1 && groqFallbackMessages[groqFallbackMessages.length - 1].role === role) {
                  groqFallbackMessages[groqFallbackMessages.length - 1].content += '\n' + text;
                } else {
                  groqFallbackMessages.push({ role, content: text });
                }
              }
            }
          }
          if (groqFallbackMessages.length > 1 && groqFallbackMessages[groqFallbackMessages.length - 1].role === 'user') {
            groqFallbackMessages.pop();
          }
          const hasInlineImages = Array.isArray(userParts) && userParts.some((p: any) => Boolean(p?.inlineData));
          const finalPromptText = hasInlineImages
            ? `[Note: Attached images cannot be inspected directly by Groq text-only fallback.]\n${String(prompt || '')}`
            : String(prompt || '');
          groqFallbackMessages.push({ role: "user", content: finalPromptText });

          const groqRes = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: groqFallbackMessages,
            temperature: temperature || 0.7
          }, {
            headers: { Authorization: `Bearer ${groqKey}` },
            timeout: 20000
          });
          let content = groqRes.data?.choices?.[0]?.message?.content;
          if (typeof content !== 'string' || !content.trim()) {
            throw new Error('Groq fallback returned an empty completion.');
          }
          content = content.replace(/\b(Llama|Meta|Groq|OpenAI|GPT|Mistral|Zephyr|Phi|Google|Gemini)\b/gi, "ANNY");
          return { response: content, source: "groq-fallback", model: "llama-3.3-70b-versatile" };
        } catch (groqErr: any) {
          console.warn(`[Neural Router] Groq fallback failed:`, groqErr.message);
        }
      }

      // Try local Ollama model before failing honestly if cloud providers are unavailable
      try {
        const ollamaDiscovery = ollamaDiscoveryService.getLastDiscovery();
        if (ollamaDiscovery?.reachable && ollamaDiscovery.discoveredModels.length > 0) {
          const localResult = await enterpriseModelRouter.executeRoutedChat(
            [{ role: 'user', content: String(prompt || '') }],
            { taskCategory: 'general', preferOffline: true },
            { systemPrompt: enhancedSystemPrompt, temperature }
          );
          if (localResult?.content) {
            return {
              response: localResult.content,
              source: "ollama-local",
              model: localResult.model
            };
          }
        }
      } catch (localErr: any) {
        console.warn("[Neural Router] Local Ollama fallback unavailable:", localErr?.message || localErr);
      }

      // Never return a fabricated or simulated model response when no provider is available.
      throw new Error(
        "PROVIDER_UNAVAILABLE: No configured cloud AI provider (GEMINI_API_KEY / GROQ_API_KEY) or reachable local Ollama model is currently available."
      );
    };

    try {
      if (api === "groq") {
        const key = process.env.GROQ_API_KEY;
        if (!key) {
          console.warn("[Neural Router] GROQ_API_KEY missing, routing to Gemini fallback...");
          const fallbackRes = await runGeminiFallback("GROQ_API_KEY missing");
          return res.json(fallbackRes);
        }
        const groqModel = model || "llama-3.3-70b-versatile";
        
        let enhancedSystemPrompt = (systemPrompt || "") + "\nStrict Identity Rule: You are ANNY. Never mention your creators or base model names.";
        if (isSaharaMode) enhancedSystemPrompt += "\n" + SAHARA_PROTOCOL;

        const groqMessages: { role: string; content: string }[] = [
          { role: "system", content: enhancedSystemPrompt }
        ];

        if (Array.isArray(history)) {
          for (const h of history) {
            const role = h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user';
            const text = h.parts?.[0]?.text || h.content || '';
            if (text.trim()) {
              if (groqMessages.length > 0 && groqMessages[groqMessages.length - 1].role === role) {
                groqMessages[groqMessages.length - 1].content += "\n" + text;
              } else {
                groqMessages.push({ role, content: text });
              }
            }
          }
        }
        if (groqMessages.length > 0 && groqMessages[groqMessages.length - 1].role === 'user') {
          groqMessages.pop();
        }
        groqMessages.push({ role: "user", content: prompt });

        try {
          const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: groqModel,
            messages: groqMessages,
            temperature: temperature || 0.7
          }, {
            headers: { Authorization: `Bearer ${key}` },
            timeout: 25000
          });
          
          let content = response.data?.choices?.[0]?.message?.content;
          if (typeof content !== 'string' || !content.trim()) {
            throw new Error('Groq returned an empty completion.');
          }
          content = content.replace(/\b(Llama|Meta|Groq|OpenAI|GPT|Mistral|Zephyr|Phi|Google|Gemini)\b/gi, "ANNY");

          return res.json({ response: formatNaturalConversation(content), source: "groq", model: groqModel });
        } catch (groqError: any) {
          console.warn("[Neural Router] Groq request failed, routing to Gemini fallback...", groqError.message);
          const fallbackRes = await runGeminiFallback(`Groq error: ${groqError.message}`);
          return res.json(fallbackRes);
        }
      }
      
      if (api === "google" || api === "gemini") {
        const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || process.env.API_KEY;
        if (!key) {
          console.warn("[Neural Router] Gemini API key missing, routing to Gemini fallback...");
          const fallbackRes = await runGeminiFallback("GEMINI_API_KEY missing");
          return res.json(fallbackRes);
        }
        
        const genAI = new GoogleGenAI({
          apiKey: key,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
        let rawModel = String(model || 'gemini-4-hydrogen');
        let googleModel = rawModel;
        if (
          rawModel.includes('1.') ||
          rawModel.includes('2.') ||
          rawModel.includes('3.5') ||
          rawModel.includes('3.6') ||
          rawModel.includes('3.7') ||
          rawModel.includes('3.8') ||
          rawModel === 'gemini' ||
          rawModel === 'gemini-pro'
        ) {
          googleModel = 'gemini-4-hydrogen';
        }
        
        try {
          let enhancedSystemPrompt = (systemPrompt || "") + "\nStrict Identity Rule: You are ANNY. You must NEVER mention your base model name or creator. Your identity is Anny.";
          if (isSaharaMode) enhancedSystemPrompt += "\n" + SAHARA_PROTOCOL;

          const googleContents: any[] = [];
          if (Array.isArray(history)) {
            for (const h of history) {
              const role = h.role === 'model' ? 'model' : 'user';
              const text = h.parts?.[0]?.text || h.content || '';
              if (text.trim()) {
                if (googleContents.length > 0 && googleContents[googleContents.length - 1].role === role) {
                  googleContents[googleContents.length - 1].parts[0].text += '\n' + text;
                } else {
                  googleContents.push({ role, parts: [{ text }] });
                }
              }
            }
          }
          if (googleContents.length > 0 && googleContents[googleContents.length - 1].role === 'user') {
            googleContents.pop();
          }
          googleContents.push({ role: 'user', parts: userParts });

          const nowTs = Date.now();
          const rawCandidates = [...new Set([googleModel, 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'])];
          const uniqueModels = [
            ...rawCandidates.filter(m => (geminiCooldownMap.get(m) || 0) <= nowTs),
            ...rawCandidates.filter(m => (geminiCooldownMap.get(m) || 0) > nowTs)
          ];

          let resultText = '';
          let modelUsed = googleModel;
          let googleSources: Array<{ title: string; url: string }> = [];
          const retryDelays = [900, 2200];

          for (let round = 0; round <= retryDelays.length; round++) {
            if (round > 0) {
              const waitMs = retryDelays[round - 1] + Math.floor(Math.random() * 350);
              console.warn(`[Neural Router] Gemini primary retry round ${round + 1}/${retryDelays.length + 1} waiting ${waitMs}ms...`);
              await new Promise(r => setTimeout(r, waitMs));
            }
            let hadTransient = false;
            for (const mName of uniqueModels) {
              try {
                const result: any = await genAI.models.generateContent({
                  model: mName,
                  contents: googleContents,
                  config: {
                    systemInstruction: enhancedSystemPrompt,
                    ...(webSearch ? { tools: [{ googleSearch: {} }] } : {})
                  }
                });
                if (result && result.text) {
                  geminiCooldownMap.delete(mName);
                  resultText = result.text;
                  modelUsed = mName;
                  googleSources = extractGroundingSources(result);
                  break;
                }
              } catch (err: any) {
                const msg = String(err?.message || '').toLowerCase();
                const is503 = err?.status === 503 || msg.includes('503') || msg.includes('unavailable') || msg.includes('high demand');
                const is429 = err?.status === 429 || msg.includes('429') || msg.includes('resource_exhausted');
                if (is503 || is429) {
                  hadTransient = true;
                  geminiCooldownMap.set(mName, Date.now() + 60000);
                  console.warn(`[Neural Router] Google model ${mName} ${is503 ? 'experiencing high demand (503)' : 'rate limited (429)'}. Switching to next candidate...`);
                } else {
                  console.warn(`[Neural Router] Google model ${mName} error:`, err?.message || err);
                }
              }
            }
            if (resultText || !hadTransient) break;
          }

          if (!resultText) {
            console.warn("[Neural Router] All primary Google candidate models failed, retrying fallback...");
            const fallbackRes = await runGeminiFallback("Primary candidates failed");
            return res.json(fallbackRes);
          }
          
          let responseText = resultText.replace(/\b(Google|Gemini|Mistral|Llama|GPT|OpenAI|Meta|Groq|Phi|Zephyr)\b/gi, "ANNY");
          const preserveStructured = Boolean(req.body?.preserveStructured);

          return res.json({
            response: preserveStructured ? responseText : formatNaturalConversation(responseText),
            source: "google",
            model: modelUsed,
            ...(googleSources.length > 0 ? { sources: googleSources } : {})
          });
        } catch (googleError: any) {
          console.warn("[Neural Router] Primary Google model error, retrying fallback...", googleError.message);
          const fallbackRes = await runGeminiFallback(`Google error: ${googleError.message}`);
          return res.json(fallbackRes);
        }
      }

      if (api === "huggingface") {
        const key = process.env.HUGGINGFACE_API_KEY;
        if (!key) {
          console.warn("[Neural Router] HUGGINGFACE_API_KEY missing, routing to Gemini fallback...");
          const fallbackRes = await runGeminiFallback("HUGGINGFACE_API_KEY missing");
          return res.json(fallbackRes);
        }
        
        const hfModel = model || "HuggingFaceH4/zephyr-7b-beta"; 
        
        try {
          let enhancedSystemPrompt = (systemPrompt || "") + "\nStrict Identity Rule: You are ANNY. You must NEVER mention your base model name or creator. Your identity is Anny.";
          if (isSaharaMode) enhancedSystemPrompt += "\n" + SAHARA_PROTOCOL;

          let hfInput = `<|system|>\n${enhancedSystemPrompt}</s>\n`;
          if (Array.isArray(history)) {
            for (const h of history) {
              const role = h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user';
              const text = h.parts?.[0]?.text || h.content || '';
              if (text.trim()) {
                hfInput += `<|${role}|>\n${text}</s>\n`;
              }
            }
          }
          hfInput += `<|user|>\n${prompt}</s>\n<|assistant|>`;

          const response = await axios.post(`https://api-inference.huggingface.co/models/${hfModel}`, {
            inputs: hfInput,
            parameters: { max_new_tokens: 500, return_full_text: false },
            options: { wait_for_model: true }
          }, {
            headers: { 
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json"
            },
            timeout: 20000
          });
          
          let generatedText = "";
          if (Array.isArray(response.data)) {
            generatedText = response.data[0].generated_text || response.data[0].translation_text || JSON.stringify(response.data[0]);
          } else if (response.data.generated_text) {
            generatedText = response.data.generated_text;
          } else {
            generatedText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          }
          
          generatedText = generatedText.replace(/\b(Mistral|HuggingFace|Zephyr|Llama|GPT|OpenAI|Meta|Groq|Phi|Google|Gemini)\b/gi, "ANNY");
          
          return res.json({ 
            response: formatNaturalConversation(generatedText), 
            source: "huggingface", 
            model: hfModel 
          });
        } catch (hfError: any) {
          console.warn("[Neural Router] Hugging Face path failed, routing to Gemini fallback...", hfError.message);
          const fallbackRes = await runGeminiFallback(`HF error: ${hfError.message}`);
          return res.json(fallbackRes);
        }
      }

      if (api === "claude") {
        if (!process.env.ANTHROPIC_API_KEY) {
          console.warn("[Neural Router] Claude requested but ANTHROPIC_API_KEY is not set — routing to Gemini fallback (no unauthorized/free workaround is used).");
          const fallbackRes = await runGeminiFallback("ANTHROPIC_API_KEY not configured");
          return res.json(fallbackRes);
        }
        try {
          const result = await aiProviderPlatform.chat(
            Array.isArray(history) ? [...history.map((h: any) => ({ role: h.role === 'model' ? 'assistant' : (h.role || 'user'), content: h.parts?.[0]?.text || h.content || '' })), { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }],
            { systemPrompt },
            'anthropic'
          );
          return res.json({
            response: formatNaturalConversation(result.content),
            source: "anthropic",
            model: result.model
          });
        } catch (anthropicError: any) {
          console.warn("[Neural Router] Anthropic call failed, routing to Gemini fallback...", anthropicError.message);
          const fallbackRes = await runGeminiFallback(`Anthropic error: ${anthropicError.message}`);
          return res.json(fallbackRes);
        }
      }

      // Default route to Gemini if api is unrecognized
      const fallbackRes = await runGeminiFallback("Default fallback");
      return res.json(fallbackRes);
    } catch (error: any) {
      const msg = String(error?.message || 'Neural provider unavailable');
      const status = msg.includes('PROVIDER_UNAVAILABLE') ? 503 : 500;
      console.error("Brain Error:", msg);
      res.status(status).json({ error: msg, fallback: false });
    }
  });

  // Stripe Integration (Skeleton - Authenticated)
  app.post("/api/create-subscription", requireAuth(), async (_req, res) => {
    res.status(501).json({ error: "Stripe integration skeleton - requires key configuration." });
  });

  // Neural Web Uplink (Authenticated + Full SSRF & redirect hop validation)
  app.post("/api/brain/uplink", requireAuth(), async (req, res) => {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') return res.status(400).json({ error: "Source URL missing" });

    try {
      const { response, finalUrl } = await safePublicFetch(url, {
        timeoutMs: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Anny/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });

      const $ = cheerio.load(String(response.data || ''));
      $('script, style, nav, footer, header, ads, iframe').remove();
      const title = $('title').text() || $('h1').first().text();
      const metaDesc = $('meta[name="description"]').attr('content') || "";
      let content = $('main, article, #content, .content, .main').text().trim();
      if (!content || content.length < 500) {
        content = $('body').text().trim();
      }
      const cleanContent = content.replace(/\s+/g, ' ').substring(0, 15000);

      res.json({
        success: true,
        data: {
          title: title.trim(),
          description: metaDesc.trim(),
          content: cleanContent,
          url: finalUrl
        }
      });
    } catch (err: any) {
      const msg = String(err?.message || 'Unable to reach URL');
      const isBlocked = /blocked|private|credentials|only http|invalid url|redirects/i.test(msg);
      console.error(`[Neural Web Uplink] Uplink rejected: ${msg}`);
      res.status(isBlocked ? 403 : 400).json({ error: `Neural link to domain rejected: ${msg}` });
    }
  });

  // ---------------------------------------------------------------------
  // Modly 3D Generation — real local image-to-3D via the bundled Modly
  // FastAPI backend (modly-main/api), which must be running separately
  // (see README: "3D Model Generation"). No fabricated/simulated results:
  // if neither the local engine nor a cloud key is available, we return
  // an honest 503 rather than invent a model.
  // ---------------------------------------------------------------------
  const MODLY_LOCAL_URL = process.env.MODLY_LOCAL_URL || "http://127.0.0.1:8765";

  app.get("/api/modly/health", async (_req, res) => {
    try {
      const r = await axios.get(`${MODLY_LOCAL_URL}/health`, { timeout: 2000 }).catch(() =>
        axios.get(`${MODLY_LOCAL_URL}/docs`, { timeout: 2000 })
      );
      res.json({ available: r.status < 400, engine: "local", url: MODLY_LOCAL_URL });
    } catch {
      res.json({
        available: false,
        engine: "local",
        url: MODLY_LOCAL_URL,
        hint: "Local Modly 3D engine is not running. See README.md → '3D Model Generation' to start it (requires Python + GPU).",
      });
    }
  });

  // Real local generation: image -> 3D mesh (Authenticated)
  app.post("/api/modly/generate", requireAuth(), modlyUpload.single("image"), async (req, res) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    const { model_id, collection, remesh, enable_texture, texture_resolution, params } = req.body || {};

    if (file) {
      try {
        const form = new FormData();
        form.append("image", file.buffer, { filename: file.originalname, contentType: file.mimetype });
        if (model_id) form.append("model_id", model_id);
        if (collection) form.append("collection", collection);
        if (remesh) form.append("remesh", remesh);
        if (enable_texture !== undefined) form.append("enable_texture", String(enable_texture));
        if (texture_resolution) form.append("texture_resolution", String(texture_resolution));
        if (params) form.append("params", params);

        const response = await axios.post(`${MODLY_LOCAL_URL}/generate/from-image`, form, {
          headers: form.getHeaders(),
          timeout: 15000,
        });
        return res.json({ id: response.data.job_id, status: "pending", progress: 0, engine: "local" });
      } catch (err: any) {
        console.error("[Modly] Local engine request failed:", err.code || err.message);
        return res.status(503).json({
          error: "Local 3D generation engine unreachable.",
          hint: "Start it: cd modly-main/api && python -m uvicorn main:app --host 127.0.0.1 --port 8765 (see README).",
        });
      }
    }

    // No image provided — fall back to real cloud text-to-3D only if a genuine key is configured.
    const { prompt } = req.body || {};
    const modlyKey = process.env.MODLY_API_KEY || process.env.MESHY_API_KEY;
    if (!prompt) return res.status(400).json({ error: "Provide either an image file or a text prompt." });
    if (!modlyKey) {
      return res.status(503).json({
        error: "No 3D generation engine available.",
        hint: "Either run the local Modly engine (upload an image) or set MESHY_API_KEY for cloud text-to-3D.",
      });
    }

    try {
      const response = await axios.post(
        "https://api.meshy.ai/v1/text-to-3d",
        { prompt, mode: "preview" },
        { headers: { Authorization: `Bearer ${modlyKey}` } }
      );
      res.json({ ...response.data, engine: "meshy-cloud" });
    } catch (err: any) {
      console.error("[Modly] Cloud synthesis failed:", err.response?.data || err.message);
      res.status(502).json({ error: "Cloud 3D synthesis request failed." });
    }
  });

  app.get("/api/modly/status/:id", requireAuth(), async (req, res) => {
    const { id } = req.params;
    const engine = (req.query.engine as string) || "local";
    const modlyKey = process.env.MODLY_API_KEY || process.env.MESHY_API_KEY;

    if (engine === "meshy-cloud") {
      if (!modlyKey) return res.status(400).json({ error: "Modly key missing" });
      try {
        const response = await axios.get(`https://api.meshy.ai/v1/text-to-3d/${id}`, {
          headers: { Authorization: `Bearer ${modlyKey}` },
        });
        return res.json(response.data);
      } catch {
        return res.status(500).json({ error: "Modly status uplink failed." });
      }
    }

    try {
      const response = await axios.get(`${MODLY_LOCAL_URL}/generate/status/${id}`, { timeout: 5000 });
      const job = response.data; // { job_id, status, progress, step, output_url, error }
      return res.json({
        id: job.job_id,
        status: job.status === "done" ? "succeeded" : job.status === "error" ? "failed" : job.status,
        progress: job.progress,
        step: job.step,
        model_url: job.output_url ? `${MODLY_LOCAL_URL}${job.output_url}` : undefined,
        error: job.error,
        engine: "local",
      });
    } catch (err: any) {
      console.error("[Modly] Local status check failed:", err.code || err.message);
      return res.status(503).json({ error: "Local 3D generation engine unreachable." });
    }
  });


  // Phase 2-5 Domain Studio Endpoints (all strictly authenticated + input validated)
  app.post("/api/architecture/plan", requireAuth(), (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const validTypologies = new Set([
        'bungalow', 'duplex', 'detached_villa', 'mansion', 'apartment_block',
        'office_hub', 'retail_plaza', 'studio_broadcast', 'clinic', 'hospitality'
      ]);
      const typology = validTypologies.has(String(body.typology)) ? body.typology : 'duplex';
      const plan = generateArchitecturePlan({
        projectName: typeof body.projectName === 'string' ? body.projectName.slice(0, 120) : undefined,
        typology,
        climate: ['tropical_west_africa', 'temperate', 'arid'].includes(String(body.climate)) ? body.climate : 'tropical_west_africa',
        location: typeof body.location === 'string' ? body.location.slice(0, 120) : undefined,
        plotWidthM: typeof body.plotWidthM === 'number' ? body.plotWidthM : Number(body.plotWidthM) || undefined,
        plotDepthM: typeof body.plotDepthM === 'number' ? body.plotDepthM : Number(body.plotDepthM) || undefined,
        bedrooms: typeof body.bedrooms === 'number' ? body.bedrooms : Number(body.bedrooms) || undefined,
        floors: typeof body.floors === 'number' ? body.floors : Number(body.floors) || undefined,
      });
      res.json({ success: true, plan });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Invalid architecture plan input' });
    }
  });

  app.post("/api/broadcast/plan", requireAuth(), (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const liveEndpointUrl = process.env.BROADCAST_STREAM_URL || process.env.ICECAST_URL || '';
      const plan = generateBroadcastPlan({
        stationName: typeof body.stationName === 'string' ? body.stationName.slice(0, 120) : 'Anny Broadcast Network',
        medium: body.medium === 'radio' ? 'radio' : 'tv',
        format: typeof body.format === 'string' ? body.format.slice(0, 160) : undefined,
        tagline: typeof body.tagline === 'string' ? body.tagline.slice(0, 160) : undefined,
        timezone: typeof body.timezone === 'string' ? body.timezone.slice(0, 64) : undefined,
        liveEndpointUrl: liveEndpointUrl || undefined,
      });
      res.json({ success: true, plan });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Invalid broadcast plan request' });
    }
  });

  app.post("/api/distribution/validate-release", requireAuth(), (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const result = validateAndPrepareMusicRelease({
        artistName: typeof body.artistName === 'string' ? body.artistName.slice(0, 120) : '',
        releaseTitle: typeof body.releaseTitle === 'string' ? body.releaseTitle.slice(0, 140) : '',
        releaseType: ['Single', 'EP', 'Album'].includes(String(body.releaseType)) ? body.releaseType : 'Single',
        primaryGenre: typeof body.primaryGenre === 'string' ? body.primaryGenre.slice(0, 80) : 'Afrobeats',
        releaseDate: typeof body.releaseDate === 'string' ? body.releaseDate.slice(0, 32) : new Date().toISOString().slice(0, 10),
        upcOrEan: typeof body.upcOrEan === 'string' ? body.upcOrEan.slice(0, 32) : undefined,
        labelName: typeof body.labelName === 'string' ? body.labelName.slice(0, 120) : undefined,
        rightsOwner: typeof body.rightsOwner === 'string' ? body.rightsOwner.slice(0, 140) : '',
        artworkWidthPx: Number(body.artworkWidthPx) || 0,
        artworkHeightPx: Number(body.artworkHeightPx) || 0,
        tracks: Array.isArray(body.tracks) ? body.tracks.slice(0, 50) : [],
        royaltySplits: Array.isArray(body.royaltySplits) ? body.royaltySplits.slice(0, 30) : [],
        targetDsps: Array.isArray(body.targetDsps) ? body.targetDsps.slice(0, 20).map(String) : undefined,
      });
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Invalid music release payload' });
    }
  });

  app.post("/api/video-platform/abr-pipeline", requireAuth(), (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const pipeline = generateVideoStreamingPipeline({
        videoTitle: typeof body.videoTitle === 'string' ? body.videoTitle.slice(0, 140) : 'Platform Master Video',
        sourceFileName: typeof body.sourceFileName === 'string' ? body.sourceFileName.slice(0, 120) : undefined,
        transcriptText: typeof body.transcriptText === 'string' ? body.transcriptText.slice(0, 8000) : undefined,
        captionSegments: Array.isArray(body.captionSegments) ? body.captionSegments.slice(0, 200) : undefined,
      });
      res.json({ success: true, pipeline });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Invalid video streaming pipeline payload' });
    }
  });

  app.get("/api/studio/records", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const isAdmin = req.authUser!.isAdmin;
      const validKinds = new Set(['architecture', 'broadcast', 'music_release', 'video_pipeline']);
      const kindFilter = typeof req.query.kind === 'string' && validKinds.has(req.query.kind)
        ? req.query.kind
        : null;

      const records = await postgresPlatform.query<any>('studio_records', (r: any) =>
        (isAdmin || r.ownerUserId === uid) && (!kindFilter || r.kind === kindFilter)
      );
      records.sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      res.json({ success: true, records });
    } catch (err: any) {
      const msg = String(err?.message || 'Unable to load studio records');
      res.status(msg.includes('POSTGRES_NOT_CONFIGURED') ? 503 : 500).json({ success: false, error: msg });
    }
  });

  app.post("/api/studio/records", requireAuth(), async (req: AuthenticatedRequest, res) => {
    try {
      const uid = req.authUser!.uid;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const validKinds = new Set(['architecture', 'broadcast', 'music_release', 'video_pipeline']);
      const kind = typeof body.kind === 'string' && validKinds.has(body.kind) ? body.kind : null;
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 140) : '';
      const payload = body.payload;

      if (!kind) {
        return res.status(400).json({ success: false, error: 'INVALID_RECORD_KIND' });
      }
      if (!title) {
        return res.status(400).json({ success: false, error: 'MISSING_RECORD_TITLE' });
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return res.status(400).json({ success: false, error: 'INVALID_RECORD_PAYLOAD' });
      }
      const serializedSize = Buffer.byteLength(JSON.stringify(payload), 'utf8');
      if (serializedSize > 262144) {
        return res.status(413).json({ success: false, error: 'RECORD_PAYLOAD_TOO_LARGE' });
      }

      const record = await postgresPlatform.insert<any>('studio_records', {
        ownerUserId: uid,
        kind,
        title,
        payload,
      });
      res.json({ success: true, record });
    } catch (err: any) {
      const msg = String(err?.message || 'Unable to save studio record');
      res.status(msg.includes('POSTGRES_NOT_CONFIGURED') ? 503 : 500).json({ success: false, error: msg });
    }
  });

  // Catch-all for API routes to avoid returning HTML on 404
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "Neural endpoint not found." });
  });

  // Serve static assets from public directories (supports running from repo root or primary-anny/)
  const publicCandidates = [
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'primary-anny', 'public'),
    path.join(process.cwd(), 'primary-anny', 'Anny', 'public'),
    path.join(process.cwd(), 'Anny', 'public'),
  ];
  const seenPublic = new Set<string>();
  for (const dir of publicCandidates) {
    const resolved = path.resolve(dir);
    if (!seenPublic.has(resolved) && fs.existsSync(resolved)) {
      seenPublic.add(resolved);
      app.use(express.static(resolved));
    }
  }

  // Vite middleware for development or static SPA bundle for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const rootIndexExists = fs.existsSync(path.join(process.cwd(), 'index.html'));
    const viteRoot = rootIndexExists
      ? process.cwd()
      : (fs.existsSync(path.join(process.cwd(), 'primary-anny', 'index.html'))
          ? path.join(process.cwd(), 'primary-anny')
          : process.cwd());
    const vite = await createViteServer({
      root: viteRoot,
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: "spa",
    });
    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const transformed = await vite.transformRequest('/@vite/client');
        if (transformed?.code) {
          const safeCode = transformed.code.replace(
            /^transport\.connect\(.+\);?$/gm,
            '/* HMR WebSocket connection disabled (HMR=false) */'
          );
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          return res.send(safeCode);
        }
      } catch {
        // Fall through to vite.middlewares
      }
      return next();
    });
    app.use(vite.middlewares);
  } else {
    const distCandidates = [
      path.join(process.cwd(), 'dist'),
      path.join(process.cwd(), 'primary-anny', 'dist'),
    ];
    const distPath = distCandidates.find((d) => fs.existsSync(path.join(d, 'index.html'))) || distCandidates[0];

    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', redisRateLimiter.middleware, (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(503).json({ error: 'Frontend production build not found. Run npm run build first.' });
      }
    });
  }

  const httpServer = http.createServer(app);
  attachLiveVisionGateway(httpServer, { allowedOrigins: configuredAllowedOrigins });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Anny Server running on http://0.0.0.0:${PORT} (Live Vision WebSocket: /api/vision/live)`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Server startup failed!", err);
  process.exit(1);
});
