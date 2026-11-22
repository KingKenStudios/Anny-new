import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { MinioStorageService, resolveMinioConnectionConfig } from './minioStorage.ts';

/**
 * Minimal path-style S3-compatible HTTP server for verifying real AWS SDK v3
 * signing, bucket creation/checks, upload, download, list, delete, and presigned URLs
 * without faking or mocking the AWS SDK client itself.
 */
async function startLocalS3TestServer(): Promise<{
  endpoint: string;
  port: number;
  close: () => Promise<void>;
  setFailNextPut: (fail: boolean) => void;
}> {
  const buckets = new Map<string, Map<string, { body: Buffer; contentType: string; etag: string; lastModified: Date }>>();
  let failNextPut = false;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const pathSegments = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    const bucketName = decodeURIComponent(pathSegments[0] || '');
    const objectKey = pathSegments.slice(1).map(decodeURIComponent).join('/');
    const method = (req.method || 'GET').toUpperCase();

    if (!bucketName) {
      res.writeHead(400);
      res.end('Missing bucket');
      return;
    }

    // Bucket-level operations
    if (!objectKey) {
      if (method === 'HEAD') {
        if (buckets.has(bucketName)) {
          res.writeHead(200);
          res.end();
        } else {
          res.writeHead(404);
          res.end();
        }
        return;
      }
      if (method === 'PUT') {
        if (!buckets.has(bucketName)) {
          buckets.set(bucketName, new Map());
        }
        res.writeHead(200);
        res.end();
        return;
      }
      if (method === 'GET' && url.searchParams.get('list-type') === '2') {
        const bucket = buckets.get(bucketName);
        if (!bucket) {
          res.writeHead(404, { 'Content-Type': 'application/xml' });
          res.end('<Error><Code>NoSuchBucket</Code></Error>');
          return;
        }
        const prefix = url.searchParams.get('prefix') || '';
        const items = Array.from(bucket.entries())
          .filter(([k]) => k.startsWith(prefix))
          .map(
            ([k, v]) =>
              `<Contents><Key>${k}</Key><LastModified>${v.lastModified.toISOString()}</LastModified><ETag>"${v.etag}"</ETag><Size>${v.body.length}</Size></Contents>`
          )
          .join('');
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end(
          `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>${bucketName}</Name><KeyCount>${bucket.size}</KeyCount><IsTruncated>false</IsTruncated>${items}</ListBucketResult>`
        );
        return;
      }
    }

    // Object-level operations
    const bucket = buckets.get(bucketName);
    if (!bucket) {
      res.writeHead(404, { 'Content-Type': 'application/xml' });
      res.end('<Error><Code>NoSuchBucket</Code></Error>');
      return;
    }

    if (method === 'PUT') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', () => {
        if (failNextPut) {
          res.writeHead(500, { 'Content-Type': 'application/xml' });
          res.end('<Error><Code>InternalError</Code><Message>Simulated storage write failure</Message></Error>');
          return;
        }
        const body = Buffer.concat(chunks);
        const etag = crypto.createHash('md5').update(body).digest('hex');
        bucket.set(objectKey, {
          body,
          contentType: String(req.headers['content-type'] || 'application/octet-stream'),
          etag,
          lastModified: new Date(),
        });
        res.writeHead(200, { ETag: `"${etag}"` });
        res.end();
      });
      return;
    }

    if (method === 'GET') {
      const obj = bucket.get(objectKey);
      if (!obj) {
        res.writeHead(404, { 'Content-Type': 'application/xml' });
        res.end('<Error><Code>NoSuchKey</Code></Error>');
        return;
      }
      res.writeHead(200, {
        'Content-Type': obj.contentType,
        'Content-Length': String(obj.body.length),
        ETag: `"${obj.etag}"`,
        'Last-Modified': obj.lastModified.toUTCString(),
      });
      res.end(obj.body);
      return;
    }

    if (method === 'DELETE') {
      bucket.delete(objectKey);
      res.writeHead(204);
      res.end();
      return;
    }

    res.writeHead(405);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return {
    endpoint: `http://127.0.0.1:${port}`,
    port,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
    setFailNextPut: (fail: boolean) => {
      failNextPut = fail;
    },
  };
}

