import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmittalsPanel } from './submittals-panel';

describe('SubmittalsPanel', () => {
  let component: SubmittalsPanel;
  let fixture: ComponentFixture<SubmittalsPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmittalsPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmittalsPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
