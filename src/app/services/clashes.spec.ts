import { TestBed } from '@angular/core/testing';

import { Clashes } from './clashes';

describe('Clashes', () => {
  let service: Clashes;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Clashes);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
