import assert from 'node:assert/strict';
import test from 'node:test';
import { annyCapabilityTruthRegistry } from './annyCapabilityTruthRegistry';

test('local text-to-3D is registered but stays unverified until runtime evidence exists', () => {
  const capability = annyCapabilityTruthRegistry.getCapability('LOCAL_TEXT_TO_3D');
  assert.ok(capability);
  assert.equal(capability!.status, 'UNKNOWN');
  assert.equal(capability!.confidence, 0);
  assert.match(capability!.runtimeEntryPoint, /generate3DModelFromTextLocal/);
  assert.deepEqual(capability!.verificationRequirements, [
    'LOCAL_SD_WEBUI',
    'LOCAL_MODLY_IMAGE_TO_MESH',
    'VALIDATED_REFERENCE_IMAGE',
    'VERIFIED_MESH_ARTIFACT',
  ]);
  assert.equal(annyCapabilityTruthRegistry.verifyEvidenceChain('LOCAL_TEXT_TO_3D'), false);
});
