using Microsoft.EntityFrameworkCore;
using Modbus2Mqtt.Data;
using Modbus2Mqtt.Hubs;
using Modbus2Mqtt.Modbus;

var builder = WebApplication.CreateBuilder(args);

if (!builder.Environment.IsDevelopment())
{
    builder.WebHost.UseUrls("http://0.0.0.0:8080");
}
var dbPath = "modbus.db";
if (Directory.Exists("/addon_config"))
{
    dbPath = Path.Combine("/addon_config", "modbus.db");
}

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddDbContext<ModbusDbContext>(options => 
    options.UseSqlite($"Data Source={dbPath}"));
builder.Services.AddSingleton<ModbusConnectionManager>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseDefaultFiles();
app.UseStaticFiles();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ModbusDbContext>();
    db.Database.Migrate();
}

// Initialize polling sessions from DB
var manager = app.Services.GetRequiredService<ModbusConnectionManager>();
await manager.InitializeAsync();

app.MapHub<ModbusHub>("/modbushub");

app.MapGet("/modbus/sessions", (ModbusConnectionManager manager) =>
{
    return Results.Ok(manager.GetActiveSessions());
});

app.MapPost("/modbus/start", (string host, int port, ModbusRegisterType registerType, ushort startAddress, ushort count, byte unitId, ModbusConnectionManager manager) =>
{
    manager.StartPolling(host, port, registerType, startAddress, count, unitId);
    return Results.Ok();
});

app.MapPost("/modbus/stop", async (string host, int port, ModbusRegisterType registerType, ushort startAddress, ushort count, byte unitId, ModbusConnectionManager manager) =>
{
    await manager.StopPolling(host, port, registerType, startAddress, count, unitId);
    return Results.Ok();
});

app.MapFallbackToFile("index.html");

app.Run();
