import { describe, expect, it } from 'vitest';
import {
  COLLAB_CHANNEL_NAME,
  CollabSyncEngine,
  detectCollabOpKind,
  InMemoryBroadcastHub,
  isIncomingPatchNewer,
} from '../collabSyncEngine';
import { createDocumentByTemplateId } from '../templates';
import { createNodeFromTool } from '../nodeFactory';
import { applyDesignTokenTheme } from '../designTokens';

describe('v5.0 Real 2-Tab BroadcastChannel Collaborative Sync Engine', () => {
  it('uses the standardized atelier_canvas_collab_v5 channel name by default', () => {
    expect(COLLAB_CHANNEL_NAME).toBe('atelier_canvas_collab_v5');
    const hub = new InMemoryBroadcastHub();
    const tab = new CollabSyncEngine(createDocumentByTemplateId('fintech-spatial'), {
      channelFactory: hub.createFactory(),
      heartbeatMs: 0,
    });
    expect(tab.channelName).toBe('atelier_canvas_collab_v5');
    expect(tab.getTelemetry().channelSupported).toBe(true);
    expect(tab.getTelemetry().activeTabs).toBe(1);
    tab.destroy();
  });

  it('tracks live peer presence across 2 and 3 tabs and decrements cleanly on tab leave', () => {
    const hub = new InMemoryBroadcastHub();
    const factory = hub.createFactory();
    const doc = createDocumentByTemplateId('fintech-spatial');

    const tabA = new CollabSyncEngine(doc, {
      peerId: 'peer-a',
      channelFactory: factory,
      heartbeatMs: 0,
    });
    expect(tabA.getTelemetry().activeTabs).toBe(1);

    const tabB = new CollabSyncEngine(doc, {
      peerId: 'peer-b',
      channelFactory: factory,
      heartbeatMs: 0,
    });
    expect(tabA.getTelemetry().activeTabs).toBe(2);
    expect(tabB.getTelemetry().activeTabs).toBe(2);

    const tabC = new CollabSyncEngine(doc, {
      peerId: 'peer-c',
      channelFactory: factory,
      heartbeatMs: 0,
    });
    expect(tabA.getTelemetry().activeTabs).toBe(3);
    expect(tabB.getTelemetry().activeTabs).toBe(3);
    expect(tabC.getTelemetry().activeTabs).toBe(3);

    tabB.destroy();
    expect(tabA.getTelemetry().activeTabs).toBe(2);
    expect(tabC.getTelemetry().activeTabs).toBe(2);

    tabA.destroy();
    tabC.destroy();
  });

  it('syncs layer creation from Tab A to Tab B instantaneously with opKind layer-create', () => {
    const hub = new InMemoryBroadcastHub();
    const factory = hub.createFactory();
    const doc = createDocumentByTemplateId('fintech-spatial');

    const tabA = new CollabSyncEngine(doc, {
      peerId: 'peer-a',
      channelFactory: factory,
      heartbeatMs: 0,
    });
    const tabB = new CollabSyncEngine(doc, {
      peerId: 'peer-b',
      channelFactory: factory,
      heartbeatMs: 0,
    });

    let receivedCount = 0;
    let lastOp = '';
    let latestNodeCount = doc.nodes.length;
    tabB.onRemoteDocument((remoteDoc, meta) => {
      receivedCount += 1;
      lastOp = meta.opKind;
      latestNodeCount = remoteDoc.nodes.length;
    });

    const newNode = createNodeFromTool('rect', 120, 140, 180, 90, doc.tokens);
    const sent = tabA.broadcastLocalChange({
      ...doc,
      nodes: [...doc.nodes, newNode],
    });

    expect(sent).toBe(true);
    expect(receivedCount).toBe(1);
    expect(lastOp).toBe('layer-create');
    expect(latestNodeCount).toBe(doc.nodes.length + 1);
    expect(tabB.getTelemetry().lastSyncLatencyMs).not.toBeNull();
    expect(tabB.getTelemetry().lastSyncLatencyMs!).toBeLessThan(30);

    tabA.destroy();
    tabB.destroy();
  });

  it('syncs layer movement (x, y coordinates) from Tab A to Tab B accurately', () => {
    const hub = new InMemoryBroadcastHub();
    const factory = hub.createFactory();
    const doc = createDocumentByTemplateId('fintech-spatial');

    const tabA = new CollabSyncEngine(doc, {
      peerId: 'peer-a',
      channelFactory: factory,
      heartbeatMs: 0,
    });
    const tabB = new CollabSyncEngine(doc, {
      peerId: 'peer-b',
      channelFactory: factory,
      heartbeatMs: 0,
    });

    let movedX = 0;
    let movedY = 0;
    let opKind = '';
    tabB.onRemoteDocument((remoteDoc, meta) => {
      const target = remoteDoc.nodes[0];
      movedX = target.x;
      movedY = target.y;
      opKind = meta.opKind;
    });

    const movedNodes = doc.nodes.map((n, idx) =>
      idx === 0 ? { ...n, x: n.x + 88, y: n.y + 44 } : n,
    );
    tabA.broadcastLocalChange({ ...doc, nodes: movedNodes });

    expect(opKind).toBe('layer-move');
    expect(movedX).toBe(doc.nodes[0].x + 88);
    expect(movedY).toBe(doc.nodes[0].y + 44);

    tabA.destroy();
    tabB.destroy();
  });

  it('syncs Design Token theme changes across tabs instantaneously', () => {
    const hub = new InMemoryBroadcastHub();
    const factory = hub.createFactory();
    const doc = createDocumentByTemplateId('fintech-spatial');

    const tabA = new CollabSyncEngine(doc, {
      peerId: 'peer-a',
      channelFactory: factory,
      heartbeatMs: 0,
    });
    const tabB = new CollabSyncEngine(doc, {
      peerId: 'peer-b',
      channelFactory: factory,
      heartbeatMs: 0,
    });

    let syncedThemeId = '';
    let syncedOp = '';
    tabB.onRemoteDocument((remoteDoc, meta) => {
      syncedThemeId = remoteDoc.tokens.id;
      syncedOp = meta.opKind;
    });

    const cyberDoc = applyDesignTokenTheme(doc, 'cyber-emerald');
    tabA.broadcastLocalChange(cyberDoc);

    expect(syncedOp).toBe('token-theme');
    expect(syncedThemeId).toBe('cyber-emerald');

    tabA.destroy();
    tabB.destroy();
  });

  it('hydrates a late-joining Tab B automatically via DOC_SYNC_REQUEST handshake', () => {
    const hub = new InMemoryBroadcastHub();
    const factory = hub.createFactory();
    const doc = createDocumentByTemplateId('fintech-spatial');

    const tabA = new CollabSyncEngine(doc, {
      peerId: 'peer-a',
      channelFactory: factory,
      heartbeatMs: 0,
    });
    const swissDoc = applyDesignTokenTheme(doc, 'swiss-editorial-light');
    tabA.broadcastLocalChange(swissDoc);

    let hydratedTheme = '';
    const tabB = new CollabSyncEngine(doc, {
      peerId: 'peer-b',
      channelFactory: factory,
      heartbeatMs: 0,
    });
    // Late joiner already caught up in constructor handshake or subsequent patch
    tabB.onRemoteDocument((d) => {
      hydratedTheme = d.tokens.id;
    });

    // Trigger another edit from Tab A and verify monotonic convergence
    const cyberDoc = applyDesignTokenTheme(swissDoc, 'cyber-emerald');
    tabA.broadcastLocalChange(cyberDoc);
    expect(hydratedTheme).toBe('cyber-emerald');
    expect(tabB.getTelemetry().lamport).toBe(tabA.getTelemetry().lamport);

    tabA.destroy();
    tabB.destroy();
  });

  it('enforces deterministic Lamport vector clock ordering and tie-breaking', () => {
    expect(isIncomingPatchNewer(3, 'peer-a', 2, 'peer-z')).toBe(true);
    expect(isIncomingPatchNewer(1, 'peer-z', 2, 'peer-a')).toBe(false);
    expect(isIncomingPatchNewer(2, 'peer-z', 2, 'peer-a')).toBe(true);
    expect(isIncomingPatchNewer(2, 'peer-a', 2, 'peer-z')).toBe(false);
    expect(isIncomingPatchNewer(2, 'peer-a', 2, 'peer-a')).toBe(false);
  });

  it('prevents self-echo loops and deduplicates identical document broadcasts', () => {
    const hub = new InMemoryBroadcastHub();
    const factory = hub.createFactory();
    const doc = createDocumentByTemplateId('fintech-spatial');

    const tabA = new CollabSyncEngine(doc, {
      peerId: 'peer-a',
      channelFactory: factory,
      heartbeatMs: 0,
    });
    let selfRemoteTriggered = 0;
    tabA.onRemoteDocument(() => {
      selfRemoteTriggered += 1;
    });

    // Identical state should not broadcast
    expect(tabA.broadcastLocalChange(doc)).toBe(false);

    // Real mutation broadcasts once, duplicate call returns false, never echoes back to self
    const updated = applyDesignTokenTheme(doc, 'cyber-emerald');
    expect(tabA.broadcastLocalChange(updated)).toBe(true);
    expect(tabA.broadcastLocalChange(updated)).toBe(false);
    expect(selfRemoteTriggered).toBe(0);

    tabA.destroy();
  });

  it('classifies operation kinds cleanly via detectCollabOpKind', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const added = {
      ...doc,
      nodes: [...doc.nodes, createNodeFromTool('ellipse', 50, 50, 80, 80, doc.tokens)],
    };
    const removed = { ...doc, nodes: doc.nodes.slice(1) };
    const moved = {
      ...doc,
      nodes: doc.nodes.map((n, i) => (i === 0 ? { ...n, x: n.x + 12 } : n)),
    };
    const themed = applyDesignTokenTheme(doc, 'swiss-editorial-light');
    const switched = createDocumentByTemplateId('luxury-editorial');

    expect(detectCollabOpKind(null, doc)).toBe('full-doc');
    expect(detectCollabOpKind(doc, added)).toBe('layer-create');
    expect(detectCollabOpKind(doc, removed)).toBe('layer-delete');
    expect(detectCollabOpKind(doc, moved)).toBe('layer-move');
    expect(detectCollabOpKind(doc, themed)).toBe('token-theme');
    expect(detectCollabOpKind(doc, switched)).toBe('template-switch');
  });

  it('degrades gracefully to single-tab local mode when BroadcastChannel is unavailable', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const localOnly = new CollabSyncEngine(doc, {
      channelFactory: () => null,
      heartbeatMs: 0,
    });
    const telemetry = localOnly.getTelemetry();
    expect(telemetry.channelSupported).toBe(false);
    expect(telemetry.activeTabs).toBe(1);
    expect(localOnly.broadcastLocalChange(applyDesignTokenTheme(doc, 'cyber-emerald'))).toBe(true);
    localOnly.destroy();
  });
});
