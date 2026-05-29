import * as signalR from '@microsoft/signalr';
import type { PollingConfig } from './ModbusTypes';


export const startPolling = async (config: PollingConfig) => {
  const url = new URL('/modbus/start', window.location.origin);
  Object.entries(config).forEach(([key, value]) => url.searchParams.append(key, value.toString()));
  
  const response = await fetch(url.toString(), { method: 'POST' });
  if (!response.ok) throw new Error('Failed to start polling');
};

export const stopPolling = async (config: PollingConfig) => {
  const url = new URL('/modbus/stop', window.location.origin);
  Object.entries(config).forEach(([key, value]) => url.searchParams.append(key, value.toString()));

  const response = await fetch(url.toString(), { method: 'POST' });
  if (!response.ok) throw new Error('Failed to stop polling');
};

export const getSessions = async (): Promise<PollingConfig[]> => {
  const response = await fetch('/modbus/sessions');
  if (!response.ok) throw new Error('Failed to fetch sessions');
  return response.json();
};

export const createHubConnection = () => {
  return new signalR.HubConnectionBuilder()
    .withUrl('/modbushub')
    .withAutomaticReconnect()
    .build();
};
