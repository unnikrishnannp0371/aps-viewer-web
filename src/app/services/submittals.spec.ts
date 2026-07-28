import { TestBed } from '@angular/core/testing';

import { Submittals } from './submittals';

describe('Submittals', () => {
  let service: Submittals;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Submittals);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
