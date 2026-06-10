const MONGODB_OBJECT_ID = /^[0-9a-fA-F]{24}$/;

function isUsableRouteId(candidate: unknown): candidate is string {
  return typeof candidate === 'string' && candidate.trim().length > 0 && candidate.trim() !== '[object Object]';
}

export function createFallbackMongoRouteId(): string {
  const hex = '0123456789abcdef';
  return Array.from({ length: 24 }, () => hex[Math.floor(Math.random() * hex.length)]).join('');
}

export function resolveTripRouteId(selectedRoute: any): string | undefined {
  const candidates = [selectedRoute?.id, selectedRoute?._id, selectedRoute?.routeId, selectedRoute?.route_id]
    .filter(isUsableRouteId)
    .map(candidate => candidate.trim());

  const preferredMongoId = candidates.find(candidate => MONGODB_OBJECT_ID.test(candidate));

  if (preferredMongoId) {
    return preferredMongoId;
  }

  if (candidates.length > 0) {
    return createFallbackMongoRouteId();
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

export function extractTripErrorMessage(error: any): string {
  if (typeof error?.error === 'string') {
    return error.error;
  }

  return (
    error?.error?.message ||
    error?.message ||
    'We couldn\'t initialize your trip tracking. Please try again.'
  );
}

export function isActiveTripError(error: any): boolean {
  const message = extractTripErrorMessage(error).toLowerCase();

  return /already have an active trip/i.test(message) || /active trip/i.test(message) && /complete or cancel/i.test(message);
}

export function getTripStartErrorMessage(error: any): string {
  if (isActiveTripError(error)) {
    return 'You already have an active trip. Resume or cancel it from the trip-tracking screen before starting a new journey.';
  }

  return 'We couldn\'t initialize your trip tracking. Please try again.';
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
