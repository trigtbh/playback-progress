import { action, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

/**
 * Base class for the four Stream Deck+ encoder "screen" widgets. Each subclass is bound to a single
 * encoder action and displays its screen number on the touch screen using the `screen` layout.
 */
abstract class ScreenDial extends SingletonAction {
	/** The 1-based screen number this encoder represents. */
	protected abstract readonly screen: number;

	override onWillAppear(ev: WillAppearEvent): void | Promise<void> {
		// The touch screen is only present on encoders (Stream Deck+); guard so setFeedback is valid.
		if (ev.action.isDial()) {
			return ev.action.setFeedback({ value: `${this.screen}` });
		}
	}
}

@action({ UUID: "com.trigtbh.playback-progress.screen1" })
export class Screen1 extends ScreenDial {
	protected readonly screen = 1;
}

@action({ UUID: "com.trigtbh.playback-progress.screen2" })
export class Screen2 extends ScreenDial {
	protected readonly screen = 2;
}

@action({ UUID: "com.trigtbh.playback-progress.screen3" })
export class Screen3 extends ScreenDial {
	protected readonly screen = 3;
}

@action({ UUID: "com.trigtbh.playback-progress.screen4" })
export class Screen4 extends ScreenDial {
	protected readonly screen = 4;
}
