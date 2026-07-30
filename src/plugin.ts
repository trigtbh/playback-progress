import streamDeck from "@elgato/streamdeck";

import { Screen1, Screen2, Screen3, Screen4 } from "./actions/screen-dial";
import { watchNowPlaying } from "./media/nowplaying";
import { setCurrent } from "./media/store";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded.
streamDeck.logger.setLevel("trace");

// Register the four encoder screen actions (one per Stream Deck+ dial).
const screen1 = new Screen1();
const screen2 = new Screen2();
streamDeck.actions.registerAction(screen1);
streamDeck.actions.registerAction(screen2);
streamDeck.actions.registerAction(new Screen3());
streamDeck.actions.registerAction(new Screen4());

// Connect to the Stream Deck, then stream system-wide now-playing info to the screens.
streamDeck.connect().then(() => {
	watchNowPlaying({
		onUpdate: (np) => {
			setCurrent(np);
			void screen1.refresh(np);
			void screen2.refresh(np);
		},
		onError: (message) => streamDeck.logger.error(message),
	});
});
