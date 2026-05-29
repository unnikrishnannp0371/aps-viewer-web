import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssuesPanel } from './issues-panel';

describe('IssuesPanel', () => {
  let component: IssuesPanel;
  let fixture: ComponentFixture<IssuesPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssuesPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(IssuesPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
