import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MicroNode } from '../../../models/locality.model';
import { LocalityService } from '../../../core/services/locality.service';

@Component({
  selector: 'app-micro-position-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './micro-position-card.component.html',
  styleUrls: ['./micro-position-card.component.scss']
})
export class MicroPositionCardComponent {
  @Input() microNode!: MicroNode;
  @Input() selectable: boolean = false;
  @Output() selected = new EventEmitter<MicroNode>();

  constructor(private localityService: LocalityService) { }

  onSelect() {
    if (this.selectable) {
      this.selected.emit(this.microNode);
    }
  }

  getVisibilityColor(): string {
    return this.localityService.getVisibilityColor(this.microNode.visibility);
  }

  getSafetyColor(): string {
    return this.localityService.getSafetyColor(this.microNode.safety);
  }

  getVisibilityLabel(): string {
    const labels = {
      'low': 'Low Visibility',
      'medium': 'Medium Visibility',
      'high': 'High Visibility'
    };
    return labels[this.microNode.visibility];
  }

  getSafetyLabel(): string {
    const labels = {
      'unsafe': 'Unsafe',
      'moderate': 'Moderate Safety',
      'safe': 'Safe'
    };
    return labels[this.microNode.safety];
  }

  getVisibilityIcon(): string {
    return this.microNode.visibility === 'high' ? '✅' :
      this.microNode.visibility === 'medium' ? '⚠️' : '❌';
  }

  getSafetyIcon(): string {
    return this.microNode.safety === 'safe' ? '✅' :
      this.microNode.safety === 'moderate' ? '⚠️' : '❌';
  }
}
