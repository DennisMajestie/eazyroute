import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TagAlongService } from '../../../core/services/tag-along.service';
import { TagAlongRide, RideSearchParams } from '../../../models/tag-along.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import Swal from 'sweetalert2';

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
  }

  showComingSoon(feature: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    Swal.fire({
      title: 'Coming Soon! 🚀',
      html: `
        <div style="font-family: 'Inter', sans-serif; text-align: center; padding: 10px;">
          <p style="font-size: 1.1rem; color: #374151; margin-bottom: 1.5rem; line-height: 1.6;">
            We are working hard to build the <strong>${feature}</strong> feature for you. 
            Make we join hands build this platform together! 🇳🇬
          </p>
          <div style="font-size: 3rem; margin-bottom: 1.5rem;">🛠️</div>
          <p style="font-size: 0.9rem; color: #6B7280; font-style: italic;">
            Stay tuned - EazyRoute dey come active with more hubs soon!
          </p>
        </div>
      `,
      confirmButtonText: 'Correct! 👍',
      confirmButtonColor: '#008751',
      customClass: {
        confirmButton: 'btn btn-primary px-4 py-2'
      }
    });
  }
}
