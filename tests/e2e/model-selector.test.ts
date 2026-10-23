import { expect, test } from "@playwright/test";

test.describe("Automatic model routing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByTestId("multimodal-input")).toHaveAttribute("data-hydrated", "true");
  });

  test("keeps model selection automatic and hides provider details", async ({ page }) => {
    await expect(page.getByTestId("model-selector")).toHaveCount(0);
    await expect(page.getByTestId("multimodal-input")).toBeVisible();
  });
});
