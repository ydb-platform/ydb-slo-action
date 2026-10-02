FROM mcr.microsoft.com/dotnet/runtime:8.0
ARG DLL
ENV SLO_DLL=$DLL
WORKDIR /app
COPY . .
ENTRYPOINT ["sh", "-c", "exec dotnet \"$SLO_DLL\" \"$@\"", "workload"]
