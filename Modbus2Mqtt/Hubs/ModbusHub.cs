using Microsoft.AspNetCore.SignalR;

namespace Modbus2Mqtt.Hubs;

public class ModbusHub : Hub
{
    public async Task JoinGroup(string host)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, host);
    }

    public async Task LeaveGroup(string host)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, host);
    }
}
