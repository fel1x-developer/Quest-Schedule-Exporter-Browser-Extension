import { Course } from './Course';

interface Config {
	MAX_COURSES: number;
	MAX_SECTIONS: number;
	filename: string;
	placeholders: Array<{
		placeholder: string;
		description: string;
		example: string;
	}>;
	summary: string;
	description: string;
}

const defaultConfig: Config = {
	MAX_COURSES: 20,
	MAX_SECTIONS: 5,
	filename: 'quest_schedule.ics',
	placeholders: [
		{
			placeholder: '@code',
			description: 'Course code',
			example: 'CS 452'
		},
		{
			placeholder: '@section',
			description: 'Course section number',
			example: '001'
		},
		{
			placeholder: '@name',
			description: 'Name of the course',
			example: 'Real-time Programming'
		},
		{
			placeholder: '@type',
			description: 'Type of course',
			example: 'LEC'
		},
		{
			placeholder: '@location',
			description: 'Room for the course',
			example: 'DWE 3522A'
		},
		{
			placeholder: '@prof',
			description: 'Instructor for the course',
			example: 'William B Cowan'
		}
	],
	summary: '@code @type in @location',
	description: '@code-@section: @name (@type) in @location with @prof'
};

export class CalendarExporter {
	_dateFormatType: string;
	_questData: string;
	_summary: string;
	_description: string;
	_courses: Array<Course>;
	_config: Config;

	constructor(
		dateFormatType: string,
		questData: string,
		summary: string = defaultConfig.summary,
		description: string = defaultConfig.description,
		config: Partial<Config> = {}
	) {
		this._dateFormatType = dateFormatType;
		this._questData = questData;
		this._summary = summary;
		this._description = description;
		this._courses = [];
		this._config = { ...defaultConfig, ...config };
	}

	run(): void {
		this.parseData();
		const ical = this.generateCal();
		this.downloadFile(ical);
	}

	private parseData(): void {
		const courses = parseQuestData(this._questData);

		console.log(`Found ${courses.length} course instances total`);

		// Create a course for each parsed instance
		for (const courseData of courses) {
			const course = new Course(
				courseData.code,
				courseData.name,
				courseData.section,
				courseData.component,
				courseData.location,
				courseData.instructor,
				this._dateFormatType,
				courseData.days,
				courseData.startTime,
				courseData.endTime,
				courseData.startDate,
				courseData.endDate,
				this._config
			);
			this._courses.push(course);
		}

		if (courses.length === 0) {
			throw new Error('Failed Search');
		}
	}

	private generateCal(): string {
		let calendarContent = '';

		const addLine = function (line: string) {
			calendarContent += line + '\n';
		};

		addLine('BEGIN:VCALENDAR');
		addLine('VERSION:2.0');
		addLine('PRODID:-//questscheduleexporter.stephenli.ca//EN');

		for (const course of this._courses) {
			const printer = course.printer(this._summary, this._description);

			let next: IteratorResult<string>;
			while (!(next = printer.next()).done) {
				addLine(next.value);
			}
		}

		addLine('END:VCALENDAR');

		return calendarContent;
	}

	private downloadFile(content: string): void {
		const element = document.createElement('a');
		element.setAttribute('href', 'data:text/calendar;charset=utf-8,' + encodeURIComponent(content));
		element.setAttribute('download', this._config.filename);
		element.style.display = 'none';

		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	}
}

function createCourseRegex(): RegExp {
	const regex = '([A-Z]{2,7} \\d{2,4}) - ([^\\n]+)\\n([\\s\\S]*?)(?=\\n[A-Z]{2,7} \\d{2,4} -|$)';
	return new RegExp(regex, 'g');
}

