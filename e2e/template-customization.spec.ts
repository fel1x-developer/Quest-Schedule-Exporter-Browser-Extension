import { test, expect } from './fixtures';
import fs from 'node:fs/promises';

const sampleQuestData = `CS 452 - Real-time Programming
1234 001 LEC MWF 10:30AM - 11:20AM MC 2066 William B Cowan 01/06/2025 - 04/04/2025

MATH 239 - Introduction to Combinatorics
5678 001 LEC TTh 01:00PM - 02:20PM MC 4045 David R Cheriton 01/06/2025 - 04/04/2025`;

test.describe('Template Customization', () => {
	test('uses default summary and description templates correctly', async ({
		context,
		extensionId
	}) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Check default summary template: "@code @type in @location"
		expect(calendarData).toContain('SUMMARY:CS 452 LEC in MC 2066');
		expect(calendarData).toContain('SUMMARY:MATH 239 LEC in MC 4045');

		// Check default description template: "@code-@section: @name (@type) in @location with @prof"
		expect(calendarData).toContain(
			'DESCRIPTION:CS 452-001: Real-time Programming (LEC) in MC 2066 with William B Cowan'
		);
		expect(calendarData).toContain(
			'DESCRIPTION:MATH 239-001: Introduction to Combinatorics (LEC) in MC 4045 with David R Cheriton'
		);
	});

	test('applies custom summary template with single placeholder', async ({
		context,
		extensionId
	}) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Set custom summary template
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();
		await summaryInput.fill('@code');

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		expect(calendarData).toContain('SUMMARY:CS 452');
		expect(calendarData).toContain('SUMMARY:MATH 239');
	});

	test('applies custom summary template with multiple placeholders', async ({
		context,
		extensionId
	}) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Set custom summary template
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();
		await summaryInput.fill('@name - @prof (@type)');

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		expect(calendarData).toContain('SUMMARY:Real-time Programming - William B Cowan (LEC)');
		expect(calendarData).toContain(
			'SUMMARY:Introduction to Combinatorics - David R Cheriton (LEC)'
		);
	});

	test('applies custom description template', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Set custom description template
		const descriptionInput = page.locator('#description');
		await descriptionInput.clear();
		await descriptionInput.fill('Course: @name | Instructor: @prof | Room: @location');

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		expect(calendarData).toContain(
			'DESCRIPTION:Course: Real-time Programming | Instructor: William B Cowan | Room: MC 2066'
		);
		expect(calendarData).toContain(
			'DESCRIPTION:Course: Introduction to Combinatorics | Instructor: David R Cheriton | Room: MC 4045'
		);
	});

	test('handles templates with no placeholders', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Set templates without placeholders
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();
		await summaryInput.fill('My Course');

		const descriptionInput = page.locator('#description');
		await descriptionInput.clear();
		await descriptionInput.fill('This is a university course');

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// All events should have the same static text
		expect(calendarData).toContain('SUMMARY:My Course');
		expect(calendarData).toContain('DESCRIPTION:This is a university course');

		// Should appear for both courses
		const summaryCount = (calendarData.match(/SUMMARY:My Course/g) || []).length;
		const descriptionCount = (calendarData.match(/DESCRIPTION:This is a university course/g) || [])
			.length;
		expect(summaryCount).toBe(2);
		expect(descriptionCount).toBe(2);
	});

	test('handles templates with repeated placeholders', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Template with same placeholder multiple times
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();
		await summaryInput.fill('@code - @code (@code)');

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		expect(calendarData).toContain('SUMMARY:CS 452 - CS 452 (CS 452)');
		expect(calendarData).toContain('SUMMARY:MATH 239 - MATH 239 (MATH 239)');
	});

	test('handles templates with all available placeholders', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Template using all placeholders
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();
		await summaryInput.fill('@code @section @name @type @location @prof');

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		expect(calendarData).toContain(
			'SUMMARY:CS 452 001 Real-time Programming LEC MC 2066 William B Cowan'
		);
		expect(calendarData).toContain(
			'SUMMARY:MATH 239 001 Introduction to Combinatorics LEC MC 4045 David R Cheriton'
		);
	});

	test('handles empty templates gracefully', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Set empty templates
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();

		const descriptionInput = page.locator('#description');
		await descriptionInput.clear();

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Should still create valid calendar with empty summary/description
		expect(calendarData).toContain('SUMMARY:');
		expect(calendarData).toContain('DESCRIPTION:');
		expect(calendarData).toContain('BEGIN:VEVENT');
		expect(calendarData).toContain('END:VEVENT');
	});

	test('handles templates with special characters', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Template with special characters
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();
		await summaryInput.fill('📚 @code: @name [Prof. @prof]');

		const descriptionInput = page.locator('#description');
		await descriptionInput.clear();
		await descriptionInput.fill('Location: @location | Section: @section | Type: @type');

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		expect(calendarData).toContain(
			'SUMMARY:📚 CS 452: Real-time Programming [Prof. William B Cowan]'
		);
		expect(calendarData).toContain('DESCRIPTION:Location: MC 2066 | Section: 001 | Type: LEC');
	});

	test('handles templates with commas (iCalendar escaping)', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Template with commas that should be escaped in iCalendar
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();
		await summaryInput.fill('@code, @name, with @prof');

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Commas should be escaped with backslashes in iCalendar format
		expect(calendarData).toContain(
			'SUMMARY:CS 452\\, Real-time Programming\\, with William B Cowan'
		);
		expect(calendarData).toContain(
			'SUMMARY:MATH 239\\, Introduction to Combinatorics\\, with David R Cheriton'
		);
	});

	test('handles invalid placeholders gracefully', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Template with invalid placeholders
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();
		await summaryInput.fill('@code @invalid @nonexistent @name');

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Valid placeholders should be replaced, invalid ones should remain as-is
		expect(calendarData).toContain('SUMMARY:CS 452 @invalid @nonexistent Real-time Programming');
		expect(calendarData).toContain(
			'SUMMARY:MATH 239 @invalid @nonexistent Introduction to Combinatorics'
		);
	});

	test('preserves template state across multiple exports', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Set custom templates
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();
		await summaryInput.fill('Custom: @code');

		const descriptionInput = page.locator('#description');
		await descriptionInput.clear();
		await descriptionInput.fill('Course: @name');

		// First export
		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const firstDownloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		await firstDownloadPromise;

		// Verify templates are still the same
		await expect(summaryInput).toHaveValue('Custom: @code');
		await expect(descriptionInput).toHaveValue('Course: @name');

		// Second export with different data
		const secondData = `ECE 356 - Database Systems
9012 001 LEC MW 02:30PM - 03:50PM EIT 1015 Peter Van Beek 01/06/2025 - 04/04/2025`;

		await textarea.clear();
		await textarea.fill(secondData);

		const secondDownloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const secondDownload = await secondDownloadPromise;

		// Templates should still be preserved
		await expect(summaryInput).toHaveValue('Custom: @code');
		await expect(descriptionInput).toHaveValue('Course: @name');

		// Verify second export used the custom templates
		const path = await secondDownload.path();
		const secondCalendarData = await fs.readFile(path, 'utf8');
		expect(secondCalendarData).toContain('SUMMARY:Custom: ECE 356');
		expect(secondCalendarData).toContain('DESCRIPTION:Course: Database Systems');
	});

	test('template customization works with complex course data', async ({
		context,
		extensionId
	}) => {
		const complexData = `MUSIC 140 - Popular Music & Culture in North America
1111 001 LEC MW 10:30AM - 11:50AM MC 2066 Dr. Music Professor, PhD 01/06/2025 - 04/04/2025
1111 002 TUT F 02:30PM - 03:20PM MC 2065 Teaching Assistant 01/06/2025 - 04/04/2025`;

		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Custom template that uses all placeholders
		const summaryInput = page.locator('#summary');
		await summaryInput.clear();
		await summaryInput.fill('[@type] @code-@section: @name');

		const descriptionInput = page.locator('#description');
		await descriptionInput.clear();
		await descriptionInput.fill('Instructor: @prof | Location: @location | Course: @name');

		const textarea = page.locator('#schedule-data');
		await textarea.fill(complexData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Verify both sections are processed with custom templates
		expect(calendarData).toContain(
			'SUMMARY:[LEC] MUSIC 140-001: Popular Music & Culture in North America'
		);
		expect(calendarData).toContain(
			'SUMMARY:[TUT] MUSIC 140-002: Popular Music & Culture in North America'
		);

		expect(calendarData).toContain(
			'DESCRIPTION:Instructor: Dr. Music Professor\\, PhD | Location: MC 2066 | Course: Popular Music & Culture in North America'
		);
		expect(calendarData).toContain(
			'DESCRIPTION:Instructor: Teaching Assistant | Location: MC 2065 | Course: Popular Music & Culture in North America'
		);
	});
});
