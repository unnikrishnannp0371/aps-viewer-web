import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FolderList } from './folder-list';

describe('FolderList', () => {
  let component: FolderList;
  let fixture: ComponentFixture<FolderList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolderList],
    }).compileComponents();

    fixture = TestBed.createComponent(FolderList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
