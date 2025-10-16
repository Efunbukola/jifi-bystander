import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { Platform } from '@ionic/angular';
import {
  BluetoothMessageRecievedEvent,
  BluetoothMessageRecievedEventType,
  BluetoothMessageSendEvent
} from './bluetooth-events';

export interface ConnectedDevice {
  id: string;
  name: string;
  raw?: any;
  showMessages?: boolean;
  messages?: string[];
}

declare var ble: any;

@Injectable({ providedIn: 'root' })
export class BluetoothService {
  private static readonly STORAGE_KEY = 'connected_devices';

  private monitorConnectionsInterval: any;


  private availableDevicesSubject = new BehaviorSubject<ConnectedDevice[]>([]);
  public availableDevices$ = this.availableDevicesSubject.asObservable();

  private deviceDisconnectSubject = new Subject<ConnectedDevice>();
  public deviceDisconnect$ = this.deviceDisconnectSubject.asObservable();

  private connectedDevicesSubject = new BehaviorSubject<ConnectedDevice[]>([]);
  public connectedDevices$ = this.connectedDevicesSubject.asObservable();

  private eventSubject = new Subject<BluetoothMessageRecievedEvent>();
  public events$ = this.eventSubject.asObservable();

  private connectedDevices: Map<string, ConnectedDevice> = new Map();
  public scanning = false;
  private scanTimer: any = null;
  private notificationStarted: Set<string> = new Set();

  private reconnectSubscriptions: Map<string, Subscription> = new Map();

  private storageReady = false;

  private connectingDevices = new Set<string>();

  // JiBand UUIDs
  private readonly SERVICE_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  // Central → Peripheral (Write characteristic)
  private readonly WRITE_CHAR_UUID = '9d5b4a92-1b25-4c32-9b61-524f4ec58e90';

  // Peripheral → Central (Notify characteristic)
  private readonly NOTIFY_CHAR_UUID = '9d5b4a92-1b25-4c32-9b61-524f4ec58d80';

  constructor(private platform: Platform, private storage: Storage, private zone: NgZone) {
    this.initStorage();

    this.platform.ready().then(() => {
      this.restoreConnections();
      this.startMonitoringConnections()
    });
  }

  private async initStorage() {
    await this.storage.create();
    this.storageReady = true;
  }

public startScan(durationMs: number = 5000): void {
  if (this.scanning) return;

  this.scanning = true;
  const found: ConnectedDevice[] = [];
  this.availableDevicesSubject.next([]);

  try {
    ble.scan([], Math.ceil(durationMs / 1000),
      (device: any) => {
        if (!device?.id) return;

        // Only store unique devices
        if (!found.find(d => d.id === device.id)) {
          const dev: ConnectedDevice = {
            id: device.id,
            name: device.name || 'Unknown Device',
            raw: device
          };
          found.push(dev);
          this.availableDevicesSubject.next([...found]);
        }
      },
      (err: any) => console.error('BLE scan error', err)
    );

    setTimeout(() => this.stopScan(), durationMs);

  } catch (err) {
    console.error('startScan exception', err);
    this.scanning = false;
  }
}

  public stopScan(): void {
    if (!this.scanning) return;
    this.scanning = false;

    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }

    try {
      ble.stopScan(() => {}, (err: any) => console.warn('stopScan error', err));
    } catch (err) {
      console.warn('stopScan exception', err);
    }
  }
  

public async connectToDevice(device: ConnectedDevice): Promise<void> {
  if (!device) return;

  this.connectingDevices.add(device.id);
  try {
    await new Promise<void>((resolve, reject) => {
      ble.connect(
        device.id,
        (peripheral: any) => {
          this.connectingDevices.delete(device.id);

          const connectedDevice: ConnectedDevice = {
            id: peripheral.id || device.id,
            name: peripheral.name || device.name || 'Unknown Device',
            raw: peripheral
          };
          this.connectedDevices.set(device.id, connectedDevice);
          this.connectedDevicesSubject.next(Array.from(this.connectedDevices.values()));

          // 🔥 Remove from available devices once connected
          const currentAvailable = this.availableDevicesSubject.getValue();
          this.availableDevicesSubject.next(
            currentAvailable.filter(d => d.id !== device.id)
          );

          this.listenForData(device.id).catch(err => console.warn('listenForData error', err));

          this.saveConnectedDevices();
          resolve();
        },
        (err: any) => {
          this.connectingDevices.delete(device.id);
          console.error('Connect error', err);
          reject(err);
        }
      );
    });
  } catch (err) {
    this.connectingDevices.delete(device.id);
    throw err;
  }
}


private startMonitoringConnections() {
  if (this.monitorConnectionsInterval) return;

  this.monitorConnectionsInterval = setInterval(async () => {
    for (const device of this.connectedDevices.values()) {
      const connected = await this.isConnected(device.id);
      if (!connected) {
        console.log(`Detected lost connection: ${device.name}`);
        this.handleDeviceDisconnected(device.id);
      }
    }
  }, 2000); // check every 2 seconds
}

