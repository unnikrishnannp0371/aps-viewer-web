import { TestBed } from '@angular/core/testing';

import { Rfi } from './rfi';

describe('Rfi', () => {
  let service: Rfi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Rfi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
