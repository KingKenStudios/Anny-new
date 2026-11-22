export type DataClassification =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'PRIVATE'
  | 'RESTRICTED'
  | 'SECRET';

export interface RemoteExecutionPolicy {
  classification: DataClassification;
  canLeaveLocalDevice: boolean;
  requiresTrustedWorker: boolean;
  allowedOrganizations?: string[];
  maxLatencyMs?: number;
  encryptionRequired: boolean;
}

export class AnnyRemoteExecutionPolicy {
  private static instance: AnnyRemoteExecutionPolicy;

  private constructor() {}

  public static getInstance(): AnnyRemoteExecutionPolicy {
    if (!AnnyRemoteExecutionPolicy.instance) {
      AnnyRemoteExecutionPolicy.instance = new AnnyRemoteExecutionPolicy();
    }
    return AnnyRemoteExecutionPolicy.instance;
  }

  public getPolicyForTask(
    taskType: string,
    organizationId: string = 'global',
    explicitClassification?: DataClassification
  ): RemoteExecutionPolicy {
    // Determine base classification
    let classification: DataClassification = explicitClassification || 'INTERNAL';

    if (!explicitClassification) {
      if (organizationId === 'king_ken_studios') {
        if (taskType.includes('creative') || taskType.includes('media') || taskType.includes('video') || taskType.includes('audio') || taskType.includes('image')) {
          classification = 'CONFIDENTIAL';
        }
      } else if (organizationId === 'keda') {
        if (taskType.includes('security') || taskType.includes('telemetry') || taskType.includes('infrastructure')) {
          classification = 'RESTRICTED';
        }
      }
    }

    return this.enforcePolicy(classification, organizationId);
  }

  private enforcePolicy(classification: DataClassification, organizationId: string): RemoteExecutionPolicy {
    const policy: RemoteExecutionPolicy = {
      classification,
      canLeaveLocalDevice: true,
      requiresTrustedWorker: false,
      allowedOrganizations: [organizationId, 'global'],
      encryptionRequired: true
    };

    switch (classification) {
      case 'PUBLIC':
        policy.requiresTrustedWorker = false;
        policy.encryptionRequired = false;
        break;
      case 'INTERNAL':
        policy.requiresTrustedWorker = true;
        break;
      case 'CONFIDENTIAL':
      case 'PRIVATE':
        policy.requiresTrustedWorker = true;
        policy.encryptionRequired = true;
        break;
      case 'RESTRICTED':
        policy.requiresTrustedWorker = true;
        policy.canLeaveLocalDevice = false; // By default restrict, must be overridden by specific trusted private worker context
        break;
      case 'SECRET':
        policy.requiresTrustedWorker = true;
        policy.canLeaveLocalDevice = false; // Never leaves local context
        break;
    }

    return policy;
  }
}

export const annyRemoteExecutionPolicy = AnnyRemoteExecutionPolicy.getInstance();
