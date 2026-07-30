import type { NowPlaying } from "../media/nowplaying";
import { COVER_PANEL_INDEX, leftPanelContent } from "./leftpanel";

/** Width of a single encoder panel, in pixels. */
const PANEL_WIDTH = 200;
/** Number of encoder panels that make up the Stream Deck+ touch strip. */
const PANEL_COUNT = 4;
/** Total width of the continuous touch strip, in pixels. */
const STRIP_WIDTH = PANEL_WIDTH * PANEL_COUNT;
/** Height of the touch strip, in pixels. */
const HEIGHT = 100;

/** Gap kept clear between the cover art and the text/bar content. */
const ART_GAP = 16;
/** Gap kept clear at the strip's right edge. */
const RIGHT_PAD = 16;

/** Title line style. */
const TITLE_SIZE = 22;
const TITLE_BASELINE = 40;
/** Artist line style (smaller and faded). */
const ARTIST_SIZE = 15;
const ARTIST_BASELINE = 60;
const ARTIST_OPACITY = 0.55;

/** Progress bar style. */
const BAR_HEIGHT = 6;
const BAR_Y = 70;
const BAR_RADIUS = 3;
const BAR_TRACK_OPACITY = 0.22;
const BAR_FILL_OPACITY = 0.95;

/** Time labels sit just above the bar ends. */
const TIME_SIZE = 12;
const TIME_BASELINE = BAR_Y - 6; // 64
const TIME_OPACITY = 0.5;

/** Taps at or below this y (within the bar's horizontal span) are treated as seeks. */
const BAR_HIT_TOP = 45;

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/** Horizontal layout of the text/bar content, filling the space to the right of the cover art. */
type Layout = { centerX: number; barLeft: number; barRight: number; barWidth: number };

