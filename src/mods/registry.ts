/**
 * Build-time mod registry. Add a mod by importing it and listing it here, in
 * load order. This is the single place the host learns which mods exist.
 *
 * (A future phase may load mods from disk at runtime; today they are bundled.)
 */

import type { Mod } from "./types";
import { ssgMod } from "./ssg";
import { dataviewMod } from "./dataview";
import { tocMod } from "./toc";
import { dailyMod } from "./daily";
import { mermaidMod } from "./mermaid";
import { latexMod } from "./latex";
import { lessonsMod } from "./lessons";
import { templatesMod } from "./templates";

export const MODS: Mod[] = [ssgMod, dataviewMod, tocMod, dailyMod, mermaidMod, latexMod, lessonsMod, templatesMod];
