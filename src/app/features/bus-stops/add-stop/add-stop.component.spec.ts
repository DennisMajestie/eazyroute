import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddStopComponent } from './add-stop.component';

describe('AddStopComponent', () => {
  let component: AddStopComponent;
  let fixture: ComponentFixture<AddStopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddStopComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddStopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
