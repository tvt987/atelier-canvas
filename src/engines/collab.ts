import * as Y from 'yjs';
import type { CollaboratorCursor, DocumentState } from '../types/canvas';

const CHANNEL_NAME = 'atelier-canvas-yjs-v1';

export interface SyncTelemetry {
  clientId: number;
  revisionCount: number;
  stateVectorBytes: number;
  channelActive: boolean;
}

export class AtelierCrdtRoom {
  readonly doc: Y.Doc;
  readonly store: Y.Map<string>;
  private channel: BroadcastChannel | null = null;
  private revisionCount = 0;
  private onRemoteDocCb: ((doc: DocumentState) => void) | null = null;

  constructor(initialDoc?: DocumentState, channelName = CHANNEL_NAME) {
    this.doc = new Y.Doc();
    this.store = this.doc.getMap<string>('atelier-document');

    if (initialDoc) {
      this.writeState(initialDoc, 'init');
    }

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; payload?: Uint8Array; sender?: number };
        if (!data || data.sender === this.doc.clientID) return;
        if (data.type === 'yjs-update' && data.payload instanceof Uint8Array) {
          this.applyRemoteUpdate(data.payload);
        } else if (data.type === 'yjs-sync-request') {
          const fullUpdate = Y.encodeStateAsUpdate(this.doc);
          this.channel?.postMessage({
            type: 'yjs-update',
            payload: fullUpdate,
            sender: this.doc.clientID,
          });
        }
      };

      this.channel.postMessage({
        type: 'yjs-sync-request',
        sender: this.doc.clientID,
      });
    }

    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      this.revisionCount += 1;
      if (origin === 'local' && this.channel) {
        this.channel.postMessage({
          type: 'yjs-update',
          payload: update,
          sender: this.doc.clientID,
        });
      }
      if (origin === 'remote') {
        const parsed = this.readState();
        if (parsed && this.onRemoteDocCb) {
          this.onRemoteDocCb(parsed);
        }
      }
    });
  }

  onRemoteDocument(cb: (doc: DocumentState) => void): void {
    this.onRemoteDocCb = cb;
  }

  pushLocalDocument(nextDoc: DocumentState): void {
    this.writeState(nextDoc, 'local');
  }

  private writeState(nextDoc: DocumentState, origin: string): void {
    const serialized = JSON.stringify(nextDoc);
    if (this.store.get('snapshot') === serialized) {
      return;
    }
    this.doc.transact(() => {
      this.store.set('snapshot', serialized);
      this.store.set('templateId', nextDoc.templateId);
      this.store.set('updatedAt', String(Date.now()));
    }, origin);
  }

  readState(): DocumentState | null {
    const raw = this.store.get('snapshot');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DocumentState;
    } catch {
      return null;
    }
  }

  encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  applyRemoteUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update, 'remote');
  }

  getTelemetry(): SyncTelemetry {
    const sv = Y.encodeStateVector(this.doc);
    return {
      clientId: this.doc.clientID,
      revisionCount: this.revisionCount,
      stateVectorBytes: sv.byteLength,
      channelActive: this.channel !== null,
    };
  }

  destroy(): void {
    this.channel?.close();
    this.channel = null;
    this.doc.destroy();
  }
}

export function syncTwoCrdtRooms(a: AtelierCrdtRoom, b: AtelierCrdtRoom): void {
  const updateA = a.encodeState();
  const updateB = b.encodeState();
  b.applyRemoteUpdate(updateA);
  a.applyRemoteUpdate(updateB);
}

const COLLABORATOR_ACTIVITIES = [
  'Auditing 8px grid rhythm',
  'Inspecting glass blur elevation',
  'Reviewing typography hierarchy',
  'Verifying CTA contrast ratio',
  'Checking token bindings',
];

export function computeCoDesignerStep(
  doc: DocumentState,
  stepIndex: number,
  active: boolean,
): CollaboratorCursor {
  const visibleNodes = doc.nodes.filter((n) => n.visible);
  const target =
    visibleNodes.length > 0
      ? visibleNodes[stepIndex % visibleNodes.length]
      : null;

  const x = target
    ? Math.round(target.x + target.width * 0.62)
    : Math.round(doc.artboard.width * 0.5);
  const y = target
    ? Math.round(target.y + target.height * 0.42)
    : Math.round(doc.artboard.height * 0.5);

  return {
    id: 'co-designer-linh',
    name: 'Linh',
    role: 'Lead Designer',
    initials: 'LN',
    color: '#06B6D4',
    x,
    y,
    activity:
      COLLABORATOR_ACTIVITIES[stepIndex % COLLABORATOR_ACTIVITIES.length],
    active,
  };
}
