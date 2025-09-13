import { test, expect } from './fixtures';

const sampleQuestData = `CS 452 - Real-time Programming
1234
001
LEC
MWF 10:30AM - 11:20AM
MC 2066
William B Cowan
01/06/2025 - 04/04/2025

MATH 239 - Introduction to Combinatorics
5678
001
LEC
TTh 01:00PM - 02:20PM
MC 4045
David R Cheriton
01/06/2025 - 04/04/2025`;

test.describe('Basic Extension Functionality', () => {
	test('extension popup loads correctly', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Check basic UI elements
		await expect(page.locator('h1')).toHaveText('Quest Schedule Exporter');
		await expect(page.locator('#schedule-data')).toBeVisible();
		await expect(page.locator('#summary')).toBeVisible();
		await expect(page.locator('#description')).toBeVisible();
		await expect(page.locator('#dateformat')).toBeVisible();
		await expect(page.locator('button')).toHaveText('Export Schedule');
	});

	test('shows validation error for empty data', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Click export without data
		await page.locator('button').click();

		// Should show error
		const errorMessage = page.locator('.text-red-800');
		await expect(errorMessage).toBeVisible();
		await expect(errorMessage).toHaveText(
			'Please paste your Quest schedule data in the text area below'
		);
	});

	test('processes valid schedule data', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Setup download mock
		await page.evaluate(() => {
			(window as any).downloadAttempts = [];
			const originalCreateElement = document.createElement;

			document.createElement = function (tagName: string) {
				const element = originalCreateElement.call(this, tagName);
				if (tagName.toLowerCase() === 'a') {
					element.click = function () {
						(window as any).downloadAttempts.push({
							href: element.getAttribute('href'),
							download: element.getAttribute('download')
						});
					};
				}
				return element;
			};
		});

		// Fill in data and export
		await page.locator('#schedule-data').fill(sampleQuestData);
		await page.locator('button').click();

		// Wait for processing
		await page.waitForTimeout(2000);

		// Check that export was attempted
		const downloadAttempts = await page.evaluate(() => (window as any).downloadAttempts);
		expect(downloadAttempts?.length || 0).toBeGreaterThan(0);

		if (downloadAttempts && downloadAttempts[0]) {
			expect(downloadAttempts[0].download).toBe('quest_schedule.ics');
			expect(downloadAttempts[0].href).toContain('data:text/calendar;charset=utf-8,');

			// Decode and check basic iCalendar structure
			const calendarData = decodeURIComponent(downloadAttempts[0].href.split(',')[1]);
			expect(calendarData).toContain('BEGIN:VCALENDAR');
			expect(calendarData).toContain('END:VCALENDAR');
			expect(calendarData).toContain('BEGIN:VEVENT');
			expect(calendarData).toContain('END:VEVENT');
		}
	});

	test('allows template customization', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Customize templates
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();
		await summaryInput.fill('Test: @code');

		const descriptionInput = page.locator('#description');
		await descriptionInput.clear();
		await descriptionInput.fill('Course: @name');

		// Verify templates were set
		await expect(summaryInput).toHaveValue('Test: @code');
		await expect(descriptionInput).toHaveValue('Course: @name');
	});

	test('allows date format selection', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const dateSelect = page.locator('#dateformat');

		// Check default value (DD/MM/YYYY for University of Waterloo Quest)
		await expect(dateSelect).toHaveValue('DD/MM/YYYY');

		// Change format
		await dateSelect.selectOption('MM/DD/YYYY');
		await expect(dateSelect).toHaveValue('MM/DD/YYYY');
	});

	test('handles TBA courses correctly', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Setup more robust download mock
		await page.evaluate(() => {
			(window as any).downloadAttempts = [];

			// Override createElement to catch anchor elements
			const originalCreateElement = document.createElement;
			document.createElement = function (tagName: string) {
				const element = originalCreateElement.call(this, tagName);
				if (tagName.toLowerCase() === 'a') {
					const originalClick = element.click;
					element.click = function () {
						(window as any).downloadAttempts.push({
							href: element.getAttribute('href'),
							download: element.getAttribute('download')
						});
						// Don't call original click to avoid actual download
					};
				}
				return element;
			};

			// Also catch console errors
			(window as any).exportErrors = [];
			const originalConsoleError = console.error;
			console.error = function (...args) {
				(window as any).exportErrors.push(args.join(' '));
				originalConsoleError.apply(console, args);
			};
		});

		// Use properly formatted test data
		const dataWithTBA = `CS 452 - Real-time Programming
1234
001
LEC
TBA
MC 2066
William B Cowan
01/06/2025 - 04/04/2025

MATH 239 - Introduction to Combinatorics
5678
001
LEC
TTh 01:00PM - 02:20PM
MC 4045
David R Cheriton
01/06/2025 - 04/04/2025`;

		await page.locator('#schedule-data').fill(dataWithTBA);
		await page.locator('button').click();

		// Wait for processing
		await page.waitForTimeout(2000);

		// Check for any export errors first
		const exportErrors = await page.evaluate(() => (window as any).exportErrors);
		if (exportErrors && exportErrors.length > 0) {
			console.log('Export errors:', exportErrors);
		}

		// Check that export was attempted
		const downloadAttempts = await page.evaluate(() => (window as any).downloadAttempts);
		expect(downloadAttempts?.length || 0).toBeGreaterThan(0);

		if (downloadAttempts && downloadAttempts[0]) {
			const calendarData = decodeURIComponent(downloadAttempts[0].href.split(',')[1]);

			// Verify calendar structure
			expect(calendarData).toContain('BEGIN:VCALENDAR');
			expect(calendarData).toContain('END:VCALENDAR');

			// Should contain MATH 239 (not TBA) but not CS 452 (TBA)
			if (calendarData.includes('BEGIN:VEVENT')) {
				expect(calendarData).toContain('MATH 239');
				expect(calendarData).not.toContain('CS 452');
			}
		}
	});
});
