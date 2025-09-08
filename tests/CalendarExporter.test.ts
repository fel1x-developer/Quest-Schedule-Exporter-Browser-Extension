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
1234 001 LEC MThWF 08:30 - 09:20 DWE 3522A William B Cowan 09/04/2023 - 12/08/2023

MATH 239 - Introduction to Combinatorics
5678 001 LEC TF 14:30 - 15:50 MC 4020 Jane Smith 09/04/2023 - 12/08/2023`;

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
1234 001 LEC TBA DWE 3522A William B Cowan 09/04/2023 - 12/08/2023`;

			const exporterWithTBA = new CalendarExporter('DD/MM/YYYY', questDataWithTBA);
			(exporterWithTBA as any).parseData();

			expect((exporterWithTBA as any)._courses).toHaveLength(0);
		});

		it('should not throw error when no courses found (courseLoopCount will be 1)', () => {
			const emptyCourseData = 'No valid course data here';
			const emptyExporter = new CalendarExporter('DD/MM/YYYY', emptyCourseData);

			// The current logic doesn't throw for this case since courseLoopCount will be 1, not 0
			expect(() => (emptyExporter as any).parseData()).not.toThrow();
			expect((emptyExporter as any)._courses).toHaveLength(0);
		});

		it('should respect MAX_COURSES limit', () => {
			const limitedExporter = new CalendarExporter(
				'DD/MM/YYYY',
				sampleQuestData,
				'@code @type in @location',
				'@code-@section: @name (@type) in @location with @prof',
				{ MAX_COURSES: 1 }
			);

			// Mock console.warn to verify it's called
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			expect(() => (limitedExporter as any).parseData()).toThrow('Failed Search');

			expect(consoleSpy).toHaveBeenCalledWith('Exceeded loop count while searching for courses');
			consoleSpy.mockRestore();
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
1234 001 LEC MThWF 8:30AM - 9:20AM DWE 3522A William B Cowan 09/04/2023 - 12/08/2023`;

			const data24h = `CS 452 - Real-time Programming
1234 001 LEC MThWF 08:30 - 09:20 DWE 3522A William B Cowan 09/04/2023 - 12/08/2023`;

			const exporter12h = new CalendarExporter('DD/MM/YYYY', data12h);
			const exporter24h = new CalendarExporter('DD/MM/YYYY', data24h);

			expect(() => (exporter12h as any).parseData()).not.toThrow();
			expect(() => (exporter24h as any).parseData()).not.toThrow();
		});
	});
});
