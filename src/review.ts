import { TFile } from "obsidian";
import { ReviewError } from "./error";
import { DayData, List } from "./main";
import { ITable, Table } from "./table";
import { YamlData } from "./yamlParser";

export class Review {
	private readonly files: TFile[];

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

		let table: Table | undefined = undefined;
		if (weekDaysData.length > 0 && this.yamlData.table) {
			table = Table.createFromColsRows({
				cols: weekDaysData,
				rows: this.yamlData.table,
			});
		}

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
			const { weekDate, table, list } = this.week(reviewDate);
			return {
				weekNumber: weekDate.getWeek(),
				table,
				list,
			};
		});

		let monthTable: Table | undefined = undefined;
		if (this.yamlData.table) {
			monthTable = this.createMonthTable(weekReviewData);
			monthTable.addAggregationToTable(this.yamlData.table);
		}

		const listHeader = weekReviewData[0].list?.header ?? "";
		const listData = weekReviewData
			.map((item) => item.list?.data)
			.flatMap((item) => item)
			.filter(this.isString);

		return {
			monthDate: targetDate,
			table: monthTable,
			list: {
				header: listHeader,
				data: listData,
			},
		};
	}

	private createMonthTable(
		weekReviewData: { weekNumber: number; table?: ITable }[]
	): Table {
		const newTable: ITable = { headers: ["Параметры"], data: {} };
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

		return new Table(newTable.headers, newTable.data);
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

	private isString(item: unknown): item is string {
		return typeof item === "string";
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
}
