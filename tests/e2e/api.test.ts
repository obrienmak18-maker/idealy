import { expect, test } from "@playwright/test";

const CHAT_URL_REGEX = /\/chat\/[\w-]+/;
const ERROR_TEXT_REGEX = /error|failed|trouble/i;

test.describe("Chat API Integration", () => {
  test("sends message and receives AI response", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByTestId("multimodal-input")).toHaveAttribute("data-hydrated", "true");

    const input = page.getByTestId("multimodal-input");
    await input.fill("Hello");
    await page.getByTestId("send-button").click();

    // Wait for assistant response to appear
    const assistantMessage = page.locator("[data-role='assistant']").first();
    await expect(assistantMessage).toBeVisible({ timeout: 30_000 });

    // Verify it has some text content
    const content = await assistantMessage.textContent();
    expect(content?.length).toBeGreaterThan(0);
  });

  test("redirects to /chat/:id after sending message", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByTestId("multimodal-input")).toHaveAttribute("data-hydrated", "true");

    const input = page.getByTestId("multimodal-input");
    await input.fill("Test redirect");
    await page.getByTestId("send-button").click();

    // URL should change to /chat/:id format
    await expect(page).toHaveURL(CHAT_URL_REGEX, { timeout: 10_000 });
  });

  test("clears input after sending", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByTestId("multimodal-input")).toHaveAttribute("data-hydrated", "true");

    const input = page.getByTestId("multimodal-input");
    await input.fill("Test message");
    await page.getByTestId("send-button").click();

    // Input should be cleared
    await expect(input).toHaveValue("");
  });

  test("shows stop button during generation", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByTestId("multimodal-input")).toHaveAttribute("data-hydrated", "true");
    const input = page.getByTestId("multimodal-input");
    await input.fill("Test");
    await page.getByTestId("send-button").click();

    // Stop button should appear during generation
    const stopButton = page.getByTestId("stop-button");
    await expect(stopButton).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Chat Error Handling", () => {
  test("handles API error gracefully", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        body: JSON.stringify({ error: "Internal server error" }),
        contentType: "application/json",
        status: 500,
      });
    });

    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByTestId("multimodal-input")).toHaveAttribute("data-hydrated", "true");
    const input = page.getByTestId("multimodal-input");
    await input.fill("Test error");
    await expect(input).toHaveValue("Test error");
    await expect(page.getByTestId("send-button")).toBeEnabled();
    await page.getByTestId("send-button").click();

    // Should show error toast or message
    await expect(page.getByText(ERROR_TEXT_REGEX).first()).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Suggested Actions", () => {
  test("selecting a suggestion prefills the composer without auto-sending", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByTestId("multimodal-input")).toHaveAttribute("data-hydrated", "true");

    const input = page.getByTestId("multimodal-input");
    const firstSuggestion = page.locator(
      "[data-testid='suggested-actions'] button"
    ).first();

    await expect(firstSuggestion).toBeVisible();
    await firstSuggestion.click();

    // Suggestions are editable drafts; the user explicitly decides when to send.
    await expect(input).toHaveValue(/\S/, { timeout: 5_000 });
    await expect(page).toHaveURL("/");
  });
});
