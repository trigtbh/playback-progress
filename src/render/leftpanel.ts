import type { NowPlaying } from "../media/nowplaying";

/** The cover / visualizer occupies this panel (0 = leftmost) at the strip's left edge. */
export const COVER_PANEL_INDEX = 0;
/** Height of the cover / visualizer (the full strip height); its width varies with aspect ratio. */
export const COVER_HEIGHT = 100;
/** Number of vertical bars the cover splits into. */
export const BAR_COUNT = 8;

// The morph plays in phases: the bars split apart, hold for a beat, then ease into oscillating.
// Reversing plays it backwards: bars settle to full height, hold, then close back into the image.
const SPLIT_MS = 160;
const HOLD_MS = 120;
const EQUALIZE_MS = 300;
const TRANSITION_MS = SPLIT_MS + HOLD_MS + EQUALIZE_MS;

/** Gap between bars once fully in visualizer mode. */
const GAP = 3;
/** Minimum bar height fraction while oscillating. */
const BAR_MIN_FRACTION = 0.22;
// Per-bar angular speeds / phases give a lively, smooth equalizer (decorative — not real audio data).
const BAR_OMEGA = [4.9, 6.3, 5.5, 7.1, 5.1, 6.8, 5.9, 7.6];
const BAR_PHASE = [0, 0.8, 1.7, 2.5, 3.2, 4.0, 4.8, 5.6];

type Mode = "cover" | "visualizer";

let mode: Mode = "cover";
let transitionStart: number | null = null;

/** Toggles between cover and visualizer, starting a morph transition. */
export function toggleLeftPanel(now = Date.now()): void {
	mode = mode === "cover" ? "visualizer" : "cover";
	transitionStart = now;
}

/** Whether the left panel needs fast re-rendering right now (visualizer running or mid-transition). */
export function leftPanelNeedsAnimation(): boolean {
	return mode === "visualizer" || transitionStart !== null;
}

function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function smooth(t: number): number {
	const c = clamp01(t);
	return c * c * (3 - 2 * c);
}

/**
 * Phase amounts for the morph. `gap` (0..1) is how far the bars have separated; `height` (0..1) is how
 * far the bars have eased from full height into their oscillating heights. Forward (to visualizer):
 * split, then hold, then equalize. Reverse (to cover) mirrors it.
 */
function morphPhases(now: number): { gap: number; height: number } {
	const goingToVis = mode === "visualizer";
	const settled = goingToVis ? { gap: 1, height: 1 } : { gap: 0, height: 0 };
	if (transitionStart === null) {
		return settled;
	}
	const e = now - transitionStart;
	if (e >= TRANSITION_MS) {
		transitionStart = null;
		return settled;
	}
	if (goingToVis) {
		return { gap: smooth(e / SPLIT_MS), height: smooth((e - SPLIT_MS - HOLD_MS) / EQUALIZE_MS) };
	}
	// Reverse: heights collapse first, hold, then the gaps close.
	return {
		gap: 1 - smooth((e - EQUALIZE_MS - HOLD_MS) / SPLIT_MS),
		height: 1 - smooth(e / EQUALIZE_MS),
	};
}

/** Visualizer height fraction (0..1) for bar `i` at time `t` seconds. */
function barFraction(i: number, t: number, playing: boolean): number {
	const amp = playing ? 1 : 0.14;
	const osc = 0.5 + 0.5 * Math.sin(t * BAR_OMEGA[i] + BAR_PHASE[i]);
	return BAR_MIN_FRACTION + (1 - BAR_MIN_FRACTION) * osc * amp;
}

function placeholder(coverW: number): string {
	return `<rect x="0" y="0" width="${coverW}" height="${COVER_HEIGHT}" rx="12" fill="#1c1c1e"/><text x="${coverW / 2}" y="${COVER_HEIGHT / 2 + 11}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#ffffff" fill-opacity="0.3">&#9835;</text>`;
}

/** The resting cover: the whole image at its natural aspect, fit to the strip height. */
function fullCover(artworkUri: string, coverW: number): string {
	return `<clipPath id="coverClip"><rect x="0" y="0" width="${coverW}" height="${COVER_HEIGHT}" rx="12"/></clipPath><image x="0" y="0" width="${coverW}" height="${COVER_HEIGHT}" preserveAspectRatio="xMidYMid meet" xlink:href="${artworkUri}" clip-path="url(#coverClip)"/>`;
}

/**
 * The split-into-bars state: each bar is a solid rect coloured from that slice of the album art, its
 * height scaled about the vertical centre. `gapFactor` (0..1) controls the separation between bars and
 * `heightMix` (0..1) blends each bar from full height to its oscillating height. Uses only rects so it
 * renders on the touch panel.
 */
function bars(np: NowPlaying | null, colors: string[] | null, now: number, gapFactor: number, heightMix: number, coverW: number): string {
	const pitch = coverW / BAR_COUNT;
	const t = now / 1000;
	const playing = np !== null && np.playing;
	const gap = GAP * gapFactor;
	const barW = pitch - gap;

	let out = "";
	for (let i = 0; i < BAR_COUNT; i++) {
		const h = lerp(COVER_HEIGHT, COVER_HEIGHT * barFraction(i, t, playing), heightMix);
		const cellX = i * pitch + gap / 2;
		const yTop = (COVER_HEIGHT - h) / 2;
		const color = colors !== null && colors[i] !== undefined ? colors[i] : "#ffffff";
		out += `<rect x="${cellX.toFixed(2)}" y="${yTop.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" rx="2" fill="${color}"/>`;
	}
	return out;
}

/**
 * Renders the left-panel content: cover art that morphs into an equalizer of album-coloured bars and
 * back. Drawn in the strip's global coordinates (x 0..`coverW`).
 */
export function leftPanelContent(
	np: NowPlaying | null,
	artworkUri: string | null,
	barColors: string[] | null,
	coverW: number,
	now: number,
): string {
	const { gap, height } = morphPhases(now);
	if (gap <= 0 && height <= 0) {
		return artworkUri === null ? placeholder(coverW) : fullCover(artworkUri, coverW);
	}
	return bars(np, barColors, now, gap, height, coverW);
}
