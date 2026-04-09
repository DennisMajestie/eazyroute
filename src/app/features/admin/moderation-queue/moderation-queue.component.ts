import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { LeafletMapService } from '../../../core/services/leaflet-map.service';
import { ModerationItem } from '../../../models/admin.types';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-moderation-queue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './moderation-queue.component.html',
  styleUrls: ['./moderation-queue.component.scss']
})
export class ModerationQueueComponent implements OnInit {
  private adminService = inject(AdminService);
  private mapService = inject(LeafletMapService);
  
  queue: ModerationItem[] = [];
  filteredQueue: ModerationItem[] = [];
  activeTab: 'all' | 'bus_stop' | 'pricing' | 'safety' = 'all';
  isLoading = false;
  selectedItem: ModerationItem | null = null;
  mapPreview: any;

  ngOnInit(): void {
    this.loadQueue();
  }

  async initPreviewMap(location: { lat: number; lng: number }): Promise<void> {
    const L = await this.mapService.loadLeaflet();
    if (!L) return;

    // Small delay to ensure container is rendered
    setTimeout(() => {
        if (this.mapPreview) {
            this.mapPreview.remove();
        }
        this.mapPreview = this.mapService.initMap('item-preview-map', location, 15);
        L.marker([location.lat, location.lng]).addTo(this.mapPreview);
    }, 100);
  }

  promoteToCaptain(userId: string): void {
    if (confirm('Are you sure you want to promote this user to Captain?')) {
        this.adminService.promoteToCaptain(userId).subscribe({
            next: () => alert('User promoted to Captain status!'),
            error: (err) => {
                if (environment.useMockAdminData) {
                    alert('Promotion successful (Simulation mode).');
                } else {
                    console.error('[Moderation] Promotion failed:', err);
                    alert('Failed to promote user. Please try again later.');
                }
            }
        });
    }
  }

  loadQueue(): void {
    this.isLoading = true;
    this.adminService.getModerationQueue().subscribe({
      next: (items) => {
        this.queue = items;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        if (environment.useMockAdminData) {
            console.warn('[Moderation] Using mock queue');
            this.queue = this.getMockQueue();
            this.applyFilter();
        } else {
            console.error('[Moderation] Queue failed:', err);
        }
        this.isLoading = false;
      }
    });
  }

  private getMockQueue(): ModerationItem[] {
      return [
        {
          _id: 'q1',
          type: 'bus_stop',
          data: { name: 'New Gwarinpa Junction', location: { name: 'Gwarinpa Phase 2' } },
          submittedBy: 'Danladi K.',
          submittedAt: new Date(),
          status: 'pending',
          flags: [],
          autoFlags: { suspiciousActivity: false, duplicateSubmission: false, rapidUpvotes: false }
        },
        {
          _id: 'q2',
          type: 'pricing',
          data: { title: 'Wuse to Berger Update', category: 'Keke Napep' },
          submittedBy: 'Chidi O.',
          submittedAt: new Date(Date.now() - 3600000),
          status: 'pending',
          flags: ['rapid_submissions'],
          autoFlags: { suspiciousActivity: true, duplicateSubmission: false, rapidUpvotes: false }
        },
        {
          _id: 'q3',
          type: 'safety',
          data: { title: 'Area 1 Construction Alert', category: 'Road Closure' },
          submittedBy: 'Amina B.',
          submittedAt: new Date(Date.now() - 7200000),
          status: 'pending',
          flags: [],
          autoFlags: { suspiciousActivity: false, duplicateSubmission: false, rapidUpvotes: false }
        }
      ];
  }

  setTab(tab: any): void {
    this.activeTab = tab;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.activeTab === 'all') {
      this.filteredQueue = this.queue;
    } else {
      this.filteredQueue = this.queue.filter(item => item.type === this.activeTab);
    }
  }

  approve(item: ModerationItem): void {
    if (confirm(`Approve this ${item.type} submission?`)) {
      this.adminService.approveItem(item._id).subscribe({
        next: () => {
          this.queue = this.queue.filter(q => q._id !== item._id);
          this.applyFilter();
          this.selectedItem = null;
          alert('Submission approved successfully!');
        },
        error: (err) => {
          if (environment.useMockAdminData) {
              this.queue = this.queue.filter(q => q._id !== item._id);
              this.applyFilter();
              this.selectedItem = null;
              alert('Submission approved successfully (Simulation)!');
          } else {
              console.error('[Moderation] Approval failed:', err);
              alert('Failed to approve submission.');
          }
        }
      });
    }
  }

  reject(item: ModerationItem): void {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      this.adminService.rejectItem(item._id, reason).subscribe({
        next: () => {
          this.queue = this.queue.filter(q => q._id !== item._id);
          this.applyFilter();
          this.selectedItem = null;
          alert('Submission rejected.');
        },
        error: (err) => {
          if (environment.useMockAdminData) {
              this.queue = this.queue.filter(q => q._id !== item._id);
              this.applyFilter();
              this.selectedItem = null;
              alert('Submission rejected (Simulation).');
          } else {
              console.error('[Moderation] Rejection failed:', err);
              alert('Failed to reject submission.');
          }
        }
      });
    }
  }

  viewDetails(item: ModerationItem): void {
    this.selectedItem = item;
    
    // Auto-init map if item has coordinates
    if (item.data.location?.lat && item.data.location?.lng) {
        this.initPreviewMap(item.data.location);
    } else if (item.data.coordinates) { // Alternative format
        this.initPreviewMap({ lat: item.data.coordinates[1], lng: item.data.coordinates[0] });
    }
  }
}
