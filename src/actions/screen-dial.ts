import { action, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

import type { NowPlaying } from "../media/nowplaying";
import { getCurrent } from "../media/store";
import { panelSvg } from "../render/strip";

/**
 * Base class for the four Stream Deck+ encoder panels. Together they render a single line of
 * now-playing text centered across the whole touch strip; each panel draws its own slice based on its
 * {@link panelIndex} (0 = leftmost).
 */
abstract class ScreenDial extends SingletonAction {
	/** 0-based position of this panel within the touch strip. */
	protected abstract readonly panelIndex: number;

	override onWillAppear(ev: WillAppearEvent): void | Promise<void> {
		if (ev.action.isDial()) {
			return ev.action.setFeedback({ value: this.slice(getCurrent()) });
		}
	}

	/** Pushes this panel's slice of the now-playing line to every visible instance of this action. */
	async refresh(np: NowPlaying | null): Promise<void> {
		const value = this.slice(np);
		for (const action of this.actions) {
			if (action.isDial()) {
				await action.setFeedback({ value });
			}
		}
	}

	private slice(np: NowPlaying | null): string {
		return panelSvg(np, this.panelIndex);
	}
}

@action({ UUID: "com.trigtbh.playback-progress.screen1" })
export class Screen1 extends ScreenDial {
	protected readonly panelIndex = 0;
}

@action({ UUID: "com.trigtbh.playback-progress.screen2" })
export class Screen2 extends ScreenDial {
	protected readonly panelIndex = 1;
}

@action({ UUID: "com.trigtbh.playback-progress.screen3" })
export class Screen3 extends ScreenDial {
	protected readonly panelIndex = 2;
}

@action({ UUID: "com.trigtbh.playback-progress.screen4" })
export class Screen4 extends ScreenDial {
	protected readonly panelIndex = 3;
}
