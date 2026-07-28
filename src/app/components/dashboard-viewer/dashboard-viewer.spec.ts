import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardViewer } from './dashboard-viewer';

describe('DashboardViewer', () => {
  let component: DashboardViewer;
  let fixture: ComponentFixture<DashboardViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardViewer],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardViewer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
