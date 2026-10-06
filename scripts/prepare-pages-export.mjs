import { cp } from "fs/promises";

if (process.env.GITHUB_PAGES !== "1") {
  console.error("Refusing to replace the studio desk. This step is only for the GitHub Pages build.");
  process.exit(1);
}

await cp("src/curate-on-pages.tsx", "src/app/curate/page.tsx");
console.log("Replaced src/app/curate/page.tsx for this static build only. Do not commit that file.");
