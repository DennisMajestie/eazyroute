export function resolveTripRouteId(selectedRoute: any): string | undefined {
  const candidate = selectedRoute?.id || selectedRoute?._id || selectedRoute?.routeId;

  if (typeof candidate === 'string') {
    const normalized = candidate.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  return undefined;
}

export function isLogoutRequestUrl(url: string): boolean {
  return /\/auth\/logout\b/i.test(url);
}
