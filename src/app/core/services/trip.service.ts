import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { WebSocketService } from './websocket.service';
import { DeviationStatus, DeviationEvent } from '../../models/deviation.types';

@Injectable({
    providedIn: 'root'
})
export class TripService {
    private apiUrl = `${environment.apiUrl}/trips`;

    constructor(
        private http: HttpClient,
        private wsService: WebSocketService
    ) { }

    /**
     * Start a new trip based on a route
     */
    startTrip(routeId: string, currentLocation: { lat: number, lng: number }): Observable<any> {
        return this.http.post(`${this.apiUrl}`, {
            routeId,
            currentLocation: {
                latitude: currentLocation.lat,
                longitude: currentLocation.lng
            }
        });
    }

    /**
     * Update location (Heartbeat)
     */
    updateLocation(tripId: string, location: { lat: number, lng: number }): Observable<any> {
        return this.http.put(`${this.apiUrl}/${tripId}/location`, {
            latitude: location.lat,
            longitude: location.lng
        });
    }

    /**
     * Get deviation status for an active trip
     */
    getDeviationStatus(tripId: string): Observable<DeviationStatus> {
        return this.http.get<{ success: boolean; data: DeviationStatus }>(
            `${this.apiUrl}/${tripId}/deviation`
        ).pipe(
            map(response => response.data)
        );
    }

    /**
     * Listen for real-time deviation updates via WebSocket
     */
    onDeviationUpdate(): Observable<DeviationEvent> {
        return this.wsService.on('deviation_update');
    }

    /**
     * Listen for reroute suggestions
     */
    onRerouteSuggestion() {
        return this.wsService.on('reroute_suggestion');
    }

    /**
     * Listen for milestone reached events
     */
    onMilestoneReached() {
        return this.wsService.on('milestone_reached');
    }

    /**
     * End an active trip
     */
    endTrip(tripId: string, summary?: { actualCost?: number; rating?: number }): Observable<any> {
        return this.http.post(`${this.apiUrl}/${tripId}/end`, summary || {});
    }

    /**
     * Get trip details
     */
    getTripDetails(tripId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${tripId}`);
    }
}
