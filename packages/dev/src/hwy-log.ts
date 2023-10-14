import pc from "picocolors";

function hwyLog(...args: any[]) {
  console.log("\n" + pc.bold(pc.bgGreen(pc.black(` Hwy `))), ...args, "\n");
}

function logPerf(task_name: string, p0: number, p1: number) {
  hwyLog(`Completed ${task_name} in ${Math.round(p1 - p0).toFixed(0)}ms.`);
}

export { hwyLog, logPerf };
