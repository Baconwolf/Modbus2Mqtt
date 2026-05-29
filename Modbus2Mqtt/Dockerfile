FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM node:20 AS client-build
WORKDIR /src/modbus2mqtt-client
COPY modbus2mqtt-client/package*.json ./
RUN npm install
COPY modbus2mqtt-client/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["Modbus2MqttServer.csproj", "./"]
RUN dotnet restore "Modbus2MqttServer.csproj"
COPY . .
RUN dotnet build "Modbus2MqttServer.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "Modbus2MqttServer.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
COPY --from=client-build /src/modbus2mqtt-client/dist ./wwwroot
ENTRYPOINT ["dotnet", "Modbus2MqttServer.dll"]
