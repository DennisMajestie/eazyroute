export function getPostLoginRoute(hasCompletedOnboarding: boolean, isAdmin: boolean): string {
  return hasCompletedOnboarding || isAdmin ? '/dashboard' : '/onboarding';
}

export function shouldPromptActiveTripOnDashboard(hasCompletedOnboarding: boolean, isAdmin: boolean): boolean {
  return getPostLoginRoute(hasCompletedOnboarding, isAdmin) === '/dashboard';
}
