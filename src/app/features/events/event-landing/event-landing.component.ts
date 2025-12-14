
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EventService, EasyRouteEvent } from '../../../core/services/event.service';

@Component({
    selector: 'app-event-landing',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './event-landing.component.html',
    styleUrls: ['./event-landing.component.scss']
})
export class EventLandingComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private eventService = inject(EventService);
    private fb = inject(FormBuilder);

    event: EasyRouteEvent | null = null;
    loading = true;
    error: string | null = null;
    isRegistered = false;

    registrationForm: FormGroup = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.email]],
        phone: ['', [Validators.required, Validators.pattern('^[0-9]+$')]]
    });

    ngOnInit() {
        const code = this.route.snapshot.paramMap.get('code');
        if (code) {
            this.loadEvent(code);
        } else {
            // Fallback / Demo purpose
            this.loadEvent('TIME25');
        }
    }

    loadEvent(code: string) {
        this.loading = true;
        this.eventService.getEventByCode(code).subscribe({
            next: (event) => {
                this.event = event;
                this.loading = false;
            },
            error: (err) => {
                this.error = 'Event not found or invalid code.';
                this.loading = false;
            }
        });
    }

    register() {
        if (this.registrationForm.invalid || !this.event) return;

        this.loading = true;
        this.eventService.registerGuest(this.event.id, this.registrationForm.value).subscribe({
            next: () => {
                this.isRegistered = true;
                this.loading = false;
            },
            error: () => {
                this.error = 'Registration failed. Please try again.';
                this.loading = false;
            }
        });
    }

    startNavigation() {
        // Navigate to Trip Planner with destination set
        // We will implement query params handling in TripPlanner next
        if (this.event) {
            this.router.navigate(['/dashboard/trip-planner'], {
                queryParams: {
                    destLat: this.event.venue.location.lat,
                    destLng: this.event.venue.location.lng,
                    destName: this.event.venue.name,
                    eventName: this.event.title
                }
            });
        }
    }
}
