import type { NextFunction, Request, RequestHandler, Response } from "express";

export class HttpError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}

/** Express 4 does not catch rejected promises, so wrap async handlers. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ detail: err.detail });
    return;
  }
  console.error(err);
  res.status(500).json({ detail: "Internal Server Error" });
}
