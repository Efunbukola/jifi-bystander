import { TestBed } from '@angular/core/testing';

import { BluetoothconnectionService } from './bluetoothconnection.service';

describe('BluetoothconnectionService', () => {
  let service: BluetoothconnectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BluetoothconnectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
