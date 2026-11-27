import type { DocumentState } from '../types/canvas';

export const COLLAB_CHANNEL_NAME = 'atelier_canvas_collab_v5';

export type CollabOpKind =
  | 'layer-create'
  | 'layer-move'
  | 'layer-update'
  | 'layer-delete'
  | 'token-theme'
  | 'template-switch'
  | 'full-doc';

export interface CollabPeer {
  peerId: string;
  label: string;
  color: string;
  joinedAt: number;
  lastSeenAt: number;
  activeTool?: string;
}

export interface CollabSyncTelemetry {
  peerId: string;
  peerLabel: string;
  channelName: string;
  channelSupported: boolean;
  activeTabs: number;
  peers: CollabPeer[];
  revision: number;
  lamport: number;
  lastSyncLatencyMs: number | null;
  lastOpKind: CollabOpKind | null;
}

export interface CollabMessageChannel {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: unknown): void;
  close(): void;
}

export type CollabChannelFactory = (name: string) => CollabMessageChannel | null;

type CollabWireMessage =
  | {
      type: 'PEER_HELLO';
      peer: CollabPeer;
      lamport: number;
      revision: number;
      sentAtMs: number;
    }
  | {
      type: 'PEER_ACK';
      peer: CollabPeer;
      lamport: number;
      revision: number;
      sentAtMs: number;
    }
  | {
      type: 'PEER_HEARTBEAT';
      peer: CollabPeer;
      sentAtMs: number;
    }
  | {
      type: 'PEER_LEAVE';
      peerId: string;
      sentAtMs: number;
    }
  | {
      type: 'DOC_SYNC_REQUEST';
      senderId: string;
      sentAtMs: number;
    }
  | {
      type: 'DOC_PATCH';
      senderId: string;
      opKind: CollabOpKind;
      lamport: number;
      revision: number;
      doc: DocumentState;
      sentAtMs: number;
    };

const PEER_COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

function generatePeerId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36).slice(-4);
  return `peer-${ts}-${rand}`;
}

function defaultChannelFactory(name: string): CollabMessageChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  return new BroadcastChannel(name);
}

/**
 * Deterministic Lamport-clock LWW comparison:
 * Returns true if incoming (inLamport, inSender) strictly supersedes current (curLamport, curSender).
 */
export function isIncomingPatchNewer(
  inLamport: number,
  inSender: string,
  curLamport: number,
  curSender: string,
): boolean {
  if (inLamport > curLamport) return true;
  if (inLamport < curLamport) return false;
  return inSender > curSender;
}

/**
 * Classifies what changed between two DocumentStates for live peer telemetry.
 */
export function detectCollabOpKind(
  prev: DocumentState | null,
  next: DocumentState,
): CollabOpKind {
  if (!prev) return 'full-doc';
  if (prev.templateId !== next.templateId) return 'template-switch';
  if (
    prev.tokens.id !== next.tokens.id ||
    prev.tokens.brandPrimary !== next.tokens.brandPrimary ||
    prev.tokens.brandAccent !== next.tokens.brandAccent ||
    prev.tokens.surfaceCanvas !== next.tokens.surfaceCanvas ||
    prev.tokens.radiusBase !== next.tokens.radiusBase
  ) {
    return 'token-theme';
  }
  if (next.nodes.length > prev.nodes.length) return 'layer-create';
  if (next.nodes.length < prev.nodes.length) return 'layer-delete';

  for (let i = 0; i < next.nodes.length; i += 1) {
    const a = prev.nodes[i];
    const b = next.nodes[i];
    if (!a || a.id !== b.id) return 'layer-update';
    if (a.x !== b.x || a.y !== b.y) return 'layer-move';
  }
  return 'layer-update';
}

export interface CollabSyncOptions {
  channelName?: string;
  peerId?: string;
  peerLabel?: string;
  heartbeatMs?: number;
  stalePeerMs?: number;
  channelFactory?: CollabChannelFactory;
}

export class CollabSyncEngine {
  readonly channelName: string;
  readonly selfPeer: CollabPeer;

  private channel: CollabMessageChannel | null;
  private peers = new Map<string, CollabPeer>();
  private currentDoc: DocumentState | null;
  private lastSerialized: string | null = null;
  private lamport = 0;
  private lastAuthorId: string;
  private revision = 1;
  private lastSyncLatencyMs: number | null = null;
  private lastOpKind: CollabOpKind | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private stalePeerMs: number;
  private destroyed = false;

  private remoteDocListeners = new Set<
    (doc: DocumentState, meta: { opKind: CollabOpKind; latencyMs: number; senderId: string }) => void
  >();
  private telemetryListeners = new Set<(telemetry: CollabSyncTelemetry) => void>();

