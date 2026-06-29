import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClashesPanel } from './clashes-panel';

describe('ClashesPanel', () => {
  let component: ClashesPanel;
  let fixture: ComponentFixture<ClashesPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClashesPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(ClashesPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
