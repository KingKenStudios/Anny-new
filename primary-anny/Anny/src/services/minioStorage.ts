import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageObjectInfo {
  bucket: string;
  objectName: string;
  size: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
}

export interface DownloadedStorageObject {
  bucket: string;
  objectName: string;
  buffer: Buffer;
  size: number;
  contentType: string;
  etag?: string;
  lastModified?: Date;
}

export interface MinioConnectionConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  region: string;
  endpointUrl: string;
  accessKey: string;
  secretKey: string;
}

function normalizeEndpoint(
  rawEndpoint: string,
  rawPort: string,
  rawUseSsl: string
): { endPoint: string; port: number; useSSL: boolean; endpointUrl: string } | null {
  const trimmed = rawEndpoint.trim();
  if (!trimmed) return null;

  let host = trimmed;
  let useSSL = rawUseSsl.toLowerCase() === 'true';
  let port = rawPort ? Number(rawPort) : 9000;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      host = parsed.hostname;
      useSSL = parsed.protocol === 'https:';
      if (parsed.port) {
        port = Number(parsed.port);
      } else if (!rawPort) {
        port = useSSL ? 443 : 80;
      }
    } catch {
      return null;
    }
  } else {
    const colonIdx = trimmed.lastIndexOf(':');
    if (colonIdx > 0 && !trimmed.includes(']')) {
      const hostPart = trimmed.slice(0, colonIdx);
      const portPart = trimmed.slice(colonIdx + 1);
      if (/^\d+$/.test(portPart)) {
        host = hostPart;
        port = Number(portPart);
      }
    }
  }

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  const protocol = useSSL ? 'https' : 'http';
  const endpointUrl = `${protocol}://${host}:${port}`;
  return { endPoint: host, port, useSSL, endpointUrl };
}

/** Resolve explicit S3/MinIO credentials only; never fall back to MinIO's public demo defaults. */
export function resolveMinioConnectionConfig(
  env: Record<string, string | undefined> = process.env
): MinioConnectionConfig | null {
  const rawEndPoint = String(env.MINIO_ENDPOINT || '').trim();
  const accessKey = String(env.MINIO_ACCESS_KEY || '').trim();
  const secretKey = String(env.MINIO_SECRET_KEY || '').trim();
  const rawPort = String(env.MINIO_PORT || '').trim();
  const rawUseSsl = String(env.MINIO_USE_SSL || '').trim();
  const region = String(env.MINIO_REGION || 'us-east-1').trim() || 'us-east-1';

  if (!rawEndPoint || !accessKey || !secretKey) return null;
  if (accessKey.toLowerCase() === 'minioadmin' || secretKey.toLowerCase() === 'minioadmin') return null;

  const normalized = normalizeEndpoint(rawEndPoint, rawPort, rawUseSsl);
  if (!normalized) return null;

  return {
    endPoint: normalized.endPoint,
    port: normalized.port,
    useSSL: normalized.useSSL,
    region,
    endpointUrl: normalized.endpointUrl,
    accessKey,
    secretKey,
  };
}

function isBucketMissingError(err: any): boolean {
  const code = String(err?.name || err?.Code || err?.code || '');
  const status = err?.$metadata?.httpStatusCode;
  return status === 404 || code === 'NotFound' || code === 'NoSuchBucket';
}

