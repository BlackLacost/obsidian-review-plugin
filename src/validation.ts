import { TFile } from "obsidian";
import { YamlValue } from "./main";
import { Table } from "./table";

export class Validation {
	static isString(item: unknown): item is string {
		return typeof item === "string";
	}

	static isTime(item: unknown): item is string {
		if (typeof item !== "string") return false;
		return !!item.match(/(\d+):(\d\d):(\d\d)/);
	}

	static isNumber(item: YamlValue): item is number {
		return typeof item === "number";
	}

	static isBoolean(item: YamlValue): item is boolean {
		return typeof item === "boolean";
	}

	static isArrayTime(arr: YamlValue[]): arr is string[] {
		return arr.every((item) => this.isTime(item));
	}

	static isArrayNumber(arr: YamlValue[]): arr is number[] {
		return arr.every((item) => this.isNumber(item));
	}

	static isArrayBoolean(arr: YamlValue[]): arr is number[] {
		return arr.every((item) => this.isBoolean(item));
	}

	static areAllFilesDailyNotes(files: TFile[]): boolean {
		return files.every((file) => this.isFileDailyNotes(file));
	}

	static isFileDailyNotes(file: TFile): boolean {
		return file.basename.match(/^\d\d\d\d-\d\d-\d\d$/) !== null;
	}

	static isTable(item: unknown): item is Table {
		return item instanceof Table;
	}
}
