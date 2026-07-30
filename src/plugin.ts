import streamDeck from "@elgato/streamdeck";

import { Screen1, Screen2, Screen3, Screen4 } from "./actions/screen-dial";
import { watchNowPlaying } from "./media/nowplaying";
import { getCurrent, onCurrentChange, setCurrent } from "./media/store";

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

// Re-render whenever the now-playing state changes (from the stream or an optimistic seek update).
onCurrentChange(() => renderAll());

// Connect to the Stream Deck, then stream system-wide now-playing info to the screens. Each panel
// renders its slice of the title/artist block (centered on screen 3) and the progress bar.
streamDeck.connect().then(() => {
	watchNowPlaying({
		onUpdate: (np) => setCurrent(np),
		onError: (message) => streamDeck.logger.error(message),
	});

	// The stream only emits on change, so tick once a second to advance the progress bar while playing.
	setInterval(() => {
		const np = getCurrent();
		if (np !== null && np.playing && np.duration !== null) {
			renderAll();
		}
	}, 1000);
});
