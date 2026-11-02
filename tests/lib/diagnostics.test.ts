import { expect, it, vi } from "vitest";
import { createDiagnostics } from "../../src/lib/diagnostics/diagnostics";
it("is silent by default and does not disrupt play when reporting fails", async () => {
  const event = { category: "test", message: "failure" };
  expect(await createDiagnostics().report(event)).toBe(false);
  const reporter = vi.fn().mockRejectedValue(new Error("offline"));
  expect(await createDiagnostics(reporter).report(event)).toBe(false);
  expect(reporter).toHaveBeenCalledWith(event);
});
