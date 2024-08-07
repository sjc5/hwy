import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const dirsInSlashPackages = ["client", "create", "react", "lit"];

function getCurrentPkgJSONs() {
  return dirsInSlashPackages.map((pkgDirname) => {
    return JSON.parse(fs.readFileSync(pkgDirnameToPath(pkgDirname), "utf-8"));
  });
}

function saveNewPkgJSONs(newVersion) {
  const pkgJSONs = getCurrentPkgJSONs();

  const currentVersion = confirmAndGetCurrentVersion();

  const newPkgJSONsStringified = pkgJSONs.map((pkgJSON) => {
    return (
      JSON.stringify(pkgJSON, null, 2).replace(
        `"version": "${currentVersion}"`,
        `"version": "${newVersion}"`,
      ) + "\n"
    );
  });

  dirsInSlashPackages.forEach((pkgDirname, i) => {
    fs.writeFileSync(
      pkgDirnameToPath(pkgDirname),
      newPkgJSONsStringified[i],
      "utf-8",
    );
  });

  console.log(
    `\nSaved new package versions.\n\n❌ Old versions: ${currentVersion}.\n\n✅ New versions: ${newVersion}.\n`,
  );
}

function confirmAndGetCurrentVersion(shouldLog = false) {
  const pkgJSONs = getCurrentPkgJSONs();

  const versions = pkgJSONs.map((pkgJSON) => pkgJSON.version);

  if (versions.some((v) => v !== versions[0])) {
    throw new Error("Package versions are not all the same.");
  }

  if (shouldLog) {
    console.log(`Current version is ${versions[0]}.\n`);
  }

  return versions[0];
}

function bumpToNewPatch() {
  const currentVersion = confirmAndGetCurrentVersion();

  const [major, minor, patch] = currentVersion.split(".").map(Number);

  const newVersion = `${major}.${minor}.${patch + 1}`;

  saveNewPkgJSONs(newVersion);
}

function bumpToNewMinor() {
  const currentVersion = confirmAndGetCurrentVersion();

  const [major, minor] = currentVersion.split(".").map(Number);

  const newVersion = `${major}.${minor + 1}.0`;

  saveNewPkgJSONs(newVersion);
}

function bumpToNewMajor() {
  const currentVersion = confirmAndGetCurrentVersion();

  const [major] = currentVersion.split(".").map(Number);

  const newVersion = `${major + 1}.0.0`;

  saveNewPkgJSONs(newVersion);
}

function throwIfAlreadyPre() {
  const currentVersion = confirmAndGetCurrentVersion();

  if (currentVersion.includes("-")) {
    throw new Error("Current version already has a pre suffix.");
  }
}

function addPre() {
  throwIfAlreadyPre();

  const currentVersion = confirmAndGetCurrentVersion();

  const [major, minor, patch] = currentVersion.split(".").map(Number);

  const newVersion = `${major}.${minor}.${patch}-pre.0`;

  saveNewPkgJSONs(newVersion);
}

function throwIfNotPre() {
  const currentVersion = confirmAndGetCurrentVersion();

  if (!currentVersion.includes("-")) {
    throw new Error("Current version does not have a pre suffix.");
  }
}

function bumpPre() {
  throwIfNotPre();

  const currentVersion = confirmAndGetCurrentVersion();

  const [major, minor, patch, pre] = currentVersion
    .split(".")
    .map((v) => (v.includes("-") ? v.split("-")[0] : v))
    .map(Number);

  const newVersion = `${major}.${minor}.${patch}-pre.${pre + 1}`;

  saveNewPkgJSONs(newVersion);
}

function removePre() {
  throwIfNotPre();

  const currentVersion = confirmAndGetCurrentVersion();

  const [major, minor, patch] = currentVersion
    .split(".")
    .map((v) => (v.includes("-") ? v.split("-")[0] : v));

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
    rl.question(`Enter new version: `, (answer) => {
      resolve(answer);
      rl.close();
    });
  }).then((newVersion) => {
    saveNewPkgJSONs(newVersion);
  });
}

function pkgDirnameToPath(pkgDirname) {
  return path.join(
    process.cwd(),
    "packages",
    "npm",
    pkgDirname,
    "package.json",
  );
}

export {
  addPre,
  bumpPre,
  bumpToNewMajor,
  bumpToNewMinor,
  bumpToNewPatch,
  confirmAndGetCurrentVersion,
  removePre,
  setVersion,
};
