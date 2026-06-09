const MONGODB_OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export function resolveTripRouteId(selectedRoute: any): string | undefined {
  const candidates = [selectedRoute?.id, selectedRoute?._id, selectedRoute?.routeId];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue;
    }

    const normalized = candidate.trim();
    if (MONGODB_OBJECT_ID.test(normalized)) {
      return normalized;
    }
  }

  return undefined;
}

export function sanitizeTripRouteForRequest(selectedRoute: any): any {
  if (!selectedRoute || typeof selectedRoute !== 'object') {
    return selectedRoute;
  }

  const routeId = resolveTripRouteId(selectedRoute);
  const sanitized = { ...selectedRoute };

  if (routeId) {
    sanitized.id = routeId;
    sanitized._id = routeId;
    sanitized.routeId = routeId;
  } else {
    delete sanitized.id;
    delete sanitized._id;
    delete sanitized.routeId;
  }

  return sanitized;
}

export function isLogoutRequestUrl(url: string): boolean {
  return /\/auth\/logout\b/i.test(url);
}

export function shouldShowSessionExpiredToast(
  requestUrl: string,
  currentUrl: string,
  isAuthenticated: boolean
): boolean {
  if (!isAuthenticated) {
    return false;
  }

  const normalizedCurrentUrl = currentUrl.split('?')[0].replace(/\/+$/, '');

  if (/^\/auth(\/|$)/.test(normalizedCurrentUrl)) {
    return false;
  }

  if (/\/auth\/(login|logout|register|forgot-password|verify-otp|reset-password)\b/i.test(requestUrl)) {
    return false;
  }

  return true;
}
