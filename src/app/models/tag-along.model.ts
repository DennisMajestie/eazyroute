// src/app/models/tag-along.model.ts
export interface TagAlongRide {
    id: number;
    driverId: number;
    driver?: {
        id: number;
        fullName: string;
        rating: number;
        profileImage?: string;
        verified: boolean;
    };
    startLocation: string;
    endLocation: string;
    departureTime: Date;
    availableSeats: number;
    pricePerSeat: number;
    status: 'available' | 'full' | 'completed' | 'cancelled';
    createdAt: Date;
    requests?: RideRequest[];
}

export interface CreateRideRequest {
    startLocation: string;
    endLocation: string;
    departureTime: string;
    availableSeats: number;
    pricePerSeat: number;
}

export interface RideRequest {
    id: number;
    rideId: number;
    riderId: number;
    rider?: {
        id: number;
        fullName: string;
        rating: number;
        profileImage?: string;
    };
    seatsRequested: number;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
}

export interface RideSearchParams {
    startLocation?: string;
    endLocation?: string;
    date?: string;
    maxPrice?: number;
}
