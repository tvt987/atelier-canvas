export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
  maxSize: number;
}

export function createHistory<T>(initial: T, maxSize = 80): HistoryState<T> {
  return {
    past: [],
    present: initial,
    future: [],
    maxSize,
  };
}

export function pushHistory<T>(state: HistoryState<T>, next: T): HistoryState<T> {
  if (Object.is(state.present, next)) {
    return state;
  }
  const nextPast = [...state.past, state.present];
  const trimmedPast =
    nextPast.length > state.maxSize
      ? nextPast.slice(nextPast.length - state.maxSize)
      : nextPast;

  return {
    past: trimmedPast,
    present: next,
    future: [],
    maxSize: state.maxSize,
  };
}

export function replacePresent<T>(state: HistoryState<T>, next: T): HistoryState<T> {
  return {
    ...state,
    present: next,
  };
}

export function undoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.past.length === 0) {
    return state;
  }
  const previous = state.past[state.past.length - 1];
  const newPast = state.past.slice(0, -1);
  return {
    past: newPast,
    present: previous,
    future: [state.present, ...state.future],
    maxSize: state.maxSize,
  };
}

export function redoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.future.length === 0) {
    return state;
  }
  const next = state.future[0];
  const newFuture = state.future.slice(1);
  return {
    past: [...state.past, state.present],
    present: next,
    future: newFuture,
    maxSize: state.maxSize,
  };
}

export function canUndo<T>(state: HistoryState<T>): boolean {
  return state.past.length > 0;
}

export function canRedo<T>(state: HistoryState<T>): boolean {
  return state.future.length > 0;
}
