using System.Data;
using System.Text.Json;
using OpenTelemetry;
using OpenTelemetry.Exporter;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using Ydb.Sdk.Ado;

var runId = Guid.NewGuid().ToString("N");
var reference = Environment.GetEnvironmentVariable("WORKLOAD_REF") ?? "current";
var builder = Sdk.CreateMeterProviderBuilder()
    .ConfigureResource(resource => resource.AddService("slo-v3-probe").AddAttributes([
        new KeyValuePair<string, object>("ref", reference),
        new KeyValuePair<string, object>("run_id", runId)
    ]));
if (!args.Contains("--no-sdk")) builder.AddMeter("Ydb.Sdk");
using var provider = builder.AddOtlpExporter(options =>
{
    options.Protocol = OtlpExportProtocol.HttpProtobuf;
    options.Endpoint = new Uri(Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT")
                               ?? "http://ydb-prometheus:9090/api/v1/otlp/v1/metrics");
}).Build();

var readSuccess = false;
var writeSuccess = false;
var detail = "Payload verified";
try
{
    await using var source = new YdbDataSourceBuilder(
        new YdbConnectionStringBuilder(Environment.GetEnvironmentVariable("YDB_CONNECTION_STRING")
                                      ?? "Host=ydb-database-1;Port=2136;Database=/Root/testdb;PoolName=slo-v3-probe")).Build();
    await using var connection = await source.OpenConnectionAsync();
    await new YdbCommand(connection)
    {
        CommandText = "CREATE TABLE IF NOT EXISTS slo_v3_probe (id Utf8, payload Utf8, PRIMARY KEY(id));"
    }.ExecuteNonQueryAsync();

    await new YdbCommand(connection)
    {
        CommandText = "UPSERT INTO slo_v3_probe (id,payload) VALUES (@id,@payload);",
        Parameters =
        {
            new YdbParameter { ParameterName = "id", DbType = DbType.String, Value = runId },
            new YdbParameter { ParameterName = "payload", DbType = DbType.String, Value = "verified" }
        }
    }.ExecuteNonQueryAsync();
    writeSuccess = true;

    var payload = await new YdbCommand(connection)
    {
        CommandText = "SELECT payload FROM slo_v3_probe WHERE id=@id;",
        Parameters = { new YdbParameter { ParameterName = "id", DbType = DbType.String, Value = runId } }
    }.ExecuteScalarAsync();
    readSuccess = Equals(payload, args.Contains("--fail") ? "wrong-payload" : "verified");
    if (!readSuccess) detail = "Read payload mismatch";
}
catch (Exception error)
{
    detail = error.Message;
}

var flushed = provider.ForceFlush(10000);
if (!flushed) detail = "SDK telemetry flush timed out";
var verdict = readSuccess && writeSuccess && flushed ? "PASS" : "FAIL";
var result = new
{
    schemaVersion = 3,
    @ref = reference,
    runId,
    kind = "table",
    verdict,
    checks = new[]
    {
        new { id = "T01", verdict = writeSuccess ? "PASS" : "FAIL", detail },
        new { id = "T02", verdict = readSuccess ? "PASS" : "FAIL", detail }
    },
    operations = new[]
    {
        new { type = "read", success = readSuccess ? 1 : 0, error = readSuccess ? 0 : 1 },
        new { type = "write", success = writeSuccess ? 1 : 0, error = writeSuccess ? 0 : 1 }
    }
};
await File.WriteAllTextAsync("/tmp/slo-result.json", JsonSerializer.Serialize(result));
Console.WriteLine(JsonSerializer.Serialize(result));
return verdict == "PASS" ? 0 : 1;
