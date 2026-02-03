import { expect, test } from "@playwright/test";

const recipient = process.env.E2E_RECIPIENT ?? "xmtp-docs.eth";
const shouldSendMessage = process.env.E2E_SEND_MESSAGE === "1";

async function openRecipient(page: import("@playwright/test").Page) {
  await page.goto(`/${encodeURIComponent(recipient)}`);
  await expect(
    page.getByRole("heading", { name: new RegExp(`^Chat with\\s+`, "i") }),
  ).toBeVisible();
}

test("resolves recipient and enables composer", async ({ page }) => {
  await openRecipient(page);

  const recipientPanel = page
    .getByRole("heading", { name: "Recipient" })
    .locator("..");
  await expect(recipientPanel.getByText(/can message/i)).toBeVisible({
    timeout: 90_000,
  });

  const addressCode = recipientPanel
    .locator("code")
    .filter({ hasText: /^0x/i })
    .first();
  await expect(addressCode).toHaveText(/^0x[a-fA-F0-9]{40}$/);

  const composer = page.getByPlaceholder("Type a message…");
  await expect(composer).toBeEnabled({ timeout: 90_000 });
});

test("sends a real XMTP message (opt-in)", async ({ page }) => {
  test.skip(
    !shouldSendMessage,
    "Set E2E_SEND_MESSAGE=1 to send a real XMTP message.",
  );

  await openRecipient(page);

  const recipientPanel = page
    .getByRole("heading", { name: "Recipient" })
    .locator("..");
  await expect(recipientPanel.getByText(/can message/i)).toBeVisible({
    timeout: 90_000,
  });

  const composer = page.getByPlaceholder("Type a message…");
  await expect(composer).toBeEnabled({ timeout: 90_000 });

  const text = `Playwright test ${new Date().toISOString()}`;
  await composer.fill(text);
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.locator(".bubble.me", { hasText: text })).toBeVisible({
    timeout: 120_000,
  });
});
