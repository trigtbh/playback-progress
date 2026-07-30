import streamDeck from "@elgato/streamdeck";

import { Screen1, Screen2, Screen3, Screen4 } from "./actions/screen-dial";
import { watchNowPlaying } from "./media/nowplaying";
import { setCurrent } from "./media/store";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded.
streamDeck.logger.setLevel("trace");

// Register the four encoder screen actions (one per Stream Deck+ dial, left to right).
const screens = [new Screen1(), new Screen2(), new Screen3(), new Screen4()];
for (const screen of screens) {
	streamDeck.actions.registerAction(screen);
}

// Connect to the Stream Deck, then stream system-wide now-playing info to the screens. Each panel
// renders its slice of a single line of text centered across the whole strip.
streamDeck.connect().then(() => {
	watchNowPlaying({
		onUpdate: (np) => {
			setCurrent(np);
			for (const screen of screens) {
				void screen.refresh(np);
			}
		},
		onError: (message) => streamDeck.logger.error(message),
	});
});
