import { DayData } from "./main";
import { Validation } from "./validation";

export interface IList {
	header: string;
	data: [Date, string[]][];
}

export class List implements IList {
	header: IList["header"];
	data: IList["data"];

	constructor(header: IList["header"], data: IList["data"]) {
		this.header = header;
		this.data = data;
	}

	render(type: "week" | "month" = "week"): string {
		const liList = this.data
			.map(
				([date, arr]) =>
					`<li>${
						type === "month" ? date.getWeek() : date.getDate()
					}<ul>${arr
						.map((item) => `<li>${item}</li>`)
						.join("")}</ul></li>`
			)
			.join("");
		return `
		<h3>${this.header}</h3>
		<ul>
			${liList}
		</ul>
		`;
	}

	static createFromDayDataAndProperty(
		daysData: DayData[],
		propertyName: string
	): List {
		const data: IList["data"] = daysData.map((dayData) => {
			const arr = dayData.properties[propertyName];
			return [dayData.date, Validation.isArrayString(arr) ? arr : []];
		});

		return new List(
			propertyName,
			data.filter(([_, arr]) => arr.length > 0)
		);
	}
}
