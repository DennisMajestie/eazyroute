export function normalizeTransportMode(value: unknown): string {
  const pick = (candidate: unknown): string | undefined => {
    if (typeof candidate === 'string') {
      return candidate.trim();
    }

    if (candidate && typeof candidate === 'object') {
      const record = candidate as Record<string, unknown>;
      const type = typeof record['type'] === 'string' ? record['type'].trim() : '';
      const name = typeof record['name'] === 'string' ? record['name'].trim() : '';
      return type || name || undefined;
    }

    return undefined;
  };

  const raw = pick(value);

  if (!raw) {
    return 'walk';
  }

  const normalized = raw.toLowerCase();

  if (['bike', 'motorcycle', 'okada', 'motorbike', 'moto'].includes(normalized)) {
    return 'okada';
  }

  if (['keke', 'keke napep', 'tricycle', 'tricycle-bike'].includes(normalized)) {
    return 'keke';
  }

  if (['walk', 'walking', 'pedestrian'].includes(normalized)) {
    return 'walk';
  }

  if (['bus', 'minibus', 'shuttle'].includes(normalized)) {
    return 'bus';
  }

  return normalized;
}
