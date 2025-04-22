import { TFile } from "obsidian";
import { Aggregation } from "./aggregation";
import { ReviewError } from "./error";
import { DayData } from "./main";
import { YamlData } from "./yamlParser";

const weekDays: Record<number, string> = {
	0: "Вс",
	1: "Пн",
	2: "Вт",
	3: "Ср",
	4: "Чт",
	5: "Пт",
	6: "Сб",
};

export class Review {
	private readonly files: TFile[];
	private readonly activeFile: TFile;
	private readonly aggregation = new Aggregation();

	constructor(
		files: TFile[],
		activeFile: TFile,
		private readonly yamlData: YamlData,
		private readonly getDayDataFromFile: (file: TFile) => DayData
	) {
		if (!this.areAllFilesDailyNotes(files)) {
			const errorMessage = "All files should have title like YYYY-MM-DD";
			throw new ReviewError(errorMessage);
		}
		this.files = files;

		if (!this.isFileDailyNotes(activeFile)) {
			throw new ReviewError(
				"Active file should have title like YYYY-MM-DD"
			);
		}
		this.activeFile = activeFile;
	}

	week(): {
		currentWeekNumber: number;
		headers: string[];
		data: Record<string, any[]>;
	} {
		const { weekNumber: currentWeekNumber } = this.getDayDataFromFile(
			this.activeFile
		);
		const weekFiles = this.getCurrentWeekFiles(currentWeekNumber);
		const weekDaysData = weekFiles
			.map((file) => this.getDayDataFromFile(file))
			// TODO: New Date.prototype.getDay
			.sort((curr, next) => {
				if (curr.weekDay === 0) return 1;
				if (next.weekDay === 0) return -1;
				return curr.weekDay - next.weekDay;
			});

		console.log({ weekDaysData });

		const headers = [
			"Параметры",
			...weekDaysData.map((item) => weekDays[item.weekDay]),
		];

		const data = weekDaysData.reduce((prev, dayData) => {
			this.yamlData.properties.forEach((property) => {
				if (prev[property.name]) {
					prev[property.name].push(dayData.properties[property.name]);
				} else {
					prev[property.name] = [dayData.properties[property.name]];
				}
			});
			return prev;
		}, {} as Record<string, unknown[]>);

		console.log({ data });

		const hasAggregation = this.yamlData.properties.some(
			(property) => !!property.aggregation
		);

		if (!hasAggregation) {
			return {
				currentWeekNumber,
				headers,
				data,
			};
		}

		this.yamlData.properties.forEach((property) => {
			const arrayWithoutEmpty = data[property.name].filter(
				(item) => !!item
			);
			if (this.isArrayNumber(arrayWithoutEmpty)) {
				const aggregationValue = this.aggregation.call(
					arrayWithoutEmpty,
					property.aggregation
				);
				data[property.name].push(aggregationValue);
				return;
			}
			if (this.isArrayTime(arrayWithoutEmpty)) {
				const aggregationValue = this.aggregation.call(
					arrayWithoutEmpty.map(fromHhMmSsToSeconds),
					property.aggregation
				);
				data[property.name].push(fromSecondsToHhMmSs(aggregationValue));
				return;
			}
		});
		headers.push("Итого");
		console.log({ data });
		return {
			currentWeekNumber,
			headers,
			data,
		};
	}

	private isArrayTime(arr: unknown[]): arr is string[] {
		if (!arr.every((item) => typeof item === "string")) return false;
		const pattern = /(\d+):(\d\d):(\d\d)/;
		return arr.every((item) => !!item.match(pattern));
	}

	private isArrayNumber(arr: unknown[]): arr is number[] {
		return arr.every(
			(item) => typeof item === "number" || typeof item === "boolean"
		);
	}

	private areAllFilesDailyNotes(files: TFile[]): boolean {
		return files.every((file) => this.isFileDailyNotes(file));
	}

	private isFileDailyNotes(file: TFile): boolean {
		return file.basename.match(/^\d\d\d\d-\d\d-\d\d$/) !== null;
	}

	private getCurrentWeekFiles(currentWeekNumber: number): TFile[] {
		return this.files.filter(
			(file) => new Date(file.basename).getWeek() === currentWeekNumber
		);
	}
}

// function isTime(item: any): item is string {
// 	if (typeof item === "number") return false;
// 	const pattern = /(\d\d):(\d\d):(\d\d)/;
// 	return !!item.match(pattern);
// }

// function isTimeArray(arr: any[]): arr is string[] {
// 	return arr.every((item) => !!isTime(item));
// }
// function fromSecondsToHhMmSs(allSeconds: number): string {
// 	const hours = Math.floor(allSeconds / 3600);
// 	const secondsMinusHours = allSeconds - hours * 3600;
// 	const minutes = Math.floor(secondsMinusHours / 60);
// 	const seconds = secondsMinusHours - minutes * 60;
// 	const result = `${hours.toString().padStart(2, "0")}:${minutes
// 		.toString()
// 		.padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
// 	return result;
// }

// function fromHhMmSsToSeconds(time: string): number {
// 	if (!time) return 0;
// 	const parsedHoursMinutesSeconds = time.match(/(\d\d):(\d\d):(\d\d)/);
// 	if (!parsedHoursMinutesSeconds) return 0;
// 	// eslint-disable-next-line @typescript-eslint/no-unused-vars
// 	const [_, hours, minutes, seconds] = parsedHoursMinutesSeconds;
// 	return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
// }

function fromSecondsToHhMmSs(allSeconds: number): string {
	const hours = Math.floor(allSeconds / 3600);
	const secondsMinusHours = allSeconds - hours * 3600;
	const minutes = Math.floor(secondsMinusHours / 60);
	const seconds = secondsMinusHours - minutes * 60;
	const result = `${hours.toString().padStart(2, "0")}:${minutes
		.toString()
		.padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	return result;
}

function fromHhMmSsToSeconds(time: string): number {
	if (!time) return 0;
	const parsedHoursMinutesSeconds = time.match(/(\d\d):(\d\d):(\d\d)/);
	if (!parsedHoursMinutesSeconds) return 0;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [_, hours, minutes, seconds] = parsedHoursMinutesSeconds;
	return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
}