describe('MinIO / S3 connection configuration', () => {
  test('requires an explicit endpoint and credentials', () => {
    assert.equal(resolveMinioConnectionConfig({}), null);
    assert.equal(
      resolveMinioConnectionConfig({
        MINIO_ENDPOINT: '127.0.0.1',
        MINIO_ACCESS_KEY: 'secure-access-key',
      }),
      null
    );
  });

  test('rejects the public default MinIO credentials', () => {
    assert.equal(
      resolveMinioConnectionConfig({
        MINIO_ENDPOINT: '127.0.0.1',
        MINIO_ACCESS_KEY: 'minioadmin',
        MINIO_SECRET_KEY: 'minioadmin',
      }),
      null
    );
  });

  test('rejects invalid ports', () => {
    assert.equal(
      resolveMinioConnectionConfig({
        MINIO_ENDPOINT: '127.0.0.1',
        MINIO_PORT: '70000',
        MINIO_ACCESS_KEY: 'secure-access-key',
        MINIO_SECRET_KEY: 'secure-secret-key',
      }),
      null
    );
  });

  test('accepts explicit non-default host+port and URL configurations', () => {
    assert.deepEqual(
      resolveMinioConnectionConfig({
        MINIO_ENDPOINT: 'storage.internal',
        MINIO_PORT: '9443',
        MINIO_USE_SSL: 'true',
        MINIO_REGION: 'eu-west-1',
        MINIO_ACCESS_KEY: 'secure-access-key',
        MINIO_SECRET_KEY: 'secure-secret-key',
      }),
      {
        endPoint: 'storage.internal',
        port: 9443,
        useSSL: true,
        region: 'eu-west-1',
        endpointUrl: 'https://storage.internal:9443',
        accessKey: 'secure-access-key',
        secretKey: 'secure-secret-key',
      }
    );

    const fromUrl = resolveMinioConnectionConfig({
      MINIO_ENDPOINT: 'http://127.0.0.1:9000',
      MINIO_ACCESS_KEY: 'secure-access-key',
      MINIO_SECRET_KEY: 'secure-secret-key',
    });
    assert.equal(fromUrl?.endpointUrl, 'http://127.0.0.1:9000');
    assert.equal(fromUrl?.port, 9000);
    assert.equal(fromUrl?.useSSL, false);
  });

  test('does not report success when only default credentials are present', async () => {
    const service = new MinioStorageService({
      MINIO_ENDPOINT: '127.0.0.1',
      MINIO_ACCESS_KEY: 'minioadmin',
      MINIO_SECRET_KEY: 'minioadmin',
    });

    assert.equal(await service.ensureBucketExists(), false);
    const health = await service.checkHealth();
    assert.equal(health.status, 'NOT_CONFIGURED');
    assert.equal(health.configured, false);

    await assert.rejects(() => service.uploadArtifact('test.txt', 'not-persisted'), /MINIO_NOT_CONFIGURED/);
    await assert.rejects(() => service.downloadArtifact('test.txt'), /MINIO_NOT_CONFIGURED/);
    await assert.rejects(() => service.getPresignedUrl('test.txt'), /MINIO_NOT_CONFIGURED/);
    await assert.rejects(() => service.getPresignedPutUrl('test.txt'), /MINIO_NOT_CONFIGURED/);
    await assert.rejects(() => service.listArtifacts(), /MINIO_NOT_CONFIGURED/);
    await assert.rejects(() => service.deleteArtifact('test.txt'), /MINIO_NOT_CONFIGURED/);
  });
});

