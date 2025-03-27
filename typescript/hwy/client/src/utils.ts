/////////////////////////////////////////////////////////////////////
// GENERAL UTILS
/////////////////////////////////////////////////////////////////////

export function isAbortError(error: unknown) {
	return error instanceof Error && error.name === "AbortError";
}

export function LogInfo(message?: any, ...optionalParams: any[]) {
	console.log("HWY:", message, ...optionalParams);
}

export function LogError(message?: any, ...optionalParams: any[]) {
	console.error("HWY:", message, ...optionalParams);
}

export function Panic(msg?: string): never {
	LogError("Panic");
	throw new Error(msg ?? "panic");
}
