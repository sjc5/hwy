export const abortControllers = new Map<string, AbortController>();

export function handleAbortController(key: string) {
	const needsAbort = abortControllers.has(key);
	if (needsAbort) {
		const controller = abortControllers.get(key);
		controller?.abort();
		abortControllers.delete(key);
	}
	const newController = new AbortController();
	abortControllers.set(key, newController);
	return { abortController: newController, didAbort: needsAbort };
}
