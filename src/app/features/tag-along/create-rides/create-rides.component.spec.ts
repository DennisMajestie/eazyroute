import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateRidesComponent } from './create-rides.component';

describe('CreateRidesComponent', () => {
  let component: CreateRidesComponent;
  let fixture: ComponentFixture<CreateRidesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateRidesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateRidesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
