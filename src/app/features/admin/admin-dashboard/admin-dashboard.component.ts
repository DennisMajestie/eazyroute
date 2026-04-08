import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { GraphReport, ConnectionSuggestion } from '../../../models/admin.types';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  public adminService = inject(AdminService);
  
  report: GraphReport | null = null;
  suggestions: ConnectionSuggestion[] = [];
  isLoading = false;
  Math = Math;

  statCards = [
    { label: 'Total Terminals', value: 0, icon: '📍', color: '#3B82F6', trend: 12 },
    { label: 'Active Routes', value: 0, icon: '🛣️', color: '#10B981', trend: 5 },
    { label: 'Avg Fare', value: 450, icon: '₦', color: '#F59E0B', trend: -2 },
    { label: 'User Contributions', value: 124, icon: '🙌', color: '#8B5CF6', trend: 18 }
  ];

  ngOnInit(): void {
    this.loadReport();
    this.loadSuggestions();
  }

  loadReport(): void {
    this.isLoading = true;
    this.adminService.getGraphReport().subscribe({
      next: (data) => {
        this.report = data;
        this.statCards[0].value = data.totalNodes;
        this.statCards[1].value = data.totalEdges;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading report:', err);
        this.isLoading = false;
        // Mock data for demo if API fails
        this.report = {
          totalNodes: 1242,
          totalEdges: 3841,
          isolatedCount: 42,
          health: 'moderate',
          issues: [
            '42 isolated bus stops found in Gwarinpa area.',
            'Route graph density is below threshold in Phase 3.',
            '12 duplicate terminal entries detected.'
          ],
          suggestions: []
        };
        this.statCards[0].value = this.report.totalNodes;
        this.statCards[1].value = this.report.totalEdges;
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
          { fromStop: { _id: '1', name: 'Berger' }, toStop: { _id: '2', name: 'Wuse Market' }, distance: 1200, reason: 'High demand area', priority: 'high' },
          { fromStop: { _id: '3', name: 'Area 1' }, toStop: { _id: '4', name: 'Garki' }, distance: 800, reason: 'Short gap', priority: 'medium' }
        ];
      }
    });
  }
}
