import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TagAlongService } from '../../../core/services/tag-along.service';
import { TagAlongRide, RideSearchParams } from '../../../models/tag-along.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-available-rides',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './available-rides.component.html',
  styleUrl: './available-rides.component.scss'
})
export class AvailableRidesComponent implements OnInit {
  private tagAlongService = inject(TagAlongService);

  rides = signal<TagAlongRide[]>([]);
  loading = signal<boolean>(false);

  // Search Filters
  searchOrigin = '';
  searchDestination = '';
  searchDate = '';

  private searchSubject = new Subject<RideSearchParams>();

  ngOnInit() {
    this.loadRides();

    // Debounce search
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(params => {
      this.loadRides(params);
    });
  }

  loadRides(params?: RideSearchParams) {
    this.loading.set(true);
    this.tagAlongService.getAvailableRides(params).subscribe({
      next: (response) => {
        if (response.success) {
          this.rides.set(response.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load rides', err);
        this.loading.set(false);
      }
    });
  }

  onSearch() {
    const params: RideSearchParams = {};
    if (this.searchOrigin) params.origin = this.searchOrigin;
    if (this.searchDestination) params.destination = this.searchDestination;
    if (this.searchDate) params.departureDate = this.searchDate;

    this.searchSubject.next(params);
  }

  joinRide(rideId: string) {
    // Navigate to details or open modal
    console.log('Join ride', rideId);
  }
}
