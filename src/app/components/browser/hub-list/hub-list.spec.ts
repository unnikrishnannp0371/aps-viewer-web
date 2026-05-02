import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HubList } from './hub-list';

describe('HubList', () => {
  let component: HubList;
  let fixture: ComponentFixture<HubList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HubList],
    }).compileComponents();

    fixture = TestBed.createComponent(HubList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
