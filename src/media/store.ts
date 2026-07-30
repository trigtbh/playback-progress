import type { NowPlaying } from "./nowplaying";

let current: NowPlaying | null = null;

/** Returns the most recently polled now-playing snapshot, or `null` when nothing is playing. */
export function getCurrent(): NowPlaying | null {
	return current;
}

/** Stores the latest now-playing snapshot for actions to read on appearance. */
export function setCurrent(np: NowPlaying | null): void {
	current = np;
}
