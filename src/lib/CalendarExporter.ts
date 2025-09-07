import { Course } from "./Course";

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
  filename: "quest_schedule.ics",
  placeholders: [
    {
      placeholder: "@code",
      description: "Course code",
      example: "CS 452",
    },
    {
      placeholder: "@section",
      description: "Course section number",
      example: "001",
    },
    {
      placeholder: "@name",
      description: "Name of the course",
      example: "Real-time Programming",
    },
    {
      placeholder: "@type",
      description: "Type of course",
      example: "LEC",
    },
    {
      placeholder: "@location",
      description: "Room for the course",
      example: "DWE 3522A",
    },
    {
      placeholder: "@prof",
      description: "Instructor for the course",
      example: "William B Cowan",
    },
  ],
  summary: "@code @type in @location",
  description: "@code-@section: @name (@type) in @location with @prof",
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
    config: Partial<Config> = {},
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
    const courseRegex = createCourseRegex();
    const sectionRegex = createSectionRegex(this._questData);

    let courseLoopCount = 0;
    let courseMatches = null;

    while (true) {
      if (courseLoopCount++ > this._config.MAX_COURSES) {
        console.warn("Exceeded loop count while searching for courses");
        break;
      }

      courseMatches = courseRegex.exec(this._questData);
      if (!courseMatches) {
        break;
      }

      let sectionLoopCount = 0;
      let sectionMatches = null;

      while (true) {
        if (sectionLoopCount++ > this._config.MAX_SECTIONS) {
          console.warn("Exceeded loop count while searching for sections");
          break;
        }

        sectionMatches = sectionRegex.exec(courseMatches[0]);
        if (!sectionMatches) {
          break;
        }

        if (sectionMatches[4] === "TBA") {
          continue;
        }

        const course = new Course(
          courseMatches[1],
          courseMatches[2],

          sectionMatches[2],
          sectionMatches[3],
          sectionMatches[8],
          sectionMatches[9],

          this._dateFormatType,
          sectionMatches[5],
          sectionMatches[6],
          sectionMatches[7],
          sectionMatches[10],
          sectionMatches[11],
          this._config,
        );
        this._courses.push(course);
      }
    }

    if (courseLoopCount === 0 || courseLoopCount >= this._config.MAX_COURSES) {
      throw new Error("Failed Search");
    }
  }

  private generateCal(): string {
    let calendarContent = "";

    const addLine = function (line: string) {
      calendarContent += line + "\n";
    };

    addLine("BEGIN:VCALENDAR");
    addLine("VERSION:2.0");
    addLine("PRODID:-//questscheduleexporter.stephenli.ca//EN");

    for (const course of this._courses) {
      const printer = course.printer(this._summary, this._description);

      let next: IteratorResult<string>;
      while (!(next = printer.next()).done) {
        addLine(next.value);
      }
    }

    addLine("END:VCALENDAR");

    return calendarContent;
  }

  private downloadFile(content: string): void {
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/calendar;charset=utf-8," + encodeURIComponent(content),
    );
    element.setAttribute("download", this._config.filename);
    element.style.display = "none";

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}

function createCourseRegex(): RegExp {
  const courseHeaderPattern = "(\\w{2,5} \\d{3,4}) - (.*)";

  const anythingBeforePattern = function (pattern: string) {
    return "(?:(?!" + pattern + ")[\\w|\\W])*";
  };

  const regex =
    courseHeaderPattern + anythingBeforePattern(courseHeaderPattern) + "";

  return new RegExp(regex, "g");
}

function createSectionRegex(questData: string): RegExp {
  const classNumberPattern = "\\d{4}";

  const timePattern = (function () {
    const timePattern12h = "1?\\d\\:[0-5]\\d[AP]M";
    const timePattern24h = "[0-2]\\d\\:[0-5]\\d";
    const is24h = /([0-5]\d[A|P]M)/.exec(questData) === null;
    return is24h ? timePattern24h : timePattern12h;
  })();

  const patternOrTba = function (pattern: string) {
    return "(" + pattern + "|TBA)\\s*";
  };

  const regex =
    "(" +
    classNumberPattern +
    ")\\s*" +
    "(\\d{3}\\s*)" +
    "(\\w{3}\\s*)" +
    patternOrTba(
      "([MThWF]{0,6})\\s*" +
        "(" +
        timePattern +
        ")\\ -\\ " +
        "(" +
        timePattern +
        ")\\s*" +
        "",
    ) +
    patternOrTba("[\\w\\ ]+\\s*[0-9]{1,5}[A-Z]?" + "") +
    patternOrTba("[A-Za-z_\\ \\-\\,\\s]+" + "") +
    "(\\d{2,4}\\/\\d{2,4}\\/\\d{2,4})\\ -\\ " +
    "(\\d{2,4}\\/\\d{2,4}\\/\\d{2,4})" +
    "";

  console.log(regex);

  return new RegExp(regex, "g");
}
