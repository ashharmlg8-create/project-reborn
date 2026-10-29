import {test,expect} from "@playwright/test";
test("Pistachio app starts in temporary demo",async({page})=>{
 await page.goto("/");
 await expect(page.locator("#page-title")).toHaveText("Today");
 await expect(page.locator("#mode")).toContainText("Demo");
});
test("Task can be added and completed in demo",async({page})=>{
 await page.goto("/");await page.getByRole("button",{name:/Tasks/}).first().click();
 await page.getByLabel("Title").fill("Revise anatomy chapter");
 await page.getByLabel("Estimated minutes").fill("45");
 await page.getByRole("button",{name:"Add task"}).click();
 await expect(page.locator("#view")).toContainText("Revise anatomy chapter");
 await page.locator("#view").getByRole("button",{name:"Done"}).click();
 await expect(page.locator("#view")).toContainText("Completed");
});
test("Money values use Indian rupees and precise paise",async({page})=>{
 await page.goto("/");await page.locator("#navigation").getByRole("button",{name:/Money/}).click();
 await page.getByLabel("Description").fill("Bus ticket");
 await page.getByLabel("Amount ₹").fill("12.50");
 await page.getByRole("button",{name:"Add expense"}).click();
 await expect(page.locator("#view")).toContainText("₹12.50");
});
test("World Model needs confirmation",async({page})=>{
 await page.goto("/");await page.locator("#navigation").getByRole("button",{name:/World Model/}).click();
 await page.getByLabel("Field").fill("Preferred language");
 await page.getByLabel("Your words").fill("Hinglish");
 await page.getByRole("button",{name:"Save confirmed detail"}).click();
 await expect(page.locator("#toast")).toContainText("Explicit confirmation required");
 await page.getByRole("checkbox").check();
 await page.getByRole("button",{name:"Save confirmed detail"}).click();
 await expect(page.locator("#view")).toContainText("Hinglish");
});
test("Encrypted vault can be created, locked and unlocked",async({page})=>{
 page.on("dialog",dialog=>dialog.accept());
 await page.goto("/");await page.locator("#navigation").getByRole("button",{name:/Privacy/}).click();
 await page.getByLabel("Password (12 or more characters)").fill("test-long-passphrase-123");
 await page.getByRole("button",{name:"Create vault"}).click();
 await expect(page.locator("#mode")).toContainText("Encrypted vault");
 await page.getByRole("button",{name:"Lock vault"}).click();
 await expect(page.locator("#mode")).toContainText("Demo");
 await page.getByLabel("Password (12 or more characters)").fill("test-long-passphrase-123");
 await page.getByRole("button",{name:"Unlock vault"}).click();
 await expect(page.locator("#mode")).toContainText("Encrypted vault");
});
test("Nudges are opt-in off by default",async({page})=>{
 await page.goto("/");await page.locator("#navigation").getByRole("button",{name:/Nudges/}).click();
 await expect(page.getByRole("checkbox")).not.toBeChecked();
});
test("Mobile app navigation remains accessible",async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto("/");
 await expect(page.locator("#mobile-nav")).toBeVisible();
 await page.locator("#mobile-nav").getByRole("button",{name:/Tasks/}).click();
 await expect(page.locator("#page-title")).toHaveText("Tasks");
});
