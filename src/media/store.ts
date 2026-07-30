import type { NowPlaying } from "./nowplaying";

/** Cover width when no artwork is known (square placeholder). */
const DEFAULT_COVER_WIDTH = 100;

let current: NowPlaying | null = null;
let artwork: string | null = null;
let barColors: string[] | null = null;
let coverWidth: number = DEFAULT_COVER_WIDTH;

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

/** Returns the cover's on-screen width in pixels (falls back to a square when unknown). */
export function getCoverWidth(): number {
	return coverWidth;
}

/** Stores the current cover art (display image, per-bar colours, width) and notifies listeners. */
export function setCover(dataUri: string | null, colors: string[] | null, width: number | null): void {
	artwork = dataUri;
	barColors = colors;
	coverWidth = width !== null && width > 0 ? width : DEFAULT_COVER_WIDTH;
	notify();
}

/** Subscribes to now-playing / artwork changes. Returns a function that unsubscribes. */
export function onCurrentChange(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
