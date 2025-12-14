import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransportPointSearchComponent } from '../../features/transport-points/transport-point-search/transport-point-search.component';
import { AddTransportPointDialogComponent } from '../../features/transport-points/add-transport-point-dialog/add-transport-point-dialog.component';
import { BusStop } from '../../models/bus-stop.model';

/**
 * Example component showing how to use the Transport Point Search system
 * 
 * Usage:
 * 1. Import this component or copy the pattern to your existing component
 * 2. Add the search component to your template
 * 3. Handle the events (pointSelected, addNewPoint)
 */
@Component({
    selector: 'app-transport-point-example',
    standalone: true,
    imports: [
        CommonModule,
        TransportPointSearchComponent,
        AddTransportPointDialogComponent
    ],
    template: `
    <div class="page-container">
      <h1>Transport Point Search</h1>
      
      <!-- Search Component -->
      <app-transport-point-search
        (pointSelected)="onPointSelected($event)"
        (addNewPoint)="openAddDialog()">
      </app-transport-point-search>

      <!-- Add Dialog (shown when user clicks "Add New Point") -->
      <app-add-transport-point-dialog
        *ngIf="showAddDialog"
        (close)="closeAddDialog()"
        (pointAdded)="onPointAdded($event)">
      </app-add-transport-point-dialog>

      <!-- Selected Point Display (optional) -->
      <div class="selected-point" *ngIf="selectedPoint">
        <h3>Selected Point:</h3>
        <p><strong>Name:</strong> {{ selectedPoint.name }}</p>
        <p><strong>Type:</strong> {{ selectedPoint.type }}</p>
        <p><strong>Location:</strong> {{ selectedPoint.area || selectedPoint.city }}</p>
        <p *ngIf="selectedPoint.localNames && selectedPoint.localNames.length > 0">
          <strong>Also known as:</strong> {{ selectedPoint.localNames.join(', ') }}
        </p>
      </div>
    </div>
  `,
    styles: [`
    .page-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 24px;
      color: #333;
    }

    .selected-point {
      margin-top: 24px;
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 8px;
      border-left: 4px solid #4CAF50;
    }

    .selected-point h3 {
      margin-top: 0;
      color: #4CAF50;
    }

    .selected-point p {
      margin: 8px 0;
    }
  `]
})
export class TransportPointExampleComponent {
    selectedPoint: BusStop | null = null;
    showAddDialog = false;

    /**
     * Handle when user selects a transport point from search results
     */
    onPointSelected(point: BusStop) {
        console.log('Point selected:', point);
        this.selectedPoint = point;

        // You can do whatever you need with the selected point:
        // - Use it as a trip planner destination
        // - Show details in a modal
        // - Navigate to a detail page
        // - etc.
    }

    /**
     * Open the "Add New Point" dialog
     */
    openAddDialog() {
        this.showAddDialog = true;
    }

    /**
     * Close the "Add New Point" dialog
     */
    closeAddDialog() {
        this.showAddDialog = false;
    }

    /**
     * Handle when user successfully adds a new transport point
     */
    onPointAdded(newPoint: BusStop) {
        console.log('New point added:', newPoint);
        this.selectedPoint = newPoint;

        // Optionally show a success message
        alert(`Successfully added: ${newPoint.name}`);

        // The search component will automatically refresh its results
    }
}
