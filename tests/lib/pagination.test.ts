import { expect, it } from "vitest";
import { anchorPage, getPagination } from "../../src/components/browsing/pagination";

it("bounds pages and preserves the first visible item as capacity changes", () => {
  expect(getPagination(12, 8, 8)).toEqual({ page: 1, pageSize: 8, totalPages: 2 });
  expect(getPagination(0, 0, 0)).toEqual({ page: 0, pageSize: 1, totalPages: 1 });
  expect(anchorPage(1, 8, 4, 12)).toBe(2);
  expect(anchorPage(2, 4, 8, 12)).toBe(1);
});
