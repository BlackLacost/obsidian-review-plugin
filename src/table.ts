import { Aggregation } from "./aggregation";
import { DayData, YamlValue } from "./main";
import { Validation } from "./validation";
import { Property } from "./yamlParser";

const weekDays: Record<number, string> = {
	0: "Вс",
	1: "Пн",
	2: "Вт",
	3: "Ср",
	4: "Чт",
	5: "Пт",
	6: "Сб",
};

export interface ITable {
	headers: (string | Date | number)[];
	data: Record<string, YamlValue[]>;
}

export class Table {
	headers: ITable["headers"];
	data: ITable["data"];
	private readonly aggregation = new Aggregation();

	constructor(headers: ITable["headers"], data: ITable["data"]) {
		this.headers = headers;
		this.data = data;
	}

	addGenerateProperties(generatedProperties: Property[]) {
		generatedProperties.forEach((genProperty) => {
			if (!genProperty.generate) return;
			const [property1, property2] = genProperty.generate;
			for (let i = 0; i < this.data[property1].length; i++) {
				const arg1 = this.data[property1][i] as number;
				const arg2 =
					fromHhMmSsToSeconds(this.data[property2][i] as string) /
					3600;
				const result = arg1 / arg2;
				this.data[genProperty.name][i] = isNaN(result)
					? ""
					: result.toFixed(2);
			}
		});
	}

	addAggregationToTable(properties: Property[]) {
		properties.forEach((property) => {
			const arrayWithoutEmpty = this.data[property.name].filter(
				(item) => !!item
			);
			if (
				Validation.isArrayNumber(arrayWithoutEmpty) ||
				Validation.isArrayBoolean(arrayWithoutEmpty)
			) {
				const aggregationValue = this.aggregation.call(
					arrayWithoutEmpty,
					property.aggregation
				);
				this.data[property.name].push(aggregationValue);
				return;
			}
			if (Validation.isArrayTime(arrayWithoutEmpty)) {
				const aggregationValue = this.aggregation.call(
					arrayWithoutEmpty.map(fromHhMmSsToSeconds),
					property.aggregation
				);
				this.data[property.name].push(
					fromSecondsToHhMmSs(aggregationValue)
				);
				return;
			}
		});

		this.addGenerateProperties(properties);
		this.headers.push("Итого");
	}

	sliceColumns(start?: number, end?: number): Table {
		this.headers = this.headers.slice(start, end);
		Object.entries(this.data).map(([propertyName, propertyValues]) => {
			this.data[propertyName] = propertyValues.slice(start, end);
		});
		return this;
	}

	render() {
		const th = this.headers
			.map((header) => {
				const newHeader =
					header instanceof Date
						? `${header.getDate()} ${weekDays[header.getDay()]}`
						: header;

				return `<th>${newHeader}</th>`;
			})
			.join("");
		const tr = Object.entries(this.data)
			.map(
				([key, arr]) => `
				<tr>
					<th>${key}</th>
					${arr.map((item) => `<td>${item ?? ""}</td>`).join("")}
				</tr>`
			)
			.join("");

		return `
			<table>
				<thead>
					<tr><th>Параметры</th>${th}</tr>
				<thead>
				<tbody>
					${tr}
				</tbody>
			</table
			`;
	}

	static createFromColsRows({
		cols,
		rows,
	}: {
		cols: DayData[];
		rows: Property[];
	}): Table {
		const headers = [...cols.map((item) => item.date)];

		const tableData = cols.reduce((table, col) => {
			rows.forEach((row) => {
				if (table[row.name]) {
					table[row.name].push(col.properties[row.name]);
				} else {
					table[row.name] = [col.properties[row.name]];
				}
			});
			return table;
		}, {} as ITable["data"]);

		if (Object.entries(tableData).length === 0) {
			return new Table([], {});
		}

		const table = new Table(headers, tableData);
		const generatedProperties = rows.filter(
			(property) => !!property.generate && property.generate.length === 2
		);
		table.addGenerateProperties(generatedProperties);

		const hasAggregation = rows.some((property) => !!property.aggregation);

		if (!hasAggregation) {
			return table;
		}

		table.addAggregationToTable(rows);

		return table;
	}

	static mergeTables(tables: Table[]): Table {
		const newTable = new Table([], {});
		tables.forEach((table) => {
			table.headers.forEach((header) => {
				newTable.headers
					? newTable.headers.push(header)
					: (newTable.headers = [header]);
			});
			Object.entries(table.data).forEach(([propertyName, arr]) => {
				arr.forEach((item) => {
					newTable.data[propertyName]
						? newTable.data[propertyName].push(item)
						: (newTable.data[propertyName] = [item]);
				});
			});
		});
		return newTable;
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
