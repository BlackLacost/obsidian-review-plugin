export class YamlParserError extends Error {
	constructor(message: string) {
		super("YamlParse: " + message);
	}
}

export class RenderCodeError extends Error {
	constructor(message: string) {
		super("RenderCode: " + message);
	}
}

export class ReviewError extends Error {
	constructor(message: string) {
		super("Review: " + message);
	}
}

export class SettingsError extends Error {
	constructor(message: string) {
		super("Settings: " + message);
	}
}

export class PropertyError extends Error {
	constructor(message: string) {
		super("Property: " + message);
	}
}

export class MainError extends Error {
	constructor(message: string) {
		super("Main: " + message);
	}
}
