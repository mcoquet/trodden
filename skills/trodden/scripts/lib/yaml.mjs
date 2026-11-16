// Parser for the restricted YAML subset the entry format allows:
// `key: value`, `key: [a, b]`, and (when asked) one level of nesting.

export class YamlSubsetError extends Error {
  constructor(message, line) {
    super(`line ${line}: ${message}`);
    this.name = "YamlSubsetError";
    this.line = line;
  }
}

function unquote(text) {
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1);
  }
  return text;
}

function parseValue(raw) {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    return raw
      .slice(1, -1)
      .split(",")
      .map((item) => unquote(item.trim()))
      .filter((item) => item !== "");
  }
  return unquote(raw);
}

export function parseYamlSubset(text, opts = {}) {
  const nested = opts.nested === true;
  const result = {};
  let parent = null;

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const trimmed = rawLine.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return;

    const indented = /^\s/.test(rawLine);
    const colon = trimmed.indexOf(":");
    if (colon <= 0) throw new YamlSubsetError("expected `key: value`", line);
    const key = trimmed.slice(0, colon).trim();
    const rest = trimmed.slice(colon + 1).trim();

    if (indented) {
      if (parent === null) throw new YamlSubsetError("unexpected indentation", line);
      if (rest === "") throw new YamlSubsetError("only one level of nesting is allowed", line);
      if (key in parent) throw new YamlSubsetError(`duplicate key "${key}"`, line);
      parent[key] = parseValue(rest);
      return;
    }

    if (key in result) throw new YamlSubsetError(`duplicate key "${key}"`, line);
    if (rest === "") {
      if (!nested) throw new YamlSubsetError(`"${key}" has no value`, line);
      parent = result[key] = {};
      return;
    }
    parent = null;
    result[key] = parseValue(rest);
  });

  return result;
}
