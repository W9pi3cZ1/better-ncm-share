import { walk } from "https://deno.land/std/fs/walk.ts";

const SELF = "build.ts"; // 脚本自身文件名

for await (const entry of walk(".", {
    exts: [".ts"],
    skip: [
        /\.d\.ts$/,
        /node_modules/,
        /dist/,
    ],
    includeDirs: false,
})) {
    if (!entry.isFile) continue;
    if (entry.name === SELF) continue;          // 排除自身
    if (entry.path.endsWith(".d.ts")) continue; // 双保险

    const outPath = entry.path.replace(/\.ts$/, ".js");
    console.log(`Bundling ${entry.path} -> ${outPath}`);

    const result = await Deno.bundle({
        entrypoints: [entry.path],
        platform: "browser",
        minify: true,
    });

    if (result.outputFiles) {
        for (const file of result.outputFiles) {
            await Deno.writeTextFile(outPath, file.text());
        }
    }
}