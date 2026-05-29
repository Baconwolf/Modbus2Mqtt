using Microsoft.EntityFrameworkCore;

namespace Modbus2Mqtt.Data;

public class ModbusDbContext : DbContext
{
    public ModbusDbContext(DbContextOptions<ModbusDbContext> options) : base(options) { }
    public DbSet<ModbusSubscription> Readings => Set<ModbusSubscription>();
}
