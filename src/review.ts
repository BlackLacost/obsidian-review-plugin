import { TFile } from "obsidian";
import { Aggregation } from "./aggregation";
import { ReviewError } from "./error";
import { DayData } from "./main";
import { Property, YamlData } from "./yamlParser";

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

	week() {
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

		const table = this.yamlData.table
			? this.createTableData(weekDaysData, this.yamlData.table)
			: undefined;
		const list = this.yamlData.list
			? this.createListData(weekDaysData, this.yamlData.list)
			: undefined;
		return {
			currentWeekNumber,
			table,
			list,
		};
	}

	private createListData(
		weekDaysData: DayData[],
		property: Property["name"]
	) {
		const data = weekDaysData
			.flatMap((dayData) => dayData.properties[property])
			.filter((item) => !!item)
			.filter((item) => typeof item === "string");
		return {
			header: property,
			data,
		};
	}

	private createTableData(
		weekDaysData: DayData[],
		properties: Property[]
	): {
		headers: string[];
		data: Record<string, any[]>;
	} {
		const headers = [
			"Параметры",
			...weekDaysData.map((item) => weekDays[item.weekDay]),
		];

		const data = weekDaysData.reduce((prev, dayData) => {
			properties.forEach((property) => {
				if (prev[property.name]) {
					prev[property.name].push(dayData.properties[property.name]);
				} else {
					prev[property.name] = [dayData.properties[property.name]];
				}
			});
			return prev;
		}, {} as Record<string, unknown[]>);

		const generateProperties = properties.filter(
			(property) => !!property.generate && property.generate.length === 2
		);

		generateProperties.forEach((genProperty) => {
			const [property1, property2] = genProperty.generate as [
				string,
				string
			];
			for (let i = 0; i < data[property1].length; i++) {
				const arg1 = data[property1][i] as number;
				const arg2 =
					fromHhMmSsToSeconds(data[property2][i] as string) / 3600;
				const result = arg1 / arg2;
				data[genProperty.name][i] = isNaN(result)
					? ""
					: result.toFixed(2);
			}
		});

		const hasAggregation = properties.some(
			(property) => !!property.aggregation
		);

		console.log({ data });

		if (!hasAggregation) {
			return {
				headers,
				data,
			};
		}

		properties.forEach((property) => {
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

		generateProperties.forEach((genProperty) => {
			const [property1, property2] = genProperty.generate as [
				string,
				string
			];

			const dataLength = data[property1].length;
			const lastArg1 = data[property1][dataLength - 1] as number;
			const lastArg2 =
				fromHhMmSsToSeconds(data[property2][dataLength - 1] as string) /
				3600;
			const result = lastArg1 / lastArg2;
			data[genProperty.name][dataLength - 1] = isNaN(result)
				? ""
				: result.toFixed(2);
		});

		headers.push("Итого");
		console.log({ data });
		return {
			headers,
			data,
		};
	}

	private isTime(item: unknown): item is string {
		if (typeof item !== "string") return false;
		return !!item.match(/(\d+):(\d\d):(\d\d)/);
	}

	private isNumber(item: unknown): item is number {
		return typeof item === "number";
	}

	private isBoolean(item: unknown): item is boolean {
		return typeof item === "boolean";
	}

	private isArrayTime(arr: unknown[]): arr is string[] {
		return arr.every((item) => this.isTime(item));
	}

	private isArrayNumber(arr: unknown[]): arr is number[] {
		return arr.every((item) => this.isNumber(item) || this.isBoolean(item));
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
	const parsedHoursMinutesSeconds = time.match(/(\d+):(\d\d):(\d\d)/);
	if (!parsedHoursMinutesSeconds) return 0;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [_, hours, minutes, seconds] = parsedHoursMinutesSeconds;
	return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
}
