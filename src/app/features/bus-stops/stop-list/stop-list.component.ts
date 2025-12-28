import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BusStopService, BusStopResponse } from '../../../core/services/bus-stop.service';

@Component({
  selector: 'app-stop-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stop-list.component.html',
  styleUrl: './stop-list.component.scss'
})
export class StopListComponent implements OnInit {
  allStops: BusStopResponse[] = [];
  filteredStops: BusStopResponse[] = [];
  searchTerm = '';
  loading = true;
  page = 1;
  limit = 20;
  totalStops = 0;
  totalPages = 0;

  constructor(
    private busStopService: BusStopService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadAllStops();
  }

  loadAllStops(): void {
    this.loading = true;

    this.busStopService.getAllBusStops(this.page, this.limit, true)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Append new stops to existing ones for "Load More" functionality
            if (this.page === 1) {
              this.allStops = response.data;
            } else {
              this.allStops = [...this.allStops, ...response.data];
            }

            this.filteredStops = this.allStops;
            this.totalStops = response.pagination.total;
            this.totalPages = response.pagination.pages;
            this.loading = false;

            console.log('[Bus Stops] Loaded stops:', this.allStops.length, 'of', this.totalStops);
          }
        },
        error: (err) => {
          console.error('[Bus Stops] Failed to load bus stops:', err);
          this.loading = false;
        }
      });
  }

  onSearch(event: any): void {
    const term = event.target.value.toLowerCase();

    if (!term) {
      this.filteredStops = this.allStops;
      return;
    }

    this.filteredStops = this.allStops.filter(stop =>
      stop.name.toLowerCase().includes(term) ||
      stop.localNames?.some((ln: string) => ln.toLowerCase().includes(term)) ||
      stop.address?.toLowerCase().includes(term)
    );

    console.log('[Bus Stops] Search results:', this.filteredStops.length);
  }

  onStopClick(stop: BusStopResponse): void {
    // Navigate to route generation with stop as destination
    this.router.navigate(['/route'], {
      queryParams: {
        toId: stop._id || stop.id,
        toName: stop.name,
        toLat: stop.location.coordinates[1],
        toLng: stop.location.coordinates[0]
      }
    });
  }

  loadMore(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadAllStops();
    }
  }

  getIconForType(type: string): string {
    switch (type) {
      case 'bus_terminal':
        return 'bus-outline';
      case 'landmark':
        return 'location-outline';
      case 'shopping':
        return 'cart-outline';
      case 'residential':
        return 'home-outline';
      default:
        return 'pin-outline';
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
