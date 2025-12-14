
import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

export interface EventVenue {
    name: string;
    address: string;
    location: { lat: number; lng: number };
}

export interface EasyRouteEvent {
    id: string;
    organizerId: string;
    title: string;
    description: string;
    bannerUrl?: string;
    eventType: 'wedding' | 'conference' | 'concert' | 'other';
    venue: EventVenue;
    schedule: {
        start: Date;
        end: Date;
    };
    accessCode: string;
    status: 'draft' | 'published' | 'active' | 'completed' | 'cancelled';
    stats: {
        registeredGuests: number;
        guestsEnRoute: number;
        guestsArrived: number;
    };
}

export interface Guest {
    id: string;
    eventId: string;
    name: string;
    phone?: string;
    email?: string;
    status: 'registered' | 'en_route' | 'arrived' | 'no_show';
}

@Injectable({
    providedIn: 'root'
})
export class EventService {
    // Mock Data Store
    private events: EasyRouteEvent[] = [
        {
            id: 'evt_123',
            organizerId: 'user_001',
            title: 'Davido Timeless Concert',
            description: 'The biggest concert of the year live at Eagles Square.',
            eventType: 'concert',
            venue: {
                name: 'Eagles Square',
                address: 'Independent Ave, Central Business Dis, Abuja',
                location: { lat: 9.0601, lng: 7.4998 }
            },
            schedule: {
                start: new Date('2025-12-20T18:00:00'),
                end: new Date('2025-12-20T23:59:00')
            },
            accessCode: 'TIME25',
            status: 'published',
            stats: {
                registeredGuests: 1250,
                guestsEnRoute: 0,
                guestsArrived: 0
            }
        }
    ];

    private guests: Guest[] = [];

    constructor() { }

    /**
     * Get all events for an organizer
     */
    getOrganizerEvents(organizerId: string): Observable<EasyRouteEvent[]> {
        return of(this.events.filter(e => e.organizerId === organizerId)).pipe(delay(500));
    }

    /**
     * Get featured public events (for Dashboard)
     */
    getFeaturedEvents(): Observable<EasyRouteEvent[]> {
        return of(this.events).pipe(delay(500));
    }

    /**
     * Get single event by ID
     */
    getEventById(id: string): Observable<EasyRouteEvent | undefined> {
        const event = this.events.find(e => e.id === id);
        return of(event).pipe(delay(300));
    }

    /**
     * Get event by Access Code (Guest Flow)
     */
    getEventByCode(code: string): Observable<EasyRouteEvent> {
        const event = this.events.find(e => e.accessCode === code);
        if (event) {
            return of(event).pipe(delay(500));
        }
        return throwError(() => new Error('Invalid Event Code'));
    }

    /**
     * Create New Event
     */
    createEvent(eventData: Partial<EasyRouteEvent>): Observable<EasyRouteEvent> {
        const newEvent: EasyRouteEvent = {
            id: `evt_${Date.now()}`,
            organizerId: 'user_001', // Mock current user
            title: eventData.title || 'Untitled Event',
            description: eventData.description || '',
            eventType: eventData.eventType || 'other',
            venue: eventData.venue || { name: '', address: '', location: { lat: 0, lng: 0 } },
            schedule: eventData.schedule || { start: new Date(), end: new Date() },
            accessCode: this.generateAccessCode(),
            status: 'published',
            stats: { registeredGuests: 0, guestsEnRoute: 0, guestsArrived: 0 },
            bannerUrl: eventData.bannerUrl
        };

        this.events.unshift(newEvent);
        return of(newEvent).pipe(delay(800));
    }

    /**
     * Register a Guest
     */
    registerGuest(eventId: string, guestData: { name: string; phone?: string; email?: string }): Observable<Guest> {
        const newGuest: Guest = {
            id: `guest_${Date.now()}`,
            eventId,
            name: guestData.name,
            phone: guestData.phone,
            email: guestData.email,
            status: 'registered'
        };

        this.guests.push(newGuest);

        // Update stats
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            event.stats.registeredGuests++;
        }

        return of(newGuest).pipe(delay(600));
    }

    private generateAccessCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
}
