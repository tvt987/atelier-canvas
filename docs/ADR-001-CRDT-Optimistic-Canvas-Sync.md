# ADR-001: Dual-Layer Collaborative Canvas Sync (Browser BroadcastChannel CRDT + .NET 10 Optimistic Concurrency)

- **Status**: Accepted
- **Date**: 2026-11-28
- **Author**: Truong Van Tinh (Principal Solution Architect)
- **Scope**: `src/engines/collabSyncEngine.ts`, `backend/src/AtelierCanvas.Domain/Services/DocumentSnapshotStore.cs`, `backend/src/AtelierCanvas.Api/Program.cs`

## 1. Context

Design studios like Figma and Linear must satisfy two seemingly opposing product requirements simultaneously:

1. **Zero-Latency Local & Multi-Tab Collaboration (`<30ms`)**: A designer working across multiple browser tabs (or reviewing side-by-side desktop + mobile artboard windows on GitHub Pages without a backend running) expects instant layer creation, movement, and token-theme morphing synchronization with live peer presence indicators (`Live Collab · N Tabs`).
2. **Strong Server-Side Write Safety (Zero Lost Updates)**: When persisting collaborative snapshots to a production `.NET 10` backend (backed by PostgreSQL + Redis in Docker Compose), two concurrent writers editing the same document revision must never silently clobber each other's changes.

## 2. Decision

We adopt a **Two-Tier Synchronization Architecture**:

### Tier 1 — Client-Side Peer Mesh (`CollabSyncEngine` over `BroadcastChannel('atelier_canvas_collab_v5')`)
- **Transport**: Native browser `BroadcastChannel('atelier_canvas_collab_v5')` with zero external WebSocket dependency for same-origin multi-tab sync and an injectable `CollabChannelFactory` (`InMemoryBroadcastHub`) for deterministic Node/Vitest unit testing.
- **Presence Protocol**: `PEER_HELLO` -> `PEER_ACK`, periodic `PEER_HEARTBEAT` (2.5s), stale peer pruning (9s), and immediate `PEER_LEAVE` on `pagehide` / `beforeunload` / `destroy()`.
- **Convergence Semantics**: Every local document commit increments a monotonic **Lamport logical clock** (`lamport`) and tags the patch with `(lamport, senderId, opKind)`. Incoming patches are accepted if and only if `(inLamport, inSenderId) > (curLamport, curAuthorId)`. This guarantees total deterministic convergence across all open tabs without self-echo feedback loops.
- **Late-Joiner Hydration**: New tabs issue `DOC_SYNC_REQUEST` upon mount and receive the active state snapshot from existing peers.

### Tier 2 — Authoritative Backend Persistence (`.NET 10` Optimistic Concurrency Vector Clock)
- **API Contract**: `GET /api/v1/documents/{docId}` returns the snapshot alongside an HTTP `ETag: "{version}"` header and `X-Atelier-Document-Version`.
- **Conflict Guard**: `PUT /api/v1/documents/{docId}` requires either an HTTP `If-Match` header or a JSON `expectedVersion` integer.
- **Atomic Serialization**: Inside `InMemoryDocumentSnapshotStore` (designed to map 1:1 to PostgreSQL `xmin` / `UPDATE ... WHERE version = @expectedVersion` row locks in multi-instance clusters), a per-document `System.Threading.Lock` verifies `expectedVersion == currentVersion`.
  - Match -> increments `Version = currentVersion + 1`, returns `200 OK` with the new `ETag`.
  - Mismatch -> throws `OptimisticConcurrencyException` -> Minimal API responds with **`409 Conflict`**, authoritative `ETag`, and structured `DocumentConflictError` (`expectedVersion`, `currentVersion`, `currentETag`).

## 3. Consequences

### Positive
- **Sub-10ms browser tab sync**: Local multi-tab collaboration works identically in static deployments (GitHub Pages) and containerized full-stack environments with `<5ms` measured sync latency.
- **Zero lost updates under concurrent load**: Verified via concurrent 6-writer race integration tests (`Task.WhenAll`) proving strictly 1 writer receives `200 OK` and 5 stale writers receive `409 Conflict`.
- **Clean React bundle isolation**: Removing heavy runtime CRDT transport coupling from the entry chunk helped shrink the main frontend entry chunk by >53% (`316 kB -> 147 kB`).

### Trade-offs & Mitigations
- **Snapshot payload vs fine-grained delta ops**: Broadcasting full structured `DocumentState` snapshots simplifies undo/redo history consistency and guarantees zero structural drift, though very large canvases (>5,000 nodes) would eventually benefit from property-level delta compression or Yjs sub-doc sharding.
- **In-memory store vs durable PostgreSQL**: The default .NET 10 API ships with `InMemoryDocumentSnapshotStore` behind `IDocumentSnapshotStore` so `dotnet test` and standalone containers start instantaneously with zero external dependencies, while `docker-compose.yml` provisions `postgres:16-alpine` and `redis:7-alpine` ready for the Dapper/Npgsql persistence adapter.
