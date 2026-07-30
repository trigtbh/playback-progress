import type { NowPlaying } from "./nowplaying";

let current: NowPlaying | null = null;
let artwork: string | null = null;
let barColors: string[] | null = null;

type Listener = (np: NowPlaying | null) => void;
const listeners = new Set<Listener>();

function notify(): void {
	for (const listener of listeners) {
		listener(current);
	}
}

/** Returns the most recently polled now-playing snapshot, or `null` when nothing is playing. */
export function getCurrent(): NowPlaying | null {
	return current;
}

/** Stores the latest now-playing snapshot and notifies listeners. */
export function setCurrent(np: NowPlaying | null): void {
	current = np;
	notify();
}

/** Returns the current cover art as a data URI, or `null` when unknown. */
export function getArtwork(): string | null {
	return artwork;
}

/** Returns the per-bar colours sampled from the cover, or `null` when unknown. */
export function getBarColors(): string[] | null {
	return barColors;
}

/** Stores the current cover art (display image + per-bar colours) and notifies listeners. */
export function setCover(dataUri: string | null, colors: string[] | null): void {
	artwork = dataUri;
	barColors = colors;
	notify();
}

/** Subscribes to now-playing / artwork changes. Returns a function that unsubscribes. */
export function onCurrentChange(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
