// // src/app/features/auth/pages/splash/splash.component.ts
// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { Router } from '@angular/router';
// import { AuthService } from './../../../core/services/auth.service';

// @Component({
//   selector: 'app-splash',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './splash.component.html',
//   styleUrls: ['./splash.component.scss']
// })
// export class SplashComponent implements OnInit {
//   features = [
//     {
//       icon: '🚌',
//       title: 'Real-Time Tracking',
//       description: 'Track your bus in real-time with live GPS updates'
//     },
//     {
//       icon: '🗺️',
//       title: 'Smart Routes',
//       description: 'Find the fastest routes to your destination'
//     },
//     {
//       icon: '👥',
//       title: 'Tag-Along',
//       description: 'Travel together and share your journey'
//     },
//     {
//       icon: '⚡',
//       title: 'Instant Updates',
//       description: 'Get notified about delays and arrivals'
//     }
//   ];

//   constructor(
//     private router: Router,
//     private authService: AuthService
//   ) { }

//   ngOnInit(): void {
//     // Check if user is already authenticated
//     if (this.authService.isAuthenticated()) {
//       this.router.navigate(['/dashboard']);
//     }
//   }

//   navigateToLogin(): void {
//     this.router.navigate(['/auth/login']);
//   }

//   navigateToRegister(): void {
//     this.router.navigate(['/auth/register']);
//   }
// }


// ============================================
// COMPONENT FILE: splash.component.ts
// ============================================
import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as THREE from 'three';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss']
})
export class SplashComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas3d', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  email: string = '';
  isSubmitted: boolean = false;
  isLoading: boolean = true;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particlesMesh!: THREE.Points;
  private animationId: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;

  features = [
    { icon: '🚌', text: 'Bus Stop Locator' },
    { icon: '📍', text: 'Event Navigation' },
    { icon: '🔒', text: 'Safe Tag-Along' },
    { icon: '🗺️', text: 'Smart Routes' }
  ];

  pulseDots = [
    { top: '20%', left: '15%' },
    { top: '30%', left: '80%' },
    { top: '60%', left: '25%' },
    { top: '70%', left: '75%' },
    { top: '45%', left: '50%' }
  ];

  mapLines = Array(5).fill(null).map(() => ({
    top: Math.random() * 80 + 10 + '%',
    width: Math.random() * 300 + 200 + 'px',
    delay: Math.random() * 4 + 's',
    duration: Math.random() * 3 + 3 + 's'
  }));

  particles = Array(50).fill(null).map(() => ({
    left: Math.random() * 100 + '%',
    top: Math.random() * 100 + '%',
    delay: Math.random() * 8 + 's',
    duration: Math.random() * 4 + 6 + 's'
  }));

  constructor(private router: Router) { }

  ngOnInit(): void {
    setTimeout(() => {
      this.isLoading = false;
    }, 2000);
  }

  ngAfterViewInit(): void {
    this.init3DBackground();
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToPlanner(): void {
    this.router.navigate(['/trip-planner']);
  }

  private init3DBackground(): void {
    if (!this.canvasRef?.nativeElement) return;

    const canvas = this.canvasRef.nativeElement;

    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 800;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 15;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    this.scene.add(this.particlesMesh);

    this.camera.position.z = 5;

    // Mouse interaction
    window.addEventListener('mousemove', (e: MouseEvent) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Handle resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.particlesMesh) {
      this.particlesMesh.rotation.x += 0.0003;
      this.particlesMesh.rotation.y += 0.0005;

      // Mouse interaction
      this.particlesMesh.rotation.x += this.mouseY * 0.00005;
      this.particlesMesh.rotation.y += this.mouseX * 0.00005;
    }

    this.renderer.render(this.scene, this.camera);
  }
}