function layout(coverW: number): Layout {
	const barLeft = coverW + ART_GAP;
	const barRight = STRIP_WIDTH - RIGHT_PAD;
	return { centerX: (barLeft + barRight) / 2, barLeft, barRight, barWidth: barRight - barLeft };
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function clamp01(value: number): number {
	return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Formats a number of seconds as `M:SS` (or `H:MM:SS` when an hour or longer). */
function formatTime(totalSeconds: number): string {
	const s = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(s / 3600);
	const minutes = Math.floor((s % 3600) / 60);
	const seconds = s % 60;
	const ss = String(seconds).padStart(2, "0");
	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
	}
	return `${minutes}:${ss}`;
}

/** Elapsed playback time in seconds, advancing with wall-clock time while playing, or `null`. */
function effectiveElapsedSeconds(np: NowPlaying | null, now: number): number | null {
	if (np === null || np.elapsedTime === null) {
		return null;
	}
	let elapsed = np.elapsedTime;
	if (np.playing && np.timestamp !== null) {
		elapsed += (now - Date.parse(np.timestamp)) / 1000;
	}
	return Math.max(0, elapsed);
}

/** Fraction of the track that has played (0..1), or `null` when there is no known duration. */
export function playbackProgress(np: NowPlaying | null, now = Date.now()): number | null {
	const elapsed = effectiveElapsedSeconds(np, now);
	if (elapsed === null || np === null || np.duration === null || np.duration <= 0) {
		return null;
	}
	return clamp01(elapsed / np.duration);
}

/**
 * Maps a touch tap on a panel to a seek position along the progress bar.
 *
 * @param panelIndex 0-based index of the tapped panel.
 * @param tapX Tap x within the panel (0..{@link PANEL_WIDTH}).
 * @param tapY Tap y within the panel (0..{@link HEIGHT}).
 * @param coverW Current cover width, which sets where the bar starts.
 * @returns Fraction along the bar (0..1), or `null` if the tap is outside the bar's hit area.
 */
export function seekFractionFromTap(panelIndex: number, tapX: number, tapY: number, coverW: number): number | null {
	if (tapY < BAR_HIT_TOP) {
		return null;
	}
	const { barLeft, barRight, barWidth } = layout(coverW);
	const globalX = panelIndex * PANEL_WIDTH + tapX;
	if (globalX < barLeft - 8 || globalX > barRight + 8) {
		return null;
	}
	return clamp01((globalX - barLeft) / barWidth);
}

function textEl(text: string, x: number, baseline: number, size: number, opacity: number, anchor = "middle"): string {
	if (text === "") {
		return "";
	}
	return `<text x="${x}" y="${baseline}" fill="#ffffff" fill-opacity="${opacity}" font-family="${FONT_FAMILY}" font-size="${size}" font-weight="600" text-anchor="${anchor}">${escapeXml(text)}</text>`;
}

function progressBar(progress: number | null, panelIndex: number, l: Layout): string {
	if (progress === null) {
		return "";
	}
	// Bar drawn in global coords, shifted into this panel's local space; SVG clips to the panel edge.
	const left = l.barLeft - panelIndex * PANEL_WIDTH;
	const track = `<rect x="${left}" y="${BAR_Y}" width="${l.barWidth}" height="${BAR_HEIGHT}" rx="${BAR_RADIUS}" fill="#ffffff" fill-opacity="${BAR_TRACK_OPACITY}"/>`;
	const filled = l.barWidth * progress;
	const fill =
		filled > 0
			? `<rect x="${left}" y="${BAR_Y}" width="${filled.toFixed(1)}" height="${BAR_HEIGHT}" rx="${BAR_RADIUS}" fill="#ffffff" fill-opacity="${BAR_FILL_OPACITY}"/>`
			: "";
	return track + fill;
}

/** Elapsed (left, aligned to bar start) and negative remaining (right, aligned to bar end) labels. */
function timeLabels(np: NowPlaying | null, panelIndex: number, now: number, l: Layout): string {
	const elapsed = effectiveElapsedSeconds(np, now);
	if (elapsed === null || np === null || np.duration === null || np.duration <= 0) {
		return "";
	}
	const played = Math.min(elapsed, np.duration);
	const remaining = np.duration - played;

	const leftX = l.barLeft - panelIndex * PANEL_WIDTH;
	const rightX = l.barRight - panelIndex * PANEL_WIDTH;
	return (
		textEl(formatTime(played), leftX, TIME_BASELINE, TIME_SIZE, TIME_OPACITY, "start") +
		textEl(`-${formatTime(remaining)}`, rightX, TIME_BASELINE, TIME_SIZE, TIME_OPACITY, "end")
	);
}

/**
 * Renders one panel's slice of the now-playing display: a two-line title/artist block and a progress
 * bar with time labels, both centered in the space to the right of the cover art, plus — on the left
 * panel — the cover art / bars visualizer. Everything is drawn in global strip coordinates shifted
 * into the panel's local space; the root SVG clips to the panel edge, so the four slices tile into one
 * continuous composition over a transparent background.
 *
 * @param np Current now-playing state, or `null` when nothing is playing.
 * @param panelIndex 0-based index of the panel (0 = leftmost).
 * @param artworkUri Cover art data URI for the left panel, or `null` when unknown.
 * @param barColors Per-bar colours sampled from the cover, or `null` when unknown.
 * @param coverW On-screen width of the cover art, which sets where the text/bar begin.
 * @returns A base64-encoded SVG data URI for the panel's pixmap.
 */
export function panelSvg(
	np: NowPlaying | null,
	panelIndex: number,
	artworkUri: string | null,
	barColors: string[] | null,
	coverW: number,
): string {
	const now = Date.now();
	const l = layout(coverW);
	const centerX = l.centerX - panelIndex * PANEL_WIDTH;
	const title = np !== null ? np.title : "";
	const artist = np !== null ? np.artist : "";

	let content =
		textEl(title, centerX, TITLE_BASELINE, TITLE_SIZE, 1) +
		textEl(artist, centerX, ARTIST_BASELINE, ARTIST_SIZE, ARTIST_OPACITY) +
		progressBar(playbackProgress(np, now), panelIndex, l) +
		timeLabels(np, panelIndex, now, l);

	if (panelIndex === COVER_PANEL_INDEX) {
		content += leftPanelContent(np, artworkUri, barColors, coverW, now);
	}

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${PANEL_WIDTH}" height="${HEIGHT}" viewBox="0 0 ${PANEL_WIDTH} ${HEIGHT}">${content}</svg>`;

	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
