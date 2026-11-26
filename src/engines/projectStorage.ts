import type {
  Artboard,
  AtelierProjectFile,
  CanvasNode,
  DocumentState,
} from '../types/canvas';

export const WORKSPACE_STORAGE_KEY = 'atelier-canvas-workspace-v3';

export function getDocumentArtboards(doc: DocumentState): Artboard[] {
  if (doc.artboards && doc.artboards.length > 0) {
    return doc.artboards;
  }
  return [doc.artboard];
}

export function getNodesForArtboard(
  doc: DocumentState,
  artboardId: string,
): CanvasNode[] {
  const primaryId = doc.artboard.id;
  return doc.nodes.filter((n) => (n.artboardId ?? primaryId) === artboardId);
}

export function serializeProjectFile(doc: DocumentState): string {
  const payload: AtelierProjectFile = {
    format: 'atelier-canvas-project',
    version: '3.0',
    exportedAt: new Date().toISOString(),
    document: doc,
  };
  return JSON.stringify(payload, null, 2);
}

export type ProjectParseResult =
  | { ok: true; doc: DocumentState }
  | { ok: false; error: string };

export function parseAndValidateProjectFile(rawJson: string): ProjectParseResult {
  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'Invalid JSON root object.' };
    }
    const obj = parsed as Record<string, unknown>;
    if (obj.format !== 'atelier-canvas-project') {
      return { ok: false, error: 'Unsupported project format header.' };
    }
    const doc = obj.document as Record<string, unknown> | undefined;
    if (!doc || typeof doc !== 'object') {
      return { ok: false, error: 'Missing document payload.' };
    }
    const artboard = doc.artboard as Record<string, unknown> | undefined;
    const tokens = doc.tokens as Record<string, unknown> | undefined;
    if (
      !artboard ||
      typeof artboard.id !== 'string' ||
      typeof artboard.width !== 'number' ||
      typeof artboard.height !== 'number'
    ) {
      return { ok: false, error: 'Invalid artboard definition.' };
    }
    if (!Array.isArray(doc.nodes)) {
      return { ok: false, error: 'Document nodes must be an array.' };
    }
    if (!tokens || typeof tokens.brandPrimary !== 'string') {
      return { ok: false, error: 'Missing design tokens block.' };
    }

    return { ok: true, doc: doc as unknown as DocumentState };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Malformed JSON file.',
    };
  }
}

export function saveWorkspaceToLocalStorage(doc: DocumentState): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      serializeProjectFile(doc),
    );
    return true;
  } catch {
    return false;
  }
}

export function loadWorkspaceFromLocalStorage(): DocumentState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseAndValidateProjectFile(raw);
    return parsed.ok ? parsed.doc : null;
  } catch {
    return null;
  }
}

export function clearWorkspaceLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup errors
  }
}
