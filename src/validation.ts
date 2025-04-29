import { TFile } from "obsidian";
import { Table } from "./table";

export class Validation {
	static isString(item: unknown): item is string {
		return typeof item === "string";
	}

	static isTime(item: unknown): item is string {
		if (typeof item !== "string") return false;
		return !!item.match(/(\d+):(\d\d):(\d\d)/);
	}

	static isNumber(item: unknown): item is number {
		return typeof item === "number";
	}

	static isBoolean(item: unknown): item is boolean {
		return typeof item === "boolean";
	}

	static isDate(item: unknown): item is Date {
		return item instanceof Date;
	}

	static isArrayTime(arr: unknown[]): arr is string[] {
		return arr.every((item) => this.isTime(item));
	}

	static isArrayNumber(arr: unknown[]): arr is number[] {
		return arr.every((item) => this.isNumber(item));
	}

	static isArrayString(arr: unknown): arr is string[] {
		if (!Array.isArray(arr)) return false;
		return arr.every((item) => this.isString(item));
	}

	static isArrayBoolean(arr: unknown[]): arr is boolean[] {
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
