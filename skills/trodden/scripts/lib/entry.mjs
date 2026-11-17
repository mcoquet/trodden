// Parses one entry file into its frontmatter, sections, rules and
// relationships. It never throws: problems are recorded for the linter.

import { parseYamlSubset, YamlSubsetError } from "./yaml.mjs";

const LEVEL = /^(MUST NOT|MUST|SHOULD NOT|SHOULD)\b/;
const SOURCE_ID = /^[A-Za-z0-9._-]+$/;
const RELATIONSHIP = /^([^:]+):\s+(\S+)(\s+\(planned\))?$/;

function readFrontmatter(lines) {
  if (lines[0]?.trim() !== "---") {
    return { frontmatter: null, frontmatterError: "no frontmatter", bodyStart: 0 };
  }
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  if (end === -1) {
    return { frontmatter: null, frontmatterError: "frontmatter is not closed", bodyStart: 0 };
  }
  try {
    const frontmatter = parseYamlSubset(lines.slice(1, end).join("\n"));
    return { frontmatter, frontmatterError: null, bodyStart: end + 1 };
  } catch (err) {
    if (!(err instanceof YamlSubsetError)) throw err;
    const message = err.message.replace(/^line \d+: /, "");
    return {
      frontmatter: null,
      frontmatterError: `line ${err.line + 1}: ${message}`,
      bodyStart: end + 1,
    };
  }
}

function citedSources(text) {
  const match = text.match(/\[([^\]]*)\]\s*$/);
  if (!match) return [];
  const ids = match[1].split(",").map((id) => id.trim());
  return ids.every((id) => SOURCE_ID.test(id)) ? ids : [];
}

function toRule(item) {
  const level = item.text.match(LEVEL);
  return {
    level: level ? level[1] : null,
    text: item.text,
    sources: citedSources(item.text),
    line: item.line,
  };
}

function toRelationship(item) {
  const match = item.text.match(RELATIONSHIP);
  return {
    kind: match ? match[1].trim() : null,
    target: match ? match[2] : null,
    planned: Boolean(match && match[3]),
    line: item.line,
    raw: item.text,
  };
}

export function parseEntry(text) {
  const lines = text.split(/\r?\n/);
  const { frontmatter, frontmatterError, bodyStart } = readFrontmatter(lines);

  let title = null;
  let titleCount = 0;
  const sections = [];
  const fences = [];
  const items = []; // list items, tagged with the section they sit in
  let fence = null;
  let lastItem = null;

  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i];
    const section = sections[sections.length - 1];
    if (section) section.bodyLines.push(line);

    const marker = line.match(/^\s*(`{3,}|~{3,})\s*(\S*)/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && marker[2] === "") {
        fence = null;
      }
      continue;
    }
    if (marker) {
      fence = marker[1];
      fences.push({ lang: marker[2], line: i + 1 });
      lastItem = null;
      continue;
    }

    const heading = line.match(/^(#{1,2})\s+(.*\S)\s*$/);
    if (heading) {
      lastItem = null;
      if (heading[1] === "#") {
        titleCount++;
        if (title === null) title = heading[2];
      } else {
        if (section) section.bodyLines.pop();
        sections.push({ heading: heading[2], line: i + 1, bodyLines: [] });
      }
      continue;
    }

    // A list item under any marker, at any indent. In the Rules section a
    // plain line counts too, so that no rule escapes the linter.
    const item = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/);
    if (line.trim() === "" || !section) {
      lastItem = null;
    } else if (item) {
      lastItem = { section: section.heading, text: item[1], line: i + 1 };
      items.push(lastItem);
    } else if (lastItem) {
      lastItem.text += ` ${line.trim()}`;
    } else if (section.heading === "Rules") {
      lastItem = { section: section.heading, text: line.trim(), line: i + 1 };
      items.push(lastItem);
    }
  }

  const body = lines.slice(bodyStart).join("\n");
  return {
    frontmatter,
    frontmatterError,
    title,
    titleCount,
    body,
    sections: sections.map(({ heading, line, bodyLines }) => ({
      heading,
      body: bodyLines.join("\n").trim(),
      line,
    })),
    rules: items.filter((item) => item.section === "Rules").map(toRule),
    relationships: items.filter((item) => item.section === "Related").map(toRelationship),
    fences,
    wordCount: body.split(/\s+/).filter(Boolean).length,
  };
}
