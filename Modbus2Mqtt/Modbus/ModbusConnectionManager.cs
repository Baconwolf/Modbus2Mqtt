using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Modbus2Mqtt.Data;
using Modbus2Mqtt.Hubs;

namespace Modbus2Mqtt.Modbus;

/// <summary>
/// Manages Modbus TCP connections and background polling.
/// Connections are singletons per host.
/// </summary>
public sealed class ModbusConnectionManager : IAsyncDisposable
{
    private readonly ConcurrentDictionary<string, ModbusTcpConnection> _connections = new();
    private readonly ConcurrentDictionary<string, ModbusPollingWorker> _workers = new();
    private readonly IHubContext<ModbusHub> _hubContext;
    private readonly ILoggerFactory _loggerFactory;
    private readonly ILogger<ModbusConnectionManager> _logger;
    private readonly IServiceProvider _serviceProvider;

    public ModbusConnectionManager(IHubContext<ModbusHub> hubContext, ILoggerFactory loggerFactory, IServiceProvider serviceProvider)
    {
        _hubContext = hubContext;
        _loggerFactory = loggerFactory;
        _logger = loggerFactory.CreateLogger<ModbusConnectionManager>();
        _serviceProvider = serviceProvider;
    }

    public async Task InitializeAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ModbusDbContext>();
        var subscriptions = await db.Readings.ToListAsync();
        
        foreach (var sub in subscriptions)
        {
            if (Enum.TryParse<ModbusRegisterType>(sub.RegisterType, out ModbusRegisterType registerType))
            {
                StartPolling(sub.Host, sub.Port, registerType, sub.StartAddress, sub.Count, sub.UnitId, saveToDb: false);
            }
        }
    }

    public IEnumerable<object> GetActiveSessions()
    {
        return _workers.Values.Select(w => new
        {
            w.Host,
            w.Port,
            RegisterType = w.RegisterType.ToString(),
            w.StartAddress,
            w.Count,
            w.UnitId
        }).ToList();
    }

    /// <summary>
    /// Gets an existing connection for the host or creates a new one.
    /// </summary>
    public ModbusTcpConnection GetOrCreateConnection(string host, int port)
    {
        var key = $"{host}:{port}";
        return _connections.GetOrAdd(key, _ => new ModbusTcpConnection(host, _loggerFactory.CreateLogger<ModbusTcpConnection>(), port));
    }

    /// <summary>
    /// Starts polling a specific register every second.
    /// </summary>
    public void StartPolling(string host, int port, ModbusRegisterType registerType, ushort startAddress, ushort count, byte unitId = 1, bool saveToDb = true)
    {
        var connection = GetOrCreateConnection(host, port);
        var key = $"{host}:{port}_{registerType}_{startAddress}_{count}_{unitId}";
        
        _workers.GetOrAdd(key, _ => 
        {
            var worker = new ModbusPollingWorker(connection, registerType, startAddress, count, unitId, _hubContext, _loggerFactory.CreateLogger<ModbusPollingWorker>());
            worker.Start();

            if (saveToDb)
            {
                Task.Run(async () =>
                {
                    try
                    {
                        using var scope = _serviceProvider.CreateScope();
                        var db = scope.ServiceProvider.GetRequiredService<ModbusDbContext>();
                        var exists = await db.Readings.AnyAsync(r => 
                            r.Host == host && r.Port == port && r.RegisterType == registerType.ToString() && 
                            r.StartAddress == startAddress && r.Count == count && r.UnitId == unitId);
                        
                        if (!exists)
                        {
                            db.Readings.Add(new Data.ModbusSubscription
                            {
                                Host = host,
                                Port = port,
                                RegisterType = registerType.ToString(),
                                StartAddress = startAddress,
                                Count = count,
                                UnitId = unitId
                            });
                            await db.SaveChangesAsync();
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to save subscription to database");
                    }
                });
            }

            return worker;
        });
    }

    /// <summary>
    /// Stops polling a specific register configuration.
    /// </summary>
    public async Task StopPolling(string host, int port, ModbusRegisterType registerType, ushort startAddress, ushort count, byte unitId = 1)
    {
        var key = $"{host}:{port}_{registerType}_{startAddress}_{count}_{unitId}";
        if (_workers.TryRemove(key, out var worker))
        {
            await worker.StopAsync();
            
            using (var scope = _serviceProvider.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ModbusDbContext>();
                var sub = await db.Readings.FirstOrDefaultAsync(r => 
                    r.Host == host && r.Port == port && r.RegisterType == registerType.ToString() && 
                    r.StartAddress == startAddress && r.Count == count && r.UnitId == unitId);
                
                if (sub != null)
                {
                    db.Readings.Remove(sub);
                    await db.SaveChangesAsync();
                }
            }

            // Check if any other workers are still using this connection
            var connectionKey = $"{host}:{port}";
            var workerPrefix = $"{connectionKey}_";
            var remainingWorkers = _workers.Keys.Any(k => k.StartsWith(workerPrefix));
            
            if (!remainingWorkers)
            {
                if (_connections.TryRemove(connectionKey, out var connection))
                {
                    await connection.DisposeAsync();
                }
            }
        }
    }

    /// <summary>
    /// Gets the last fetched data for a specific polling configuration.
    /// </summary>
    public Memory<byte>? GetLastData(string host, int port, ModbusRegisterType registerType, ushort startAddress, ushort count, byte unitId = 1)
    {
        var key = $"{host}:{port}_{registerType}_{startAddress}_{count}_{unitId}";
        if (_workers.TryGetValue(key, out var worker))
        {
            return worker.LastData;
        }
        return null;
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var worker in _workers.Values)
        {
            await worker.StopAsync();
        }
        
        foreach (var connection in _connections.Values)
        {
            await connection.DisposeAsync();
        }
        
        _workers.Clear();
        _connections.Clear();
    }
}

