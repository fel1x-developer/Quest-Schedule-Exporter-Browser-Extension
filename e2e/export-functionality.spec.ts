import { test, expect } from './fixtures';
import fs from 'node:fs/promises';

const sampleQuestData = `CS 452 - Real-time Programming
1234 001 LEC MWF 10:30AM - 11:20AM MC 2066 William B Cowan 01/06/2025 - 04/04/2025

MATH 239 - Introduction to Combinatorics
5678 001 LEC TTh 01:00PM - 02:20PM MC 4045 David R Cheriton 01/06/2025 - 04/04/2025`;

test.describe('Export Functionality', () => {
	test('creates download with correct filename and content', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		// Set up download promise before clicking
		const downloadPromise = page.waitForEvent('download');

		const exportButton = page.locator('button');
		await exportButton.click();

		// Wait for download to complete
		const download = await downloadPromise;

		// Verify download properties
		expect(download.suggestedFilename()).toBe('quest_schedule.ics');

		// Save download to temporary location and read content
		const path = await download.path();
		expect(path).toBeTruthy();

		// Read the downloaded content
		const calendarData = await fs.readFile(path, 'utf8');

		// Verify iCalendar structure
		expect(calendarData).toContain('BEGIN:VCALENDAR');
		expect(calendarData).toContain('END:VCALENDAR');
		expect(calendarData).toContain('VERSION:2.0');
		expect(calendarData).toContain('PRODID:-//questscheduleexporter.stephenli.ca//EN');
	});

	test('generates valid iCalendar events', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Check for VEVENT blocks
		expect(calendarData).toContain('BEGIN:VEVENT');
		expect(calendarData).toContain('END:VEVENT');

		// Count events (should have 2 courses)
		const eventCount = (calendarData.match(/BEGIN:VEVENT/g) || []).length;
		expect(eventCount).toBe(2);

		// Check required event properties
		expect(calendarData).toContain('DTSTART;TZID=America/Toronto:');
		expect(calendarData).toContain('DTEND;TZID=America/Toronto:');
		expect(calendarData).toContain('SUMMARY:');
		expect(calendarData).toContain('LOCATION:');
		expect(calendarData).toContain('DESCRIPTION:');

		// Check course-specific content
		expect(calendarData).toContain('CS 452');
		expect(calendarData).toContain('MATH 239');
		expect(calendarData).toContain('MC 2066');
		expect(calendarData).toContain('MC 4045');
	});

	test('handles special characters in course data', async ({ context, extensionId }) => {
		const specialCharData = `CS 452 - Real-time Programming & Advanced Concepts
1234 001 LEC MWF 10:30AM - 11:20AM MC 2066 Dr. William B. Cowan, PhD 01/06/2025 - 04/04/2025

MATH 239 - Introduction to Combinatorics (Advanced)
5678 001 LEC TTh 01:00PM - 02:20PM MC 4045 Prof. David R. Cheriton 01/06/2025 - 04/04/2025`;

		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(specialCharData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Check that special characters are properly handled
		expect(calendarData).toContain('Real-time Programming & Advanced Concepts');
		expect(calendarData).toContain('Dr. William B. Cowan\\, PhD'); // Commas should be escaped
		expect(calendarData).toContain('Introduction to Combinatorics (Advanced)');
		expect(calendarData).toContain('Prof. David R. Cheriton');
	});

	test('export works with single day course', async ({ context, extensionId }) => {
		const singleDayData = `CS 452 - Real-time Programming
1234 001 LEC F 10:30AM - 11:20AM MC 2066 William B Cowan 01/06/2025 - 01/06/2025`;

		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(singleDayData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Single day course should not have RRULE (no recurrence)
		expect(calendarData).toContain('BEGIN:VEVENT');
		expect(calendarData).toContain('DTSTART;TZID=America/Toronto:');
		expect(calendarData).toContain('DTEND;TZID=America/Toronto:');
		expect(calendarData).not.toContain('RRULE:'); // No recurrence for single day
		expect(calendarData).toContain('SUMMARY:CS 452 LEC in MC 2066');
	});

	test('export handles course with multiple sections', async ({ context, extensionId }) => {
		const multiSectionData = `CS 452 - Real-time Programming
1234 001 LEC MWF 10:30AM - 11:20AM MC 2066 William B Cowan 01/06/2025 - 04/04/2025
1235 002 TUT T 02:30PM - 03:20PM MC 2065 John Doe 01/06/2025 - 04/04/2025

MATH 239 - Introduction to Combinatorics
5678 001 LEC TTh 01:00PM - 02:20PM MC 4045 David R Cheriton 01/06/2025 - 04/04/2025
5679 002 LAB W 03:30PM - 04:20PM MC 3003 Jane Smith 01/06/2025 - 04/04/2025`;

		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(multiSectionData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Should have 4 events total (2 courses x 2 sections each)
		const eventCount = (calendarData.match(/BEGIN:VEVENT/g) || []).length;
		expect(eventCount).toBe(4);

		// Check that different section types are included
		expect(calendarData).toContain('LEC'); // Lecture
		expect(calendarData).toContain('TUT'); // Tutorial
		expect(calendarData).toContain('LAB'); // Lab

		// Check different instructors are included
		expect(calendarData).toContain('William B Cowan');
		expect(calendarData).toContain('John Doe');
		expect(calendarData).toContain('David R Cheriton');
		expect(calendarData).toContain('Jane Smith');
	});

	test('preserves proper timezone information', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Check timezone information
		expect(calendarData).toContain('DTSTART;TZID=America/Toronto:');
		expect(calendarData).toContain('DTEND;TZID=America/Toronto:');

		// Verify time format (should be in format YYYYMMDDTHHMMSS)
		const timeRegex = /\d{8}T\d{6}/;
		expect(calendarData).toMatch(timeRegex);
	});

	test('export with empty location handles gracefully', async ({ context, extensionId }) => {
		const noLocationData = `CS 452 - Real-time Programming
1234 001 LEC MWF 10:30AM - 11:20AM  William B Cowan 01/06/2025 - 04/04/2025`;

		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(noLocationData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Should still create valid calendar even with missing location
		expect(calendarData).toContain('BEGIN:VCALENDAR');
		expect(calendarData).toContain('BEGIN:VEVENT');
		expect(calendarData).toContain('LOCATION:'); // Location field should exist even if empty
		expect(calendarData).toContain('END:VEVENT');
		expect(calendarData).toContain('END:VCALENDAR');
	});

	test('handles DOM manipulation correctly', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		// Track DOM changes during export
		const initialBodyChildren = await page.evaluate(() => document.body.children.length);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		await downloadPromise;

		// Verify DOM is cleaned up (no leftover download elements)
		const finalBodyChildren = await page.evaluate(() => document.body.children.length);
		expect(finalBodyChildren).toBe(initialBodyChildren);
	});
});
