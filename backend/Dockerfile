# Stage 1: Restore, Build, Test & Publish .NET 10 Minimal API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend/AtelierCanvas.sln ./backend/
COPY backend/src/AtelierCanvas.Domain/AtelierCanvas.Domain.csproj ./backend/src/AtelierCanvas.Domain/
COPY backend/src/AtelierCanvas.Api/AtelierCanvas.Api.csproj ./backend/src/AtelierCanvas.Api/
COPY backend/tests/AtelierCanvas.Api.Tests/AtelierCanvas.Api.Tests.csproj ./backend/tests/AtelierCanvas.Api.Tests/

RUN dotnet restore backend/AtelierCanvas.sln

COPY backend ./backend
RUN dotnet test backend/AtelierCanvas.sln --no-restore --configuration Release
RUN dotnet publish backend/src/AtelierCanvas.Api/AtelierCanvas.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# Stage 2: Minimal hardened ASP.NET Core 10 runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_EnableDiagnostics=0

COPY --from=build /app/publish ./

USER $APP_UID
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["dotnet", "AtelierCanvas.Api.dll"]
