import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectPicker } from './project-picker';

describe('ProjectPicker', () => {
  let component: ProjectPicker;
  let fixture: ComponentFixture<ProjectPicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectPicker],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectPicker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
