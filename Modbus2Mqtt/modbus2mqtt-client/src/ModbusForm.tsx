import React, { useState } from 'react';
import { ModbusRegisterType } from './ModbusTypes';
import type { PollingConfig } from './ModbusTypes';

interface ModbusFormProps {
  onStart: (config: PollingConfig) => void;
  onStop: (config: PollingConfig) => void;
  isLoading: boolean;
}

export const ModbusForm: React.FC<ModbusFormProps> = ({ onStart, onStop, isLoading }) => {
  const [config, setConfig] = useState<PollingConfig>({
    host: '127.0.0.1',
    port: 502,
    registerType: ModbusRegisterType.HoldingRegisters,
    startAddress: 0,
    count: 10,
    unitId: 1,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: name === 'host' || name === 'registerType' ? value : parseInt(value) || 0,
    }));
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm">
      <h2 className="text-xl font-bold mb-4 text-slate-950 dark:text-slate-50">Polling Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Host</label>
          <input
            type="text"
            name="host"
            value={config.host}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Port</label>
          <input
            type="number"
            name="port"
            value={config.port}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Register Type</label>
          <select
            name="registerType"
            value={config.registerType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-slate-100"
          >
            {Object.values(ModbusRegisterType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unit ID</label>
          <input
            type="number"
            name="unitId"
            value={config.unitId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Address</label>
          <input
            type="number"
            name="startAddress"
            value={config.startAddress}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Count</label>
          <input
            type="number"
            name="count"
            value={config.count}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => onStart(config)}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-bold transition disabled:opacity-50"
        >
          Start Polling
        </button>
        <button
          onClick={() => onStop(config)}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-bold transition disabled:opacity-50"
        >
          Stop Polling
        </button>
      </div>
    </div>
  );
};
