using System.Collections.Concurrent;
using System.Text.Json;
using AtelierCanvas.Domain.Models;

namespace AtelierCanvas.Domain.Services;

public interface IDocumentSnapshotStore
{
    CanvasDocumentSnapshot? Get(string docId);
    IReadOnlyList<CanvasDocumentSnapshot> ListAll();
    CanvasDocumentSnapshot PutWithOptimisticConcurrency(string docId, UpdateDocumentCommand command);
}

public sealed class InMemoryDocumentSnapshotStore : IDocumentSnapshotStore
{
    private readonly ConcurrentDictionary<string, CanvasDocumentSnapshot> _snapshots =
        new(StringComparer.OrdinalIgnoreCase);

    private readonly ConcurrentDictionary<string, Lock> _locks =
        new(StringComparer.OrdinalIgnoreCase);

    public InMemoryDocumentSnapshotStore()
    {
        SeedDefaultStudioDocument();
    }

    private void SeedDefaultStudioDocument()
    {
        using var doc = JsonDocument.Parse("""
        {
          "artboard": {
            "id": "artboard-fintech",
            "name": "01 · Treasury Overview",
            "width": 1080,
            "height": 680
          },
          "tokens": {
            "id": "obsidian-pro",
            "name": "Obsidian Pro",
            "brandPrimary": "#6366F1",
            "brandAccent": "#06B6D4",
            "surfaceCanvas": "#0C0E14",
            "surfaceCard": "#151924",
            "textPrimary": "#F8FAFC"
          },
          "nodes": [
            { "id": "ft-balance-card", "type": "glass", "x": 48, "y": 96, "width": 440, "height": 240 },
            { "id": "ft-cta-transfer", "type": "button", "x": 48, "y": 364, "width": 220, "height": 48 }
          ]
        }
        """);

        var initial = new CanvasDocumentSnapshot(
            DocId: "atelier-studio-main",
            Version: 1,
            TemplateId: "fintech-spatial",
            Payload: doc.RootElement.Clone(),
            UpdatedBy: "system-seed",
            UpdatedAtUtc: DateTimeOffset.UtcNow,
            ETag: "\"1\""
        );
        _snapshots[initial.DocId] = initial;
    }

    public CanvasDocumentSnapshot? Get(string docId)
    {
        if (string.IsNullOrWhiteSpace(docId)) return null;
        return _snapshots.TryGetValue(docId.Trim(), out var snapshot) ? snapshot : null;
    }

    public IReadOnlyList<CanvasDocumentSnapshot> ListAll() =>
        _snapshots.Values.OrderBy(s => s.DocId, StringComparer.OrdinalIgnoreCase).ToList();

    public CanvasDocumentSnapshot PutWithOptimisticConcurrency(string docId, UpdateDocumentCommand command)
    {
        var normalizedId = docId.Trim();
        var docLock = _locks.GetOrAdd(normalizedId, static _ => new Lock());

        lock (docLock)
        {
            var exists = _snapshots.TryGetValue(normalizedId, out var current);
            var currentVersion = exists && current is not null ? current.Version : 0L;

            if (command.ExpectedVersion != currentVersion)
            {
                throw new OptimisticConcurrencyException(
                    normalizedId,
                    command.ExpectedVersion,
                    currentVersion
                );
            }

            var nextVersion = currentVersion + 1;
            var updated = new CanvasDocumentSnapshot(
                DocId: normalizedId,
                Version: nextVersion,
                TemplateId: string.IsNullOrWhiteSpace(command.TemplateId) ? "custom" : command.TemplateId.Trim(),
                Payload: command.Payload.Clone(),
                UpdatedBy: string.IsNullOrWhiteSpace(command.UpdatedBy) ? "anonymous-peer" : command.UpdatedBy.Trim(),
                UpdatedAtUtc: DateTimeOffset.UtcNow,
                ETag: $"\"{nextVersion}\""
            );

            _snapshots[normalizedId] = updated;
            return updated;
        }
    }
}
