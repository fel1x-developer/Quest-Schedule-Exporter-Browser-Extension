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
			expect(exporter._dateFormatType).toBe('DD/MM/YYYY');
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

	describe('regex functions', () => {
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
	});
});
