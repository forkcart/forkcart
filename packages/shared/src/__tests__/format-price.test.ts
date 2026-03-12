import { describe, it, expect } from "vitest";
import { formatPrice } from "../index";

describe("formatPrice", () => {
  it("formats cents to EUR", () => {
    expect(formatPrice(1299)).toBe("€12.99");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("€0.00");
  });
});
