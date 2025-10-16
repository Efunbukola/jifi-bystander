export enum BluetoothMessageRecievedEventType {
  CALIBRATION_FAILED = 'CALIBRATION_FAILED',
  CALIBRATION_STARTED = 'CALIBRATION_STARTED',
  CALIBRATION_SUCCESS = 'CALIBRATION_SUCCESS',
  DEVICE_STARTED_COLLECTION = 'DEVICE_STARTED_COLLECTION',
  DEVICE_STOPPED_COLLECTION = 'DEVICE_STOPPED_COLLECTION',
  ENTERED_LOW_POWER_MODE = 'ENTERED_LOW_POWER_MODE',
  EXITED_LOW_POWER_MODE = 'EXITED_LOW_POWER_MODE',
  CUSTOM = 'CUSTOM'
}

export interface BluetoothMessageRecievedEvent{
  type: BluetoothMessageRecievedEventType;
  payload: string;
   deviceId: string;
}


export enum BluetoothMessageSendEventType {
  TOGGLE_LOW_POWER_MODE = 3,
  TOGGLE_DATA_COLLECTION = 1,
  TOGGLE_CALIBRATION = 2,
}

export interface BluetoothMessageSendEvent{
  type: BluetoothMessageSendEventType;
  payload: string;
}
