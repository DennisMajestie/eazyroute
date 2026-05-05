import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';
import { AiService } from '../../../core/services/ai.service';

@Component({
  selector: 'app-harvest-registry',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './harvest-registry.component.html',
  styleUrls: ['./harvest-registry.component.scss']
})
export class HarvestRegistryComponent implements OnInit {
  harvestedStops: any[] = [];
  totalCount: number = 0;
  page: number = 1;
  limit: number = 20;
  searchQuery: string = '';
  isLoading: boolean = false;
  isEnriching: boolean = false;
  
  // Expose Math to the template to fix TS2339
  protected readonly Math = Math;

  constructor(
    private adminService: AdminService,
    private toastService: ToastNotificationService,
    private aiService: AiService
  ) {}

  ngOnInit(): void {
    this.loadHarvestedStops();
  }

  loadHarvestedStops(): void {
    this.isLoading = true;
    this.adminService.getHarvestedBusStops(this.page, this.limit, this.searchQuery).subscribe({
      next: (res: { data: any[]; total: number }) => {
        this.harvestedStops = res.data || [];
        this.totalCount = res.total;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading harvested stops:', err);
        this.toastService.error('Error', 'Failed to load harvested landmarks.');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.page = 1;
    this.loadHarvestedStops();
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
    this.loadHarvestedStops();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.limit);
  }

  // Helper to get coordinates string
  getCoords(stop: any): string {
    if (stop.location?.coordinates) {
      return `${stop.location.coordinates[1].toFixed(4)}, ${stop.location.coordinates[0].toFixed(4)}`;
    }
    return 'N/A';
  }

  triggerHarvest(): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.toastService.info('Harvesting', 'Scanning Abuja for new landmarks. This may take a moment...');
    
    this.adminService.triggerLandmarkHarvest().subscribe({
      next: (res: any) => {
        this.toastService.success('Success', `Harvest complete! Found ${res.totalNew} new potential landmarks.`);
        this.page = 1;
        this.loadHarvestedStops();
      },
      error: (err: any) => {
        console.error('Harvest error:', err);
        this.toastService.error('Error', 'Failed to complete landmark harvest.');
      }
    });
  }

  triggerAiEnrichment(): void {
    if (this.isEnriching || this.harvestedStops.length === 0) return;

    this.isEnriching = true;
    this.toastService.info('AI Enrichment', 'Gemini is processing landmarks. Please wait...');

    const ids = this.harvestedStops.map(s => s._id);

    this.aiService.enrichLandmarks(ids).subscribe({
      next: (res) => {
        this.isEnriching = false;
        if (res.success) {
          this.toastService.success('AI Enrichment', `Processed ${res.processed} landmarks successfully.`);
          this.loadHarvestedStops(); // Refresh the list
        } else {
          this.toastService.warning('AI Enrichment', 'Completed with issues or no updates were made.');
        }
      },
      error: (err) => {
        this.isEnriching = false;
        console.error('AI Enrichment Error:', err);
        const errorMsg = err.error?.message || err.error?.error || 'Failed to enrich landmarks.';
        this.toastService.error('Error', errorMsg);
      }
    });
  }
}
