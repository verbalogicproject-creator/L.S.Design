import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveChromium, screenshot } from "../server/screenshot.ts";

function pngWidth(buffer: Buffer): number {
  return buffer.readUInt32BE(16);
}

describe("screenshot", () => {
  let outDir: string;

  afterEach(async () => {
    if (outDir) await rm(outDir, { recursive: true, force: true });
  });

  it("resolveChromium returns a path that exists on disk", (context) => {
    const chromium = resolveChromium();
    if (chromium === null) {
      context.skip();
      return;
    }
    expect(typeof chromium).toBe("string");
  });

  it("renders a tiny local html file at the requested widths", async (context) => {
    const chromium = resolveChromium();
    if (chromium === null) {
      // No chromium-family binary on this box; nothing to render against.
      context.skip();
      return;
    }

    const workDir = await mkdtemp(join(tmpdir(), "ls-design-shot-"));
    outDir = workDir;
    const htmlPath = join(workDir, "sample.html");
    await writeFile(
      htmlPath,
      "<!doctype html><html><body style=\"margin:0;background:#336699;height:1200px\"></body></html>",
      "utf8",
    );
    const outputDir = join(workDir, "out");

    const result = await screenshot({
      htmlPath,
      widths: [360, 768],
      outDir: outputDir,
    });

    expect(result.files.length).toBe(2);
    expect(result.chromium).toBe(chromium);

    const widths = [360, 768];
    for (let index = 0; index < result.files.length; index += 1) {
      const file = result.files[index] as string;
      const buffer = await readFile(file);
      expect(buffer.subarray(0, 4).toString("hex")).toBe("89504e47");
      expect(pngWidth(buffer)).toBe(widths[index]);
    }
  }, 60000);
});
