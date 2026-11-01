/*
 * Lets `node --test` load the app's TypeScript the way Next does. Node strips
 * the types itself. This hook only resolves the "@/" alias from tsconfig.json,
 * the extensionless relative imports the source uses, and package subpaths
 * such as "next/headers" that only a bundler finds without ".js". It also
 * marks .json imports as JSON: the app imports content/studio.json without
 * an import attribute, which a bundler allows and plain Node refuses.
 */
import { existsSync } from "fs";
import { registerHooks } from "module";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const src = path.join(process.cwd(), "src");

function resolveSource(specifier, context, nextResolve) {
  let target = null;
  if (specifier.startsWith("@/")) {
    target = path.join(src, specifier.slice(2));
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (target && !path.extname(target) && existsSync(`${target}.ts`)) {
    return nextResolve(pathToFileURL(`${target}.ts`).href, context);
  }
  if (target && specifier.startsWith("@/")) {
    return nextResolve(pathToFileURL(target).href, context);
  }
  try {
    return nextResolve(specifier, context);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND" || specifier.startsWith(".")) throw error;
    return nextResolve(`${specifier}.js`, context);
  }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = resolveSource(specifier, context, nextResolve);
    if (resolved.url.endsWith(".json") && context.importAttributes?.type !== "json") {
      return { ...resolved, importAttributes: { ...context.importAttributes, type: "json" } };
    }
    return resolved;
  },
});
