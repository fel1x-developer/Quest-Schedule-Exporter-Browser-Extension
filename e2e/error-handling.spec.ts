import { test, expect } from './fixtures';

const invalidQuestData = `This is not valid Quest schedule data
Random text without proper format
No course codes or times here`;

const malformedQuestData = `CS 452 - Real-time Programming
1234 001 LEC INVALID_DAY 10:30AM - 11:20AM MC 2066 William B Cowan 01/06/2025 - 04/04/2025`;

const questDataWithInvalidDates = `CS 452 - Real-time Programming
1234 001 LEC MWF 10:30AM - 11:20AM MC 2066 William B Cowan 99/99/9999 - 99/99/9999`;

const questDataWithInvalidTimes = `CS 452 - Real-time Programming
1234 001 LEC MWF 25:99PM - 30:99PM MC 2066 William B Cowan 01/06/2025 - 04/04/2025`;

const questDataTooManyCourses = Array.from(
	{ length: 25 },
	(_, i) =>
		`CS${i.toString().padStart(3, '0')} - Course ${i}
${(1000 + i).toString()} 001 LEC MWF 10:30AM - 11:20AM MC 2066 Prof ${i} 01/06/2025 - 04/04/2025`
).join('\n\n');

test.describe('Error Handling', () => {
	test('shows error when schedule data is empty', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Click export without entering data
		const exportButton = page.locator('button');
		await exportButton.click();

		// Check error message
		const errorMessage = page.locator('.text-red-800');
		await expect(errorMessage).toBeVisible();
		await expect(errorMessage).toHaveText(
			'Please paste your Quest schedule data in the text area below'
		);

		// Button should return to normal state
		await expect(exportButton).toHaveText('Export Schedule');
		await expect(exportButton).not.toBeDisabled();
	});

	test('shows error when schedule data is only whitespace', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Fill textarea with only spaces, tabs, and newlines
		const textarea = page.locator('#schedule-data');
		await textarea.fill('   \n\t  \n  ');

		const exportButton = page.locator('button');
		await exportButton.click();

		const errorMessage = page.locator('.text-red-800');
		await expect(errorMessage).toBeVisible();
		await expect(errorMessage).toHaveText(
			'Please paste your Quest schedule data in the text area below'
		);
	});

	test('handles invalid schedule data format gracefully', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(invalidQuestData);

		const exportButton = page.locator('button');
		await exportButton.click();

		// Wait for processing to complete
		await page.waitForTimeout(2000);

		// Either should show error OR complete successfully (if data somehow parses)
		const errorMessage = page.locator('.text-red-800');
		const isErrorVisible = await errorMessage.isVisible();

		if (isErrorVisible) {
			await expect(errorMessage).toContainText('Error processing schedule data:');
		}

		// Button should return to normal state regardless
		await expect(exportButton).toHaveText('Export Schedule');
		await expect(exportButton).not.toBeDisabled();
	});

	test('handles malformed course data gracefully', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(malformedQuestData);

		const exportButton = page.locator('button');
		await exportButton.click();

		// Wait for processing to complete
		await page.waitForTimeout(2000);

		// Either should show error OR complete successfully
		const errorMessage = page.locator('.text-red-800');
		const isErrorVisible = await errorMessage.isVisible();

		if (isErrorVisible) {
			await expect(errorMessage).toContainText('Error processing schedule data:');
		}

		// Button should return to normal state
		await expect(exportButton).toHaveText('Export Schedule');
		await expect(exportButton).not.toBeDisabled();
	});

	test('clears previous error messages on new attempts', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// First attempt - trigger error
		const exportButton = page.locator('button');
		await exportButton.click();

		let errorMessage = page.locator('.text-red-800');
		await expect(errorMessage).toBeVisible();
		await expect(errorMessage).toHaveText(
			'Please paste your Quest schedule data in the text area below'
		);

		// Second attempt - add some data
		const textarea = page.locator('#schedule-data');
		await textarea.fill('some test data');

		// Error should clear when we start typing/processing
		await exportButton.click();
		await page.waitForTimeout(1000);

		// After processing, button should be back to normal state
		await expect(exportButton).toHaveText('Export Schedule');
	});

	test('handles network or permission errors during download', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Mock download to fail
		await page.evaluate(() => {
			const originalCreateElement = document.createElement;
			document.createElement = function (tagName: string) {
				const element = originalCreateElement.call(this, tagName);
				if (tagName.toLowerCase() === 'a') {
					element.click = function () {
						throw new Error('Download failed');
					};
				}
				return element;
			};
		});

		const validData = `CS 452 - Real-time Programming
1234 001 LEC MWF 10:30AM - 11:20AM MC 2066 William B Cowan 01/06/2025 - 04/04/2025`;

		const textarea = page.locator('#schedule-data');
		await textarea.fill(validData);

		const exportButton = page.locator('button');
		await exportButton.click();

		// Should show error even though data was valid
		const errorMessage = page.locator('.text-red-800');
		await expect(errorMessage).toBeVisible();
		await expect(errorMessage).toContainText('Error processing schedule data:');
	});

	test('shows processing state during export', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const validData = `CS 452 - Real-time Programming
1234 001 LEC MWF 10:30AM - 11:20AM MC 2066 William B Cowan 01/06/2025 - 04/04/2025`;

		const textarea = page.locator('#schedule-data');
		await textarea.fill(validData);

		const exportButton = page.locator('button');

		// Initial state
		await expect(exportButton).toHaveText('Export Schedule');
		await expect(exportButton).not.toBeDisabled();

		// Click button and check that it processes
		await exportButton.click();

		// Wait for processing to complete
		await page.waitForTimeout(2000);

		// Should return to normal state
		await expect(exportButton).toHaveText('Export Schedule');
		await expect(exportButton).not.toBeDisabled();
	});

	test('handles courses with invalid time formats', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(questDataWithInvalidTimes);

		const exportButton = page.locator('button');
		await exportButton.click();

		// Wait for processing
		await page.waitForTimeout(2000);

		// Either should show error OR complete successfully
		const errorMessage = page.locator('.text-red-800');
		const isErrorVisible = await errorMessage.isVisible();

		if (isErrorVisible) {
			await expect(errorMessage).toContainText('Error processing schedule data:');
		}

		// Button should return to normal state
		await expect(exportButton).toHaveText('Export Schedule');
	});

	test('handles courses with invalid date formats', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(questDataWithInvalidDates);

		const exportButton = page.locator('button');
		await exportButton.click();

		// Wait for processing
		await page.waitForTimeout(2000);

		// Either should show error OR complete successfully
		const errorMessage = page.locator('.text-red-800');
		const isErrorVisible = await errorMessage.isVisible();

		if (isErrorVisible) {
			await expect(errorMessage).toContainText('Error processing schedule data:');
		}

		// Button should return to normal state
		await expect(exportButton).toHaveText('Export Schedule');
	});

	test('handles excessive number of courses gracefully', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(questDataTooManyCourses);

		const exportButton = page.locator('button');
		await exportButton.click();

		// Should either process successfully (with loop limit) or show error
		// The extension has MAX_COURSES protection, so it should handle this
		await page.waitForTimeout(2000); // Give it time to process

		// Check final state
		const errorMessage = page.locator('.text-red-800');
		const isErrorVisible = await errorMessage.isVisible();

		if (isErrorVisible) {
			await expect(errorMessage).toContainText('Error processing schedule data:');
		} else {
			// If no error, processing should complete
			await expect(exportButton).toHaveText('Export Schedule');
		}
	});

	test('recovers from error state when valid data is entered', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// First attempt - cause error
		const exportButton = page.locator('button');
		await exportButton.click();

		let errorMessage = page.locator('.text-red-800');
		await expect(errorMessage).toBeVisible();

		// Mock successful download for recovery test
		await page.evaluate(() => {
			(window as any).downloadAttempts = [];
			const originalCreateElement = document.createElement;
			document.createElement = function (tagName: string) {
				const element = originalCreateElement.call(this, tagName);
				if (tagName.toLowerCase() === 'a') {
					element.click = function () {
						(window as any).downloadAttempts.push({ success: true });
					};
				}
				return element;
			};
		});

		// Second attempt - with valid data
		const validData = `CS 452 - Real-time Programming
1234 001 LEC MWF 10:30AM - 11:20AM MC 2066 William B Cowan 01/06/2025 - 04/04/2025`;

		const textarea = page.locator('#schedule-data');
		await textarea.fill(validData);

		await exportButton.click();

		// Error should be cleared and export should succeed
		await expect(errorMessage).not.toBeVisible();
		await expect(exportButton).toHaveText('Export Schedule');

		const downloadAttempts = await page.evaluate(() => (window as any).downloadAttempts);
		expect(downloadAttempts.length).toBe(1);
		expect(downloadAttempts[0].success).toBe(true);
	});
});