async function bodyToBuffer(body: any): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof body.transformToByteArray === 'function') {
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array | Buffer | string>) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export class MinioStorageService {
  private client: S3Client | null = null;
  private config: MinioConnectionConfig | null = null;
  private defaultBucket: string;
  private isConnected: boolean = false;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.defaultBucket = String(env.MINIO_BUCKET || 'anny-artifacts').trim() || 'anny-artifacts';
    const config = resolveMinioConnectionConfig(env);
    if (config) {
      this.config = config;
      this.client = new S3Client({
        endpoint: config.endpointUrl,
        region: config.region,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.accessKey,
          secretAccessKey: config.secretKey,
        },
        maxAttempts: 2,
      });
    }
  }

  public getConfiguredEndpoint(): string | null {
    return this.config?.endpointUrl || null;
  }

  /** Performs a live object-storage connectivity check; configuration alone is not health. */
  public async checkHealth(): Promise<{
    status: 'CONNECTED' | 'NOT_CONFIGURED' | 'BUCKET_MISSING' | 'CONNECTION_FAILED';
    configured: boolean;
    latencyMs: number;
    bucket: string;
    error?: string;
  }> {
    const startedAt = Date.now();
    if (!this.client) {
      this.isConnected = false;
      return {
        status: 'NOT_CONFIGURED',
        configured: false,
        latencyMs: Date.now() - startedAt,
        bucket: this.defaultBucket,
        error: 'MINIO_NOT_CONFIGURED',
      };
    }

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.defaultBucket }));
      this.isConnected = true;
      return {
        status: 'CONNECTED',
        configured: true,
        latencyMs: Date.now() - startedAt,
        bucket: this.defaultBucket,
      };
    } catch (err: any) {
      this.isConnected = false;
      if (isBucketMissingError(err)) {
        return {
          status: 'BUCKET_MISSING',
          configured: true,
          latencyMs: Date.now() - startedAt,
          bucket: this.defaultBucket,
          error: 'MINIO_BUCKET_MISSING',
        };
      }
      return {
        status: 'CONNECTION_FAILED',
        configured: true,
        latencyMs: Date.now() - startedAt,
        bucket: this.defaultBucket,
        error: `MINIO_CONNECTION_FAILED: ${err?.message || String(err)}`,
      };
    }
  }

  /**
   * Verifies bucket exists or creates it automatically on the S3/MinIO server.
   */
  public async ensureBucketExists(bucketName: string = this.defaultBucket): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucketName }));
      this.isConnected = true;
      return true;
    } catch (err: any) {
      if (!isBucketMissingError(err)) {
        console.warn(`[MinIO Storage] Bucket check failed (${bucketName}):`, err?.message || String(err));
        this.isConnected = false;
        return false;
      }
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: bucketName }));
        await this.client.send(new HeadBucketCommand({ Bucket: bucketName }));
        this.isConnected = true;
        return true;
      } catch (createErr: any) {
        const code = String(createErr?.name || createErr?.Code || '');
        if (code === 'BucketAlreadyOwnedByYou' || code === 'BucketAlreadyExists') {
          this.isConnected = true;
          return true;
        }
        console.warn(`[MinIO Storage] Bucket creation failed (${bucketName}):`, createErr?.message || String(createErr));
        this.isConnected = false;
        return false;
      }
    }
  }

  /**
   * Uploads an artifact or media buffer to S3/MinIO storage and confirms server persistence.
   */
  public async uploadArtifact(
    objectName: string,
    content: Buffer | Uint8Array | string,
    contentType: string = 'application/octet-stream',
    bucketName: string = this.defaultBucket
  ): Promise<StorageObjectInfo> {
    if (!objectName || !objectName.trim()) {
      throw new Error('MINIO_INVALID_KEY: objectName is required.');
    }
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : Buffer.from(content);

    if (!this.client) {
      throw new Error('MINIO_NOT_CONFIGURED: explicit endpoint and non-default credentials are required.');
    }
    const bucketReady = await this.ensureBucketExists(bucketName);
    if (!bucketReady) {
      throw new Error('MINIO_BUCKET_UNAVAILABLE: object storage bucket could not be verified.');
    }

    try {
      const response = await this.client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: objectName,
          Body: buffer,
          ContentType: contentType,
          ContentLength: buffer.length,
        })
      );

      const statusCode = response.$metadata?.httpStatusCode;
      if (statusCode !== undefined && (statusCode < 200 || statusCode >= 300)) {
        throw new Error(`Unexpected storage status code ${statusCode}`);
      }

      const cleanEtag = response.ETag ? response.ETag.replace(/^"|"$/g, '') : undefined;
      return {
        bucket: bucketName,
        objectName,
        size: buffer.length,
        contentType,
        etag: cleanEtag,
        lastModified: new Date(),
      };
    } catch (err: any) {
      throw new Error(`MINIO_UPLOAD_FAILED: object was not persisted: ${err?.message || String(err)}`);
    }
  }

  /**
   * Downloads an artifact buffer from S3/MinIO storage.
   */
  public async downloadArtifact(
    objectName: string,
    bucketName: string = this.defaultBucket
  ): Promise<DownloadedStorageObject> {
    if (!this.client) {
      throw new Error('MINIO_NOT_CONFIGURED: object download requires live object storage.');
    }
    if (!(await this.ensureBucketExists(bucketName))) {
      throw new Error('MINIO_BUCKET_UNAVAILABLE: object download requires an available bucket.');
    }

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: objectName,
        })
      );
      const buffer = await bodyToBuffer(response.Body);
      return {
        bucket: bucketName,
        objectName,
        buffer,
        size: buffer.length,
        contentType: response.ContentType || 'application/octet-stream',
        etag: response.ETag ? response.ETag.replace(/^"|"$/g, '') : undefined,
        lastModified: response.LastModified,
      };
    } catch (err: any) {
      throw new Error(`MINIO_DOWNLOAD_FAILED: object download failed: ${err?.message || String(err)}`);
    }
  }

  /**
   * Generates a pre-signed GET URL for downloading or serving uploaded media/artifacts.
   */
  public async getPresignedUrl(
    objectName: string,
    expiryInSeconds: number = 24 * 3600,
    bucketName: string = this.defaultBucket
  ): Promise<string> {
    if (!this.client) {
      throw new Error('MINIO_NOT_CONFIGURED: a real presigned download URL cannot be created without configured object storage.');
    }
    if (!(await this.ensureBucketExists(bucketName))) {
      throw new Error('MINIO_BUCKET_UNAVAILABLE: cannot create a presigned download URL for an unavailable bucket.');
    }
    try {
      const clampedExpiry = Math.max(60, Math.min(7 * 24 * 3600, Math.floor(expiryInSeconds)));
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: bucketName, Key: objectName }),
        { expiresIn: clampedExpiry }
      );
    } catch (err: any) {
      throw new Error(`MINIO_PRESIGN_FAILED: download URL was not created: ${err?.message || String(err)}`);
    }
  }

  /**
   * Generates a pre-signed PUT URL for client-side direct uploads.
   */
  public async getPresignedPutUrl(
    objectName: string,
    expiryInSeconds: number = 3600,
    bucketName: string = this.defaultBucket
  ): Promise<string> {
    if (!this.client) {
      throw new Error('MINIO_NOT_CONFIGURED: a real presigned upload URL cannot be created without configured object storage.');
    }
    if (!(await this.ensureBucketExists(bucketName))) {
      throw new Error('MINIO_BUCKET_UNAVAILABLE: cannot create a presigned upload URL for an unavailable bucket.');
    }
    try {
      const clampedExpiry = Math.max(60, Math.min(24 * 3600, Math.floor(expiryInSeconds)));
      return await getSignedUrl(
        this.client,
        new PutObjectCommand({ Bucket: bucketName, Key: objectName }),
        { expiresIn: clampedExpiry }
      );
    } catch (err: any) {
      throw new Error(`MINIO_PRESIGN_FAILED: upload URL was not created: ${err?.message || String(err)}`);
    }
  }

  /**
   * Lists artifacts stored in the specified bucket using paginated ListObjectsV2.
   */
  public async listArtifacts(
    prefix: string = '',
    bucketName: string = this.defaultBucket
  ): Promise<StorageObjectInfo[]> {
    if (!this.client) {
      throw new Error('MINIO_NOT_CONFIGURED: object listing requires live object storage.');
    }
    if (!(await this.ensureBucketExists(bucketName))) {
      throw new Error('MINIO_BUCKET_UNAVAILABLE: object listing requires an available bucket.');
    }

    try {
      const objects: StorageObjectInfo[] = [];
      let continuationToken: string | undefined;

      do {
        const page = await this.client.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix || undefined,
            ContinuationToken: continuationToken,
          })
        );
        for (const item of page.Contents || []) {
          if (item.Key) {
            objects.push({
              bucket: bucketName,
              objectName: item.Key,
              size: Number(item.Size ?? 0),
              etag: item.ETag ? item.ETag.replace(/^"|"$/g, '') : undefined,
              lastModified: item.LastModified,
            });
          }
        }
        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (continuationToken);

      return objects;
    } catch (err: any) {
      throw new Error(`MINIO_LIST_FAILED: object listing failed: ${err?.message || String(err)}`);
    }
  }

  /**
   * Deletes an artifact from storage.
   */
  public async deleteArtifact(
    objectName: string,
    bucketName: string = this.defaultBucket
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error('MINIO_NOT_CONFIGURED: object deletion requires live object storage.');
    }
    if (!(await this.ensureBucketExists(bucketName))) {
      throw new Error('MINIO_BUCKET_UNAVAILABLE: object deletion requires an available bucket.');
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: objectName,
        })
      );
      return true;
    } catch (err: any) {
      throw new Error(`MINIO_DELETE_FAILED: object deletion failed: ${err?.message || String(err)}`);
    }
  }

  public destroy(): void {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
    this.isConnected = false;
  }
}

export const minioStorageService = new MinioStorageService();
