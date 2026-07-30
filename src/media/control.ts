import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { ADAPTER_FRAMEWORK, ADAPTER_SCRIPT, PERL } from "./adapter";

const execFileAsync = promisify(execFile);

/**
 * Seeks the currently playing media to an absolute position, via the MediaRemote adapter. Best-effort:
 * failures (including non-macOS platforms) are swallowed. The adapter expects microseconds.
 *
 * @param seconds Target position from the start of the track.
 */
export async function seekTo(seconds: number): Promise<void> {
	if (process.platform !== "darwin") {
		return;
	}
	const micros = Math.max(0, Math.round(seconds * 1_000_000));
	try {
		await execFileAsync(PERL, [ADAPTER_SCRIPT, ADAPTER_FRAMEWORK, "seek", String(micros)], { timeout: 5000 });
	} catch (err) {
		console.error(`Failed to seek: ${String(err)}`);
	}
}
