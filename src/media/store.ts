import type { NowPlaying } from "./nowplaying";

let current: NowPlaying | null = null;

type Listener = (np: NowPlaying | null) => void;
const listeners = new Set<Listener>();

/** Returns the most recently polled now-playing snapshot, or `null` when nothing is playing. */
export function getCurrent(): NowPlaying | null {
	return current;
}

/** Stores the latest now-playing snapshot and notifies listeners. */
export function setCurrent(np: NowPlaying | null): void {
	current = np;
	for (const listener of listeners) {
		listener(current);
	}
}

/** Subscribes to now-playing changes. Returns a function that unsubscribes. */
export function onCurrentChange(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
