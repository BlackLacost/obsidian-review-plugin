import { TFile } from "obsidian";
import { ReviewError } from "./error";
import { List } from "./list";
import { DayData } from "./main";
import { Table } from "./table";
import { Validation } from "./validation";
import { YamlData } from "./yamlParser";

export class Review {
	private readonly files: TFile[];

	constructor(
		files: TFile[],
		private readonly yamlData: YamlData,
		private readonly getDayDataFromFile: (file: TFile) => DayData
	) {
		if (!Validation.areAllFilesDailyNotes(files)) {
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
				if (curr.date.getDay() === 0) return 1;
				if (next.date.getDay() === 0) return -1;
				return curr.date.getDay() - next.date.getDay();
			});

		let table: Table | undefined = undefined;
		if (weekDaysData.length > 0 && this.yamlData.table) {
			table = Table.createFromColsRows({
				cols: weekDaysData,
				rows: this.yamlData.table,
			});
		}

		let list: List | undefined = undefined;
		if (weekDaysData.length > 0 && this.yamlData.list) {
			list = List.createFromDayDataAndProperty(
				weekDaysData,
				this.yamlData.list
			);
		}

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
		const weekReviewsData = allSundaysInTargetMonth.map((reviewDate) => {
			const { weekDate, table, list } = this.week(reviewDate);
			return {
				weekNumber: weekDate.getWeek(),
				weekReviewTable: table,
				list,
			};
		});

		let monthTable: Table | undefined = undefined;
		if (this.yamlData.table) {
			monthTable = this.createMonthTable(weekReviewsData);
			monthTable.addAggregationToTable(this.yamlData.table);
		}

		let monthList: List | undefined = undefined;
		if (this.yamlData.list) {
			const listHeader = weekReviewsData[0].list?.header ?? "";
			const listData = weekReviewsData
				.map((item) => item.list?.data)
				.flatMap((item) => item)
				.filter((item) => !!item);
			monthList = new List(listHeader, listData);
		}

		return {
			monthDate: targetDate,
			table: monthTable,
			list: monthList,
		};
	}

	private createMonthTable(
		weekReviewsTables: { weekNumber: number; weekReviewTable?: Table }[]
	): Table {
		const tables = weekReviewsTables
			.map(({ weekNumber, weekReviewTable }) => {
				if (!weekReviewTable) return;
				weekReviewTable.headers = [weekNumber];
				weekReviewTable.sliceColumns(
					weekReviewTable.headers.length - 2
				);
				return weekReviewTable;
			})
			.filter(Validation.isTable);

		return Table.mergeTables(tables);
	}

	private getCurrentWeekFiles(currentDate: Date): TFile[] {
		return this.files.filter(
			(file) =>
				new Date(file.basename).getWeek() === currentDate.getWeek()
		);
	}
}
