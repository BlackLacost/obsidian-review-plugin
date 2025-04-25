import { DayData } from "./main";
import { Validation } from "./validation";

export class List {
	header: string;
	data: string[];

	constructor(header: string, data: string[]) {
		this.header = header;
		this.data = data;
	}

	render(): string {
		const liList = this.data.map((item) => `<li>${item}</li>`).join("");
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
		const data = daysData
			.flatMap((dayData) => dayData.properties[propertyName])
			.filter(Validation.isString);

		return new List(propertyName, data);
	}
}
