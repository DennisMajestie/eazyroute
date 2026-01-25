// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loggingInterceptor } from './core/interceptors/logging.interceptor';
import { sanitizerInterceptor } from './core/interceptors/sanitizer.interceptor';

// ✨ NEW: Import engine adapter providers
import {
  BUS_STOP_REPOSITORY,
  LOCATION_SERVICE,
  ROUTING_SERVICE,
  FARE_CALCULATOR,
  NOTIFICATION_SERVICE,
  BusStopRepositoryAdapter,
  LocationServiceAdapter,
  RoutingServiceAdapter,
  FareCalculatorAdapter,
  NotificationServiceAdapter
} from './core/engines/adapters/engine-adapters.provider';
import { provideEasyrouteEngines } from './core/engines/adapters/engine-providers.config';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideEasyrouteEngines(),
    provideHttpClient(
      withInterceptors([
        loggingInterceptor,   // Optional: For debugging (runs first)
        sanitizerInterceptor, // Normalizes volatile API data
        authInterceptor,      // Adds JWT token
        errorInterceptor      // Handles errors (runs last)
      ])
    ),

    provideAnimations(),

    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      progressBar: true,
      closeButton: true,
      newestOnTop: true
    }),

    // ✨ NEW: EasyRoute Engine Adapter Providers
    { provide: BUS_STOP_REPOSITORY, useClass: BusStopRepositoryAdapter },
    { provide: LOCATION_SERVICE, useClass: LocationServiceAdapter },
    { provide: ROUTING_SERVICE, useClass: RoutingServiceAdapter },
    { provide: FARE_CALCULATOR, useClass: FareCalculatorAdapter },
    { provide: NOTIFICATION_SERVICE, useClass: NotificationServiceAdapter },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};