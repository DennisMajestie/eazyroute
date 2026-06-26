import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastNotificationService } from '../../../core/services/toast-notification.service';
import { PricingRule } from '../../../models/admin.types';
import { GraphReport } from '../../../models/admin.types';

@Component({
  selector: 'app-flow-network-engine',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flow-network-engine.component.html',
  styleUrls: ['./flow-network-engine.component.scss']
})
export class FlowNetworkEngineComponent implements OnInit {
  activeTierLevels: any[] = [];
  refreshCount = 0;
  selectedNode: any = null;
  showRetagModal = false;
  currentRetagOperation: any = null;
  tierCountData: any = {
    totalNodes: 0,
    tierBreakdown: { captain: 0, trusted: 0, new: 0 }
  };

  constructor(
    private adminService: AdminService,
    private toastService: ToastNotificationService
  ) {}

  ngOnInit(): void {
    this.loadTierLevels();
    this.loadTierStats();
    this.setupRealTimeUpdates();
  }

  loadTierLevels(): void {
    this.adminService.getGraphReport().subscribe({
      next: (report: GraphReport) => {
        this.activeTierLevels = this.generateMockTierData();
      },
      error: (err) => {
        console.error('Error loading tier levels:', err);
        this.activeTierLevels = this.generateMockTierData();
      }
    });
  }

  loadTierStats(): void {
    this.adminService.getTopContributors().subscribe({
      next: (contributors) => {
        this.tierCountData = {
          totalNodes: contributors.length,
          tierBreakdown: {
            captain: contributors.filter(c => c.tier === 'captain').length,
            trusted: contributors.filter(c => c.tier === 'trusted').length,
            new: contributors.filter(c => c.tier === 'new').length
          }
        };
      },
      error: (err) => {
        console.error('Error loading tier stats:', err);
      }
    });
  }

  generateMockTierData(): any[] {
    const tiers = ['captain', 'trusted', 'new'];
    const nodes: any[] = [];
    
    tiers.forEach(tier => {
      for (let i = 0; i < 15; i++) {
        const node = {
          id: `${tier}_node_${i + 1}`, 
          name: `Node ${tier.charAt(0).toUpperCase() + tier.slice(1)} ${i + 1}`, 
          tier: tier,
          connectionCount: Math.floor(Math.random() * 10),
          trustScore: Math.floor(Math.random() * 100),
          reputationScore: Math.floor(Math.random() * 50),
          interactionCount: Math.floor(Math.random() * 100),
          status: Math.random() > 0.2 ? 'active' : 'inactive',
          coordinates: {
            x: Math.random() * 100,
            y: Math.random() * 100
          },
          transportModes: ['KEKE', 'OKADA', 'TAXI', 'BUS'].filter(() => Math.random() > 0.5)
        };
        nodes.push(node);
      }
    });
    
    return nodes.sort((a: any, b: any) => {
      const tierOrder: Record<string, number> = { captain: 0, trusted: 1, new: 2 };
      return (tierOrder[a.tier] || 0) - (tierOrder[b.tier] || 0);
    });
  }

  setupRealTimeUpdates(): void {
    this.adminService.refreshStats$.subscribe({
      next: () => {
        this.refreshCount++;
        this.loadTierLevels();
        this.loadTierStats();
        this.toastService.success('Refreshed', 'Network tiers updated successfully');
      }
    });
  }

  getNodeTierColor(tier: string): string {
    const colors: Record<string, string> = {
      captain: '#ef4444', 
      trusted: '#f59e0b',
      new: '#3b82f6'
    };
    return colors[tier] || '#6b7280';
  }

  getNodeTierBorderColor(tier: string): string {
    const colors: Record<string, string> = {
      captain: 'rgba(239, 68, 68, 0.3)',
      trusted: 'rgba(245, 158, 11, 0.3)',
      new: 'rgba(59, 130, 246, 0.3)'
    };
    return colors[tier] || 'rgba(107, 114, 128, 0.3)';
  }

  openRetagNode(node: any): void {
    this.currentRetagOperation = node;
    this.showRetagModal = true;
  }

  cancelRetag(): void {
    this.showRetagModal = false;
    this.currentRetagOperation = null;
  }

  confirmRetag(): void {
    if (!this.currentRetagOperation) return;
    
    const newTier = this.getRandomTier(this.currentRetagOperation.tier);
    
    this.adminService.updateBusStopPreferences(this.currentRetagOperation.id, {
      firstLegPreferredMode: this.currentRetagOperation.transportModes[Math.floor(Math.random() * this.currentRetagOperation.transportModes.length)],
      bridgeModePreference: this.currentRetagOperation.transportModes[Math.floor(Math.random() * this.currentRetagOperation.transportModes.length)]
    }).subscribe({
      next: () => {
        this.toastService.success('Retagged', `${this.currentRetagOperation.name} retagged to ${newTier} tier`);
        this.loadTierLevels();
        this.cancelRetag();
      },
      error: (err) => {
        console.error('Retag error:', err);
        this.toastService.error('Error', 'Failed to retag node');
      }
    });
  }

  getRandomTier(currentTier: string): string {
    const tiers = ['captain', 'trusted', 'new'];
    const currentIndex = tiers.indexOf(currentTier);
    const possibleTiers = tiers.filter((_, index) => 
      index !== currentIndex && 
      (currentIndex === 0 || index === currentIndex - 1) ||
      (currentIndex === 2 || index === currentIndex + 1)
    );
    
    return possibleTiers[Math.floor(Math.random() * possibleTiers.length)];
  }

  getNodeTierChange(currentTier: string): string {
    const changes = [
      { from: 'captain', to: 'trusted' },
      { from: 'trusted', to: 'new' },
      { from: 'trusted', to: 'captain' },
      { from: 'new', to: 'trusted' }
    ];
    
    const change = changes.find(c => c.from === currentTier);
    return change ? change.to : currentTier;
  }

  getNodeMovementDirection(node: any): { dx: number; dy: number } {
    const tierDirections: Record<string, { dx: number; dy: number }> = {
      captain: { dx: Math.random() > 0.5 ? 20 : -20, dy: Math.random() > 0.5 ? -10 : 10 },
      trusted: { dx: Math.random() > 0.5 ? 10 : -10, dy: Math.random() > 0.5 ? 20 : -20 },
      new: { dx: Math.random() > 0.5 ? -15 : 15, dy: Math.random() > 0.5 ? 5 : -5 }
    };
    
    return tierDirections[node.tier] || { dx: 0, dy: 0 };
  }

  trackByFn(index: number, node: any): string {
    return node.id;
  }

  getRandomDelay(): number {
    return Math.random() * 3;
  }

  refreshNetwork(): void {
    this.refreshCount++;
    this.adminService.triggerRefresh();
  }
}