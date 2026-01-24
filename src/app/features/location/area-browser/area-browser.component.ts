import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AreaService } from '../../../core/services/area.service';
import { Area } from '../../../models/area.model';
import { AreaCardComponent } from '../../../shared/components/area-card/area-card.component';

@Component({
  selector: 'app-area-browser',
  standalone: true,
  imports: [CommonModule, FormsModule, AreaCardComponent],
  templateUrl: './area-browser.component.html',
  styleUrls: ['./area-browser.component.scss']
})
export class AreaBrowserComponent implements OnInit {
  territory: string = '';
  areas: Area[] = [];
  filteredAreas: Area[] = [];
  groupedAreas: { type: string; areas: Area[] }[] = [];
  areaSearch: string = '';
  isLoading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private areaService: AreaService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.territory = params['territory'];
      if (this.territory) {
        this.loadAreas();
      }
    });
  }

  loadAreas() {
    this.isLoading = true;

    this.areaService.getAreasByTerritory(this.territory).pipe(
      catchError(error => {
        console.error('Error loading areas:', error);
        this.isLoading = false;
        return of([]);
      })
    ).subscribe({
      next: (areas) => {
        this.areas = (Array.isArray(areas) ? areas : []).filter(a => !!a);
        this.filteredAreas = [...this.areas];
        this.groupAreas();
        this.isLoading = false;
      }
    });
  }

  groupAreas() {
    const groups = new Map<string, Area[]>();

    this.filteredAreas.forEach(area => {
      const type = area.type || 'mixed';
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(area);
    });

    this.groupedAreas = Array.from(groups.entries()).filter(([type, areas]) => !!areas).map(([type, areas]) => ({
      type: type || 'mixed',
      areas: (Array.isArray(areas) ? areas : []).filter(a => !!a)
    }));
  }

  onSearchInput() {
    if (!this.areaSearch || this.areaSearch.length < 2) {
      this.filteredAreas = this.areas;
    } else {
      const query = this.areaSearch.toLowerCase();
      this.filteredAreas = this.areas.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.lga.toLowerCase().includes(query)
      );
    }
    this.groupAreas();
  }

  onAreaSelected(area: Area) {
    // Save selected area to localStorage
    localStorage.setItem('selectedArea', JSON.stringify(area));

    // Navigate to home screen
    this.router.navigate(['/home'], {
      queryParams: {
        areaId: area.id,
        areaName: area.name
      }
    });
  }

  goBack() {
    this.router.navigate(['/select-state']);
  }

  getGroupIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'commercial': '🏢',
      'residential': '🏘️',
      'mixed': '🏪',
      'industrial': '🏭'
    };
    return iconMap[type] || '📍';
  }
}
