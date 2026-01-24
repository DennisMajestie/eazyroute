import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BusStopService } from '../../../core/services/bus-stop.service';
import { BusStop, SearchBusStopParams, TransportMode, VerificationStatus } from '../../../models/bus-stop.model';
import { TransportPointType, TRANSPORT_POINT_TYPES, TRANSPORT_MODES, getAllTransportPointTypes, getAllTransportModes } from '../../../models/transport-point.constants';
import { VerificationBadgeComponent } from '../../../shared/components/verification-badge/verification-badge.component';
import { TransportPointIconComponent } from '../../../shared/components/transport-point-icon/transport-point-icon.component';

@Component({
  selector: 'app-transport-point-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VerificationBadgeComponent,
    TransportPointIconComponent
  ],
  templateUrl: './transport-point-search.component.html',
  styleUrls: ['./transport-point-search.component.scss']
})
export class TransportPointSearchComponent implements OnInit {
  @Output() pointSelected = new EventEmitter<BusStop>();
  @Output() addNewPoint = new EventEmitter<void>();

  searchQuery: string = '';
  searchResults: BusStop[] = [];
  isLoading: boolean = false;

  // Filters
  selectedTypes: Set<TransportPointType> = new Set();
  selectedModes: Set<TransportMode> = new Set();
  selectedStatus: VerificationStatus | null = null;

  // Available options
  transportPointTypes = getAllTransportPointTypes();
  transportModes = getAllTransportModes();

  // Configs for display
  TRANSPORT_POINT_TYPES = TRANSPORT_POINT_TYPES;
  TRANSPORT_MODES = TRANSPORT_MODES;

  // Search debounce
  private searchSubject = new Subject<string>();

  constructor(private busStopService: BusStopService) { }

  ngOnInit() {
    // Setup debounced search
    this.searchSubject
      .pipe(debounceTime(300))
      .subscribe(query => {
        this.performSearch();
      });

    // Initial load
    this.performSearch();
  }

  onSearchInput() {
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch() {
    this.searchQuery = '';
    this.performSearch();
  }

  toggleTypeFilter(type: TransportPointType) {
    if (this.selectedTypes.has(type)) {
      this.selectedTypes.delete(type);
    } else {
      this.selectedTypes.add(type);
    }
    this.performSearch();
  }

  toggleModeFilter(mode: TransportMode) {
    if (this.selectedModes.has(mode)) {
      this.selectedModes.delete(mode);
    } else {
      this.selectedModes.add(mode);
    }
    this.performSearch();
  }

  clearAllFilters() {
    this.selectedTypes.clear();
    this.selectedModes.clear();
    this.selectedStatus = null;
    this.performSearch();
  }

  get activeFilterCount(): number {
    return this.selectedTypes.size + this.selectedModes.size + (this.selectedStatus ? 1 : 0);
  }

  performSearch() {
    this.isLoading = true;

    const params: SearchBusStopParams = {
      search: this.searchQuery || undefined,
      limit: 20
    };

    // Note: Backend might not support filtering by multiple types/modes
    // If it doesn't, we'll filter client-side
    this.busStopService.searchStops(params).pipe(
      catchError(error => {
        console.error('Search error:', error);
        this.isLoading = false;
        return of([]);
      })
    ).subscribe({
      next: (results) => {
        // Client-side filtering if needed
        const safeResults = (Array.isArray(results) ? results : []).filter(r => !!r);
        this.searchResults = this.filterResults(safeResults);
        this.isLoading = false;
      }
    });
  }

  private filterResults(results: BusStop[]): BusStop[] {
    let filtered = results;

    // Filter by types
    if (this.selectedTypes.size > 0) {
      filtered = filtered.filter(point => this.selectedTypes.has(point.type));
    }

    // Filter by modes
    if (this.selectedModes.size > 0) {
      filtered = filtered.filter(point =>
        point.transportModes?.some(mode => this.selectedModes.has(mode))
      );
    }

    // Filter by status
    if (this.selectedStatus) {
      filtered = filtered.filter(point => point.verificationStatus === this.selectedStatus);
    }

    return filtered;
  }

  selectPoint(point: BusStop) {
    this.pointSelected.emit(point);
  }

  upvotePoint(point: BusStop, event: Event) {
    event.stopPropagation();
    this.busStopService.upvoteStop(point.id).subscribe({
      next: () => {
        point.upvotes = (point.upvotes || 0) + 1;
      },
      error: (error) => {
        console.error('Upvote error:', error);
      }
    });
  }

  downvotePoint(point: BusStop, event: Event) {
    event.stopPropagation();
    this.busStopService.downvoteStop(point.id).subscribe({
      next: () => {
        point.downvotes = (point.downvotes || 0) + 1;
      },
      error: (error) => {
        console.error('Downvote error:', error);
      }
    });
  }

  onAddNewPoint() {
    this.addNewPoint.emit();
  }

  getLocalNamesDisplay(point: BusStop): string {
    if (!point.localNames || point.localNames.length === 0) {
      return '';
    }
    return point.localNames.join(', ');
  }
}
