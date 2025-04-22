import { parse } from "yaml";
import { AggregationType } from "./aggregation";
import { RenderCodeError } from "./error";

export interface Property {
	name: string;
	aggregation?: AggregationType;
	generate?: [property1: string, property2: string];
}

export interface YamlData {
	properties: Property[];
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
			throw new RenderCodeError("Invalid properties");
		}
		return isValid;
	}

	private validateYamlData(data: any): data is YamlData {
		if (data === null) {
			throw new RenderCodeError("Add code");
		}

		if (typeof data !== "object") {
			throw new RenderCodeError("Code should be yaml");
		}

		if (!Array.isArray(data.properties)) {
			throw new RenderCodeError("Properties should be array");
		}
		return data.properties.every((prop: any) =>
			this.validateProperty(prop)
		);
	}

	parse(source: string) {
		const yamlData = parse(source);
		this.validateYamlData(yamlData);
		return yamlData as YamlData;
	}
}
