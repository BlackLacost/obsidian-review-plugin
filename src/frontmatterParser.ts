import { FrontMatterCache } from "obsidian";
import { z } from "zod";

type YamlScalar = string | number | boolean | null;
type YamlArray = YamlValue[];
type YamlObject = { [key: string]: YamlValue };

export type YamlValue = YamlScalar | YamlArray | YamlObject;

const YamlScalarSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
]);
const YamlArraySchema = z.array(z.lazy(() => YamlValueSchema));
const YamlObjectSchema: z.ZodType<YamlObject> = z.record(
	z.string(),
	z.lazy(() => YamlValueSchema)
);

const YamlValueSchema: z.ZodType<YamlValue> = z.union([
	YamlScalarSchema,
	YamlArraySchema,
	YamlObjectSchema,
]);
const FrontMatterSchema = z.record(z.string(), YamlValueSchema);

export type FrontMatter = z.infer<typeof FrontMatterSchema>;

export class FrontMatterParser {
	static parse(frontmatter: FrontMatterCache): FrontMatter {
		const result = FrontMatterSchema.safeParse(frontmatter);
		if (!result.success) {
			console.error(result.error);
			throw new Error(JSON.stringify(result.error.flatten().fieldErrors));
		}
		return result.data;
	}
}
