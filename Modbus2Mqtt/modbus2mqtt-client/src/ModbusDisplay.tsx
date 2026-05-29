import React, { useState } from 'react';
import type { ModbusData, PollingConfig } from './ModbusTypes';

interface ModbusDisplayProps {
  modbusData: ModbusData[];
  activeSessions: PollingConfig[];
  onStop: (config: PollingConfig) => void;
  onEdit: (oldConfig: PollingConfig, newConfig: PollingConfig) => void;
  isLoading: boolean;
}

export const ModbusDisplay: React.FC<ModbusDisplayProps> = ({ modbusData, activeSessions, onStop, onEdit, isLoading }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [editConfig, setEditConfig] = useState<PollingConfig | null>(null);

  const activeSession = activeSessions[activeTabIndex];
  const liveData = activeSession ? modbusData.find(d => 
    d.host === activeSession.host && d.port === activeSession.port && 
    d.registerType === activeSession.registerType && d.startAddress === activeSession.startAddress && 
    d.unitId === activeSession.unitId
  ) : null;

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editConfig) return;
    const { name, value } = e.target;
    setEditConfig(prev => prev ? ({
      ...prev,
      [name]: name === 'host' || name === 'registerType' ? value : parseInt(value) || 0,
    }) : null);
  };

  const handleSaveEdit = () => {
    if (editConfig && activeSession) {
      onEdit(activeSession, editConfig);
      setEditConfig(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm mt-6">
      <div className="px-5 py-4 border-b border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <h2 className="text-xl font-bold text-slate-950 dark:text-slate-50">Live Data</h2>
      </div>
      
      {activeSessions.length === 0 ? (
        <div className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
          No active polling sessions. Start polling to see results.
        </div>
      ) : (
        <div className="flex flex-col md:flex-row min-h-[400px]">
          {/* Left Side: Tab Headers */}
          <div className="w-full md:w-64 border-r border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 overflow-y-auto">
            {activeSessions.map((session, idx) => (
              <button
                key={`${session.host}-${session.startAddress}-${idx}`}
                onClick={() => {
                  setActiveTabIndex(idx);
                  setEditConfig(null);
                }}
                className={`w-full text-left px-4 py-3 border-b border-slate-200 dark:border-slate-800 transition-colors ${
                  activeTabIndex === idx 
                    ? 'bg-white dark:bg-slate-800 border-l-4 border-l-blue-500' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{session.host}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {session.registerType} @ {session.startAddress}
                </div>
              </button>
            ))}
          </div>

          {/* Right Side: Tab Content */}
          <div className="flex-1 p-6 bg-white dark:bg-slate-900">
            {activeSession && (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {activeSession.host}:{activeSession.port}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Unit ID: {activeSession.unitId} | Type: {activeSession.registerType}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!editConfig ? (
                      <button
                        onClick={() => setEditConfig({ ...activeSession })}
                        className="px-3 py-1.5 text-xs font-bold text-blue-600 border border-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                      >
                        Edit
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditConfig(null)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-800/20 transition"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => onStop(activeSession)}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                    >
                      Stop Session
                    </button>
                  </div>
                </div>

                {editConfig ? (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Edit Session</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Start Address</label>
                        <input
                          type="number"
                          name="startAddress"
                          value={editConfig.startAddress}
                          onChange={handleEditChange}
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Count</label>
                        <input
                          type="number"
                          name="count"
                          value={editConfig.count}
                          onChange={handleEditChange}
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Unit ID</label>
                        <input
                          type="number"
                          name="unitId"
                          value={editConfig.unitId}
                          onChange={handleEditChange}
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded transition disabled:opacity-50"
                    >
                      Apply Changes
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded border border-slate-200 dark:border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Live Data (Hex)</h4>
                      <div className="flex flex-wrap gap-2">
                        {liveData && Array.isArray(liveData.data) ? (
                          liveData.data.map((byte, i) => (
                            <div key={i} className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-400 mb-1">{activeSession.startAddress + i}</span>
                              <span className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded font-mono text-blue-600 dark:text-blue-400">
                                {byte.toString(16).padStart(2, '0')}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-400 italic text-sm py-4">Waiting for data...</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-slate-400 text-right">
                      Polling every 2 seconds
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
