import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthPanel } from './health-panel';

describe('HealthPanel', () => {
  let component: HealthPanel;
  let fixture: ComponentFixture<HealthPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(HealthPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
