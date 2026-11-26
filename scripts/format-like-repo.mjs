/**
 * Text formatted the way the repository's Prettier configuration formats the
 * file it is written to, so a generated file passes `format:check` as
 * written. A file Prettier has no parser for comes back unchanged.
 */
import prettier from "prettier";

/**
 * @param {string} path - Absolute path the text is written to.
 * @param {string} contents - The text to write.
 * @returns {Promise<string>} The text as the committed file holds it.
 */
export async function formatLikeRepo(path, contents) {
  const info = await prettier.getFileInfo(path);
  if (!info.inferredParser) return contents;
  return prettier.format(contents, {
    ...(await prettier.resolveConfig(path)),
    parser: info.inferredParser,
  });
}
