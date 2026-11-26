/**
 * Point a package's maps at one shared copy of each source.
 *
 * Vue's build emits production and development output, ESM and CommonJS,
 * and declaration maps through tsdown. Core's library build already does
 * this step; Vue keeps its own tsdown config and runs the same rewrite after.
 */
import { shareMapSources } from "./build-library.mjs";

shareMapSources("dist", process.cwd());
