// src/app/models/trip.model.ts
export interface Trip {
    id: number;
    userId: number;
    type: 'route' | 'tag-along';
    routeId?: number;
    rideId?: number;
    startLocation: string;
    endLocation: string;
    fare: number;
    date: Date;
    status: 'completed' | 'cancelled' | 'ongoing';
    rating?: number;
    createdAt: Date;
}