private handleDeviceDisconnected(deviceId: string) {
  const disconnectedDevice = this.connectedDevices.get(deviceId);
  if (!disconnectedDevice) return;

  this.connectedDevices.delete(deviceId);
  this.connectedDevicesSubject.next(Array.from(this.connectedDevices.values()));
  this.deviceDisconnectSubject.next(disconnectedDevice);

  // Cleanup
  if (this.notificationStarted.has(deviceId)) this.notificationStarted.delete(deviceId);
  if (this.reconnectSubscriptions.has(deviceId)) {
    this.reconnectSubscriptions.get(deviceId)?.unsubscribe();
    this.reconnectSubscriptions.delete(deviceId);
  }
}



 public isConnecting(deviceId: string): boolean {
  return this.connectingDevices.has(deviceId);
  }


  public async disconnect(deviceId: string): Promise<void> {
    // Clean up any reconnect subscription
    if (this.reconnectSubscriptions.has(deviceId)) {
      this.reconnectSubscriptions.get(deviceId)?.unsubscribe();
      this.reconnectSubscriptions.delete(deviceId);
    }

    return new Promise((resolve, reject) => {
      if (this.notificationStarted.has(deviceId)) {
        try {
          ble.stopNotification(deviceId, this.SERVICE_UUID, this.NOTIFY_CHAR_UUID, () => {}, () => {});
        } catch {}
        this.notificationStarted.delete(deviceId);
      }


      ble.disconnect(deviceId,
        () => {
          const disconnectedDevice = this.connectedDevices.get(deviceId);
          this.connectedDevices.delete(deviceId);
          this.connectedDevicesSubject.next(Array.from(this.connectedDevices.values()));
          this.saveConnectedDevices();

          // 🔥 Emit disconnect event
          if (disconnectedDevice) {
            this.deviceDisconnectSubject.next(disconnectedDevice);
          }

          resolve();
        },
        (err: any) => {
          console.error('Disconnect error', err);
          reject(err);
        }
      );


    });
  }

  public async isConnected(deviceId: string): Promise<boolean> {
    return new Promise(resolve => {
      try {
        ble.isConnected(deviceId, () => resolve(true), () => resolve(false));
      } catch {
        resolve(false);
      }
    });
  }

  public async sendMessage(deviceId: string, messageEvent: BluetoothMessageSendEvent): Promise<void> {
    const connected = await this.isConnected(deviceId);
    if (!connected) throw new Error(`Device ${deviceId} not connected`);

    // Convert the integer (enum value) into a single-byte buffer
    const buffer = new Uint8Array([messageEvent.type]).buffer;

    return new Promise((resolve, reject) => {
      ble.write(
        deviceId,
        this.SERVICE_UUID,
        this.WRITE_CHAR_UUID,
        buffer,
        resolve,
        (err: any) => {
          console.error('Write error', err);
          reject(err);
        }
      );
    });
  }

private listenForData(deviceId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (this.notificationStarted.has(deviceId)) {
      resolve();
      return;
    }

    try {
      ble.startNotification(
        deviceId,
        this.SERVICE_UUID,
        this.NOTIFY_CHAR_UUID,
        (data: ArrayBuffer) => {
          // Wrap callback in NgZone so Angular updates immediately
          this.zone.run(() => {
            const message = this.bytesToString(data).trim();
            this.handleIncomingMessage(deviceId, message);
          });
        },
        (err: any) => console.error('Notification error', err)
      );

      this.notificationStarted.add(deviceId);
      resolve();
    } catch (err) {
      console.error('listenForData exception', err);
      reject(err);
    }
  });
}

// ------------------- Handle incoming message -------------------
private handleIncomingMessage(deviceId: string, message: string) {
  // Normalize message and map to enum
  const normalized = message.toUpperCase();
  const eventMap: { [key: string]: BluetoothMessageRecievedEventType } = {
    'CALIBRATION_FAILED': BluetoothMessageRecievedEventType.CALIBRATION_FAILED,
    'CALIBRATION_STARTED': BluetoothMessageRecievedEventType.CALIBRATION_STARTED,
    'CALIBRATION_SUCCESS': BluetoothMessageRecievedEventType.CALIBRATION_SUCCESS,
    'DEVICE_STARTED_COLLECTION': BluetoothMessageRecievedEventType.DEVICE_STARTED_COLLECTION,
    'DEVICE_STOPPED_COLLECTION': BluetoothMessageRecievedEventType.DEVICE_STOPPED_COLLECTION,
    'ENTERED_LOW_POWER_MODE': BluetoothMessageRecievedEventType.ENTERED_LOW_POWER_MODE,
    'EXITED_LOW_POWER_MODE': BluetoothMessageRecievedEventType.EXITED_LOW_POWER_MODE,
  };
  const eventType = eventMap[normalized] || BluetoothMessageRecievedEventType.CUSTOM;

  // Emit event with deviceId and message
  this.eventSubject.next({ deviceId, type: eventType, payload: message });
}


  public getConnectedDevices(): ConnectedDevice[] {
    return Array.from(this.connectedDevices.values());
  }



  private async saveConnectedDevices() {
    if (!this.storageReady) return;
    const devices = Array.from(this.connectedDevices.values()).map(d => ({ id: d.id, name: d.name }));
    await this.storage.set(BluetoothService.STORAGE_KEY, devices);
  }

  private stringToBytes(str: string): ArrayBuffer {
    return new TextEncoder().encode(str).buffer;
  }

  private bytesToString(buffer: ArrayBuffer): string {
    try {
      return new TextDecoder('utf-8').decode(buffer);
    } catch {
      return String.fromCharCode(...new Uint8Array(buffer));
    }
  }

  private async restoreConnections() {
    if (!this.storageReady) return;

    const saved: ConnectedDevice[] | null = await this.storage.get(BluetoothService.STORAGE_KEY);
    if (!saved || !saved.length) return;

    // Only connect to up to 2 devices on startup
    for (const device of saved.slice(0, 2)) {
      try {
        await this.connectToDevice(device);
      } catch (error) {
        console.warn(`Failed to reconnect to ${device.id}`, error);
      }
    }
  }
}
