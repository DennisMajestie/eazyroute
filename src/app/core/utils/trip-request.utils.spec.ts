import {
  resolveTripRouteId,
  sanitizeTripRouteForRequest,
  isLogoutRequestUrl,
  shouldShowSessionExpiredToast,
  isActiveTripError,
  getTripStartErrorMessage
} from './trip-request.utils';

describe('trip-request.utils', () => {
  it('prefers a usable MongoDB route id from the selected route payload', () => {
    expect(resolveTripRouteId({ id: '64f0c1d7a9b5c2d3e4f56789' })).toBe('64f0c1d7a9b5c2d3e4f56789');
    expect(resolveTripRouteId({ _id: '64f0c1d7a9b5c2d3e4f56789' })).toBe('64f0c1d7a9b5c2d3e4f56789');
  });

  it('falls back to a valid Mongo-style route id when the route payload uses placeholder ids', () => {
    const routeId = resolveTripRouteId({ id: 'route-123' });
    const routeIdFromRouteField = resolveTripRouteId({ routeId: 'custom-route-id' });

    expect(routeId).toMatch(/^[0-9a-fA-F]{24}$/);
    expect(routeIdFromRouteField).toMatch(/^[0-9a-fA-F]{24}$/);
    expect(routeId).not.toBe('route-123');
    expect(routeIdFromRouteField).not.toBe('custom-route-id');
  });

  it('sanitizes the selected route payload so the backend sees a valid Mongo route id', () => {
    const selectedRoute = {
      id: 'route-123',
      _id: '64f0c1d7a9b5c2d3e4f56789',
      routeId: 'custom-route-id',
      name: 'Route 1'
    };

    const sanitized = sanitizeTripRouteForRequest(selectedRoute);

    expect(sanitized.id).toBe('64f0c1d7a9b5c2d3e4f56789');
    expect(sanitized._id).toBe('64f0c1d7a9b5c2d3e4f56789');
    expect(sanitized.routeId).toBe('64f0c1d7a9b5c2d3e4f56789');
    expect(sanitized.name).toBe('Route 1');
  });

  it('suppresses the session-expired toast while the user is on the login route or already logged out', () => {
    expect(shouldShowSessionExpiredToast('/auth/login', '/auth/login', false)).toBeFalse();
    expect(shouldShowSessionExpiredToast('/api/v1/trips', '/auth/login', false)).toBeFalse();
    expect(shouldShowSessionExpiredToast('/api/v1/trips', '/dashboard', false)).toBeFalse();
    expect(shouldShowSessionExpiredToast('/api/v1/trips', '/dashboard', true)).toBeTrue();
  });

  it('detects logout calls so the interceptor does not recurse on them', () => {
    expect(isLogoutRequestUrl('https://example.com/api/v1/auth/logout')).toBeTrue();
    expect(isLogoutRequestUrl('https://example.com/api/v1/trips')).toBeFalse();
  });

  it('recognizes the active-trip backend error while starting a journey', () => {
    const error = {
      status: 400,
      error: {
        message: 'You already have an active trip. Please complete or cancel it first.'
      }
    };

    expect(isActiveTripError(error)).toBeTrue();
    expect(getTripStartErrorMessage(error)).toContain('already have an active trip');
  });

  it('falls back to a generic message for unrelated trip-start failures', () => {
    const error = {
      status: 500,
      error: { message: 'Something else went wrong.' }
    };

    expect(isActiveTripError(error)).toBeFalse();
    expect(getTripStartErrorMessage(error)).toContain('We couldn\'t initialize your trip tracking');
  });
});
