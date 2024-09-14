import type { ScrollState } from "../../common/index.mjs";

const scrollStateMapKey = "__hwy__scrollStateMap";
type ScrollStateMap = Map<string, ScrollState>;

function getScrollStateMapFromLocalStorage() {
	const scrollStateMapString = localStorage.getItem(scrollStateMapKey);
	let scrollStateMap: ScrollStateMap;
	if (scrollStateMapString) {
		scrollStateMap = new Map(JSON.parse(scrollStateMapString));
	} else {
		scrollStateMap = new Map();
	}
	return scrollStateMap;
}

function setScrollStateMapToLocalStorage(newScrollStateMap: ScrollStateMap) {
	localStorage.setItem(
		scrollStateMapKey,
		JSON.stringify(Array.from(newScrollStateMap.entries())),
	);
}

function setScrollStateMapSubKey(key: string, value: ScrollState) {
	const scrollStateMap = getScrollStateMapFromLocalStorage();
	scrollStateMap.set(key, value);

	// if new item would brought it over 50 entries, delete the oldest one
	if (scrollStateMap.size > 50) {
		const oldestKey = Array.from(scrollStateMap.keys())[0];
		scrollStateMap.delete(oldestKey);
	}

	setScrollStateMapToLocalStorage(scrollStateMap);
}

function readScrollStateMapSubKey(key: string) {
	const scrollStateMap = getScrollStateMapFromLocalStorage();
	return scrollStateMap.get(key);
}

export const scrollStateMapSubKey = {
	read: readScrollStateMapSubKey,
	set: setScrollStateMapSubKey,
};
