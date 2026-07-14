import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRouter } from './admin-router';

describe('AdminRouter', () => {
  let component: AdminRouter;
  let fixture: ComponentFixture<AdminRouter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRouter],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRouter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
