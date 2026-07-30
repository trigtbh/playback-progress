import type { NowPlaying } from "../media/nowplaying";

/** Width of a single encoder panel, in pixels. */
const PANEL_WIDTH = 200;
/** Number of encoder panels that make up the Stream Deck+ touch strip. */
const PANEL_COUNT = 4;
/** Total width of the continuous touch strip (all panels), in pixels. */
const STRIP_WIDTH = PANEL_WIDTH * PANEL_COUNT;
/** Height of the touch strip, in pixels. */
const HEIGHT = 100;
/** Font size for the now-playing line. */
const FONT_SIZE = 22;

/** Builds the single line shown across the strip, e.g. `Title — Artist`. */
export function nowPlayingText(np: NowPlaying | null): string {
	if (np === null) {
		return "";
	}
	if (np.title !== "" && np.artist !== "") {
		return `${np.title} — ${np.artist}`;
	}
	return np.title !== "" ? np.title : np.artist;
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Renders one panel's slice of a single line of text centered across the whole touch strip. The text
 * is centered at the strip's midpoint (x = {@link STRIP_WIDTH} / 2, which is the panel-2/3 seam) and
 * drawn into each panel shifted by that panel's offset; the root SVG clips to the panel edge, so the
 * four slices tile into one continuous centered line.
 *
 * @param text Full line to render across the strip.
 * @param panelIndex 0-based index of the panel (0 = leftmost).
 * @returns A base64-encoded SVG data URI for the panel's pixmap.
 */
export function panelSvg(text: string, panelIndex: number): string {
	// x of the strip centre expressed in this panel's local (0..PANEL_WIDTH) coordinate space.
	const centerX = STRIP_WIDTH / 2 - panelIndex * PANEL_WIDTH;
	const baselineY = (HEIGHT / 2 + FONT_SIZE * 0.35).toFixed(1);

	const label =
		text === ""
			? ""
			: `<text x="${centerX}" y="${baselineY}" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="${FONT_SIZE}" font-weight="600" text-anchor="middle">${escapeXml(text)}</text>`;

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL_WIDTH}" height="${HEIGHT}" viewBox="0 0 ${PANEL_WIDTH} ${HEIGHT}"><rect width="${PANEL_WIDTH}" height="${HEIGHT}" fill="#000000"/>${label}</svg>`;

	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
