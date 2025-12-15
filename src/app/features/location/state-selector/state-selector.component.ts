import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AreaService } from '../../../core/services/area.service';
import { Territory } from '../../../models/area.model';
import { StateCardComponent } from '../../../shared/components/state-card/state-card.component';

@Component({
  selector: 'app-state-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, StateCardComponent],
  templateUrl: './state-selector.component.html',
  styleUrls: ['./state-selector.component.scss']
})
export class StateSelectorComponent implements OnInit {
  territories: Territory[] = [];
  popularTerritories: Territory[] = [];
  filteredTerritories: Territory[] = [];
  searchQuery: string = '';
  isLoading: boolean = false;

  constructor(
    private areaService: AreaService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadTerritories();
  }

  loadTerritories() {
    this.isLoading = true;

    this.areaService.getTerritories().subscribe({
      next: (territories) => {
        this.territories = territories;
        this.popularTerritories = territories.filter(t => t.isPopular);
        this.filteredTerritories = territories;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading territories:', error);
        this.isLoading = false;
      }
    });
  }

  onSearchInput() {
    if (!this.searchQuery || this.searchQuery.length < 2) {
      this.filteredTerritories = this.territories;
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredTerritories = this.territories.filter(t =>
      t.name.toLowerCase().includes(query)
    );
  }

  onStateSelected(territory: Territory) {
    // Navigate to area browser for this territory
    this.router.navigate(['/browse-areas', territory.name]);
  }

  skipSelection() {
    // Go directly to home screen
    this.router.navigate(['/home']);
  }
}
