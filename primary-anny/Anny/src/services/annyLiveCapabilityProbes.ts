/**
 * ANNY live capability probes.
 * These probes use existing service health APIs and never treat in-memory simulations
 * or configured credentials alone as proof of a live dependency.
 */
import { capabilityManager } from '../core/capabilityManager';
import { databaseMonitor } from './databaseMonitor';
import { providerRegistryService } from './providerRegistryService';
import { minioStorageService } from './minioStorage';
import { rabbitWorkerService } from './rabbitWorkerService';
import type { OllamaDiscoveryResult } from './ollamaService';

function statusResult(status: string, latencyMs: number, detail: string) {
  const healthy = status === 'online';
  return { healthy, connected: healthy, latencyMs, detail };
}

export async function runAnnyLiveCapabilityProbes(
  ollamaDiscovery?: OllamaDiscoveryResult
): Promise<void> {
  const database = await databaseMonitor.executeCheck();

  await capabilityManager.verify('service_postgres', () => statusResult(
    database.postgres.status,
    database.postgres.latencyMs,
    database.postgres.configured
      ? database.postgres.error || `PostgreSQL probe: ${database.postgres.status}`
      : 'PostgreSQL is not configured'
  ));

  await capabilityManager.verify('service_redis', () => statusResult(
    database.redis.status,
    database.redis.latencyMs,
    database.redis.configured
      ? database.redis.error || `Redis probe: ${database.redis.status}`
      : 'Redis is not configured'
  ));

  const ollama = ollamaDiscovery;
  await capabilityManager.verify('service_ollama', ollama ? () => ({
    healthy: ollama.reachable && ollama.inferenceTestPassed,
    connected: ollama.reachable,
    latencyMs: ollama.latencyMs,
    detail: !ollama.reachable
      ? ollama.error || 'Ollama endpoint is unreachable'
      : ollama.inferenceTestPassed
        ? `Ollama inference verified; ${ollama.discoveredModels.length} model(s) discovered`
        : `Ollama endpoint reachable but inference not verified; ${ollama.discoveredModels.length} model(s) discovered`
  }) : undefined);

  const providers = providerRegistryService.getProviderRegistry();
  const configuredAndHealthy = providers.filter(provider =>
    provider.providerId !== 'ollama' &&
    provider.isOnline &&
    ['CONNECTED', 'HEALTHY'].includes(provider.healthStatus)
  );
  await capabilityManager.verify('service_cloud_ai', () => ({
    healthy: configuredAndHealthy.length > 0,
    connected: configuredAndHealthy.length > 0,
    detail: configuredAndHealthy.length
      ? `${configuredAndHealthy.length} cloud provider(s) passed the provider registry audit`
      : 'No cloud AI provider currently has a successful health audit; credentials/configuration alone are not proof'
  }));

  const minio = await minioStorageService.checkHealth();
  await capabilityManager.verify('service_minio', () => ({
    healthy: minio.status === 'CONNECTED',
    connected: minio.status === 'CONNECTED',
    latencyMs: minio.latencyMs,
    detail: minio.status === 'CONNECTED'
      ? `Object storage bucket "${minio.bucket}" passed a live HeadBucket check`
      : minio.error || `Object storage status: ${minio.status}`
  }));

  const rabbit = await rabbitWorkerService.checkHealth();
  await capabilityManager.verify('service_rabbitmq', () => ({
    healthy: rabbit.status === 'CONNECTED',
    connected: rabbit.status === 'CONNECTED',
    latencyMs: rabbit.latencyMs,
    detail: rabbit.status === 'CONNECTED'
      ? 'RabbitMQ broker and required worker queues passed live checks'
      : rabbit.error || `RabbitMQ status: ${rabbit.status}`
  }));

  // QdrantPlatform currently reports SIMULATED even when a URL is configured.
  // Do not promote it to healthy until a real remote health endpoint is implemented.
  await capabilityManager.verify('service_qdrant');
}
