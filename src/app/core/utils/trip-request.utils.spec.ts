import { resolveTripRouteId, isLogoutRequestUrl } from './trip-request.utils';

describe('trip-request.utils', () => {
  it('prefers a usable route id from the selected route payload', () => {
    expect(resolveTripRouteId({ id: 'route-123' })).toBe('route-123');
    expect(resolveTripRouteId({ _id: '64f0c1d7a9b5c2d3e4f56789' })).toBe('64f0c1d7a9b5c2d3e4f56789');
    expect(resolveTripRouteId({ routeId: 'custom-route-id' })).toBe('custom-route-id');
  });

  it('detects logout calls so the interceptor does not recurse on them', () => {
    expect(isLogoutRequestUrl('https://example.com/api/v1/auth/logout')).toBeTrue();
    expect(isLogoutRequestUrl('https://example.com/api/v1/trips')).toBeFalse();
  });
});
