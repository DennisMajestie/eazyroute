
// src/app/models/bus-stop.model.ts
export interface BusStop {
    id: number;
    name: string;
    area: string;
    latitude: number;
    longitude: number;
    verified: boolean;
    addedBy?: number;
    createdAt: Date;
}

export interface CreateBusStopRequest {
    name: string;
    area: string;
    latitude: number;
    longitude: number;
}