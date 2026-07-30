import { action, SingletonAction, TouchTapEvent, WillAppearEvent } from "@elgato/streamdeck";

import { seekTo } from "../media/control";
import type { NowPlaying } from "../media/nowplaying";
import { getArtwork, getBarColors, getCurrent, setCurrent } from "../media/store";
import { COVER_PANEL_INDEX, COVER_SIZE, toggleLeftPanel } from "../render/leftpanel";
import { panelSvg, seekFractionFromTap } from "../render/strip";

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

	/** Tapping the cover toggles the visualizer; tapping the progress bar seeks. */
	override async onTouchTap(ev: TouchTapEvent): Promise<void> {
		const [x, y] = ev.payload.tapPos;

		// Cover panel: tapping the cover / visualizer square morphs between the two.
		if (this.panelIndex === COVER_PANEL_INDEX) {
			if (x <= COVER_SIZE) {
				toggleLeftPanel();
				setCurrent(getCurrent()); // re-render immediately with the transition underway
			}
			return;
		}

		const np = getCurrent();
		if (np === null || np.duration === null || np.duration <= 0) {
			return;
		}

		const fraction = seekFractionFromTap(this.panelIndex, x, y);
		if (fraction === null) {
			return;
		}

		const target = fraction * np.duration;
		await seekTo(target);
		// Optimistically reflect the new position immediately; the stream will confirm shortly. This
		// notifies the store, which re-renders every panel so the bar stays consistent across screens.
		setCurrent({ ...np, elapsedTime: target, timestamp: new Date().toISOString() });
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
		return panelSvg(np, this.panelIndex, getArtwork(), getBarColors());
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
