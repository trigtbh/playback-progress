import streamDeck from "@elgato/streamdeck";

import { Screen1, Screen2, Screen3, Screen4 } from "./actions/screen-dial";
import { getCoverAssets } from "./media/artwork";
import { watchNowPlaying, type NowPlaying } from "./media/nowplaying";
import { getCurrent, onCurrentChange, setCover, setCurrent } from "./media/store";
import { COVER_PANEL_INDEX, leftPanelNeedsAnimation } from "./render/leftpanel";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded.
streamDeck.logger.setLevel("trace");

// Register the four encoder screen actions (one per Stream Deck+ dial, left to right).
const screens = [new Screen1(), new Screen2(), new Screen3(), new Screen4()];
for (const screen of screens) {
	streamDeck.actions.registerAction(screen);
}

/** Re-renders every panel from the current now-playing state. */
function renderAll(): void {
	const np = getCurrent();
	for (const screen of screens) {
		void screen.refresh(np);
	}
}

/** Re-renders only the cover panel (used for the visualizer animation). */
function renderCover(): void {
	void screens[COVER_PANEL_INDEX].refresh(getCurrent());
}

/** Identity of a track; used to detect when the cover art needs refetching. */
function trackKey(np: NowPlaying | null): string | null {
	return np === null ? null : `${np.bundleIdentifier}|${np.title}|${np.album}`;
}

let lastTrackKey: string | null = null;

/** Fetches cover art when the track changes, clearing the old art while the new one loads. */
function updateArtwork(np: NowPlaying | null): void {
	const key = trackKey(np);
	if (key === lastTrackKey) {
		return;
	}
	lastTrackKey = key;
	setCover(null, null, null);
	if (np === null) {
		return;
	}
	getCoverAssets()
		.then((assets) => {
			// Ignore if the track changed again while fetching.
			if (trackKey(getCurrent()) === key) {
				setCover(assets.uri, assets.colors, assets.width);
			}
		})
		.catch(() => {});
}

// Re-render whenever the now-playing state or artwork changes.
onCurrentChange(() => renderAll());

// Connect to the Stream Deck, then stream system-wide now-playing info to the screens. Each panel
// renders its slice of the title/artist block (centered on screen 3), the progress bar, and — on the
// left panel — the cover art / bars visualizer.
streamDeck.connect().then(() => {
	watchNowPlaying({
		onUpdate: (np) => {
			updateArtwork(np);
			setCurrent(np);
		},
		onError: (message) => streamDeck.logger.error(message),
	});

	// The stream only emits on change, so tick once a second to advance the progress bar while playing.
	setInterval(() => {
		const np = getCurrent();
		if (np !== null && np.playing && np.duration !== null) {
			renderAll();
		}
	}, 1000);

	// Animate the visualizer / cover morph (~14fps), but only while an animation is in progress.
	setInterval(() => {
		if (leftPanelNeedsAnimation()) {
			renderCover();
		}
	}, 70);
});
