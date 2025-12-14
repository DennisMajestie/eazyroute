// // src/app/core/engines/adapters/engine-providers.config.ts
// import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

// // Import injection tokens
// import {
//   BUS_STOP_REPOSITORY,
//   LOCATION_SERVICE,
//   ROUTING_SERVICE,
//   FARE_CALCULATOR,
//   NOTIFICATION_SERVICE
// } from './engine-adapters.provider';

// // Import HTTP-based adapter implementations
// import { BusStopHttpAdapter } from './bus-stop-http.adapter';
// import { LocationServiceAdapter } from './location-service.adapter';
// import { RoutingHttpAdapter } from './routing-http.adapter';
// import { FareCalculatorHttpAdapter } from './fare-calculator-http.adapter';
// import { NotificationHttpAdapter } from './notification-http.adapter';

// // Import engines
// import { RouteGenerationEngine } from '../route-generation.engine';
// import { TripExecutionEngine } from '../trip-execution.engine';
// import { ReroutingEngine } from '../rerouting.engine';

// // Import services
// import { EasyrouteOrchestratorService } from '../../services/easyroute-orchestrator.service';
// import { TripHttpService } from '../../services/trip-http.service';
// import { ReroutingHttpService } from '../../services/rerouting-http.service';
// import { RouteGenerationHttpService } from '../../services/route-generation-http.service';

// /**
//  * ═══════════════════════════════════════════════════════════════
//  * PROVIDE EASYROUTE ENGINES (Standalone Function)
//  * ═══════════════════════════════════════════════════════════════
//  * 
//  * This function provides all necessary dependencies for EazyRoute engines
//  * in a standalone Angular application.
//  * 
//  * @returns EnvironmentProviders for all engine dependencies
//  */
// export function provideEasyrouteEngines(): EnvironmentProviders {
//   return makeEnvironmentProviders([
//     // ==================== ADAPTERS ====================

//     // Bus Stop Repository - HTTP Implementation
//     {
//       provide: BUS_STOP_REPOSITORY,
//       useClass: BusStopHttpAdapter
//     },

//     // Location Service - Uses GeolocationService
//     {
//       provide: LOCATION_SERVICE,
//       useClass: LocationServiceAdapter
//     },

//     // Routing Service - HTTP Implementation
//     {
//       provide: ROUTING_SERVICE,
//       useClass: RoutingHttpAdapter
//     },

//     // Fare Calculator - HTTP Implementation with Fallback
//     {
//       provide: FARE_CALCULATOR,
//       useClass: FareCalculatorHttpAdapter
//     },

//     // Notification Service - HTTP + Browser Notifications
//     {
//       provide: NOTIFICATION_SERVICE,
//       useClass: NotificationHttpAdapter
//     },

//     // ==================== ENGINES ====================

//     RouteGenerationEngine,
//     TripExecutionEngine,
//     ReroutingEngine,

//     // ==================== HTTP SERVICES ====================

//     TripHttpService,
//     ReroutingHttpService,
//     RouteGenerationHttpService,

//     // ==================== ORCHESTRATOR ====================

//     EasyrouteOrchestratorService
//   ]);
// }

// /**
//  * ═══════════════════════════════════════════════════════════════
//  * USAGE IN APP.CONFIG.TS (Standalone Angular)
//  * ═══════════════════════════════════════════════════════════════
//  * 
//  * import { ApplicationConfig } from '@angular/core';
//  * import { provideRouter } from '@angular/router';
//  * import { provideHttpClient } from '@angular/common/http';
//  * import { provideEasyrouteEngines } from './core/engines/adapters/engine-providers.config';
//  * import { routes } from './app.routes';
//  * 
//  * export const appConfig: ApplicationConfig = {
//  *   providers: [
//  *     provideRouter(routes),
//  *     provideHttpClient(),
//  *     provideEasyrouteEngines(),  // ← Add this line
//  *   ]
//  * };
//  */

// /**
//  * ═══════════════════════════════════════════════════════════════
//  * ALTERNATIVE: Individual Provider Arrays (for NgModule)
//  * ═══════════════════════════════════════════════════════════════
//  */
// export const ENGINE_ADAPTER_PROVIDERS = [
//   { provide: BUS_STOP_REPOSITORY, useClass: BusStopHttpAdapter },
//   { provide: LOCATION_SERVICE, useClass: LocationServiceAdapter },
//   { provide: ROUTING_SERVICE, useClass: RoutingHttpAdapter },
//   { provide: FARE_CALCULATOR, useClass: FareCalculatorHttpAdapter },
//   { provide: NOTIFICATION_SERVICE, useClass: NotificationHttpAdapter }
// ];

// export const ENGINE_SERVICE_PROVIDERS = [
//   RouteGenerationEngine,
//   TripExecutionEngine,
//   ReroutingEngine,
//   TripHttpService,
//   ReroutingHttpService,
//   RouteGenerationHttpService,
//   EasyrouteOrchestratorService
// ];

