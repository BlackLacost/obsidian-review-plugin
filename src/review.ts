import { TFile } from "obsidian";
import { Aggregation } from "./aggregation";
import { ReviewError } from "./error";
import { DayData, List, Table, YamlValue } from "./main";
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
	private readonly aggregation = new Aggregation();

	constructor(
		files: TFile[],
		private readonly yamlData: YamlData,
		private readonly getDayDataFromFile: (file: TFile) => DayData
	) {
		if (!this.areAllFilesDailyNotes(files)) {
			const errorMessage = "All files should have title like YYYY-MM-DD";
			throw new ReviewError(errorMessage);
		}
		this.files = files;
	}

	week(targetDate: Date): {
		weekDate: Date;
		table?: Table;
		list?: List;
	} {
		const weekFiles = this.getCurrentWeekFiles(targetDate);
		const weekDaysData = weekFiles
			.map((file) => this.getDayDataFromFile(file))
			// TODO: New Date.prototype.getDay
			.sort((curr, next) => {
				if (curr.date.getWeek() === 0) return 1;
				if (next.date.getWeek() === 0) return -1;
				return curr.date.getWeek() - next.date.getWeek();
			});

		const table = this.yamlData.table
			? this.createTableDataFromDayData(weekDaysData, this.yamlData.table)
			: undefined;
		const list = this.yamlData.list
			? this.createListData(weekDaysData, this.yamlData.list)
			: undefined;
		return {
			weekDate: targetDate,
			table,
			list,
		};
	}

	month(targetDate: Date): {
		monthDate: Date;
		table?: Table;
		list?: List;
	} {
		const allSundaysInTargetMonth = targetDate.getAllSundaysInMonth();
		const weekReviewData = allSundaysInTargetMonth.map((reviewDate) => {
			const { weekDate, table, list } = this.week(new Date(reviewDate));
			return {
				weekNumber: weekDate.getWeek(),
				table,
				list,
			};
		});

		let monthTableWithAggregation: Table | undefined = undefined;
		if (this.yamlData.table) {
			const monthTable = this.createMonthTable(weekReviewData);
			monthTableWithAggregation = this.addAggregationToTable(
				monthTable,
				this.yamlData.table
			);
		}

		const listHeader = weekReviewData[0].list?.header ?? "";
		const listData = weekReviewData
			.map((item) => item.list?.data)
			.flatMap((item) => item)
			.filter(this.isString);

		return {
			monthDate: targetDate,
			table: monthTableWithAggregation,
			list: {
				header: listHeader,
				data: listData,
			},
		};
	}

	private createMonthTable(
		weekReviewData: { weekNumber: number; table?: Table }[]
	): Table {
		const newTable: Table = { headers: ["Параметры"], data: {} };
		weekReviewData.forEach(({ weekNumber, table }) => {
			if (!table) return;
			if (table?.data) {
				Object.entries(table.data).forEach(
					([propertyName, arr], index) => {
						if (index === 0) {
							newTable.headers.push(weekNumber);
						}
						if (newTable.data[propertyName]) {
							newTable.data[propertyName].push(
								arr[arr.length - 1]
							);
						} else {
							newTable.data[propertyName] = [arr[arr.length - 1]];
						}
					}
				);
			}
		});

		return newTable;
	}

	private createListData(
		weekDaysData: DayData[],
		propertyName: string
	): List {
		const data = weekDaysData
			.flatMap((dayData) => dayData.properties[propertyName])
			.filter(this.isString);

		return {
			header: propertyName,
			data,
		};
	}

	private createTableDataFromDayData(
		weekDaysData: DayData[],
		properties: Property[]
	): Table {
		const headers = [
			"Параметры",
			...weekDaysData.map((item) => weekDays[item.date.getDay()]),
		];

		const tableData = weekDaysData.reduce((prev, dayData) => {
			properties.forEach((property) => {
				if (prev[property.name]) {
					prev[property.name].push(dayData.properties[property.name]);
				} else {
					prev[property.name] = [dayData.properties[property.name]];
				}
			});
			return prev;
		}, {} as Table["data"]);

		if (Object.entries(tableData).length === 0) {
			return {
				headers: [],
				data: {},
			};
		}

		const tableDataWithGeneratedProperties = this.addGenerateProperties(
			tableData,
			properties
		);

		const hasAggregation = properties.some(
			(property) => !!property.aggregation
		);

		const newTable: Table = {
			headers,
			data: tableDataWithGeneratedProperties,
		};

		if (!hasAggregation) {
			return newTable;
		}

		return this.addAggregationToTable(newTable, properties);
	}

	private addGenerateProperties(
		tableData: Table["data"],
		properties: Property[]
	): Table["data"] {
		this.getPropertiesForGenerate(properties).forEach((genProperty) => {
			if (!genProperty.generate) return;
			const [property1, property2] = genProperty.generate;
			for (let i = 0; i < tableData[property1].length; i++) {
				const arg1 = tableData[property1][i] as number;
				const arg2 =
					fromHhMmSsToSeconds(tableData[property2][i] as string) /
					3600;
				const result = arg1 / arg2;
				tableData[genProperty.name][i] = isNaN(result)
					? ""
					: result.toFixed(2);
			}
		});
		return tableData;
	}

	private getPropertiesForGenerate(properties: Property[]): Property[] {
		return properties.filter(
			(property) => !!property.generate && property.generate.length === 2
		);
	}

	private addAggregationToTable(table: Table, properties: Property[]): Table {
		properties.forEach((property) => {
			const arrayWithoutEmpty = table.data[property.name].filter(
				(item) => !!item
			);
			if (this.isArrayNumber(arrayWithoutEmpty)) {
				const aggregationValue = this.aggregation.call(
					arrayWithoutEmpty,
					property.aggregation
				);
				table.data[property.name].push(aggregationValue);
				return;
			}
			if (this.isArrayTime(arrayWithoutEmpty)) {
				const aggregationValue = this.aggregation.call(
					arrayWithoutEmpty.map(fromHhMmSsToSeconds),
					property.aggregation
				);
				table.data[property.name].push(
					fromSecondsToHhMmSs(aggregationValue)
				);
				return;
			}
		});

		const newTableData = this.addGenerateProperties(table.data, properties);

		table.headers.push("Итого");
		table.data = newTableData;
		return table;
	}

	private isTime(item: YamlValue): item is string {
		if (typeof item !== "string") return false;
		return !!item.match(/(\d+):(\d\d):(\d\d)/);
	}

	private isNumber(item: YamlValue): item is number {
		return typeof item === "number";
	}

	private isBoolean(item: YamlValue): item is boolean {
		return typeof item === "boolean";
	}

	private isString(item: unknown): item is string {
		return typeof item === "string";
	}

	private isArrayTime(arr: YamlValue[]): arr is string[] {
		return arr.every((item) => this.isTime(item));
	}

	private isArrayNumber(arr: YamlValue[]): arr is number[] {
		return arr.every((item) => this.isNumber(item) || this.isBoolean(item));
	}

	private areAllFilesDailyNotes(files: TFile[]): boolean {
		return files.every((file) => this.isFileDailyNotes(file));
	}

	private isFileDailyNotes(file: TFile): boolean {
		return file.basename.match(/^\d\d\d\d-\d\d-\d\d$/) !== null;
	}

	private getCurrentWeekFiles(currentDate: Date): TFile[] {
		return this.files.filter(
			(file) =>
				new Date(file.basename).getWeek() === currentDate.getWeek()
		);
	}

	private getCurrentMonthWeekReviewFiles(date: Date): TFile[] {
		return this.files
			.filter(
				(file) => new Date(file.basename).getMonth() === date.getMonth()
			)
			.filter((file) => new Date(file.basename).getDay() === 0);
	}
}

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
