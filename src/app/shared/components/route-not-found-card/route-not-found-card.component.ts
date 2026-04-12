import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CoverageStats {
  areasMapped: number;
  hotspotsActive: number;
  contributors: number;
}

@Component({
  selector: 'app-route-not-found-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './route-not-found-card.component.html',
  styleUrls: ['./route-not-found-card.component.scss']
})
export class RouteNotFoundCardComponent {
  @Input() errorHubs: any[] = [];
  @Input() stats: CoverageStats | null = null;
  @Input() fromName: string = '';
  @Input() toName: string = '';
  
  @Output() addLocation = new EventEmitter<void>();
  @Output() selectHub = new EventEmitter<any>();

  onAddLocation() {
    this.addLocation.emit();
  }

  onSelectHub(hub: any) {
    this.selectHub.emit(hub);
  }
}
