import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The adapter is bundled under the plugin at `<sdPlugin>/mediaremote`; the compiled plugin runs from
// `<sdPlugin>/bin/plugin.js`, so resolve the adapter relative to this module.
const ADAPTER_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "mediaremote");

/** macOS system Perl, which is entitled to load the MediaRemote framework. */
export const PERL = "/usr/bin/perl";
/** Absolute path to the adapter's Perl entry point. */
export const ADAPTER_SCRIPT = join(ADAPTER_DIR, "mediaremote-adapter.pl");
/** Absolute path to the bundled adapter framework. */
export const ADAPTER_FRAMEWORK = join(ADAPTER_DIR, "MediaRemoteAdapter.framework");
