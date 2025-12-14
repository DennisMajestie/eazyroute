
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService, EasyRouteEvent } from '../../../core/services/event.service';
import { MapComponent } from '../../../shared/components/map/map.component'; // We will use this for the live map

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [CommonModule, MapComponent],
  templateUrl: './vendor-dashboard.component.html',
  styleUrls: ['./vendor-dashboard.component.scss']
})
export class VendorDashboardComponent implements OnInit {
  private eventService = inject(EventService);

  // Mock User ID
  userId = 'user_001';

  events: EasyRouteEvent[] = [];
  selectedEvent: EasyRouteEvent | null = null;
  loading = true;

  // Live Tracking Data (Mock for now, would come from WebSocket)
  liveGuests = [
    { lat: 9.065, lng: 7.495, title: 'Guest: Chioma' },
    { lat: 9.055, lng: 7.502, title: 'Guest: Tunde' }
  ];

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.eventService.getOrganizerEvents(this.userId).subscribe(events => {
      this.events = events;
      this.loading = false;
      if (events.length > 0) {
        this.selectEvent(events[0]);
      }
    });
  }

  selectEvent(event: EasyRouteEvent) {
    this.selectedEvent = event;
    // Real implementation: Subscribe to WebSocket channel for this event
  }
}
