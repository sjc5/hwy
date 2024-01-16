/////////////////////////////////////
// LOGGERS

import pc from "picocolors";

export function hwyLog(...args: any[]) {
  if (args[0] === "WARN") {
    const [_, ...rest] = args;
    console.log(
      "\n" + pc.bold(pc.bgYellow(pc.black(` Hwy --- START WARNING --- `))),
    );
    console.log("\n" + rest.join("\n\n") + "\n");
    console.log(
      pc.bold(pc.bgYellow(pc.black(` Hwy ---- END WARNING ---- `))),
      "\n",
    );
    return;
  }
  console.log("\n" + pc.bold(pc.bgGreen(pc.black(` Hwy `))), ...args, "\n");
}

export function logPerf(task_name: string, p0: number, p1: number) {
  hwyLog(`Completed ${task_name} in ${Math.round(p1 - p0).toFixed(0)}ms.`);
}
