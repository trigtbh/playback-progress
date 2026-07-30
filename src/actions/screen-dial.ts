import { action, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

import type { NowPlaying } from "../media/nowplaying";
import { getCurrent } from "../media/store";

/**
 * Base class for the four Stream Deck+ encoder "screen" widgets. Each subclass decides what text it
 * shows for a given now-playing snapshot, and renders it to the touch screen via the `screen` layout.
 */
abstract class ScreenDial extends SingletonAction {
	/** Computes the text this screen should display for the given now-playing state. */
	protected abstract text(np: NowPlaying | null): string;

	override onWillAppear(ev: WillAppearEvent): void | Promise<void> {
		// The touch screen is only present on encoders (Stream Deck+); guard so setFeedback is valid.
		if (ev.action.isDial()) {
			return ev.action.setFeedback({ value: this.text(getCurrent()) });
		}
	}

	/** Pushes the latest now-playing text to every visible instance of this action. */
	async refresh(np: NowPlaying | null): Promise<void> {
		const value = this.text(np);
		for (const action of this.actions) {
			if (action.isDial()) {
				await action.setFeedback({ value });
			}
		}
	}
}

@action({ UUID: "com.trigtbh.playback-progress.screen1" })
export class Screen1 extends ScreenDial {
	protected text(np: NowPlaying | null): string {
		return np?.title ?? "";
	}
}

@action({ UUID: "com.trigtbh.playback-progress.screen2" })
export class Screen2 extends ScreenDial {
	protected text(np: NowPlaying | null): string {
		return np?.artist ?? "";
	}
}

@action({ UUID: "com.trigtbh.playback-progress.screen3" })
export class Screen3 extends ScreenDial {
	protected text(): string {
		return "3";
	}
}

@action({ UUID: "com.trigtbh.playback-progress.screen4" })
export class Screen4 extends ScreenDial {
	protected text(): string {
		return "4";
	}
}
