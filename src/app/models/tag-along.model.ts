// src/app/models/tag-along.model.ts

export interface UserProfile {
    _id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    rating?: number;
}

export interface TagAlongRide {
    _id: string;
    title: string;
    description: string;
    origin: string;
    destination: string;
    departureDate: string | Date;
    departureTime: string;
    estimatedArrivalTime?: string;
    availableSeats: number;
    pricePerSeat: number;
    vehicleType: 'car' | 'van' | 'bus' | 'suv' | 'motorcycle' | 'other';
    vehicleDetails?: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    createdBy: UserProfile;
    participants: any[]; // Define properly if needed
    meetingPoint?: string;
    notes?: string;
    createdAt: Date;
    remainingSeats?: number; // Virtual
}

export interface CreateRideRequest {
    title: string;
    description?: string;
    origin: string;
    destination: string;
    originLatitude: number;
    originLongitude: number;
    destinationLatitude: number;
    destinationLongitude: number;
    departureDate: string;
    departureTime: string;
    availableSeats: number;
    pricePerSeat: number;
    vehicleType: string;
    vehicleDetails?: string;
    meetingPoint?: string;
    notes?: string;
}

export interface RideSearchParams {
    origin?: string;
    destination?: string;
    departureDate?: string;
    minSeats?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
}

