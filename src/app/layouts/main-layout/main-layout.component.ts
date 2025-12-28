// src/app/layouts/main-layout/main-layout.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ToastNotificationComponent } from '../../shared/components/toast-notification/toast-notification.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterModule, NavbarComponent, BottomNavComponent, ToastNotificationComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent { }