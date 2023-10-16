import { DEFAULT_PORT } from "../../common/index.mjs";

// WIP

const ts = `
import type { HwyConfig } from "@hwy-js/build";

export default {
  dev: {
    port: ${DEFAULT_PORT},
    watchExclusions: ["src/styles/tw-output.bundle.css"],
  },
  deploymentTarget: "vercel-lambda",
} satisfies HwyConfig;
`;

const js = `
/** @type {import('@hwy-js/build').HwyConfig} */
export default {
  dev: {
    port: ${DEFAULT_PORT},
    watchExclusions: ["src/styles/tw-output.bundle.css"],
  },
  deploymentTarget: "vercel-lambda",
};
`;
