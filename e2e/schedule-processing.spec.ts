import { test, expect } from './fixtures';
import fs from 'node:fs/promises';

// Sample Quest schedule data for testing
const sampleQuestData = `CS 452 - Real-time Programming
1234 001 LEC MWF 10:30AM - 11:20AM MC 2066 William B Cowan 01/06/2025 - 04/04/2025

MATH 239 - Introduction to Combinatorics
5678 001 LEC TTh 01:00PM - 02:20PM MC 4045 David R Cheriton 01/06/2025 - 04/04/2025

ECE 356 - Database Systems
9012 001 LEC MW 02:30PM - 03:50PM EIT 1015 Peter Van Beek 01/06/2025 - 04/04/2025`;

const sampleQuestDataWith24HrTime = `CS 452 - Real-time Programming
1234 001 LEC MWF 10:30 - 11:20 MC 2066 William B Cowan 01/06/2025 - 04/04/2025

MATH 239 - Introduction to Combinatorics
5678 001 LEC TTh 13:00 - 14:20 MC 4045 David R Cheriton 01/06/2025 - 04/04/2025`;

const questDataWithTBA = `CS 452 - Real-time Programming
1234 001 LEC TBA MC 2066 William B Cowan 01/06/2025 - 04/04/2025

MATH 239 - Introduction to Combinatorics
5678 001 LEC TTh 01:00PM - 02:20PM MC 4045 David R Cheriton 01/06/2025 - 04/04/2025`;

