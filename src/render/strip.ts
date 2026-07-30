import type { NowPlaying } from "../media/nowplaying";

/** Width of a single encoder panel, in pixels. */
const PANEL_WIDTH = 200;
/** Height of the touch strip, in pixels. */
const HEIGHT = 100;

/** The text block is centered on the middle of this panel (0-based). Screen 3 = index 2. */
const CENTER_PANEL_INDEX = 2;
/** X of the centre point across the whole strip (middle of the centre panel). */
const CENTER_X = CENTER_PANEL_INDEX * PANEL_WIDTH + PANEL_WIDTH / 2;

/** Title line style. */
const TITLE_SIZE = 22;
const TITLE_BASELINE = 40;
/** Artist line style (smaller and faded). */
const ARTIST_SIZE = 15;
const ARTIST_BASELINE = 60;
const ARTIST_OPACITY = 0.55;

/** Progress bar spans these panels inclusive: screen 2 (index 1) through screen 4 (index 3). */
const BAR_START_PANEL = 1;
const BAR_END_PANEL = 3;
/** Horizontal padding kept clear at each end of the bar, in pixels. */
const BAR_PADDING = 24;
const BAR_LEFT = BAR_START_PANEL * PANEL_WIDTH + BAR_PADDING; // 224 (global)
const BAR_WIDTH = (BAR_END_PANEL + 1 - BAR_START_PANEL) * PANEL_WIDTH - 2 * BAR_PADDING; // 552
const BAR_HEIGHT = 6;
const BAR_Y = 70;
const BAR_RADIUS = 3;
const BAR_TRACK_OPACITY = 0.22;
const BAR_FILL_OPACITY = 0.95;

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

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

/**
 * Fraction of the track that has played (0..1), advancing with wall-clock time while playing, or
 * `null` when there is no known duration (e.g. live streams).
 */
export function playbackProgress(np: NowPlaying | null, now = Date.now()): number | null {
	if (np === null || np.duration === null || np.duration <= 0 || np.elapsedTime === null) {
		return null;
	}
	let elapsed = np.elapsedTime;
	if (np.playing && np.timestamp !== null) {
		elapsed += (now - Date.parse(np.timestamp)) / 1000;
	}
	return clamp01(elapsed / np.duration);
}

function textEl(text: string, x: number, baseline: number, size: number, opacity: number): string {
	if (text === "") {
		return "";
	}
	return `<text x="${x}" y="${baseline}" fill="#ffffff" fill-opacity="${opacity}" font-family="${FONT_FAMILY}" font-size="${size}" font-weight="600" text-anchor="middle">${escapeXml(text)}</text>`;
}

function progressBar(progress: number | null, panelIndex: number): string {
	if (progress === null) {
		return "";
	}
	// Bar drawn in global coords, shifted into this panel's local space; SVG clips to the panel edge.
	const left = BAR_LEFT - panelIndex * PANEL_WIDTH;
	const track = `<rect x="${left}" y="${BAR_Y}" width="${BAR_WIDTH}" height="${BAR_HEIGHT}" rx="${BAR_RADIUS}" fill="#ffffff" fill-opacity="${BAR_TRACK_OPACITY}"/>`;
	const filled = BAR_WIDTH * progress;
	const fill =
		filled > 0
			? `<rect x="${left}" y="${BAR_Y}" width="${filled.toFixed(1)}" height="${BAR_HEIGHT}" rx="${BAR_RADIUS}" fill="#ffffff" fill-opacity="${BAR_FILL_OPACITY}"/>`
			: "";
	return track + fill;
}

/**
 * Renders one panel's slice of the now-playing display: a two-line title/artist block centered on
 * screen 3, plus a progress bar spanning screens 2–4. Everything is drawn in global strip coordinates
 * shifted into the panel's local space; the root SVG clips to the panel edge, so the four slices tile
 * into one continuous composition over a transparent background.
 *
 * @param np Current now-playing state, or `null` when nothing is playing.
 * @param panelIndex 0-based index of the panel (0 = leftmost).
 * @returns A base64-encoded SVG data URI for the panel's pixmap.
 */
export function panelSvg(np: NowPlaying | null, panelIndex: number): string {
	const centerX = CENTER_X - panelIndex * PANEL_WIDTH;
	const title = np !== null ? np.title : "";
	const artist = np !== null ? np.artist : "";

	const content =
		textEl(title, centerX, TITLE_BASELINE, TITLE_SIZE, 1) +
		textEl(artist, centerX, ARTIST_BASELINE, ARTIST_SIZE, ARTIST_OPACITY) +
		progressBar(playbackProgress(np), panelIndex);

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL_WIDTH}" height="${HEIGHT}" viewBox="0 0 ${PANEL_WIDTH} ${HEIGHT}">${content}</svg>`;

	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
