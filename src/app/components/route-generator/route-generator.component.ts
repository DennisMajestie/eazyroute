
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlongService } from '../../core/services/along.service';
import { AlongRoute, AlongSegment } from '../../models/transport.types';

@Component({
    selector: 'app-route-generator',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './route-generator.component.html',
    styleUrls: ['./route-generator.component.css']
})
export class RouteGeneratorComponent {
    routeLegs: AlongSegment[] = [];
    loading = false;
    error: string | null = null;
    totalDistance = 0;
    totalDuration = 0;

    fromLocation = {
        name: 'Dogongada Village',
        lat: 9.0067,
        lng: 7.3589
    };

    toLocation = {
        name: 'Lugbe Total',
        lat: 8.9897,
        lng: 7.3789
    };

    constructor(private alongService: AlongService) { }

    generateRoute(): void {
        this.loading = true;
        this.error = null;
        this.routeLegs = [];

        this.alongService.generateRoute(this.fromLocation, this.toLocation).subscribe({
            next: (response) => {
                if (response.success && response.data && response.data.length > 0) {
                    const route = response.data[0];
                    this.routeLegs = route.segments || [];
                    this.totalDistance = route.totalDistance;
                    this.totalDuration = route.totalTime;
                } else {
                    this.error = response.message || 'No route found';
                }
                this.loading = false;
            },
            error: (err) => {
                this.error = err.error?.message || err.message || 'Failed to generate route';
                this.loading = false;
            }
        });
    }
}
