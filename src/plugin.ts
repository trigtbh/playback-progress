import streamDeck from "@elgato/streamdeck";

import { Screen1, Screen2, Screen3, Screen4 } from "./actions/screen-dial";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded.
streamDeck.logger.setLevel("trace");

// Register the four encoder screen actions (one per Stream Deck+ dial).
streamDeck.actions.registerAction(new Screen1());
streamDeck.actions.registerAction(new Screen2());
streamDeck.actions.registerAction(new Screen3());
streamDeck.actions.registerAction(new Screen4());

// Finally, connect to the Stream Deck.
streamDeck.connect();
