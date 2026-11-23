export function resolveProviderAttempts<T extends string>(
  priority: T[],
  preferredProvider: T | undefined,
  options: {
    offlineOnly?: boolean;
    disableCloudFallback?: boolean;
    localProvider: T;
  }
): T[] {
  const localProvider = options.localProvider;
  if (options.offlineOnly) {
    if (preferredProvider && preferredProvider !== localProvider) {
      throw new Error(`OFFLINE_UNAVAILABLE: Provider "${preferredProvider}" is blocked in OFFLINE_ONLY mode.`);
    }
    return [localProvider];
  }

  const blockFallback = Boolean(options.disableCloudFallback || preferredProvider === localProvider);
  if (blockFallback) {
    if (!preferredProvider || preferredProvider === localProvider) return [localProvider];
    return [preferredProvider];
  }

  return preferredProvider
    ? [preferredProvider, ...priority.filter(provider => provider !== preferredProvider)]
    : [...priority];
}
