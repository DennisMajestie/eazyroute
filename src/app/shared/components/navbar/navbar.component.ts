// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-navbar',
//   imports: [],
//   templateUrl: './navbar.component.html',
//   styleUrl: './navbar.component.scss'
// })
// export class NavbarComponent {

// }


// src/app/shared/components/bottom-nav/bottom-nav.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss'
})
export class BottomNavComponent {
  navItems = [
    { path: '/dashboard', icon: 'fa-home', label: 'Home' },
    { path: '/routes', icon: 'fa-route', label: 'Routes' },
    { path: '/tag-along', icon: 'fa-car-side', label: 'Tag Along' },
    { path: '/activity', icon: 'fa-clock', label: 'Activity' },
    { path: '/profile', icon: 'fa-user-circle', label: 'Profile' }
  ];
  constructor(private router: Router) { }
}