describe('S3 / MinIO AWS SDK v3 operations', () => {
  test('verifies bucket creation, upload, download, list, presigned GET/PUT, delete, and honest error propagation', async () => {
    const mockServer = await startLocalS3TestServer();
    const service = new MinioStorageService({
      MINIO_ENDPOINT: mockServer.endpoint,
      MINIO_ACCESS_KEY: 'annytestaccess',
      MINIO_SECRET_KEY: 'annytestsecret_strong_value',
      MINIO_BUCKET: 'anny-unit-bucket',
    });

    try {
      // Bucket does not exist initially -> BUCKET_MISSING
      const initialHealth = await service.checkHealth();
      assert.equal(initialHealth.status, 'BUCKET_MISSING');
      assert.equal(initialHealth.configured, true);

      // Bucket creation & verification
      assert.equal(await service.ensureBucketExists(), true);
      const connectedHealth = await service.checkHealth();
      assert.equal(connectedHealth.status, 'CONNECTED');

      // Upload & verify metadata
      const payload = 'ANNY Sovereign Storage Integrity Payload';
      const uploaded = await service.uploadArtifact('users/u1/report.txt', payload, 'text/plain');
      assert.equal(uploaded.bucket, 'anny-unit-bucket');
      assert.equal(uploaded.objectName, 'users/u1/report.txt');
      assert.equal(uploaded.size, Buffer.byteLength(payload));
      assert.ok(uploaded.etag && uploaded.etag.length > 0);

      // Download & verify exact persisted bytes
      const downloaded = await service.downloadArtifact('users/u1/report.txt');
      assert.equal(downloaded.buffer.toString('utf8'), payload);
      assert.equal(downloaded.contentType, 'text/plain');

      // List objects with prefix
      const listed = await service.listArtifacts('users/u1/');
      assert.equal(listed.length, 1);
      assert.equal(listed[0].objectName, 'users/u1/report.txt');

      // Presigned GET URL works over real HTTP
      const getUrl = await service.getPresignedUrl('users/u1/report.txt', 300);
      assert.ok(getUrl.includes('X-Amz-Signature='));
      const getRes = await fetch(getUrl);
      assert.equal(getRes.status, 200);
      assert.equal(await getRes.text(), payload);

      // Presigned PUT URL works over real HTTP
      const putUrl = await service.getPresignedPutUrl('users/u1/direct.txt', 300);
      assert.ok(putUrl.includes('X-Amz-Signature='));
      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: 'Uploaded via presigned PUT',
      });
      assert.equal(putRes.status, 200);
      const directDownload = await service.downloadArtifact('users/u1/direct.txt');
      assert.equal(directDownload.buffer.toString('utf8'), 'Uploaded via presigned PUT');

      // Honest failure when server rejects write across retries (never silently claims success)
      mockServer.setFailNextPut(true);
      await assert.rejects(
        () => service.uploadArtifact('users/u1/fail.txt', 'should-fail', 'text/plain'),
        /MINIO_UPLOAD_FAILED/
      );
      mockServer.setFailNextPut(false);

      // Delete objects and verify removal
      assert.equal(await service.deleteArtifact('users/u1/report.txt'), true);
      assert.equal(await service.deleteArtifact('users/u1/direct.txt'), true);
      const afterDelete = await service.listArtifacts('users/u1/');
      assert.equal(afterDelete.length, 0);
    } finally {
      service.destroy();
      await mockServer.close();
    }
  });

  test('executes against live external MinIO container when MINIO_ENDPOINT is configured', async (t) => {
    const liveConfig = resolveMinioConnectionConfig(process.env);
    if (!liveConfig) {
      t.skip('MINIO_ENDPOINT not set in environment; skipping live container test.');
      return;
    }

    const liveService = new MinioStorageService(process.env);
    const key = `ci-integration/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.txt`;
    const body = `ANNY live MinIO test ${new Date().toISOString()}`;

    try {
      assert.equal(await liveService.ensureBucketExists(), true);
      const health = await liveService.checkHealth();
      assert.equal(health.status, 'CONNECTED');

      const uploaded = await liveService.uploadArtifact(key, body, 'text/plain');
      assert.equal(uploaded.size, Buffer.byteLength(body));

      const downloaded = await liveService.downloadArtifact(key);
      assert.equal(downloaded.buffer.toString('utf8'), body);

      const getUrl = await liveService.getPresignedUrl(key, 120);
      const res = await fetch(getUrl);
      assert.equal(res.status, 200);
      assert.equal(await res.text(), body);

      const listed = await liveService.listArtifacts('ci-integration/');
      assert.ok(listed.some((o) => o.objectName === key));

      assert.equal(await liveService.deleteArtifact(key), true);
    } finally {
      liveService.destroy();
    }
  });
});
