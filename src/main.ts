import {
	App,
	MarkdownView,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
import { RenderCodeError } from "./error";
import { Review } from "./review";
import { YamlParser } from "./yamlParser";

interface ReviewPluginSettings {
	dailyFolder: string;
}

export interface DayData {
	date: string;
	weekNumber: number;
	weekDay: number;
	properties: Record<string, unknown>;
}

const DEFAULT_SETTINGS: ReviewPluginSettings = {
	dailyFolder: "daily",
};

export default class ReviewPlugin extends Plugin {
	settings: ReviewPluginSettings;

	yaml = new YamlParser();

	// async activateView() {
	// 	const { workspace } = this.app;

	// 	let leaf: WorkspaceLeaf | null = null;
	// 	const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

	// 	if (leaves.length > 0) {
	// 		// A leaf with our view already exists, use that
	// 		leaf = leaves[0];
	// 	} else {
	// 		// Our view could not be found in the workspace, create a new leaf
	// 		// in the right sidebar for it
	// 		leaf = workspace.getRightLeaf(false);
	// 		await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
	// 	}

	// 	// "Reveal" the leaf in case it is in a collapsed sidebar
	// 	workspace.revealLeaf(leaf);
	// }

	async onload() {
		console.log("loading review plugin");

		await this.loadSettings();

		// this.registerView(VIEW_TYPE_EXAMPLE, (leaf) => new ExampleView(leaf));

		// const ribbonIconEl = this.addRibbonIcon("dice", "Activate view", () => {
		// 	this.activateView();
		// 	new Notice("Hello, world!");
		// });

		// This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon(
		// 	"dice",
		// 	"Sample Plugin",
		// 	(evt: MouseEvent) => {
		// 		// Called when the user clicks the icon.
		// 		new Notice("This is a notice!");
		// 	}
		// );
		// ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText("Week Review");

		// This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: "open-sample-modal-simple",
		// 	name: "Open sample modal (simple)",
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	},
		// });
		// This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: "sample-editor-command",
		// 	name: "Sample editor command",
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection("Sample Editor Command");
		// 	},
		// });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: "open-sample-modal-complex",
		// 	name: "Open sample modal (complex)",
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView =
		// 			this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	},
		// });

		this.addSettingTab(new ReviewSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, "click", (evt: MouseEvent) => {
		// 	console.log("click", evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(
		// 	window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		// );

		this.registerMarkdownCodeBlockProcessor(
			"review",
			async (source, el, ctx) => {
				try {
					const review = new Review(
						this.getDailyFilesFromDailyFolder(),
						this.getActiveFile(),
						this.yaml.parse(source),
						this.getDayDataFromFile.bind(this)
					);

					this.renderHTML(el, review.week());
				} catch (e) {
					if (e instanceof Error) {
						el.innerHTML = `<strong style="color: red;">${e.message}</strong>`;
					}
					console.log(e);
				}
			}
		);
	}

	onunload() {
		console.log("unloading review plugin");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private renderHTML(
		el: HTMLElement,
		{
			currentWeekNumber,
			table,
			list,
		}: {
			currentWeekNumber: number;
			table?: {
				headers: string[];
				data: Record<string, any[]>;
			};
			list?: {
				header: string;
				data: string[];
			};
		}
	) {
		const tableUi = table ? this.tableUi(table) : "";
		const listUi = list && list.data.length > 0 ? this.listUi(list) : "";
		el.innerHTML = `
					<h2>Week Review №${currentWeekNumber}</h2>

					${tableUi}

					${listUi}
					`;
	}

	private tableUi(table: { headers: string[]; data: Record<string, any[]> }) {
		const ths = table.headers
			.map((header: any) => `<th>${header}</th>`)
			.join("");
		const trs = Object.entries(table.data)
			.map(
				([key, arr]: [string, any[]]) => `
				<tr>
					<td>${key}</td>
					${arr.map((item) => `<td>${item ?? ""}</td>`).join("")}
				</tr>`
			)
			.join("");

		return `
			<table>
				<thead>
					<tr>${ths}</tr>
				<thead>
				<tbody>
					${trs}
				</tbody>
			</table
			`;
	}

	private listUi(list: { header: string; data: string[] }) {
		const liList = list.data.map((item) => `<li>${item}</li>`).join("");
		return `<h3>${list.header}</h3>
		<ul>
			${liList}
		</ul>
		`;
	}

	private getDailyFilesFromDailyFolder(): TFile[] {
		const dailyFolder = this.app.vault.getFolderByPath(
			this.settings.dailyFolder
		);
		if (!dailyFolder) return [];
		const result = dailyFolder.children
			.map((file) => this.app.vault.getFileByPath(file.path))
			.filter((file) => !!file);
		return result;
	}

	private getDayDataFromFile(file: TFile): DayData {
		const metadata = this.app.metadataCache.getFileCache(file);
		if (!metadata) throw new RenderCodeError(`No metadata in ${file}`);
		const { frontmatter } = metadata;
		return {
			date: file.basename,
			weekNumber: new Date(file.basename).getWeek(),
			weekDay: new Date(file.basename).getDay(),
			properties: {
				...(frontmatter && { ...frontmatter }),
			},
		};
	}

	private getActiveFile(): TFile {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

		if (!activeView) {
			throw new RenderCodeError("Active View not found");
		}
		if (!activeView.file) {
			throw new RenderCodeError("Active Found not found");
		}
		return activeView.file;
	}
}

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const { contentEl } = this;
// 		contentEl.setText("Woah!");
// 	}

// 	onClose() {
// 		const { contentEl } = this;
// 		contentEl.empty();
// 	}
// }

class ReviewSettingTab extends PluginSettingTab {
	plugin: ReviewPlugin;

	constructor(app: App, plugin: ReviewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Daily Folder")
			.setDesc("Folder with daily notes")
			.addText((text) =>
				text
					.setPlaceholder("Enter folder name")
					.setValue(this.plugin.settings.dailyFolder)
					.onChange(async (value) => {
						this.plugin.settings.dailyFolder = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

// export const VIEW_TYPE_EXAMPLE = "example-view";

// export class ExampleView extends ItemView {
// 	constructor(leaf: WorkspaceLeaf) {
// 		super(leaf);
// 	}

// 	getViewType() {
// 		return VIEW_TYPE_EXAMPLE;
// 	}

// 	getDisplayText() {
// 		return "Example view";
// 	}

// 	async onOpen() {
// 		const container = this.containerEl.children[1];
// 		container.empty();
// 		container.createEl("h4", { text: "Example view" });
// 	}

// 	async onClose() {
// 		// Nothing to clean up.
// 	}
// }

Date.prototype.getWeek = function () {
	const date = new Date(this.getTime());
	date.setHours(0, 0, 0, 0);
	// Thursday in current week decides the year.
	date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
	// January 4 is always in week 1.
	const week1 = new Date(date.getFullYear(), 0, 4);
	// Adjust to Thursday in week 1 and count number of weeks from date to week1.
	return (
		1 +
		Math.round(
			((date.getTime() - week1.getTime()) / 86400000 -
				3 +
				((week1.getDay() + 6) % 7)) /
				7
		)
	);
};