  constructor(initialDoc: DocumentState | null = null, options: CollabSyncOptions = {}) {
    this.channelName = options.channelName ?? COLLAB_CHANNEL_NAME;
    this.stalePeerMs = options.stalePeerMs ?? 9000;

    const id = options.peerId ?? generatePeerId();
    const colorIdx =
      id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % PEER_COLORS.length;
    const now = Date.now();
    this.selfPeer = {
      peerId: id,
      label: options.peerLabel ?? `Tab ${id.slice(-4).toUpperCase()}`,
      color: PEER_COLORS[colorIdx],
      joinedAt: now,
      lastSeenAt: now,
    };
    this.lastAuthorId = id;
    this.peers.set(this.selfPeer.peerId, this.selfPeer);

    this.currentDoc = initialDoc ? structuredClone(initialDoc) : null;
    this.lastSerialized = initialDoc ? JSON.stringify(initialDoc) : null;

    const factory = options.channelFactory ?? defaultChannelFactory;
    this.channel = factory(this.channelName);

    if (this.channel) {
      this.channel.onmessage = (event) => {
        this.handleWireMessage(event.data as CollabWireMessage);
      };

      // Announce presence & request latest state from existing tabs
      this.post({
        type: 'PEER_HELLO',
        peer: this.selfPeer,
        lamport: this.lamport,
        revision: this.revision,
        sentAtMs: Date.now(),
      });
      this.post({
        type: 'DOC_SYNC_REQUEST',
        senderId: this.selfPeer.peerId,
        sentAtMs: Date.now(),
      });

      const hbInterval = options.heartbeatMs ?? 2500;
      if (hbInterval > 0) {
        this.heartbeatTimer = setInterval(() => {
          this.sendHeartbeat();
          this.pruneStalePeers();
        }, hbInterval);
      }
    }
  }

  private post(message: CollabWireMessage): void {
    if (this.destroyed || !this.channel) return;
    try {
      this.channel.postMessage(message);
    } catch {
      // Ignore postMessage failures when channel is closing
    }
  }

  private emitTelemetry(): void {
    const snapshot = this.getTelemetry();
    for (const listener of this.telemetryListeners) {
      listener(snapshot);
    }
  }

  private handleWireMessage(msg: CollabWireMessage | null | undefined): void {
    if (this.destroyed || !msg || typeof msg !== 'object' || !('type' in msg)) {
      return;
    }

    const now = Date.now();

    switch (msg.type) {
      case 'PEER_HELLO': {
        if (msg.peer.peerId === this.selfPeer.peerId) return;
        this.peers.set(msg.peer.peerId, { ...msg.peer, lastSeenAt: now });
        this.post({
          type: 'PEER_ACK',
          peer: { ...this.selfPeer, lastSeenAt: now },
          lamport: this.lamport,
          revision: this.revision,
          sentAtMs: now,
        });
        this.emitTelemetry();
        break;
      }

      case 'PEER_ACK': {
        if (msg.peer.peerId === this.selfPeer.peerId) return;
        this.peers.set(msg.peer.peerId, { ...msg.peer, lastSeenAt: now });
        this.emitTelemetry();
        break;
      }

      case 'PEER_HEARTBEAT': {
        if (msg.peer.peerId === this.selfPeer.peerId) return;
        this.peers.set(msg.peer.peerId, { ...msg.peer, lastSeenAt: now });
        this.emitTelemetry();
        break;
      }

      case 'PEER_LEAVE': {
        if (msg.peerId === this.selfPeer.peerId) return;
        if (this.peers.delete(msg.peerId)) {
          this.emitTelemetry();
        }
        break;
      }

      case 'DOC_SYNC_REQUEST': {
        if (msg.senderId === this.selfPeer.peerId) return;
        if (this.currentDoc && this.lamport > 0) {
          this.post({
            type: 'DOC_PATCH',
            senderId: this.selfPeer.peerId,
            opKind: 'full-doc',
            lamport: this.lamport,
            revision: this.revision,
            doc: this.currentDoc,
            sentAtMs: now,
          });
        }
        break;
      }

      case 'DOC_PATCH': {
        if (msg.senderId === this.selfPeer.peerId) return;

        // Register sender peer even if PEER_HELLO was missed
        if (!this.peers.has(msg.senderId)) {
          this.peers.set(msg.senderId, {
            peerId: msg.senderId,
            label: `Tab ${msg.senderId.slice(-4).toUpperCase()}`,
            color: PEER_COLORS[1],
            joinedAt: now,
            lastSeenAt: now,
          });
        } else {
          const existing = this.peers.get(msg.senderId)!;
          this.peers.set(msg.senderId, { ...existing, lastSeenAt: now });
        }

        const shouldApply = isIncomingPatchNewer(
          msg.lamport,
          msg.senderId,
          this.lamport,
          this.lastAuthorId,
        );
        if (!shouldApply) {
          this.emitTelemetry();
          return;
        }

        const incomingSerialized = JSON.stringify(msg.doc);
        this.lamport = Math.max(this.lamport, msg.lamport);
        this.lastAuthorId = msg.senderId;
        this.revision = Math.max(this.revision + 1, msg.revision);

        const latencyMs = Math.max(0, Math.min(999, now - msg.sentAtMs));
        this.lastSyncLatencyMs = latencyMs;
        this.lastOpKind = msg.opKind;

        if (incomingSerialized === this.lastSerialized) {
          this.emitTelemetry();
          return;
        }

        this.currentDoc = structuredClone(msg.doc);
        this.lastSerialized = incomingSerialized;

        for (const listener of this.remoteDocListeners) {
          listener(structuredClone(this.currentDoc), {
            opKind: msg.opKind,
            latencyMs,
            senderId: msg.senderId,
          });
        }
        this.emitTelemetry();
        break;
      }
    }
  }