function createSectionRegex(questData: string): RegExp {
	const classNumberPattern = '\\d{4,5}'; // Quest uses 4-5 digit class numbers

	const timePattern = (function () {
		const timePattern12h = '[0-1]?\\d\\:[0-5]\\d[AP]M';
		const timePattern24h = '[0-2]\\d\\:[0-5]\\d';
		const is24h = /([0-5]\d[A|P]M)/.exec(questData) === null;
		return is24h ? timePattern24h : timePattern12h;
	})();

	// Quest format: ClassNbr Section Component DaysTime Room Instructor StartDate - EndDate
	// Handle both regular time patterns and TBA
	const dayTimePattern =
		'(?:([MTWThF]+)\\s+(' + timePattern + ')\\s+-\\s+(' + timePattern + ')|TBA)';

	const regex =
		'(' +
		classNumberPattern +
		')\\s+' + // Class Number (group 1)
		'(\\d{3}|[A-Z]{3})\\s+' + // Section (group 2) - can be numbers or letters
		'(\\w{3})\\s+' + // Component (group 3)
		dayTimePattern +
		'\\s+' + // Days & Times (groups 4,5,6 or null if TBA)
		'([A-Z0-9\\s]*?)\\s+' + // Room (group 7) - allow empty with *
		'([A-Za-z][^\\d]*?)\\s+' + // Instructor (group 8) - everything until date
		'(\\d{2}\\/\\d{2}\\/\\d{4})\\s+-\\s+' + // Start Date (group 9)
		'(\\d{2}\\/\\d{2}\\/\\d{4})'; // End Date (group 10)

	console.log('Quest section regex:', regex);

	return new RegExp(regex, 'gm');
}

// New function to parse all date ranges for a given section pattern
function parseAllSectionInstances(sectionData: string, questData: string): Array<any> {
	const instances = [];

	// First, find all complete section entries (with class number)
	const fullSectionRegex = createSectionRegex(questData);
	fullSectionRegex.lastIndex = 0;

	let match;
	while ((match = fullSectionRegex.exec(sectionData)) !== null) {
		if (!match[4] || match[4] === 'TBA') {
			continue;
		}

		const baseSection = {
			classNumber: match[1],
			section: match[2],
			component: match[3],
			days: match[4],
			startTime: match[5],
			endTime: match[6],
			location: match[7] ? match[7].trim() : '',
			instructor: match[8] ? match[8].trim() : '',
			startDate: match[9],
			endDate: match[10]
		};

		instances.push(baseSection);

		// Now look for continuation lines (same days/time but different dates)
		// Pattern: whitespace + same day pattern + same time + location + instructor + different date
		const timePattern = (function () {
			const timePattern12h = '[0-1]?\\d\\:[0-5]\\d[AP]M';
			const timePattern24h = '[0-2]\\d\\:[0-5]\\d';
			const is24h = /([0-5]\d[A|P]M)/.exec(questData) === null;
			return is24h ? timePattern24h : timePattern12h;
		})();

		const continuationPattern = new RegExp(
			'\\n\\s*' +
				'(' +
				match[4] +
				')\\s+' + // Same days
				'(' +
				timePattern +
				')\\s+-\\s+(' +
				timePattern +
				')\\s+' + // Same times
				'([^\\n]*?)\\s+' + // Location (might be different)
				'([A-Za-z][^\\d]*?)\\s+' + // Instructor
				'(\\d{2}\\/\\d{2}\\/\\d{4})\\s+-\\s+' + // Different start date
				'(\\d{2}\\/\\d{2}\\/\\d{4})', // Different end date
			'g'
		);

		let contMatch;
		while ((contMatch = continuationPattern.exec(sectionData)) !== null) {
			instances.push({
				classNumber: baseSection.classNumber,
				section: baseSection.section,
				component: baseSection.component,
				days: contMatch[1],
				startTime: contMatch[2],
				endTime: contMatch[3],
				location: contMatch[4] ? contMatch[4].trim() : baseSection.location,
				instructor: contMatch[5] ? contMatch[5].trim() : baseSection.instructor,
				startDate: contMatch[6],
				endDate: contMatch[7]
			});
		}
	}

	return instances;
}