test.describe('Schedule Data Processing', () => {
	test('processes valid Quest schedule data successfully', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		const exportButton = page.locator('button');
		await exportButton.click();

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toBe('quest_schedule.ics');

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Verify all courses are processed
		expect(calendarData).toContain('CS 452');
		expect(calendarData).toContain('MATH 239');
		expect(calendarData).toContain('ECE 356');

		// Verify events were created
		const eventCount = (calendarData.match(/BEGIN:VEVENT/g) || []).length;
		expect(eventCount).toBe(3);
	});

	test('handles 24-hour time format correctly', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestDataWith24HrTime);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Verify calendar contains both courses
		expect(calendarData).toContain('BEGIN:VCALENDAR');
		expect(calendarData).toContain('CS 452');
		expect(calendarData).toContain('MATH 239');

		// Should have proper time entries
		expect(calendarData).toContain('DTSTART;TZID=America/Toronto:');
		expect(calendarData).toContain('DTEND;TZID=America/Toronto:');
	});

	test('skips TBA courses correctly', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(questDataWithTBA);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Should contain MATH 239 but not CS 452 (TBA)
		expect(calendarData).toContain('MATH 239');

		// CS 452 might still appear in course name but shouldn't have an event
		const eventCount = (calendarData.match(/BEGIN:VEVENT/g) || []).length;
		expect(eventCount).toBe(1); // Only MATH 239 should have an event
	});

	test('handles different date formats correctly', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		// Change date format to DD/MM/YYYY
		const dateFormatSelect = page.locator('#dateformat');
		await dateFormatSelect.selectOption('DD/MM/YYYY');

		// Use sample data with DD/MM/YYYY format
		const ddmmData = sampleQuestData
			.replace(/01\/06\/2025/g, '06/01/2025')
			.replace(/04\/04\/2025/g, '04/04/2025');
		const textarea = page.locator('#schedule-data');
		await textarea.fill(ddmmData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		// Verify download was successful
		expect(download.suggestedFilename()).toBe('quest_schedule.ics');

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Verify processing worked with different date format
		expect(calendarData).toContain('BEGIN:VCALENDAR');
		expect(calendarData).toContain('BEGIN:VEVENT');
	});

	test('processes courses with different day combinations', async ({ context, extensionId }) => {
		const complexScheduleData = `CS 452 - Real-time Programming
1234 001 LEC MWF 10:30AM - 11:20AM MC 2066 William B Cowan 01/06/2025 - 04/04/2025

MATH 239 - Introduction to Combinatorics
5678 001 LEC TTh 01:00PM - 02:20PM MC 4045 David R Cheriton 01/06/2025 - 04/04/2025

ECE 356 - Database Systems
9012 001 LEC MW 02:30PM - 03:50PM EIT 1015 Peter Van Beek 01/06/2025 - 04/04/2025

STAT 230 - Probability
3456 001 LEC M 11:30AM - 12:20PM MC 4040 Jane Smith 01/06/2025 - 04/04/2025`;

		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(complexScheduleData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Check that all courses are included
		expect(calendarData).toContain('CS 452');
		expect(calendarData).toContain('MATH 239');
		expect(calendarData).toContain('ECE 356');
		expect(calendarData).toContain('STAT 230');

		// Check BYDAY rules for different day combinations
		expect(calendarData).toContain('BYDAY=MO,WE,FR'); // MWF
		expect(calendarData).toContain('BYDAY=TU,TH'); // TTh
		expect(calendarData).toContain('BYDAY=MO,WE'); // MW
		expect(calendarData).toContain('BYDAY=MO'); // M
	});

	test('generates proper iCalendar format', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(sampleQuestData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Check iCalendar structure
		expect(calendarData).toContain('BEGIN:VCALENDAR');
		expect(calendarData).toContain('END:VCALENDAR');
		expect(calendarData).toContain('VERSION:2.0');
		expect(calendarData).toContain('PRODID:-//questscheduleexporter.stephenli.ca//EN');

		// Check VEVENT structure
		expect(calendarData).toContain('BEGIN:VEVENT');
		expect(calendarData).toContain('END:VEVENT');

		// Check required event properties
		expect(calendarData).toContain('DTSTART;TZID=America/Toronto:');
		expect(calendarData).toContain('DTEND;TZID=America/Toronto:');
		expect(calendarData).toContain('SUMMARY:');
		expect(calendarData).toContain('LOCATION:');
		expect(calendarData).toContain('DESCRIPTION:');

		// Check recurrence rules
		expect(calendarData).toContain('RRULE:FREQ=WEEKLY');
		expect(calendarData).toContain('UNTIL=');
		expect(calendarData).toContain('WKST=SU');
	});

	test('processes courses with Thursday correctly', async ({ context, extensionId }) => {
		// Test specifically for Thursday handling (Th -> H conversion)
		const thursdayData = `MATH 239 - Introduction to Combinatorics
5678 001 LEC TTh 01:00PM - 02:20PM MC 4045 David R Cheriton 01/06/2025 - 04/04/2025

PHYS 121 - Mechanics
7890 001 LEC ThF 09:00AM - 10:20AM PHY 145 John Teacher 01/06/2025 - 04/04/2025`;

		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(thursdayData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Check Thursday is properly handled
		expect(calendarData).toContain('BYDAY=TU,TH'); // TTh should become TU,TH
		expect(calendarData).toContain('BYDAY=TH,FR'); // ThF should become TH,FR

		// Verify both courses are processed
		expect(calendarData).toContain('MATH 239');
		expect(calendarData).toContain('PHYS 121');
	});

	test('handles courses with long names and special characters', async ({
		context,
		extensionId
	}) => {
		const specialData = `CS 486 - Introduction to Artificial Intelligence & Machine Learning
1111 001 LEC MW 10:30AM - 11:50AM MC 2066 Dr. AI Professor, PhD 01/06/2025 - 04/04/2025

ENGL 109 - Introduction to Academic Writing: Critical Reading & Composition
2222 001 LEC TTh 02:30PM - 03:50PM HH 180 Jane Writer-Smith 01/06/2025 - 04/04/2025`;

		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		const textarea = page.locator('#schedule-data');
		await textarea.fill(specialData);

		const downloadPromise = page.waitForEvent('download');
		await page.locator('button').click();
		const download = await downloadPromise;

		const path = await download.path();
		const calendarData = await fs.readFile(path, 'utf8');

		// Check courses with special characters are handled
		expect(calendarData).toContain('CS 486');
		expect(calendarData).toContain('ENGL 109');

		// Check special characters in names and descriptions
		expect(calendarData).toContain('Artificial Intelligence & Machine Learning');
		expect(calendarData).toContain('Dr. AI Professor\\, PhD'); // Comma should be escaped
		expect(calendarData).toContain('Jane Writer-Smith');
	});
});
