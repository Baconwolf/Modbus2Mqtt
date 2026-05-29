namespace Modbus2Mqtt.Data;

public class ModbusSubscription
{
    public int Id { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; }
    public string RegisterType { get; set; } = string.Empty;
    public ushort StartAddress { get; set; }
    public ushort Count { get; set; }
    public byte UnitId { get; set; }   
}