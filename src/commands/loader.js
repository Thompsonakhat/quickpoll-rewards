import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function registerCommands(bot) {
  const files = await fs.readdir(__dirname);
  const commandFiles = files
    .filter((file) => file.endsWith(".js") && file !== "loader.js" && file !== "index.js")
    .sort();

  for (const file of commandFiles) {
    const mod = await import(pathToFileURL(path.join(__dirname, file)).href);
    const register = mod.default || mod.register;
    if (typeof register === "function") {
      register(bot);
    }
  }
}
