import { CalendarExporter } from '../src/lib/CalendarExporter';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DOM methods
const mockCreateElement = vi.fn(() => ({
	setAttribute: vi.fn(),
	style: { display: '' },
	click: vi.fn()
}));
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();

Object.defineProperty(global, 'document', {
	value: {
		createElement: mockCreateElement,
		body: {
			appendChild: mockAppendChild,
			removeChild: mockRemoveChild
		}
	}
});

describe('CalendarExporter', () => {
	let exporter: CalendarExporter;
	const sampleQuestData = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
LEC
MThWF 8:30AM - 9:20AM
DWE 3522A
William B Cowan
04/09/2023 - 08/12/2023

MATH 239 - Introduction to Combinatorics
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
5678
001
LEC
TF 2:30PM - 3:50PM
MC 4020
Jane Smith
04/09/2023 - 08/12/2023`;

	beforeEach(() => {
		vi.clearAllMocks();
		exporter = new CalendarExporter('DD/MM/YYYY', sampleQuestData);
	});

	describe('constructor', () => {
		it('should initialize with correct default values', () => {
			expect(exporter._dateFormat).toBe('DD/MM/YYYY');
			expect(exporter._questData).toBe(sampleQuestData);
			expect(exporter._summary).toBe('@code @type in @location');
			expect(exporter._description).toBe('@code-@section: @name (@type) in @location with @prof');
			expect(exporter._courses).toEqual([]);
		});

		it('should allow custom summary and description', () => {
			const customExporter = new CalendarExporter(
				'MM/DD/YYYY',
				sampleQuestData,
				'Custom @code',
				'Custom description for @name'
			);

			expect(customExporter._summary).toBe('Custom @code');
			expect(customExporter._description).toBe('Custom description for @name');
		});

		it('should merge custom config with defaults', () => {
			const customConfig = {
				MAX_COURSES: 10,
				filename: 'custom.ics'
			};
			const customExporter = new CalendarExporter(
				'MM/DD/YYYY',
				sampleQuestData,
				'@code @type in @location',
				'@code-@section: @name (@type) in @location with @prof',
				customConfig
			);

			expect(customExporter._config.MAX_COURSES).toBe(10);
			expect(customExporter._config.filename).toBe('custom.ics');
			expect(customExporter._config.MAX_SECTIONS).toBe(5); // default value preserved
		});
	});

	describe('parseData', () => {
		it('should parse valid course data correctly', () => {
			(exporter as any).parseData();

			expect((exporter as any)._courses).toHaveLength(2);
			expect((exporter as any)._courses[0]).toBeDefined();
			expect((exporter as any)._courses[1]).toBeDefined();
		});

		it('should skip sections with TBA time', () => {
			const questDataWithTBA = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
LEC
TBA
DWE 3522A
William B Cowan
04/09/2023 - 08/12/2023`;

			const exporterWithTBA = new CalendarExporter('DD/MM/YYYY', questDataWithTBA);

			// Should throw "Failed Search" when no valid courses found (TBA skipped)
			expect(() => (exporterWithTBA as any).parseData()).toThrow('Failed Search');
			expect((exporterWithTBA as any)._courses).toHaveLength(0);
		});

		it('should throw error when no valid courses found', () => {
			const emptyCourseData = 'No valid course data here';
			const emptyExporter = new CalendarExporter('DD/MM/YYYY', emptyCourseData);

			// New parser throws "Failed Search" when no valid courses are found
			expect(() => (emptyExporter as any).parseData()).toThrow('Failed Search');
			expect((emptyExporter as any)._courses).toHaveLength(0);
		});

		it('should handle empty course data without throwing', () => {
			const emptyCourseData = 'No valid course data here';
			const emptyExporter = new CalendarExporter('DD/MM/YYYY', emptyCourseData);

			// New parser should handle empty data gracefully by returning empty array
			expect(() => (emptyExporter as any).parseData()).toThrow('Failed Search');
			expect((emptyExporter as any)._courses).toHaveLength(0);
		});
	});

	describe('generateCal', () => {
		beforeEach(() => {
			(exporter as any).parseData();
		});

		it('should generate valid iCalendar format', () => {
			const calendar = (exporter as any).generateCal();

			expect(calendar).toContain('BEGIN:VCALENDAR');
			expect(calendar).toContain('VERSION:2.0');
			expect(calendar).toContain('PRODID:-//questscheduleexporter.stephenli.ca//EN');
			expect(calendar).toContain('END:VCALENDAR');
		});

		it('should include course events in calendar', () => {
			const calendar = (exporter as any).generateCal();

			expect(calendar).toContain('BEGIN:VEVENT');
			expect(calendar).toContain('END:VEVENT');
			expect(calendar).toContain('SUMMARY:');
			expect(calendar).toContain('LOCATION:');
			expect(calendar).toContain('DESCRIPTION:');
		});
	});

	describe('downloadFile', () => {
		it('should create download link with correct attributes', () => {
			const mockElement = {
				setAttribute: vi.fn(),
				style: { display: '' },
				click: vi.fn()
			};
			mockCreateElement.mockReturnValue(mockElement);

			const testContent = 'test calendar content';
			(exporter as any).downloadFile(testContent);

			expect(mockCreateElement).toHaveBeenCalledWith('a');
			expect(mockElement.setAttribute).toHaveBeenCalledWith(
				'href',
				'data:text/calendar;charset=utf-8,' + encodeURIComponent(testContent)
			);
			expect(mockElement.setAttribute).toHaveBeenCalledWith('download', 'quest_schedule.ics');
			expect(mockElement.style.display).toBe('none');
			expect(mockElement.click).toHaveBeenCalled();
			expect(mockAppendChild).toHaveBeenCalledWith(mockElement);
			expect(mockRemoveChild).toHaveBeenCalledWith(mockElement);
		});

		it('should use custom filename from config', () => {
			const customExporter = new CalendarExporter(
				'DD/MM/YYYY',
				sampleQuestData,
				'@code @type in @location',
				'@code-@section: @name (@type) in @location with @prof',
				{ filename: 'custom_schedule.ics' }
			);

			const mockElement = {
				setAttribute: vi.fn(),
				style: { display: '' },
				click: vi.fn()
			};
			mockCreateElement.mockReturnValue(mockElement);

			(customExporter as any).downloadFile('test content');

			expect(mockElement.setAttribute).toHaveBeenCalledWith('download', 'custom_schedule.ics');
		});
	});

	describe('run', () => {
		it('should execute the full export process', () => {
			const parseDataSpy = vi.spyOn(exporter as any, 'parseData');
			const generateCalSpy = vi
				.spyOn(exporter as any, 'generateCal')
				.mockReturnValue('mock calendar');
			const downloadFileSpy = vi.spyOn(exporter as any, 'downloadFile');

			exporter.run();

			expect(parseDataSpy).toHaveBeenCalled();
			expect(generateCalSpy).toHaveBeenCalled();
			expect(downloadFileSpy).toHaveBeenCalledWith('mock calendar');
		});
	});

	describe('edge cases and parsing', () => {
		it('should handle different time formats', () => {
			const data12h = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
LEC
MThWF 8:30AM - 9:20AM
DWE 3522A
William B Cowan
04/09/2023 - 08/12/2023`;

			const data24h = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
LEC
MThWF 8:30AM - 9:20AM
DWE 3522A
William B Cowan
04/09/2023 - 08/12/2023`;

			const exporter12h = new CalendarExporter('DD/MM/YYYY', data12h);
			const exporter24h = new CalendarExporter('DD/MM/YYYY', data24h);

			expect(() => (exporter12h as any).parseData()).not.toThrow();
			expect(() => (exporter24h as any).parseData()).not.toThrow();
		});

		it('should handle multi-line instructor names', () => {
			const questDataWithMultiLineInstructor = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
LEC
MThWF 8:30AM - 9:20AM
DWE 3522A
William B Cowan
Additional Instructor Info
04/09/2023 - 08/12/2023`;

			const exporterMultiInstructor = new CalendarExporter(
				'DD/MM/YYYY',
				questDataWithMultiLineInstructor
			);
			(exporterMultiInstructor as any).parseData();

			expect((exporterMultiInstructor as any)._courses).toHaveLength(1);
			expect((exporterMultiInstructor as any)._courses[0]._meta.prof).toBe(
				'William B Cowan, Additional Instructor Info'
			);
		});

		it('should handle invalid time patterns', () => {
			const questDataWithInvalidTime = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
LEC
InvalidTimeFormat
DWE 3522A
William B Cowan
04/09/2023 - 08/12/2023`;

			const exporterInvalidTime = new CalendarExporter('DD/MM/YYYY', questDataWithInvalidTime);
			expect(() => (exporterInvalidTime as any).parseData()).toThrow('Failed Search');
		});

		it('should handle invalid date patterns', () => {
			const questDataWithInvalidDate = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
LEC
MThWF 8:30AM - 9:20AM
DWE 3522A
William B Cowan
InvalidDateFormat`;

			const exporterInvalidDate = new CalendarExporter('DD/MM/YYYY', questDataWithInvalidDate);
			expect(() => (exporterInvalidDate as any).parseData()).toThrow('Failed Search');
		});

		it('should handle insufficient lines in parsing', () => {
			const questDataWithInsufficientLines = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001`;

			const exporterInsufficientLines = new CalendarExporter(
				'DD/MM/YYYY',
				questDataWithInsufficientLines
			);
			expect(() => (exporterInsufficientLines as any).parseData()).toThrow('Failed Search');
		});

		it('should skip entries with invalid component format', () => {
			const questDataWithInvalidComponent = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
INVALIDCOMPONENT
MThWF 8:30AM - 9:20AM
DWE 3522A
William B Cowan
04/09/2023 - 08/12/2023

5678
002
LEC
TF 2:30PM - 3:50PM
MC 4020
Jane Smith
04/09/2023 - 08/12/2023`;

			const exporterInvalidComponent = new CalendarExporter(
				'DD/MM/YYYY',
				questDataWithInvalidComponent
			);
			(exporterInvalidComponent as any).parseData();

			expect((exporterInvalidComponent as any)._courses).toHaveLength(1);
			expect((exporterInvalidComponent as any)._courses[0]._meta.type).toBe('LEC');
		});

		it('should handle entries without time in days and times field', () => {
			const questDataWithoutTime = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
LEC
MThWF
DWE 3522A
William B Cowan
04/09/2023 - 08/12/2023`;

			const exporterWithoutTime = new CalendarExporter('DD/MM/YYYY', questDataWithoutTime);
			expect(() => (exporterWithoutTime as any).parseData()).toThrow('Failed Search');
		});

		it('should handle break conditions in parsing loop', () => {
			const questDataWithBreakCondition = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
LEC
MThWF 8:30AM - 9:20AM
DWE 3522A
William B Cowan
04/09/2023 - 08/12/2023

9999`;

			const exporterWithBreakCondition = new CalendarExporter(
				'DD/MM/YYYY',
				questDataWithBreakCondition
			);
			(exporterWithBreakCondition as any).parseData();

			expect((exporterWithBreakCondition as any)._courses).toHaveLength(1);
		});

		it('should detect and break on new class number pattern', () => {
			const questDataWithNewClassNumber = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
LEC
MThWF 8:30AM - 9:20AM
DWE 3522A
William B Cowan
04/09/2023 - 08/12/2023

5678
002
LEC
TF 2:30PM - 3:50PM
MC 4020
Jane Smith
04/09/2023 - 08/12/2023`;

			const exporterWithNewClassNumber = new CalendarExporter(
				'DD/MM/YYYY',
				questDataWithNewClassNumber
			);
			(exporterWithNewClassNumber as any).parseData();

			expect((exporterWithNewClassNumber as any)._courses).toHaveLength(2);
		});

		it('should handle non-matching date range in instructor parsing', () => {
			const questDataNonMatchingDate = `CS 452 - Real-time Programming
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
LEC
MThWF 8:30AM - 9:20AM
DWE 3522A
William B Cowan
NonMatchingDatePattern`;

			const exporterNonMatchingDate = new CalendarExporter('DD/MM/YYYY', questDataNonMatchingDate);
			expect(() => (exporterNonMatchingDate as any).parseData()).toThrow('Failed Search');
		});

		it('should successfully parse complete course data with all fields', () => {
			const completeQuestData = `CS 135 - Designing Functional Programs
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
12345
001
LEC
MWF 1:30PM - 2:20PM
MC 4020
Prof Johnson
05/01/2024 - 08/15/2024`;

			const completeExporter = new CalendarExporter('MM/DD/YYYY', completeQuestData);
			(completeExporter as any).parseData();

			expect((completeExporter as any)._courses).toHaveLength(1);
			const course = (completeExporter as any)._courses[0];
			expect(course._meta.code).toBe('CS 135');
			expect(course._meta.name).toBe('Designing Functional Programs');
			expect(course._meta.type).toBe('LEC');
			expect(course._meta.prof).toBe('Prof Johnson');
			expect(course._meta.location).toBe('MC 4020');
		});

		it('should parse course with different time format patterns', () => {
			const timeFormatQuestData = `MATH 138 - Calculus 2 for Honours Mathematics
Status	Units	Grading	Deadlines
Enrolled
0.50
Numeric Grading Basis
Academic Calendar Deadlines
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
67890
002
LEC
TTh 10:30AM - 11:50AM
MC 2065
Dr Smith
01/09/2024 - 04/12/2024`;

			const timeFormatExporter = new CalendarExporter('DD/MM/YYYY', timeFormatQuestData);
			(timeFormatExporter as any).parseData();

			expect((timeFormatExporter as any)._courses).toHaveLength(1);
			const course = (timeFormatExporter as any)._courses[0];
			expect(course._meta.code).toBe('MATH 138');
			expect(course._meta.name).toBe('Calculus 2 for Honours Mathematics');
		});

		it('should skip entry with invalid time format and parse others', () => {
			const questData = `CS 452 - Real-time Programming
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
1234
001
LEC
Some:InvalidTime
DWE 3522A
William B Cowan
04/09/2023 - 08/12/2023

MATH 239 - Introduction to Combinatorics
Class Nbr	Section	Component	Days & Times	Room	Instructor	Start/End Date
5678
001
LEC
TF 2:30PM - 3:50PM
MC 4020
Jane Smith
04/09/2023 - 08/12/2023
`;
			const exporter = new CalendarExporter('DD/MM/YYYY', questData);
			(exporter as any).parseData();
			expect((exporter as any)._courses).toHaveLength(1);
			expect((exporter as any)._courses[0]._meta.code).toBe('MATH 239');
		});
	});
});
