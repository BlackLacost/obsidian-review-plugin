import { parse } from "yaml";
import { AggregationType } from "./aggregation";
import { YamlParserError } from "./error";

export interface Property {
	name: string;
	aggregation?: AggregationType;
	generate?: [property1: string, property2: string];
}

export interface YamlData {
	table?: Property[];
	list?: Property["name"];
}

export class YamlParser {
	private validateProperty(property: any): property is Property {
		const isValidName = typeof property.name === "string";
		const isValidAggregation =
			typeof property.aggregation === "undefined" ||
			typeof property.aggregation === "string";
		const isValidGenerate =
			typeof property.generate === "undefined" ||
			(Array.isArray(property.generate) &&
				property.generate.every(
					(item: any) => typeof item === "string"
				));

		const isValid = isValidName && isValidAggregation && isValidGenerate;
		if (!isValid) {
			throw new YamlParserError("Invalid properties");
		}
		return isValid;
	}

	private validateYamlData(data: any): data is YamlData {
		if (data === null) {
			throw new YamlParserError("Add code");
		}

		if (typeof data !== "object") {
			throw new YamlParserError("Code should be yaml");
		}

		if (typeof data.table !== "undefined" && !Array.isArray(data.table)) {
			throw new YamlParserError("Table properties should be array");
		}

		if (typeof data.list !== "undefined" && typeof data.list !== "string") {
			throw new YamlParserError("List property should be string");
		}
		if (typeof data.table !== "undefined") {
			return data.table.every((prop: any) => this.validateProperty(prop));
		}
		return true;
	}

	parse(source: string) {
		const yamlData = parse(source);
		this.validateYamlData(yamlData);
		return yamlData as YamlData;
	}
}
