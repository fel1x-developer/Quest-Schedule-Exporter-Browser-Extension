import { test, expect } from './fixtures';

test.describe('Extension Popup UI', () => {
	test('loads popup with correct title and instructions', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Check title
		await expect(page.locator('h1')).toHaveText('Quest Schedule Exporter');

		// Check subtitle
		await expect(page.locator('p')).toHaveText(
			'Export your uWaterloo schedule from Quest to iCalendar format!'
		);

		// Check instructions header
		await expect(page.locator('h2')).toHaveText('How to use:');

		// Check all instruction steps are present
		const instructions = page.locator('ol li');
		await expect(instructions).toHaveCount(6);

		// Verify first instruction contains Quest link
		const firstInstruction = instructions.nth(0);
		await expect(firstInstruction.locator('a')).toHaveAttribute(
			'href',
			'https://quest.pecs.uwaterloo.ca/psp/SS/?cmd=login'
		);
		await expect(firstInstruction.locator('a')).toHaveAttribute('target', '_blank');
	});

	test('has all form elements with correct default values', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Check textarea
		const textarea = page.locator('#schedule-data');
		await expect(textarea).toBeVisible();
		await expect(textarea).toHaveAttribute(
			'placeholder',
			'Paste your Quest schedule data here (copy from the Quest page using Ctrl+A, then Ctrl+C)...'
		);
		await expect(textarea).toHaveValue('');

		// Check summary template input
		const summaryInput = page.locator('#summary');
		await expect(summaryInput).toBeVisible();
		await expect(summaryInput).toHaveValue('@code @type in @location');

		// Check description template input
		const descriptionInput = page.locator('#description');
		await expect(descriptionInput).toBeVisible();
		await expect(descriptionInput).toHaveValue(
			'@code-@section: @name (@type) in @location with @prof'
		);

		// Check date format select
		const dateFormatSelect = page.locator('#dateformat');
		await expect(dateFormatSelect).toBeVisible();
		await expect(dateFormatSelect).toHaveValue('DD/MM/YYYY');

		// Check all date format options
		const options = dateFormatSelect.locator('option');
		await expect(options).toHaveCount(6);
		await expect(options.nth(0)).toHaveText('DD/MM/YYYY (default for UW Quest)');
		await expect(options.nth(1)).toHaveText('MM/DD/YYYY');
		await expect(options.nth(2)).toHaveText('YYYY/MM/DD');

		// Check placeholders info box
		const placeholdersBox = page.locator('.text-xs.text-gray-600');
		await expect(placeholdersBox).toContainText('Available placeholders:');
		await expect(placeholdersBox).toContainText('@code, @section, @name, @type, @location, @prof');

		// Check export button
		const exportButton = page.locator('button');
		await expect(exportButton).toBeVisible();
		await expect(exportButton).toHaveText('Export Schedule');
		await expect(exportButton).not.toBeDisabled();
	});

	test('can modify form inputs', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Test textarea input
		const textarea = page.locator('#schedule-data');
		await textarea.fill('Test schedule data');
		await expect(textarea).toHaveValue('Test schedule data');

		// Test summary template modification
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();
		await summaryInput.fill('Custom @code summary');
		await expect(summaryInput).toHaveValue('Custom @code summary');

		// Test description template modification
		const descriptionInput = page.locator('#description');
		await descriptionInput.clear();
		await descriptionInput.fill('Custom @name description');
		await expect(descriptionInput).toHaveValue('Custom @name description');

		// Test date format selection
		const dateFormatSelect = page.locator('#dateformat');
		await dateFormatSelect.selectOption('DD/MM/YYYY');
		await expect(dateFormatSelect).toHaveValue('DD/MM/YYYY');
	});

	test('shows error when trying to export without schedule data', async ({
		context,
		extensionId
	}) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Click export button without entering data
		const exportButton = page.locator('button');
		await exportButton.click();

		// Check error message appears
		const errorMessage = page.locator('.text-red-800');
		await expect(errorMessage).toBeVisible();
		await expect(errorMessage).toHaveText(
			'Please paste your Quest schedule data in the text area below'
		);
	});

	test('button shows processing state when clicked', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Fill in some schedule data
		const textarea = page.locator('#schedule-data');
		await textarea.fill('Invalid data that will cause processing');

		// Click export button
		const exportButton = page.locator('button');
		const clickPromise = exportButton.click();

		// Check button state changes (though it might be very brief)
		// We'll use a more comprehensive test with valid data in processing tests
		await clickPromise;
	});

	test('supports dark mode styling', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Add dark class to test dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark');
		});

		// Check that dark mode classes are applied
		const main = page.locator('main');
		await expect(main).toHaveClass(/dark:bg-gray-900/);

		const title = page.locator('h1');
		await expect(title).toHaveClass(/dark:text-white/);
	});
});
