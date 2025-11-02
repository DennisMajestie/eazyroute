// src/app/features/dashboard/components/dashboard-home/dashboard-home.component.ts
import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './../../../core/services/auth.service';
import { RouteService } from './../../../core/services/route.service';
import { User } from './../../../models/user.model';
import { Trip } from './../../../models/trip.model';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss'
})
export class DashboardHomeComponent implements OnInit {
  currentUser: User | null = null;
  recentTrips: Trip[] = [];
  stats = {
    totalTrips: 0,
    rating: 0,
    saved: 0
  };

  constructor(
    private authService: AuthService,
    private routeService: RouteService,
    private router: Router
  ) {
    // Use effect to react to signal changes
    effect(() => {
      const user = this.authService.currentUser();
      this.currentUser = user;
    });
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadRecentTrips();
    this.loadStats();
  }

  loadUserData(): void {
    // Read the signal value directly
    this.currentUser = this.authService.currentUser();
  }

  loadRecentTrips(): void {
    // Mock data - replace with actual API call
    this.recentTrips = [];
  }

  loadStats(): void {
    // Mock data - replace with actual API call
    this.stats = {
      totalTrips: 24,
      rating: 4.8,
      saved: 12000
    };
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}