// New function to parse Quest's columnar format
function parseQuestData(questData: string): Array<any> {
	const courses = [];
	const processedEntries = new Set<string>();

	// Split data by course headers (e.g., "MATH 117 - Calculus 1 (Eng)")
	const courseHeaderRegex = /([A-Z]{2,7} \d{2,4}) - ([^\n]+)/g;
	let courseMatch;

	while ((courseMatch = courseHeaderRegex.exec(questData)) !== null) {
		const courseCode = courseMatch[1];
		const courseName = courseMatch[2];
		const startIndex = courseMatch.index;

		// Find the end of this course section (either next course or end of data)
		courseHeaderRegex.lastIndex = startIndex + courseMatch[0].length;
		const nextCourseMatch = courseHeaderRegex.exec(questData);
		const endIndex = nextCourseMatch ? nextCourseMatch.index : questData.length;
		courseHeaderRegex.lastIndex = startIndex + courseMatch[0].length; // Reset for next iteration

		const courseSection = questData.substring(startIndex, endIndex);

		// Parse this course section for schedule data
		const courseInstances = parseCourseSectionData(courseCode, courseName, courseSection);

		// Add unique entries only
		for (const instance of courseInstances) {
			// Only prevent true duplicates (identical in ALL aspects including instructor)
			// This allows same class code & component with different times/dates/locations
			const entryId = `${instance.code}-${instance.section}-${instance.component}-${instance.days}-${instance.startTime}-${instance.endTime}-${instance.location}-${instance.instructor}-${instance.startDate}-${instance.endDate}`;

			if (!processedEntries.has(entryId)) {
				processedEntries.add(entryId);
				courses.push(instance);
			}
		}
	}

	return courses;
}

function parseCourseSectionData(
	courseCode: string,
	courseName: string,
	sectionData: string
): Array<any> {
	const instances = [];

	// Look for class number entries - these start new sections
	const lines = sectionData
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	let i = 0;
	while (i < lines.length) {
		// Look for class number (4-5 digits)
		if (!/^\d{4,5}$/.test(lines[i])) {
			i++;
			continue;
		}

		const classNumber = lines[i];
		if (i + 6 >= lines.length) break; // Need at least 6 more lines

		const section = lines[i + 1];
		const component = lines[i + 2];

		// Skip if component is not 3 letters
		if (!/^[A-Z]{3}$/.test(component)) {
			i++;
			continue;
		}

		i += 3; // Move past class number, section, component

		// Now parse schedule entries until we hit the next class number or end
		while (i < lines.length) {
			// Check if this is a new class number (start of next section)
			if (/^\d{4,5}$/.test(lines[i]) && i + 6 < lines.length && /^[A-Z]{3}$/.test(lines[i + 2])) {
				break;
			}

			// Look for schedule pattern: Days & Times, Room, Instructor, Start/End Date
			if (i + 3 >= lines.length) break;

			const daysAndTimes = lines[i];
			const room = lines[i + 1];

			// Handle multi-line instructor names (look ahead for date pattern)
			let instructor = lines[i + 2];
			let dateRange = lines[i + 3];
			let extraLines = 0;

			// If the next line doesn't match date pattern, it might be part of instructor name
			if (!dateRange.match(/^\d{2}\/\d{2}\/\d{4}\s+-\s+\d{2}\/\d{2}\/\d{4}$/)) {
				// Check if next line is also part of instructor name
				if (
					i + 4 < lines.length &&
					lines[i + 4].match(/^\d{2}\/\d{2}\/\d{4}\s+-\s+\d{2}\/\d{2}\/\d{4}$/)
				) {
					instructor = instructor + ', ' + lines[i + 3];
					dateRange = lines[i + 4];
					extraLines = 1;
				}
			}

			// Skip TBA entries
			if (daysAndTimes === 'TBA' || !daysAndTimes.includes(':')) {
				i += 4 + extraLines;
				continue;
			}

			// Parse days and times
			const timeMatch = daysAndTimes.match(
				/^([MTWThF]+)\s+(\d{1,2}:\d{2}[AP]M)\s+-\s+(\d{1,2}:\d{2}[AP]M)$/
			);
			if (!timeMatch) {
				i += 4 + extraLines;
				continue;
			}

			const days = timeMatch[1];
			const startTime = timeMatch[2];
			const endTime = timeMatch[3];

			// Parse date range
			const dateMatch = dateRange.match(/^(\d{2}\/\d{2}\/\d{4})\s+-\s+(\d{2}\/\d{2}\/\d{4})$/);
			if (!dateMatch) {
				i += 4 + extraLines;
				continue;
			}

			const startDate = dateMatch[1];
			const endDate = dateMatch[2];

			// Create course instance
			instances.push({
				code: courseCode,
				name: courseName,
				section: section,
				component: component,
				days: days,
				startTime: startTime,
				endTime: endTime,
				location: room.trim(),
				instructor: instructor.trim(),
				startDate: startDate,
				endDate: endDate
			});

			i += 4 + extraLines; // Move to next schedule entry
		}
	}

	return instances;
}