// /**
//  * All providers combined (for NgModule)
//  */
// export const ENGINE_PROVIDERS = [
//   ...ENGINE_ADAPTER_PROVIDERS,
//   ...ENGINE_SERVICE_PROVIDERS
// ];

// src/app/core/engines/adapters/engine-providers.config.ts
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

// Import injection tokens
import {
  BUS_STOP_REPOSITORY,
  LOCATION_SERVICE,
  ROUTING_SERVICE,
  FARE_CALCULATOR,
  NOTIFICATION_SERVICE
} from './engine-adapters.provider';

// Import HTTP-based adapter implementations
import { BusStopHttpAdapter } from './bus-stop-http.adapter';
import { LocationServiceAdapter } from './location-service.adapter';
import { RoutingHttpAdapter } from './routing-http.adapter';
import { FareCalculatorHttpAdapter } from './fare-calculator-http.adapter';
import { NotificationHttpAdapter } from './notification-http.adapter';

// Import engines
import { RouteGenerationEngine } from '../route-generation.engine';
import { TripExecutionEngine } from '../trip-execution.engine';
import { ReroutingEngine } from '../rerouting.engine';

// Import services
import { EasyrouteOrchestratorService } from '../../services/easyroute-orchestrator.service';
import { TripHttpService } from '../../services/trip-http.service';
import { ReroutingHttpService } from '../../services/rerouting-http.service';
import { RouteGenerationHttpService } from '../../services/route-generation-http.service';

/**
 * ═══════════════════════════════════════════════════════════════
 * PROVIDE EASYROUTE ENGINES (Standalone Function)
 * ═══════════════════════════════════════════════════════════════
 * 
 * This function provides all necessary dependencies for EazyRoute engines
 * in a standalone Angular application.
 * 
 * @returns EnvironmentProviders for all engine dependencies
 */
export function provideEasyrouteEngines(): EnvironmentProviders {
  return makeEnvironmentProviders([
    // ==================== ADAPTERS ====================

    // Bus Stop Repository - HTTP Implementation
    {
      provide: BUS_STOP_REPOSITORY,
      useClass: BusStopHttpAdapter
    },

    // Location Service - Uses GeolocationService
    {
      provide: LOCATION_SERVICE,
      useClass: LocationServiceAdapter
    },

    // Routing Service - HTTP Implementation
    {
      provide: ROUTING_SERVICE,
      useClass: RoutingHttpAdapter
    },

    // Fare Calculator - HTTP Implementation with Fallback
    {
      provide: FARE_CALCULATOR,
      useClass: FareCalculatorHttpAdapter
    },

    // Notification Service - HTTP + Browser Notifications
    {
      provide: NOTIFICATION_SERVICE,
      useClass: NotificationHttpAdapter
    },

    // ==================== ENGINES ====================

    RouteGenerationEngine,
    TripExecutionEngine,
    ReroutingEngine,

    // ==================== HTTP SERVICES ====================

    TripHttpService,
    ReroutingHttpService,
    RouteGenerationHttpService,

    // ==================== ORCHESTRATOR ====================

    EasyrouteOrchestratorService
  ]);
}

/**
 * ═══════════════════════════════════════════════════════════════
 * USAGE IN APP.CONFIG.TS (Standalone Angular)
 * ═══════════════════════════════════════════════════════════════
 * 
 * import { ApplicationConfig } from '@angular/core';
 * import { provideRouter } from '@angular/router';
 * import { provideHttpClient } from '@angular/common/http';
 * import { provideEasyrouteEngines } from './core/engines/adapters/engine-providers.config';
 * import { routes } from './app.routes';
 * 
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideRouter(routes),
 *     provideHttpClient(),
 *     provideEasyrouteEngines(),  // ← Add this line
 *   ]
 * };
 */

/**
 * ═══════════════════════════════════════════════════════════════
 * ALTERNATIVE: Individual Provider Arrays (for NgModule)
 * ═══════════════════════════════════════════════════════════════
 */
export const ENGINE_ADAPTER_PROVIDERS = [
  { provide: BUS_STOP_REPOSITORY, useClass: BusStopHttpAdapter },
  { provide: LOCATION_SERVICE, useClass: LocationServiceAdapter },
  { provide: ROUTING_SERVICE, useClass: RoutingHttpAdapter },
  { provide: FARE_CALCULATOR, useClass: FareCalculatorHttpAdapter },
  { provide: NOTIFICATION_SERVICE, useClass: NotificationHttpAdapter }
];

export const ENGINE_SERVICE_PROVIDERS = [
  RouteGenerationEngine,
  TripExecutionEngine,
  ReroutingEngine,
  TripHttpService,
  ReroutingHttpService,
  RouteGenerationHttpService,
  EasyrouteOrchestratorService
];

/**
 * All providers combined (for NgModule)
 */
export const ENGINE_PROVIDERS = [
  ...ENGINE_ADAPTER_PROVIDERS,
  ...ENGINE_SERVICE_PROVIDERS
];