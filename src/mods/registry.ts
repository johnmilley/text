/**
 * Build-time mod registry. Add a mod by importing it and listing it here, in
 * load order. This is the single place the host learns which mods exist.
 *
 * (A future phase may load mods from disk at runtime; today they are bundled.)
 */

import type { Mod } from "./types";
import { ssgMod } from "./ssg";
import { dataviewMod } from "./dataview";

export const MODS: Mod[] = [ssgMod, dataviewMod];
