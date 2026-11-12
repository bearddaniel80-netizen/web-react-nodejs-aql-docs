import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { asyncHandler, HttpError } from "../errors";
import { verifyInternalKey } from "../security/apiKeyCheck";
import { mdLinksToHtml, render } from "./runProcess";

const SAFE_NAME = /^[\w.-]+$/;

export function assertSafeName(name: string): void {
  if (!SAFE_NAME.test(name) || name.includes("..")) {
    throw new HttpError(400, "Invalid filename");
  }
}

export function apiRouter(folder: string): Router {
  const router = Router();

  router.get(
    "/list",
    asyncHandler(async (req, res) => {
      verifyInternalKey(req.header("x-internal-key"));
      await render(["aql", "docs"]);
      const results = await render(["ls", folder]);
      const cleanResult = results
        .split("\n")
        .filter(Boolean)
        .map((f) => path.parse(f).name);
      res.json({ result: cleanResult });
    }),
  );

  router.get(
    "/:filename",
    asyncHandler(async (req, res) => {
      verifyInternalKey(req.header("x-internal-key"));
      const { filename } = req.params;
      assertSafeName(filename);
      const inputFile = path.join(process.cwd(), folder, `${filename}.md`);
      const outputFile = path.join(process.cwd(), folder, `${filename}.html`);
      await mdLinksToHtml(inputFile);
      await render(["pandoc", "-f", "markdown-yaml_metadata_block", inputFile, "-o", outputFile]);
      res.type("html").send(await readFile(outputFile, "utf8"));
    }),
  );

  return router;
}
