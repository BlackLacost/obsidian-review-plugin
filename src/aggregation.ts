export type AggregationType = "min" | "max" | "sum" | "avg";

export class Aggregation {
	call(arr: number[], type?: AggregationType) {
		if (type === "min") return this.min(arr);
		if (type === "max") return this.max(arr);
		if (type === "sum") return this.sum(arr);
		if (type === "avg") return this.avg(arr);
		return this.sum(arr);
	}

	min(arr: number[]) {
		return arr.reduce(
			(prev, curr) => (curr <= prev ? curr : prev),
			Infinity
		);
	}

	max(arr: number[]) {
		return arr.reduce(
			(prev, curr) => (curr >= prev ? curr : prev),
			-Infinity
		);
	}

	sum(arr: number[]) {
		return arr.reduce((prev, curr) => curr + prev, 0);
	}

	avg(arr: number[]) {
		return this.sum(arr) / arr.length;
	}
}
