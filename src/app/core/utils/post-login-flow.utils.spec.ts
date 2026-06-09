import { getPostLoginRoute, shouldPromptActiveTripOnDashboard } from './post-login-flow.utils';

describe('post-login flow utils', () => {
  it('routes completed users to the dashboard', () => {
    expect(getPostLoginRoute(true, false)).toBe('/dashboard');
    expect(getPostLoginRoute(false, true)).toBe('/dashboard');
  });

  it('keeps the active-trip prompt in the dashboard path for authenticated users', () => {
    expect(shouldPromptActiveTripOnDashboard(true, false)).toBeTrue();
    expect(shouldPromptActiveTripOnDashboard(false, true)).toBeTrue();
    expect(shouldPromptActiveTripOnDashboard(false, false)).toBeFalse();
  });
});
