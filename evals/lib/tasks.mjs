// Loads eval tasks: one folder per task, each with a task.json.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadTasks(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((item) => item.isDirectory() && existsSync(join(dir, item.name, "task.json")))
    .map((item) => {
      const task = JSON.parse(readFileSync(join(dir, item.name, "task.json"), "utf8"));
      for (const field of ["id", "prompt", "fixture"]) {
        if (typeof task[field] !== "string" || task[field] === "") {
          throw new Error(`${item.name}/task.json: "${field}" is missing`);
        }
      }
      if (task.id !== item.name) throw new Error(`${item.name}/task.json: id must be "${item.name}"`);
      if (!Array.isArray(task.variants) || task.variants.length === 0) {
        throw new Error(`${item.name}/task.json: "variants" must list at least one variant id`);
      }
      return { id: task.id, prompt: task.prompt, fixture: task.fixture, variants: task.variants };
    })
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}
