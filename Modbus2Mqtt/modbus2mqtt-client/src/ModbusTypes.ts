export const ModbusRegisterType = {
  Coils: 'Coils',
  DiscreteInputs: 'DiscreteInputs',
  InputRegisters: 'InputRegisters',
  HoldingRegisters: 'HoldingRegisters',
} as const;

export type ModbusRegisterType = typeof ModbusRegisterType[keyof typeof ModbusRegisterType];

export interface ModbusData {
  host: string;
  port: number;
  registerType: ModbusRegisterType;
  startAddress: number;
  count: number;
  unitId: number;
  data: number[];
}

export interface PollingConfig {
  host: string;
  port: number;
  registerType: ModbusRegisterType;
  startAddress: number;
  count: number;
  unitId: number;
}
