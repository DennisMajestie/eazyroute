// src/app/core/engines/adapters/engine-adapters.provider.ts

import { InjectionToken } from '@angular/core';
import {
    IBusStopRepository,
    ILocationService,
    IRoutingService,
    IFareCalculator,
    INotificationService
} from '../types/easyroute.types';

// ✅ Export injection tokens
export const BUS_STOP_REPOSITORY = new InjectionToken<IBusStopRepository>('IBusStopRepository');
export const LOCATION_SERVICE = new InjectionToken<ILocationService>('ILocationService');
export const ROUTING_SERVICE = new InjectionToken<IRoutingService>('IRoutingService');
export const FARE_CALCULATOR = new InjectionToken<IFareCalculator>('IFareCalculator');
export const NOTIFICATION_SERVICE = new InjectionToken<INotificationService>('INotificationService');

// ✅ Export adapter classes (add these exports)
export { BusStopRepositoryAdapter } from './bus-stop-repository.adapter';
export { LocationServiceAdapter } from './location-service.adapter';
export { RoutingServiceAdapter } from './routing-service.adapter';
export { FareCalculatorAdapter } from './fare-calculator.adapter';
export { NotificationServiceAdapter } from './notification-service.adapter';