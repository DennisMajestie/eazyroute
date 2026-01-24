import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Locality } from '../../../models/locality.model';
import { LocalityService } from '../../../core/services/locality.service';

@Component({
  selector: 'app-locality-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locality-card.component.html',
  styleUrls: ['./locality-card.component.scss']
})
export class LocalityCardComponent {
  @Input() locality!: Locality;
  @Input() selectable: boolean = true;
  @Output() selected = new EventEmitter<Locality>();

  constructor(private localityService: LocalityService) { }

  onSelect() {
    if (this.selectable) {
      this.selected.emit(this.locality);
    }
  }

  getVehicleEmoji(vehicle: string): string {
    const emojiMap: { [key: string]: string } = {
      'keke': '🛺',
      'taxi': '🚕',
      'cab': '🚕',
      'bus': '🚌',
      'okada': '🏍️',
      'walking': '🚶'
    };
    return emojiMap[vehicle.toLowerCase()] || '🚏';
  }

  getDensityColor(): string {
    const density = this.locality?.movementProfile?.informalBoardingDensity;
    return this.localityService.getDensityColor(density || 'low');
  }

  getDensityLabel(): string {
    const labels: { [key: string]: string } = {
      'low': 'Low Density',
      'medium': 'Medium Density',
      'high': 'High Density'
    };
    const density = this.locality?.movementProfile?.informalBoardingDensity;
    return labels[density || 'low'] || 'Standard Density';
  }
}
