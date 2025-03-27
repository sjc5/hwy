/**
 * Performs a deep equality comparison of two JSON-compatible values.
 * Handles null, undefined, primitives, arrays, and plain objects, recursively.
 * Does not support Maps, Sets, Functions, or other non-JSON types.
 */
export function jsonDeepEquals(a: unknown, b: unknown): boolean {
	// Tautology
	if (a === b) {
		return true;
	}

	// If both were null or both were undefined, we would have early returned above.
	// So if either at this point is loosely null, we know they're not equal.
	if (a == null || b == null) {
		return false;
	}

	// If types are different, we know they're not equal.
	if (typeof a !== typeof b) {
		return false;
	}

	const aIsArray = Array.isArray(a);
	const bIsArray = Array.isArray(b);

	// If one is an array and the other is not, we know they're not equal.
	if (aIsArray !== bIsArray) {
		return false;
	}

	// Handle arrays
	if (aIsArray && bIsArray) {
		if (a.length !== b.length) {
			return false;
		}
		return a.every((item, index) => jsonDeepEquals(item, b[index]));
	}

	// Handle objects
	if (typeof a === "object" && typeof b === "object") {
		const aKeys = Object.keys(a as object);
		const bKeys = Object.keys(b as object);

		if (aKeys.length !== bKeys.length) {
			return false;
		}

		return aKeys.every((key) => {
			return Object.hasOwn(b, key) && jsonDeepEquals((a as any)[key], (b as any)[key]);
		});
	}

	return false;
}
