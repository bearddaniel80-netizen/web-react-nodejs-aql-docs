import express from "express";
import cors from "cors";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { asyncHandler, errorHandler } from "./errors";
import { verifyInternalKey } from "./security/apiKeyCheck";
import { render } from "./routers/runProcess";
import { apiRouter, assertSafeName } from "./routers/mainRouter";
import { router as minioRouter } from "./routers/minio";

const app = express();

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

app.use(minioRouter);
for (const folder of ["examples", "scripts", "sources"]) {
  app.use(`/api/${folder}`, apiRouter(folder));
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/data", (req, res) => {
  verifyInternalKey(req.header("x-internal-key"));
  res.json({ message: "Hello from Express" });
});

app.get(
  "/api/:filename",
  asyncHandler(async (req, res) => {
    verifyInternalKey(req.header("x-internal-key"));
    const { filename } = req.params;
    assertSafeName(filename);
    const inputFile = path.join(process.cwd(), `${filename}.md`);
    const outputFile = path.join(process.cwd(), `${filename}.html`);
    await render(["pandoc", inputFile, "-o", outputFile]);
    res.type("html").send(await readFile(outputFile, "utf8"));
  }),
);

app.use(errorHandler);

const port = Number(process.env.PORT ?? 8000);
app.listen(port, () => console.log(`Listening on :${port}`));
