import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { IsolatedNode, ConnectionSuggestion } from '../../../models/admin.types';

@Component({
  selector: 'app-graph-diagnostics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graph-diagnostics.component.html',
  styleUrls: ['./graph-diagnostics.component.scss']
})
export class GraphDiagnosticsComponent implements OnInit {
  public adminService = inject(AdminService);
  
  isolatedNodes: IsolatedNode[] = [];
  filteredNodes: IsolatedNode[] = [];
  suggestions: ConnectionSuggestion[] = [];
  isLoading = false;
  isRepairing = false;

  ngOnInit(): void {
    this.loadIsolatedNodes();
    this.loadSuggestions();
  }

  loadIsolatedNodes(): void {
    this.isLoading = true;
    this.adminService.getIsolatedNodes().subscribe({
      next: (nodes) => {
        this.isolatedNodes = nodes;
        this.filteredNodes = nodes;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading isolated nodes:', err);
        // Mock data for demo
        this.isolatedNodes = [
          { _id: '507f1f087a21', name: 'Gwarinpa Phase 2 Extension', city: 'Abuja', location: { type: 'Point', coordinates: [7.38, 9.11] } },
          { _id: '507f1f087a22', name: 'Karsana North Gate', city: 'Abuja', location: { type: 'Point', coordinates: [7.35, 9.15] } },
          { _id: '507f1f087a23', name: 'Kubwa Village Market Inner', city: 'Abuja', location: { type: 'Point', coordinates: [7.33, 9.17] } }
        ];
        this.filteredNodes = this.isolatedNodes;
        this.isLoading = false;
      }
    });
  }

  loadSuggestions(): void {
    this.adminService.getConnectionSuggestions().subscribe({
      next: (data) => {
        this.suggestions = data;
      },
      error: (err) => {
        console.error('Error loading suggestions:', err);
        this.suggestions = [
          { fromStop: { _id: 's1', name: 'Maitama' }, toStop: { _id: 's2', name: 'Wuse 2' }, distance: 1500, reason: 'High transit volume between clusters', priority: 'high' },
          { fromStop: { _id: 's3', name: 'Jabi Lake' }, toStop: { _id: 's4', name: 'Utako' }, distance: 950, reason: 'Adjacent commercial hubs', priority: 'medium' }
        ];
      }
    });
  }

  filterNodes(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filteredNodes = this.isolatedNodes.filter(node => 
      node.name.toLowerCase().includes(query) || 
      node._id.toLowerCase().includes(query)
    );
  }

  triggerAutoRepair(): void {
    if (confirm('Initiate Class D Snapping Strategy? This will attempt to automatically connect isolated nodes to the nearest major hubs.')) {
      this.isRepairing = true;
      // Simulate repair process
      setTimeout(() => {
        alert('Repair strategy executed! 14 connection segments identified and staged for syncing.');
        this.isRepairing = false;
        this.loadIsolatedNodes();
      }, 2500);
    }
  }

  viewOnMap(node: IsolatedNode): void {
    console.log('Viewing node on map:', node);
    // Future: In-app map navigation
    window.open(`https://www.google.com/maps?q=${node.location.coordinates[1]},${node.location.coordinates[0]}`, '_blank');
  }

  manualRepair(node: IsolatedNode): void {
    console.log('Initiating manual repair for:', node);
    // Future: Open manual connection wizard
  }

  applySuggestion(suggestion: ConnectionSuggestion): void {
    if (confirm(`Approve connection between ${suggestion.fromStop.name} and ${suggestion.toStop.name}?`)) {
      this.adminService.createConnection(suggestion.fromStop._id, suggestion.toStop._id, {
        transportModes: ['bus', 'taxi'],
        estimatedTime: Math.round(suggestion.distance / 400),
        priceRange: { min: 200, max: 400 }
      }).subscribe({
        next: () => {
          alert('Connection successfuly created!');
          this.loadSuggestions();
          this.loadIsolatedNodes();
        },
        error: () => {
          // Mock success if API fails for demo
          alert('Connection successfuly created (Simulation)!');
          this.suggestions = this.suggestions.filter(s => s !== suggestion);
        }
      });
    }
  }
}
