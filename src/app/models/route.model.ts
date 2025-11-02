
// Most recommended - src/app/models/route.model.ts
export interface TransportRoute {
    id: number;
    routeName: string;
    startStop: BusStopBasic;
    endStop: BusStopBasic;
    fare: number;
    avgDuration: number;
    distance?: number;
    createdAt: Date;
}

export interface BusStopBasic {
    id: number;
    name: string;
    area: string;
    latitude: number;
    longitude: number;
}

export interface TransportRouteDetails extends TransportRoute {
    stops: RouteStop[];
    operators?: string[];
    popularity: number;
}

export interface RouteStop {
    id: number;
    stopId: number;
    routeId: number;
    stopOrder: number;
    distanceFromPrevious: number;
    stop: BusStopBasic;
}

export interface RouteSearchParams {
    startLocation?: string;
    endLocation?: string;
    maxFare?: number;
    date?: string;
}