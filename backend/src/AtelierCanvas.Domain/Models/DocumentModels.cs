using System.Text.Json;

namespace AtelierCanvas.Domain.Models;

public sealed record CanvasDocumentSnapshot(
    string DocId,
    long Version,
    string TemplateId,
    JsonElement Payload,
    string UpdatedBy,
    DateTimeOffset UpdatedAtUtc,
    string ETag
);

public sealed record UpdateDocumentCommand(
    long ExpectedVersion,
    string TemplateId,
    JsonElement Payload,
    string? UpdatedBy
);

public sealed record DocumentConflictError(
    string Code,
    string DocId,
    long ExpectedVersion,
    long CurrentVersion,
    string CurrentETag,
    string Message
);

public sealed class OptimisticConcurrencyException(
    string docId,
    long expectedVersion,
    long currentVersion
) : Exception(
    $"Optimistic concurrency conflict on document '{docId}': expected version {expectedVersion}, but current version is {currentVersion}."
)
{
    public string DocId { get; } = docId;
    public long ExpectedVersion { get; } = expectedVersion;
    public long CurrentVersion { get; } = currentVersion;
    public string CurrentETag => $"\"{CurrentVersion}\"";

    public DocumentConflictError ToErrorPayload() => new(
        Code: "OPTIMISTIC_CONCURRENCY_CONFLICT",
        DocId: DocId,
        ExpectedVersion: ExpectedVersion,
        CurrentVersion: CurrentVersion,
        CurrentETag: CurrentETag,
        Message: Message
    );
}