internal sealed class ModbusPollingWorker
{
    private readonly ModbusTcpConnection _connection;
    private readonly ModbusRegisterType _registerType;
    private readonly ushort _startAddress;
    private readonly ushort _count;
    private readonly byte _unitId;
    private readonly IHubContext<ModbusHub> _hubContext;
    private readonly ILogger<ModbusPollingWorker> _logger;
    private CancellationTokenSource? _cts;
    private Task? _pollingTask;

    public Memory<byte>? LastData { get; private set; }
    public string Host => _connection.Host;
    public int Port => _connection.Port;
    public ModbusRegisterType RegisterType => _registerType;
    public ushort StartAddress => _startAddress;
    public ushort Count => _count;
    public byte UnitId => _unitId;

    public ModbusPollingWorker(ModbusTcpConnection connection, ModbusRegisterType registerType, ushort startAddress, ushort count, byte unitId, IHubContext<ModbusHub> hubContext, ILogger<ModbusPollingWorker> logger)
    {
        _connection = connection;
        _registerType = registerType;
        _startAddress = startAddress;
        _count = count;
        _unitId = unitId;
        _hubContext = hubContext;
        _logger = logger;
    }

    public void Start()
    {
        if (_pollingTask != null) return;
        
        _cts = new CancellationTokenSource();
        _pollingTask = PollAsync(_cts.Token);
    }

    public async Task StopAsync()
    {
        if (_cts != null)
        {
            await _cts.CancelAsync();
        }

        if (_pollingTask != null)
        {
            try
            {
                await _pollingTask;
            }
            catch (OperationCanceledException)
            {
                // Expected
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during polling task termination: {Message}", ex.Message);
            }
        }
    }

    private async Task PollAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                if (!_connection.IsConnected)
                {
                    await _connection.ConnectAsync(cancellationToken);
                }

                LastData = await _connection.ReadAsync(_registerType, _startAddress, _count, _unitId, cancellationToken);
                
                await _hubContext.Clients.Group(_connection.ToString()).SendAsync("ReceiveData", new
                {
                    Host = _connection.Host,
                    Port = _connection.Port,
                    RegisterType = _registerType.ToString(),
                    StartAddress = _startAddress,
                    Count = _count,
                    UnitId = _unitId,
                    Data = LastData.Value.ToArray().Select(b => (int)b).ToArray()
                }, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error polling Modbus on {Connection}: {Message}", _connection, ex.Message);
            }

            try
            {
                await Task.Delay(2000, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
