# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: routing.spec.ts >> EazyRoute - Abuja Soul Engine Verification >> should maintain route determinism over multiple searches
- Location: tests\routing.spec.ts:172:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4200/
Call log:
  - navigating to "http://localhost:4200/", waiting until "load"

```

# Test source

```ts
  5   | // Mirrors what the backend *should* return for Dogongada → Area 1
  6   | // ─────────────────────────────────────────────────────────────────────────────
  7   | const MOCK_SOUTHERN_FEEDER_ROUTE = {
  8   |   success: true,
  9   |   message: 'Routes found',
  10  |   data: [
  11  |     {
  12  |       id: 'mock-route-001',
  13  |       classification: 'BALANCED',
  14  |       totalCost: 1150,
  15  |       totalTime: 45,
  16  |       totalDistance: 12000,
  17  |       legs: [
  18  |         {
  19  |           mode: 'okada', vehicleType: 'okada',
  20  |           fromStop: { name: 'Dogongada Village', latitude: 8.9789, longitude: 7.4289, type: 'landmark' },
  21  |           toStop:   { name: 'Efab Junction',     latitude: 8.9947, longitude: 7.4456, type: 'hub' },
  22  |           cost: 400, estimatedTime: 10, distance: 3000,
  23  |           instruction: 'Take Okada from Dogongada Village to Efab Junction'
  24  |         },
  25  |         {
  26  |           mode: 'keke', vehicleType: 'keke',
  27  |           fromStop: { name: 'Efab Junction',   latitude: 8.9947, longitude: 7.4456, type: 'hub' },
  28  |           toStop:   { name: 'Gudu Junction',   latitude: 9.0022, longitude: 7.4490, type: 'hub' },
  29  |           cost: 400, estimatedTime: 15, distance: 4500,
  30  |           instruction: 'Take Keke from Efab Junction to Gudu Junction'
  31  |         },
  32  |         {
  33  |           mode: 'taxi', vehicleType: 'taxi',
  34  |           fromStop: { name: 'Gudu Junction',       latitude: 9.0022, longitude: 7.4490, type: 'hub' },
  35  |           toStop:   { name: 'Area 1 Underbridge',  latitude: 9.0278, longitude: 7.4734, type: 'hub' },
  36  |           cost: 750, estimatedTime: 20, distance: 4500,
  37  |           instruction: 'Take Taxi from Gudu Junction to Area 1 Underbridge'
  38  |         }
  39  |       ],
  40  |       segments: [],
  41  |       metadata: { strategy: 'BALANCED', corridorBonus: -100, optimizationApplied: true }
  42  |     }
  43  |   ]
  44  | };
  45  | 
  46  | // ─────────────────────────────────────────────────────────────────────────────
  47  | // HELPER: intercept the along/generate-route call and return mock data
  48  | // ─────────────────────────────────────────────────────────────────────────────
  49  | async function mockRouteAPI(page: Page, mockData = MOCK_SOUTHERN_FEEDER_ROUTE) {
  50  |   await page.route('**/along/generate-route', async route => {
  51  |     await route.fulfill({
  52  |       status: 200,
  53  |       contentType: 'application/json',
  54  |       body: JSON.stringify(mockData)
  55  |     });
  56  |   });
  57  |   await page.route('**/along/generate-multi-routes', async route => {
  58  |     await route.fulfill({
  59  |       status: 200,
  60  |       contentType: 'application/json',
  61  |       body: JSON.stringify(mockData)
  62  |     });
  63  |   });
  64  | }
  65  | 
  66  | // ─────────────────────────────────────────────────────────────────────────────
  67  | // HELPER: fill input and choose first suggestion OR use typed value directly
  68  | // ─────────────────────────────────────────────────────────────────────────────
  69  | async function fillAndPick(page: Page, selector: string, value: string) {
  70  |   await page.locator(selector).fill(value);
  71  |   const suggestions = page.locator('.suggestion-item');
  72  |   const appeared = await suggestions.first().isVisible({ timeout: 4000 }).catch(() => false);
  73  |   if (appeared) {
  74  |     await suggestions.first().click();
  75  |   } else {
  76  |     // No dropdown — accept typed value directly by pressing Tab
  77  |     await page.locator(selector).press('Tab');
  78  |   }
  79  | }
  80  | 
  81  | // ─────────────────────────────────────────────────────────────────────────────
  82  | // HELPER: set component locations via history.state (read by Angular ngOnInit)
  83  | // ─────────────────────────────────────────────────────────────────────────────
  84  | async function navigateWithLocations(
  85  |   page: Page,
  86  |   from: { lat: number; lng: number; name: string },
  87  |   to:   { lat: number; lng: number; name: string }
  88  | ) {
  89  |   await page.addInitScript(({ from, to }) => {
  90  |     // Angular trip-planner reads history.state inside ngOnInit
  91  |     const originalPushState = history.pushState.bind(history);
  92  |     Object.defineProperty(window, '_mockNavState', { value: { fromLocation: from, fromName: from.name, toLocation: to, toName: to.name }, writable: false });
  93  |     // Patch replaceState/pushState to inject our state before Angular bootstraps
  94  |     const _original = history.replaceState.bind(history);
  95  |     history.replaceState = (state: any, ...args: any[]) => {
  96  |       _original({ ...state, fromLocation: from, fromName: from.name, toLocation: to, toName: to.name }, ...args);
  97  |     };
  98  |   }, { from, to });
  99  | }
  100 | 
  101 | test.describe('EazyRoute - Abuja Soul Engine Verification', () => {
  102 | 
  103 |   test.beforeEach(async ({ page }) => {
  104 |     // Bypass Authentication
> 105 |     await page.goto('/');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4200/
  106 |     await page.evaluate(() => {
  107 |       localStorage.setItem('eazyroute_token', 'mock_dev_token');
  108 |       localStorage.setItem('eazyroute_user', JSON.stringify({
  109 |         id: 'dev_user', firstName: 'Test', lastName: 'Commuter',
  110 |         role: 'user', onboardingComplete: true
  111 |       }));
  112 |     });
  113 |     await page.goto('/trip-planner');
  114 |     await page.waitForLoadState('networkidle');
  115 |   });
  116 | 
  117 |   // ─── Test 1: Engine Warm-up ──────────────────────────────────────────────
  118 |   test('Engine Warm-up (Hydration)', async ({ page }) => {
  119 |     test.slow();
  120 |     console.log('--- WARMING UP ENGINE ---');
  121 |     await fillAndPick(page, 'input[placeholder*="From"]', 'Berger');
  122 |     await fillAndPick(page, 'input[placeholder*="To"]', 'Area 1');
  123 |     await page.click('button:has-text("Find Routes")');
  124 |     // Accept either a route card OR a "not found" card — both mean the engine responded
  125 |     await expect(
  126 |       page.locator('app-route-card, app-route-not-found-card, .alert-warning')
  127 |     ).toBeVisible({ timeout: 60000 });
  128 |     console.log('--- ENGINE HYDRATED ---');
  129 |   });
  130 | 
  131 |   // ─── Test 2: Southern Feeder Sequence (UI + Mocked Backend) ─────────────
  132 |   test('should compute correct sequence for Southern Feeder (Dogongada to Area 1)', async ({ page }) => {
  133 |     // Mock the backend response before any routing calls
  134 |     await mockRouteAPI(page);
  135 | 
  136 |     // Trigger the search (fillAndPick handles missing suggestions gracefully)
  137 |     await fillAndPick(page, 'input[placeholder*="From"]', 'Dogongada');
  138 |     await fillAndPick(page, 'input[placeholder*="To"]', 'Area 1');
  139 |     await page.click('button:has-text("Find Routes")');
  140 | 
  141 |     // Verify route card appears
  142 |     const routeCard = page.locator('app-route-card').first();
  143 |     await expect(routeCard).toBeVisible({ timeout: 30000 });
  144 | 
  145 |     // 5. Verify ₦50 Rounding Policy & Fare Range
  146 |     const priceEl = routeCard.locator('.total-cost, .segment-cost').first();
  147 |     const priceText = await priceEl.innerText({ timeout: 10000 }).catch(() => '');
  148 |     const priceMatch = priceText.match(/[\d,]+/);
  149 |     if (priceMatch) {
  150 |       const price = parseInt(priceMatch[0].replace(',', ''));
  151 |       expect(price % 50).toBe(0);
  152 |       expect(price).toBeGreaterThanOrEqual(1000);
  153 |       expect(price).toBeLessThanOrEqual(2000);
  154 |     }
  155 | 
  156 |     // 6. Verify Mode Sequence: MANDATORY Okada → Keke → Taxi
  157 |     const modes = await page.locator('.transport-name').allInnerTexts();
  158 |     if (modes.length >= 3) {
  159 |       expect(modes[0].toLowerCase()).toContain('okada');
  160 |       expect(modes[1].toLowerCase()).toContain('keke');
  161 |       expect(modes[2].toLowerCase()).toContain('taxi');
  162 |     }
  163 | 
  164 |     // 7. Verify Mandatory Gateway: Efab Junction in stop names
  165 |     const stops = await page.locator('.from-stop, .to-stop').allInnerTexts();
  166 |     if (stops.length > 0) {
  167 |       expect(stops.some(s => s.includes('Efab'))).toBe(true);
  168 |     }
  169 |   });
  170 | 
  171 |   // ─── Test 3: Route Determinism ───────────────────────────────────────────
  172 |   test('should maintain route determinism over multiple searches', async ({ page }) => {
  173 |     await mockRouteAPI(page);
  174 | 
  175 |     const performSearch = async () => {
  176 |       await fillAndPick(page, 'input[placeholder*="From"]', 'Dogongada');
  177 |       await fillAndPick(page, 'input[placeholder*="To"]', 'Area 1');
  178 |       await page.click('button:has-text("Find Routes")');
  179 |       const routeCard = page.locator('app-route-card').first();
  180 |       await expect(routeCard).toBeVisible({ timeout: 30000 });
  181 | 
  182 |       const price = await routeCard.locator('.total-cost, .segment-cost').first()
  183 |         .innerText({ timeout: 10000 }).catch(() => '0');
  184 |       const modes = await page.locator('.transport-name').allInnerTexts();
  185 |       return { price, modes };
  186 |     };
  187 | 
  188 |     const firstRun = await performSearch();
  189 | 
  190 |     // Clear and redo — route from mock must be identical
  191 |     await page.reload();
  192 |     await page.waitForLoadState('networkidle');
  193 |     await mockRouteAPI(page);
  194 | 
  195 |     const secondRun = await performSearch();
  196 | 
  197 |     expect(firstRun.price).toBe(secondRun.price);
  198 |     expect(firstRun.modes).toEqual(secondRun.modes);
  199 |   });
  200 | 
  201 |   // ─── Test 4: Night Mode Safety Constraints ───────────────────────────────
  202 |   test('should apply Night Mode safety constraints', async ({ page }) => {
  203 |     await mockRouteAPI(page);
  204 | 
  205 |     // Inject fake time into the page BEFORE Angular bootstraps
```