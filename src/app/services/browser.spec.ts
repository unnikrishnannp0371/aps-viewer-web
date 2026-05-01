import { TestBed } from '@angular/core/testing';

import { Browser } from './browser';

describe('Browser', () => {
  let service: Browser;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Browser);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
