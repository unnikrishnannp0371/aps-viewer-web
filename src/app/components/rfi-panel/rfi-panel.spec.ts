import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RfiPanel } from './rfi-panel';

describe('RfiPanel', () => {
  let component: RfiPanel;
  let fixture: ComponentFixture<RfiPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RfiPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(RfiPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
