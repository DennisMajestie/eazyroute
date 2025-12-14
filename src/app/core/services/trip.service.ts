import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WebSocketService } from './websocket.service';

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
     * Listen for live events
     */
    onRerouteSuggestion() {
        return this.wsService.on('reroute_suggestion');
    }

    onMilestoneReached() {
        return this.wsService.on('milestone_reached');
    }
}
