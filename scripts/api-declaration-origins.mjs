import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { eachMapping, TraceMap } from "@jridgewell/trace-mapping";

export function canonicalPath(path) {
  try {
    return realpathSync(path);
  } catch {
    return undefined;
  }
}

export function inside(folder, path) {
  const local = relative(folder, path);
  return local !== ".." && !local.startsWith(`..${sep}`) && !isAbsolute(local);
}

export function originKey(origin) {
  return JSON.stringify([origin.file, origin.line, origin.column]);
}

/** Exact declaration-map origins; absent required or ambiguous maps prove nothing. */
export function declarationOrigins(projectFolder) {
  const maps = new Map();
  function load(source) {
    const file = canonicalPath(source.fileName);
    if (!file || !inside(projectFolder, file)) return undefined;
    if (maps.has(file)) return maps.get(file);
    const mapFile = `${file}.map`;
    const advertised = source.text.split(/\r?\n/).flatMap((line) => {
      const match = /^\/\/[#@]\s*sourceMappingURL\s*=\s*(\S+)$/.exec(
        line.trim()
      );
      return match ? [match[1]] : [];
    });
    if (!existsSync(mapFile)) {
      const absent = advertised.length > 0 ? undefined : { file, mappings: [] };
      maps.set(file, absent);
      return absent;
    }
    try {
      const mapPath = canonicalPath(mapFile);
      if (!mapPath || !inside(projectFolder, mapPath)) return undefined;
      if (
        advertised.length > 1 ||
        (advertised.length === 1 &&
          canonicalPath(resolve(dirname(file), advertised[0])) !== mapPath)
      )
        return undefined;
      const mappings = [];
      const map = new TraceMap(
        JSON.parse(readFileSync(mapFile, "utf8")),
        pathToFileURL(mapFile).href
      );
      let ambiguous = false;
      eachMapping(map, (item) => {
        const previous = mappings.at(-1);
        if (
          previous &&
          previous.generatedLine === item.generatedLine &&
          previous.generatedColumn === item.generatedColumn &&
          (previous.source !== item.source ||
            previous.originalLine !== item.originalLine ||
            previous.originalColumn !== item.originalColumn)
        )
          ambiguous = true;
        mappings.push(item);
      });
      const result =
        ambiguous || mappings.length === 0 ? undefined : { file, mappings };
      maps.set(file, result);
      return result;
    } catch {
      maps.set(file, undefined);
      return undefined;
    }
  }
  return (node) => {
    const source = node.getSourceFile();
    const data = load(source);
    if (!data) return undefined;
    const position = source.getLineAndCharacterOfPosition(
      node.getStart(source)
    );
    const line = position.line + 1;
    const column = position.character;
    if (data.mappings.length === 0)
      return { file: data.file, line, column: column + 1 };
    const anchor = data.mappings.findLast(
      (item) => item.generatedLine === line && item.generatedColumn === column
    );
    if (
      !anchor?.source ||
      anchor.originalLine === null ||
      anchor.originalColumn === null
    )
      return undefined;
    try {
      const path = anchor.source.startsWith("file:")
        ? fileURLToPath(anchor.source)
        : resolve(dirname(data.file), anchor.source);
      const file = canonicalPath(path);
      if (!file || !inside(projectFolder, file)) return undefined;
      if (
        !Number.isInteger(anchor.originalLine) ||
        anchor.originalLine < 1 ||
        !Number.isInteger(anchor.originalColumn) ||
        anchor.originalColumn < 0
      )
        return undefined;
      return {
        file,
        line: anchor.originalLine,
        column: anchor.originalColumn + 1,
      };
    } catch {
      return undefined;
    }
  };
}
