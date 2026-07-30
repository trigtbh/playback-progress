import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { BAR_COUNT, COVER_HEIGHT } from "../render/leftpanel";
import { ADAPTER_FRAMEWORK, ADAPTER_SCRIPT, PERL } from "./adapter";

const execFileAsync = promisify(execFile);

/** Size (px) the cover is downscaled to for display; keeps the pushed image small. */
const COVER_PX = 120;
/** Bounds for the cover's on-screen width (px) once fit to the strip height. */
const MIN_COVER_W = 56;
const MAX_COVER_W = 196;

/** Cover art for the left panel: a display image, per-bar colours, and its on-screen width. */
export type CoverAssets = {
	/** Downscaled cover as a data URI, or `null` when unknown. */
	uri: string | null;
	/** One colour per visualizer bar, sampled across the art, or `null` when unavailable. */
	colors: string[] | null;
	/** On-screen width (px) at the strip height, preserving aspect ratio, or `null` when unknown. */
	width: number | null;
};

/** Reads an image's pixel dimensions via sips, or `null` on failure. */
async function imageSize(file: string): Promise<{ w: number; h: number } | null> {
	try {
		const { stdout } = await execFileAsync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", file], {
			timeout: 5000,
		});
		const w = /pixelWidth:\s*(\d+)/.exec(stdout);
		const h = /pixelHeight:\s*(\d+)/.exec(stdout);
		if (w === null || h === null) {
			return null;
		}
		return { w: Number(w[1]), h: Number(h[1]) };
	} catch {
		return null;
	}
}

/** Parses the pixel row of a tiny uncompressed BMP into hex colours (left to right). */
function parseBmpRow(buf: Buffer): string[] | null {
	if (buf.length < 54 || buf[0] !== 0x42 || buf[1] !== 0x4d) {
		return null;
	}
	const dataOffset = buf.readUInt32LE(10);
	const width = buf.readInt32LE(18);
	const bpp = buf.readUInt16LE(28);
	if (bpp !== 24 && bpp !== 32) {
		return null;
	}
	const bytesPerPixel = bpp / 8;
	const colors: string[] = [];
	for (let x = 0; x < width; x++) {
		const off = dataOffset + x * bytesPerPixel;
		if (off + 2 >= buf.length) {
			return null;
		}
		// BMP stores pixels as BGR(A).
		const b = buf[off];
		const g = buf[off + 1];
		const r = buf[off + 2];
		colors.push(`#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
	}
	return colors.length > 0 ? colors : null;
}

/**
 * Fetches the current track's cover art: a downscaled display image plus a per-bar colour sample of
 * the art (by resizing to {@link BAR_COUNT}×1 and reading the pixels). Returns nulls when there is no
 * artwork, on non-macOS platforms, or on failure.
 */
export async function getCoverAssets(): Promise<CoverAssets> {
	const empty: CoverAssets = { uri: null, colors: null, width: null };
	if (process.platform !== "darwin") {
		return empty;
	}

	let base64: string;
	let mime: string;
	try {
		const { stdout } = await execFileAsync(PERL, [ADAPTER_SCRIPT, ADAPTER_FRAMEWORK, "get"], {
			timeout: 5000,
			maxBuffer: 8 * 1024 * 1024,
		});
		const line = stdout.trim();
		if (line === "") {
			return empty;
		}
		const data = JSON.parse(line) as { artworkData?: unknown; artworkMimeType?: unknown };
		if (typeof data.artworkData !== "string" || data.artworkData === "") {
			return empty;
		}
		base64 = data.artworkData;
		mime = typeof data.artworkMimeType === "string" ? data.artworkMimeType : "image/jpeg";
	} catch {
		return empty;
	}

	const ext = mime === "image/png" ? "png" : "jpg";
	const input = join(tmpdir(), `pp-cover-in-${process.pid}.${ext}`);
	const outJpg = join(tmpdir(), `pp-cover-out-${process.pid}.jpg`);
	const outBmp = join(tmpdir(), `pp-cover-cols-${process.pid}.bmp`);

	let uri: string | null = null;
	let colors: string[] | null = null;
	let width: number | null = null;
	try {
		await writeFile(input, Buffer.from(base64, "base64"));

		// On-screen width from the original aspect ratio, fit to the strip height.
		const size = await imageSize(input);
		if (size !== null && size.w > 0 && size.h > 0) {
			const fitted = Math.round((COVER_HEIGHT * size.w) / size.h);
			width = Math.max(MIN_COVER_W, Math.min(MAX_COVER_W, fitted));
		}

		// Downscaled display image.
		try {
			await execFileAsync("/usr/bin/sips", ["-Z", String(COVER_PX), input, "--out", outJpg], { timeout: 5000 });
			uri = `data:image/jpeg;base64,${(await readFile(outJpg)).toString("base64")}`;
		} catch {
			uri = `data:${mime};base64,${base64}`;
		}

		// Per-bar colour sample: resize to BAR_COUNT×1 BMP and read the pixels.
		try {
			await execFileAsync("/usr/bin/sips", ["-s", "format", "bmp", "-z", "1", String(BAR_COUNT), input, "--out", outBmp], {
				timeout: 5000,
			});
			colors = parseBmpRow(await readFile(outBmp));
		} catch {
			colors = null;
		}
	} catch {
		// If we couldn't even write the input, fall back to the original image with no colours.
		uri = `data:${mime};base64,${base64}`;
	}

	return { uri, colors, width };
}
