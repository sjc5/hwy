import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

const dirsInSlashPackages = ["client", "react"]; // "create"
const preSuffix = "-pre";

function getCurrentPkgJSONs() {
	return dirsInSlashPackages.map((pkgDirname) => {
		const unparsed = fs.readFileSync(pkgDirnameToPath(pkgDirname), "utf-8");

		const parsed = JSON.parse(unparsed);
		if (!validateParsedPkgJSONFile(parsed)) {
			throw new Error("Parsed package.json is invalid.");
		}

		return { parsed, unparsed };
	});
}

function validateParsedPkgJSONFile(parsed: any): parsed is { version: string } {
	if (typeof parsed !== "object") return false;
	if (typeof parsed.version !== "string") return false;
	if (!parsed.version) return false;
	return true;
}

function saveNewPkgJSONs(newVersion: string) {
	const pkgJSONs = getCurrentPkgJSONs();

	const currentVersion = confirmAndGetCurrentVersion();

	const newPkgJSONsStringified = pkgJSONs.map((pkgJSON) => {
		return pkgJSON.unparsed.replace(`"version": "${currentVersion}"`, `"version": "${newVersion}"`);
	});

	dirsInSlashPackages.forEach((pkgDirname, i) => {
		const data = newPkgJSONsStringified[i];
		if (!data) {
			throw new Error("Data is empty.");
		}
		fs.writeFileSync(pkgDirnameToPath(pkgDirname), data, "utf-8");
	});

	console.log("Saved new package version.");
	console.log(`❌ Old version: ${currentVersion}`);
	console.log(`✅ New version: ${newVersion}`);
}

function confirmAndGetCurrentVersion(shouldLog = false) {
	const pkgJSONs = getCurrentPkgJSONs();

	const versions = pkgJSONs.map((pkgJSON) => pkgJSON.parsed.version);

	if (versions.some((v) => v !== versions[0])) {
		throw new Error("Package versions are not all the same.");
	}

	if (shouldLog) {
		console.log(`Current version is ${versions[0]}.`);
		console.log();
	}

	const currentVersion = versions[0];
	if (!currentVersion) {
		throw new Error("Current version is an empty string.");
	}

	return currentVersion;
}

function versionStrToTypedTuple(version: string): [number, number, number, number | undefined] {
	let [majorStr, minorStr, patchStr, preStr] = version.split(".");

	patchStr = patchStr?.replace(preSuffix, "") ?? patchStr;

	if (!majorStr || !minorStr || !patchStr) {
		throw new Error("Version is not in the correct format.");
	}

	const major = Number(majorStr);
	const minor = Number(minorStr);
	if (Number.isNaN(major) || Number.isNaN(minor)) {
		throw new Error("Version is not in the correct format.");
	}

	const patch = Number(patchStr);
	if (Number.isNaN(patch)) {
		throw new Error("Version is not in the correct format.");
	}

	const pre = preStr ? Number(preStr) : undefined;

	return [major, minor, patch, pre];
}

function bumpToNewPatch() {
	const currentVersion = confirmAndGetCurrentVersion();
	const [major, minor, patch] = versionStrToTypedTuple(currentVersion);
	const newVersion = `${major}.${minor}.${patch + 1}`;
	saveNewPkgJSONs(newVersion);
}

function bumpToNewMinor() {
	const currentVersion = confirmAndGetCurrentVersion();
	const [major, minor] = versionStrToTypedTuple(currentVersion);
	const newVersion = `${major}.${minor + 1}.0`;
	saveNewPkgJSONs(newVersion);
}

function bumpToNewMajor() {
	const currentVersion = confirmAndGetCurrentVersion();
	const [major] = versionStrToTypedTuple(currentVersion);
	const newVersion = `${major + 1}.0.0`;
	saveNewPkgJSONs(newVersion);
}

function throwIfAlreadyPre() {
	const currentVersion = confirmAndGetCurrentVersion();
	if (currentVersion.includes(preSuffix)) {
		throw new Error("Current version already has a pre suffix.");
	}
}

function addPre() {
	throwIfAlreadyPre();
	const currentVersion = confirmAndGetCurrentVersion();
	const [major, minor, patch] = versionStrToTypedTuple(currentVersion);
	const newVersion = `${major}.${minor}.${patch}${preSuffix}.0`;
	saveNewPkgJSONs(newVersion);
}

function throwIfNotPre() {
	const currentVersion = confirmAndGetCurrentVersion();
	if (!currentVersion.includes(preSuffix)) {
		throw new Error("Current version does not have a pre suffix.");
	}
}

function bumpPre() {
	throwIfNotPre();
	const currentVersion = confirmAndGetCurrentVersion();
	const [major, minor, patch, pre] = versionStrToTypedTuple(currentVersion);
	if (typeof pre !== "number") {
		throw new Error("Pre version is not a number.");
	}
	const newVersion = `${major}.${minor}.${patch}${preSuffix}.${pre + 1}`;
	saveNewPkgJSONs(newVersion);
}

function removePre() {
	throwIfNotPre();
	const currentVersion = confirmAndGetCurrentVersion();
	const [major, minor, patch] = versionStrToTypedTuple(currentVersion);
	const newVersion = `${major}.${minor}.${patch}`;
	saveNewPkgJSONs(newVersion);
}

function setVersion() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	confirmAndGetCurrentVersion(true);

	new Promise((resolve) => {
		rl.question("Enter new version: ", (answer) => {
			resolve(answer);
			rl.close();
		});
	}).then((newVersion) => {
		if (typeof newVersion !== "string") {
			throw new Error("New version must be a string.");
		}
		saveNewPkgJSONs(newVersion);
	});
}

function pkgDirnameToPath(pkgDirname: string) {
	return path.join(process.cwd(), "packages", "npm", pkgDirname, "package.json");
}

const cmdToFnMap = {
	"--add-pre": addPre,
	"--remove-pre": removePre,
	"--bump-pre": bumpPre,
	"--bump-patch": bumpToNewPatch,
	"--bump-minor": bumpToNewMinor,
	"--bump-major": bumpToNewMajor,
	"--current-version": () => confirmAndGetCurrentVersion(true),
	"--set-version": setVersion,
} as const;

function isFlagValid(flag: string): flag is keyof typeof cmdToFnMap {
	return Object.keys(cmdToFnMap).includes(flag);
}

function main() {
	const flag = process.argv[2];

	if (typeof flag !== "string") {
		throw new Error("Flag is missing.");
	}

	if (!isFlagValid(flag)) {
		throw new Error(
			`Invalid flag. Must be one of: ${Object.keys(cmdToFnMap)
				.map((k) => `"${k}"`)
				.join(", ")}.`,
		);
	}

	cmdToFnMap[flag]();
}

main();
