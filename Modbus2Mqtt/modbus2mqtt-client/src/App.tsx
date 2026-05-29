import { useEffect, useState, useCallback, useRef } from 'react';
import type { ModbusData, PollingConfig } from './ModbusTypes';
import { startPolling, stopPolling, createHubConnection, getSessions } from './ModbusService';
import { ModbusForm } from './ModbusForm';
import { ModbusDisplay } from './ModbusDisplay';
import { HubConnection } from '@microsoft/signalr';

function App() {
  const [modbusData, setModbusData] = useState<ModbusData[]>([]);
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessions, setActiveSessions] = useState<PollingConfig[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    const newConnection = createHubConnection();
    setConnection(newConnection);
  }, []);

  const loadSessions = useCallback(async (conn: HubConnection) => {
    try {
      const sessions = await getSessions();
      setActiveSessions(sessions);
      
      // Join groups for existing sessions
      for (const session of sessions) {
        await conn.invoke('JoinGroup', `${session.host}:${session.port}`);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, []);

  useEffect(() => {
    if (connection) {
      connection
        .start()
        .then(() => {
          console.log('Connected to SignalR Hub');
          if (!initialized.current) {
            loadSessions(connection);
            initialized.current = true;
          }
          connection.on('ReceiveData', (data: any) => {
            // Mapping back from PascalCase (C#) to camelCase if necessary, 
            // but the SignalR Hub usually serializes to camelCase by default in ASP.NET Core
              const mappedData: ModbusData = {
                host: data.host,
                port: data.port,
                registerType: data.registerType,
                startAddress: data.startAddress,
                count: data.count,
                unitId: data.unitId,
                data: Array.isArray(data.data) 
                  ? data.data 
                  : (typeof data.data === 'string' 
                      ? Array.from(atob(data.data), c => c.charCodeAt(0))
                      : []),
              };

              setModbusData((prev) => {
                const existingIdx = prev.findIndex(
                  (item) =>
                    item.host === mappedData.host &&
                    item.port === mappedData.port &&
                    item.registerType === mappedData.registerType &&
                    item.startAddress === mappedData.startAddress &&
                    item.unitId === mappedData.unitId
                );

              if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = mappedData;
                return updated;
              }
              return [...prev, mappedData];
            });
          });
        })
        .catch((err) => {
          console.error('SignalR Connection Error: ', err);
          setError('Failed to connect to real-time data hub');
        });

      return () => {
        connection.stop();
      };
    }
  }, [connection, loadSessions]);

  const handleStart = useCallback(
    async (config: PollingConfig) => {
      setIsLoading(true);
      setError(null);
      try {
        await startPolling(config);
        
        // Update active sessions list
        setActiveSessions(prev => {
          const exists = prev.some(s => 
            s.host === config.host && s.port === config.port && 
            s.registerType === config.registerType && s.startAddress === config.startAddress && 
            s.count === config.count && s.unitId === config.unitId
          );
          if (exists) return prev;
          return [...prev, config];
        });

        if (connection) {
          // Join the group for this host to receive updates
          await connection.invoke('JoinGroup', `${config.host}:${config.port}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start polling');
      } finally {
        setIsLoading(false);
      }
    },
    [connection]
  );

  const handleStop = useCallback(
    async (config: PollingConfig) => {
      setIsLoading(true);
      setError(null);
      try {
        await stopPolling(config);
        
        // Update active sessions list
        setActiveSessions(prev => prev.filter(s => 
          !(s.host === config.host && s.port === config.port && 
            s.registerType === config.registerType && s.startAddress === config.startAddress && 
            s.count === config.count && s.unitId === config.unitId)
        ));

        // We might want to remove it from the list locally too
        setModbusData((prev) =>
          prev.filter(
            (item) =>
              !(
                item.host === config.host &&
                item.port === config.port &&
                item.registerType === config.registerType &&
                item.startAddress === config.startAddress &&
                item.unitId === config.unitId
              )
          )
        );
        // Optionally leave group if no other polling for this host, 
        // but server-side Hub handles group management and the manager handles connection.
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to stop polling');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return (
    <main className="min-h-screen min-w-80 bg-slate-100 px-3 py-6 font-sans text-slate-600 antialiased sm:px-4 sm:py-10 dark:bg-slate-950 dark:text-slate-300">
      <header className="mx-auto mb-7 flex w-full max-w-6xl flex-col gap-6 text-left">
        <div>
          <p className="mb-2 text-[13px] font-bold tracking-wider text-teal-700 uppercase dark:text-teal-300">
            Modbus TCP Monitor
          </p>
          <h1 className="text-[34px] leading-[1.05] font-bold tracking-normal text-slate-950 sm:text-5xl dark:text-slate-50">
            Modbus2Mqtt
          </h1>
          <p className="mt-2 text-[17px] text-slate-600 dark:text-slate-300">
            Monitor Modbus registers in real-time via SignalR.
          </p>
        </div>
      </header>

      {error && (
        <section
          className="mx-auto mb-5 flex w-full max-w-6xl items-center gap-2.5 rounded-md border border-red-300 bg-red-50 px-3.5 py-3 text-left text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          role="alert"
        >
          <strong>Error</strong>
          <span>{error}</span>
        </section>
      )}

      <div className="mx-auto w-full max-w-6xl">
        <ModbusForm onStart={handleStart} onStop={handleStop} isLoading={isLoading} />
        <ModbusDisplay 
          modbusData={modbusData} 
          activeSessions={activeSessions} 
          onStop={handleStop}
          onEdit={(oldConfig, newConfig) => {
            handleStop(oldConfig);
            handleStart(newConfig);
          }}
          isLoading={isLoading}
        />
      </div>
    </main>
  );
}

export default App;