  sendHeartbeat(): void {
    if (this.destroyed) return;
    const now = Date.now();
    this.selfPeer.lastSeenAt = now;
    this.peers.set(this.selfPeer.peerId, this.selfPeer);
    this.post({
      type: 'PEER_HEARTBEAT',
      peer: this.selfPeer,
      sentAtMs: now,
    });
  }

  pruneStalePeers(now = Date.now()): number {
    let removed = 0;
    for (const [peerId, peer] of this.peers.entries()) {
      if (peerId === this.selfPeer.peerId) continue;
      if (now - peer.lastSeenAt > this.stalePeerMs) {
        this.peers.delete(peerId);
        removed += 1;
      }
    }
    if (removed > 0) {
      this.emitTelemetry();
    }
    return removed;
  }

  /**
   * Broadcasts a local canvas mutation immediately across all tabs on atelier_canvas_collab_v5.
   * Returns true if a new patch was sent, false if document was identical.
   */
  broadcastLocalChange(nextDoc: DocumentState, explicitOpKind?: CollabOpKind): boolean {
    if (this.destroyed) return false;
    const serialized = JSON.stringify(nextDoc);
    if (serialized === this.lastSerialized) {
      return false;
    }

    const opKind = explicitOpKind ?? detectCollabOpKind(this.currentDoc, nextDoc);
    this.lamport += 1;
    this.revision += 1;
    this.lastAuthorId = this.selfPeer.peerId;
    this.lastOpKind = opKind;
    this.currentDoc = structuredClone(nextDoc);
    this.lastSerialized = serialized;

    this.post({
      type: 'DOC_PATCH',
      senderId: this.selfPeer.peerId,
      opKind,
      lamport: this.lamport,
      revision: this.revision,
      doc: this.currentDoc,
      sentAtMs: Date.now(),
    });
    this.emitTelemetry();
    return true;
  }

  /**
   * Updates local state cache without broadcasting (e.g. during remote apply).
   */
  syncLocalCacheWithoutBroadcast(doc: DocumentState): void {
    this.currentDoc = structuredClone(doc);
    this.lastSerialized = JSON.stringify(doc);
  }

  onRemoteDocument(
    cb: (
      doc: DocumentState,
      meta: { opKind: CollabOpKind; latencyMs: number; senderId: string },
    ) => void,
  ): () => void {
    this.remoteDocListeners.add(cb);
    return () => {
      this.remoteDocListeners.delete(cb);
    };
  }

  onTelemetryChange(cb: (telemetry: CollabSyncTelemetry) => void): () => void {
    this.telemetryListeners.add(cb);
    return () => {
      this.telemetryListeners.delete(cb);
    };
  }

  getPeers(): CollabPeer[] {
    return Array.from(this.peers.values());
  }

  getTelemetry(): CollabSyncTelemetry {
    const peerList = this.getPeers();
    return {
      peerId: this.selfPeer.peerId,
      peerLabel: this.selfPeer.label,
      channelName: this.channelName,
      channelSupported: this.channel !== null,
      activeTabs: Math.max(1, peerList.length),
      peers: peerList,
      revision: this.revision,
      lamport: this.lamport,
      lastSyncLatencyMs: this.lastSyncLatencyMs,
      lastOpKind: this.lastOpKind,
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.post({
      type: 'PEER_LEAVE',
      peerId: this.selfPeer.peerId,
      sentAtMs: Date.now(),
    });
    this.destroyed = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.channel) {
      this.channel.onmessage = null;
      this.channel.close();
      this.channel = null;
    }
    this.remoteDocListeners.clear();
    this.telemetryListeners.clear();
  }
}

/**
 * In-memory BroadcastChannel hub for deterministic multi-tab Vitest verification.
 */
export class InMemoryBroadcastHub {
  private channels = new Map<string, Set<CollabMessageChannel>>();

  createFactory(): CollabChannelFactory {
    return (name: string): CollabMessageChannel => {
      if (!this.channels.has(name)) {
        this.channels.set(name, new Set());
      }
      const bucket = this.channels.get(name)!;
      const endpoint: CollabMessageChannel = {
        onmessage: null,
        postMessage: (message: unknown) => {
          const cloned = structuredClone(message);
          for (const peer of bucket) {
            if (peer === endpoint) continue;
            peer.onmessage?.({ data: structuredClone(cloned) } as MessageEvent<unknown>);
          }
        },
        close: () => {
          bucket.delete(endpoint);
        },
      };
      bucket.add(endpoint);
      return endpoint;
    };
  }
}
