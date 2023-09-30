import pc from "picocolors";

function hwy_log(...args: any[]) {
  console.log("\n" + pc.bold(pc.bgGreen(pc.black(` Hwy `))), ...args, "\n");
}

function log_perf(task_name: string, p0: number, p1: number) {
  console.log(
    `Completed ${task_name} in ${Math.round(p1 - p0).toFixed(0)}ms.\n`
  );
}

export { hwy_log, log_perf };
