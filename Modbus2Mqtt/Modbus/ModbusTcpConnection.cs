using System.Net;
using FluentModbus;
using Microsoft.Extensions.Logging;

namespace Modbus2Mqtt.Modbus;

public enum ModbusRegisterType
{
    Coils,
    DiscreteInputs,
    InputRegisters,
    HoldingRegisters
}

public sealed class ModbusTcpConnection : IAsyncDisposable
{
    public string Host { get; }
    public int Port { get; }
    private readonly ILogger<ModbusTcpConnection> _logger;
    private readonly ModbusTcpClient _client = new();

    public bool IsConnected => _client.IsConnected;

    public ModbusTcpConnection(string host, ILogger<ModbusTcpConnection> logger, int port = 502)
    {
        Host = host;
        _logger = logger;
        Port = port;
    }

    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Connecting to Modbus TCP server at {Host}:{Port}", Host, Port);
        var addresses = await Dns.GetHostAddressesAsync(Host, cancellationToken);
        _client.Connect(new IPEndPoint(addresses[0], Port));
    }

    public void Disconnect() => _client.Disconnect();

    /// <summary>
    /// Reads registers from the Modbus server.
    /// For holding/input registers: returns count * 2 raw bytes (big-endian per Modbus spec).
    /// For coils/discrete inputs: returns ceil(count / 8) bytes with bits packed LSB-first.
    /// </summary>
    public async Task<Memory<byte>> ReadAsync(
        ModbusRegisterType registerType,
        ushort startAddress,
        ushort count,
        byte unitId = 1,
        CancellationToken cancellationToken = default)
    {
        Memory<byte> data = registerType switch
        {
            ModbusRegisterType.Coils =>
                await _client.ReadCoilsAsync(unitId, startAddress, count, cancellationToken),
            ModbusRegisterType.DiscreteInputs =>
                await _client.ReadDiscreteInputsAsync(unitId, startAddress, count, cancellationToken),
            ModbusRegisterType.InputRegisters =>
                await _client.ReadInputRegistersAsync(unitId, startAddress, count, cancellationToken),
            ModbusRegisterType.HoldingRegisters =>
                await _client.ReadHoldingRegistersAsync(unitId, startAddress, count, cancellationToken),
            _ => throw new ArgumentOutOfRangeException(nameof(registerType))
        };

        return data.ToArray();
    }

    public override string ToString() => $"{Host}:{Port}";

    public ValueTask DisposeAsync()
    {
        _logger.LogInformation("Disposing Modbus TCP connection to {Host}:{Port}", Host, Port);
        _client.Dispose();
        return ValueTask.CompletedTask;
    }
}
