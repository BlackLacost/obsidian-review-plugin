import { parse } from "yaml";
import { z } from "zod";
import { YamlParserError } from "./error";

const aggregationSchema = z.union([
	z.literal("min"),
	z.literal("max"),
	z.literal("sum"),
	z.literal("avg"),
]);

export type Aggregation = z.infer<typeof aggregationSchema>;

const propertySchema = z.object({
	name: z.string(),
	aggregation: aggregationSchema.optional(),
	generate: z.tuple([z.string(), z.string()]).optional(),
});
export type Property = z.infer<typeof propertySchema>;

const YamlRenderDataSchema = z.object({
	table: propertySchema.array().optional(),
	list: z.string().optional(),
});

export type YamlData = z.infer<typeof YamlRenderDataSchema>;

export class YamlParser {
	parse(source: string) {
		const yamlData = parse(source);
		const result = YamlRenderDataSchema.safeParse(yamlData);
		if (!result.success) {
			const error = result.error.flatten().fieldErrors;
			throw new YamlParserError(JSON.stringify(error));
		}
		return result.data;
	}
}
