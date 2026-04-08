import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { ModerationItem } from '../../../models/admin.types';

@Component({
  selector: 'app-moderation-queue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './moderation-queue.component.html',
  styleUrls: ['./moderation-queue.component.scss']
})
export class ModerationQueueComponent implements OnInit {
  private adminService = inject(AdminService);
  
  queue: ModerationItem[] = [];
  filteredQueue: ModerationItem[] = [];
  activeTab: 'all' | 'bus_stop' | 'pricing' | 'safety' = 'all';
  isLoading = false;
  selectedItem: ModerationItem | null = null;

  ngOnInit(): void {
    this.loadQueue();
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
        console.error('Error loading moderation queue:', err);
        // Mock data for demo
        this.queue = [
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
        this.applyFilter();
        this.isLoading = false;
      }
    });
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
        error: () => {
          // Mock success for demo
          this.queue = this.queue.filter(q => q._id !== item._id);
          this.applyFilter();
          this.selectedItem = null;
          alert('Submission approved successfully (Simulation)!');
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
        error: () => {
          // Mock success for demo
          this.queue = this.queue.filter(q => q._id !== item._id);
          this.applyFilter();
          this.selectedItem = null;
          alert('Submission rejected (Simulation).');
        }
      });
    }
  }

  viewDetails(item: ModerationItem): void {
    this.selectedItem = item;
  }
}
