import { Component, OnInit } from '@angular/core';
import { Platform, AlertController, ToastController } from '@ionic/angular';
import { BluetoothService, ConnectedDevice } from 'src/app/services/bluetoothconnection.service';
import { Capacitor } from '@capacitor/core';
import { BluetoothMessageSendEventType } from 'src/app/services/bluetooth-events';

@Component({
  selector: 'app-main-bluetooth-page',
  templateUrl: './main-bluetooth-page.component.html',
  styleUrls: ['./main-bluetooth-page.component.scss'],
  standalone: false
})
export class MainBluetoothPageComponent implements OnInit {

  availableDevices: ConnectedDevice[] = [];
  connectedDevices: ConnectedDevice[] = [];
  connectingDeviceId: string | null = null;
  connectionError: string | null = null;

  // Modal
  activeDevice: ConnectedDevice | null = null;
  deviceMessages: string[] = [];

  constructor(
    public bluetoothService: BluetoothService,
    private platform: Platform,
    private alertController: AlertController,
    private toastController: ToastController // ✅ Inject ToastController
  ) {}

  async ngOnInit() {
    await this.requestPermissions();

    this.bluetoothService.availableDevices$.subscribe(devices => {
      this.availableDevices = devices;
    });

    this.bluetoothService.connectedDevices$.subscribe(devices => {
      this.connectedDevices = devices.map(d => ({
        ...d,
        showMessages: false,
        messages: []
      }));
    });

    // Listen for incoming messages
    this.bluetoothService.events$.subscribe(event => {
      const device = this.connectedDevices.find(d => d.id === event.deviceId);
      if (device) {
        device.messages = device.messages || [];
        device.messages = [...device.messages, 'Command sent: start/stop data collection'];
        device.messages.push('Received from JI Band: ' + event.payload);
      }
    });

    // 🔥 Listen for device disconnects and show toast
    this.bluetoothService.deviceDisconnect$.subscribe(async (device: ConnectedDevice) => {
      const toast = await this.toastController.create({
        message: `${device.name || 'A device'} has disconnected`,
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
    });
  }

  /** Request BLE-related permissions on Android 12+ */
  private async requestPermissions() {
    if (!this.platform.is('android')) return;

    try {
      // @ts-ignore: Capacitor Android Permissions
      const granted = await Capacitor.Plugins.Permissions.requestPermissions({
        permissions: [
          'android.permission.BLUETOOTH_SCAN',
          'android.permission.BLUETOOTH_CONNECT',
          'android.permission.ACCESS_FINE_LOCATION'
        ]
      });

      const denied = Object.entries(granted).filter(([k, v]) => v !== 'granted');
      if (denied.length > 0) {
        const alert = await this.alertController.create({
          header: 'Permissions required',
          message: 'Bluetooth permissions are required to scan and connect devices.',
          buttons: ['OK']
        });
        await alert.present();
      }
    } catch (err) {
      console.error('Permission request error:', err);
    }
  }

  scan() {
    this.connectionError = null;
    this.availableDevices = [];
    this.bluetoothService.startScan(5000);
  }

  async connect(device: ConnectedDevice) {
    if (!device) return;

    this.connectingDeviceId = device.id;
    this.connectionError = null;

    try {
      await this.bluetoothService.connectToDevice(device);
    } catch (err) {
      console.error('Connection failed', err);
      this.connectionError = `Failed to connect to ${device.name || 'Unknown Device'}`;
    } finally {
      this.connectingDeviceId = null;
    }
  }

  disconnect(deviceId: string) {
    this.bluetoothService.disconnect(deviceId);
  }

  isConnecting(deviceId: string) {
    return this.connectingDeviceId === deviceId;
  }

  startCalibration(device: ConnectedDevice) {
    this.bluetoothService.sendMessage(device.id, { 
      type: BluetoothMessageSendEventType.TOGGLE_CALIBRATION, 
      payload: "" 
    });
    device.messages = [...(device.messages || []), 'Command sent: start calibration'];
  }

  /** Start/Stop Data Collection for ALL connected devices at once */
  startDataCollection() {
    this.connectedDevices.forEach(device => {
      this.bluetoothService.sendMessage(device.id, { 
        type: BluetoothMessageSendEventType.TOGGLE_DATA_COLLECTION, 
        payload: "" 
      });
      device.messages = [...(device.messages || []), 'Command sent: start/stop data collection'];
    });
  }

  enterLowPowerMode(device: ConnectedDevice) {
    this.bluetoothService.sendMessage(device.id, { 
      type: BluetoothMessageSendEventType.TOGGLE_LOW_POWER_MODE, 
      payload: "" 
    });
    device.messages = [...(device.messages || []), 'Command sent: enter/exit low power mode'];
  }
}
