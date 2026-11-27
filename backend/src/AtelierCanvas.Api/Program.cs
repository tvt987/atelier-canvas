using System.Globalization;
using System.Text.Json;
using AtelierCanvas.Domain.Models;
using AtelierCanvas.Domain.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IDocumentSnapshotStore, InMemoryDocumentSnapshotStore>();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.WriteIndented = false;
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("AtelierWeb", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowAnyOrigin()
            .WithExposedHeaders("ETag", "X-Atelier-Document-Version");
    });
});

var app = builder.Build();

app.UseCors("AtelierWeb");

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    await next();
});

app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    service = "AtelierCanvas.Api",
    version = "5.0.0",
    runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
    utcNow = DateTimeOffset.UtcNow
}));

app.MapGet("/api/v1/documents/{docId}", (string docId, HttpResponse response, IDocumentSnapshotStore store) =>
{
    if (string.IsNullOrWhiteSpace(docId))
    {
        return Results.BadRequest(new { code = "INVALID_DOC_ID", message = "Document ID cannot be empty." });
    }

    var snapshot = store.Get(docId);
    if (snapshot is null)
    {
        return Results.NotFound(new
        {
            code = "DOCUMENT_NOT_FOUND",
            docId,
            message = $"Canvas document '{docId}' was not found."
        });
    }

    response.Headers.ETag = snapshot.ETag;
    response.Headers["X-Atelier-Document-Version"] = snapshot.Version.ToString(CultureInfo.InvariantCulture);
    return Results.Ok(snapshot);
});

app.MapPut("/api/v1/documents/{docId}", (
    string docId,
    PutDocumentRequestBody body,
    HttpRequest request,
    HttpResponse response,
    IDocumentSnapshotStore store) =>
{
    if (string.IsNullOrWhiteSpace(docId))
    {
        return Results.BadRequest(new { code = "INVALID_DOC_ID", message = "Document ID cannot be empty." });
    }

    if (body.Payload.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
    {
        return Results.BadRequest(new { code = "INVALID_PAYLOAD", message = "Canvas document payload is required." });
    }

    long? expectedVersion = body.ExpectedVersion;
    if (request.Headers.TryGetValue("If-Match", out var ifMatchValues))
    {
        var rawHeader = ifMatchValues.ToString().Trim();
        if (!TryParseVersionFromIfMatch(rawHeader, out var headerVersion))
        {
            return Results.BadRequest(new
            {
                code = "INVALID_IF_MATCH",
                message = $"Invalid If-Match ETag header '{rawHeader}'. Expected numeric version such as \"1\"."
            });
        }

        if (expectedVersion.HasValue && expectedVersion.Value != headerVersion)
        {
            return Results.BadRequest(new
            {
                code = "VERSION_HEADER_MISMATCH",
                message = $"If-Match header ({headerVersion}) disagrees with body expectedVersion ({expectedVersion.Value})."
            });
        }

        expectedVersion = headerVersion;
    }

    if (!expectedVersion.HasValue || expectedVersion.Value < 0)
    {
        return Results.BadRequest(new
        {
            code = "MISSING_EXPECTED_VERSION",
            message = "Provide a non-negative expectedVersion in the body or an If-Match ETag header."
        });
    }

    try
    {
        var updated = store.PutWithOptimisticConcurrency(
            docId,
            new UpdateDocumentCommand(
                ExpectedVersion: expectedVersion.Value,
                TemplateId: body.TemplateId ?? "custom",
                Payload: body.Payload,
                UpdatedBy: body.UpdatedBy
            ));

        response.Headers.ETag = updated.ETag;
        response.Headers["X-Atelier-Document-Version"] = updated.Version.ToString(CultureInfo.InvariantCulture);
        return Results.Ok(updated);
    }
    catch (OptimisticConcurrencyException conflict)
    {
        response.Headers.ETag = conflict.CurrentETag;
        response.Headers["X-Atelier-Document-Version"] = conflict.CurrentVersion.ToString(CultureInfo.InvariantCulture);
        return Results.Conflict(conflict.ToErrorPayload());
    }
});

app.MapPost("/api/v1/tokens/compile", (TokenCompilationRequest request) =>
{
    var validation = W3CTokenValidator.ValidateAndNormalize(request.Tokens);
    if (!validation.IsValid || validation.Normalized is null)
    {
        return Results.BadRequest(new
        {
            code = "INVALID_DESIGN_TOKENS",
            message = "W3C Design Token validation failed.",
            errors = validation.Errors
        });
    }

    try
    {
        var compiled = MultiPlatformTokenCompiler.Compile(validation.Normalized, request.Targets);
        return Results.Ok(compiled);
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new
        {
            code = "UNSUPPORTED_TARGET",
            message = ex.Message
        });
    }
});

app.Run();

static bool TryParseVersionFromIfMatch(string raw, out long version)
{
    version = 0;
    if (string.IsNullOrWhiteSpace(raw)) return false;

    var cleaned = raw.Trim();
    if (cleaned.StartsWith("W/", StringComparison.OrdinalIgnoreCase))
    {
        cleaned = cleaned[2..].Trim();
    }

    cleaned = cleaned.Trim('"');
    if (cleaned.StartsWith('v') || cleaned.StartsWith('V'))
    {
        cleaned = cleaned[1..];
    }

    return long.TryParse(cleaned, NumberStyles.Integer, CultureInfo.InvariantCulture, out version) && version >= 0;
}

public sealed record PutDocumentRequestBody(
    long? ExpectedVersion,
    string? TemplateId,
    JsonElement Payload,
    string? UpdatedBy
);

public partial class Program { }
