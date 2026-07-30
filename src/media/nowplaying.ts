import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** A snapshot of the currently playing track (system-wide, any media app). */
export type NowPlaying = {
	/** Bundle id of the app the track is playing in, e.g. `com.apple.Music`. */
	bundleIdentifier: string;
	/** Track name. */
	title: string;
	/** Track artist / author. */
	artist: string;
	/** Album name, when available. */
	album: string;
	/** Whether the track is actively playing (vs paused). */
	playing: boolean;
	/** Track duration in seconds, or `null` when unknown. */
	duration: number | null;
	/** Elapsed playback time (seconds) at {@link timestamp}, or `null` when unknown. */
	elapsedTime: number | null;
	/** ISO timestamp the {@link elapsedTime} was sampled at, or `null` when unknown. */
	timestamp: string | null;
};

// The adapter is bundled under the plugin at `<sdPlugin>/mediaremote`; the compiled plugin runs from
// `<sdPlugin>/bin/plugin.js`, so resolve the adapter relative to this module.
const ADAPTER_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "mediaremote");
const PERL = "/usr/bin/perl";
const SCRIPT = join(ADAPTER_DIR, "mediaremote-adapter.pl");
const FRAMEWORK = join(ADAPTER_DIR, "MediaRemoteAdapter.framework");

/** Delay before restarting the stream process if it exits unexpectedly. */
const RESTART_DELAY = 2000;

type StreamMessage = {
	type?: string;
	payload?: Record<string, unknown>;
};

/**
 * Parses one line of the adapter's stream output.
 * @returns a {@link NowPlaying} snapshot, `null` when nothing is playing, or `undefined` for lines
 * that should be ignored (non-data messages or parse errors).
 */
function parseLine(line: string): NowPlaying | null | undefined {
	let message: StreamMessage;
	try {
		message = JSON.parse(line) as StreamMessage;
	} catch {
		return undefined;
	}

	if (message.type !== "data" || typeof message.payload !== "object" || message.payload === null) {
		return undefined;
	}

	const p = message.payload;
	// An empty payload (or one without a title) means nothing is currently playing.
	if (typeof p.title !== "string" || p.title === "") {
		return null;
	}

	return {
		bundleIdentifier: typeof p.bundleIdentifier === "string" ? p.bundleIdentifier : "",
		title: p.title,
		artist: typeof p.artist === "string" ? p.artist : "",
		album: typeof p.album === "string" ? p.album : "",
		playing: p.playing === true,
		duration: typeof p.duration === "number" ? p.duration : null,
		elapsedTime: typeof p.elapsedTime === "number" ? p.elapsedTime : null,
		timestamp: typeof p.timestamp === "string" ? p.timestamp : null,
	};
}

/** Handlers for the now-playing watcher. */
export type NowPlayingHandlers = {
	/** Called whenever the now-playing state changes. `null` means nothing is playing. */
	onUpdate: (np: NowPlaying | null) => void;
	/** Optional diagnostics sink (adapter stderr, spawn/parse issues). */
	onError?: (message: string) => void;
};

/**
 * Streams system-wide now-playing info via the bundled MediaRemote adapter and invokes
 * `handlers.onUpdate` on every change. Works for any media app and requires no Automation/TCC
 * permission. The stream emits the current state immediately on start, and the process is restarted
 * if it exits. Returns a function that stops watching.
 *
 * On non-macOS platforms this reports "nothing playing" once and does nothing further.
 */
export function watchNowPlaying(handlers: NowPlayingHandlers): () => void {
	const { onUpdate, onError } = handlers;

	if (process.platform !== "darwin") {
		onUpdate(null);
		return () => {};
	}

	let stopped = false;
	let child: ReturnType<typeof spawn> | undefined;
	let restartTimer: NodeJS.Timeout | undefined;

	const start = (): void => {
		child = spawn(PERL, [SCRIPT, FRAMEWORK, "stream", "--no-diff", "--no-artwork", "--debounce=250"], {
			stdio: ["ignore", "pipe", "pipe"],
		});

		child.on("error", (err) => onError?.(`Failed to start now-playing adapter: ${err.message}`));
		child.stderr?.on("data", (data: Buffer) => onError?.(`now-playing adapter: ${data.toString().trim()}`));

		const rl = createInterface({ input: child.stdout! });
		rl.on("line", (line) => {
			const result = parseLine(line);
			if (result !== undefined) {
				onUpdate(result);
			}
		});

		child.on("exit", () => {
			rl.close();
			if (!stopped) {
				restartTimer = setTimeout(start, RESTART_DELAY);
			}
		});
	};

	start();

	return () => {
		stopped = true;
		if (restartTimer !== undefined) {
			clearTimeout(restartTimer);
		}
		child?.kill();
	};
}
