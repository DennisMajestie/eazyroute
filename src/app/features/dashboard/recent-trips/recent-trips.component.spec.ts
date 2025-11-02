import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentTripsComponent } from './recent-trips.component';

describe('RecentTripsComponent', () => {
  let component: RecentTripsComponent;
  let fixture: ComponentFixture<RecentTripsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentTripsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecentTripsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
