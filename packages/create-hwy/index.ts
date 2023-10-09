import * as fs from "node:fs";
import * as path from "node:path";
import pc from "picocolors";
import inquirer from "inquirer";
import { fileURLToPath } from "node:url";
import { Options } from "./src/types.js";
import {
  LATEST_HWY_VERSION,
  get_package_json,
} from "./src/get-package-json.js";
import { get_tailwind_config } from "./src/get-tailwind-config.js";
import { get_ts_config } from "./src/get-tsconfig.js";
import { get_readme } from "./src/get-readme.js";
import { get_main } from "./src/get-main.js";
import { transform } from "detype";
import { get_gitignore } from "./src/get-gitignore.js";
import { get_client_entry } from "./src/get-client-entry.js";
import { get_is_target_deno } from "./src/utils.js";
import { format } from "prettier";

function dirname_from_import_meta(import_meta_url: string) {
  return path.dirname(fileURLToPath(import_meta_url));
}

const lang_choices = ["TypeScript", "JavaScript"] as const;

const deployment_choices = [
  "Node",
  "Bun",
  "Vercel (Node Serverless)",
  "Deno Deploy",
  "Deno",
] as const;

const css_choices = ["Tailwind", "Vanilla"] as const;

type Prompts = Parameters<(typeof inquirer)["prompt"]>[0];

const prompts = [
  {
    type: "",
    name: "new_dir_name",
    message: `Enter a name for your project's new directory:`,
    prefix: "\n",
    validate: (dirname: string) => {
      const invalidCharacters = /[<>:"\/\\|?*\x00-\x1F ]/;
      return !!dirname && !invalidCharacters.test(dirname);
    },
  },
  {
    type: "list",
    name: "lang_preference",
    message: "TypeScript or JavaScript?",
    choices: lang_choices,
    prefix: "\n",
  },
  {
    type: "list",
    name: "css_choice",
    message: `How do you feel about CSS?`,
    choices: css_choices,
    prefix: "\n",
  },
  {
    type: "list",
    name: "deployment_target",
    message: `Choose a deployment target (easy to change later):`,
    choices: deployment_choices,
    prefix: "\n",
  },
  {
    type: "confirm",
    name: "nprogress",
    message: "Should we add NProgress?",
    default: false,
    prefix: "\n",
  },
] satisfies Prompts;

async function main() {
  async function ask_questions(): Promise<
    | {
        new_dir_name: string;
        lang_preference: (typeof lang_choices)[number];
        css_choice: (typeof css_choices)[number];
        deployment_target: (typeof deployment_choices)[number];
        nprogress: boolean;
      }
    | undefined
  > {
    try {
      return await inquirer.prompt(prompts);
    } catch (error) {
      console.error("\nError:", error);
    }
  }

  const choices = await ask_questions();

  if (!choices) {
    console.log("\nSomething went wrong! Please file an issue.\n");
    return;
  }

  const options: Options = {
    project_name: choices.new_dir_name,
    with_nprogress: choices.nprogress,
    css_preference:
      choices.css_choice === "Tailwind"
        ? "tailwind"
        : choices.css_choice === "Vanilla"
        ? "vanilla"
        : "none",
    lang_preference:
      choices.lang_preference === "TypeScript" ? "typescript" : "javascript",
    deployment_target:
      choices.deployment_target === "Vercel (Node Serverless)"
        ? "vercel"
        : choices.deployment_target === "Deno Deploy"
        ? "deno_deploy"
        : choices.deployment_target === "Deno"
        ? "deno"
        : choices.deployment_target === "Bun"
        ? "bun"
        : "node",
  };

  console.log("\nWorking...");

  try {
    const new_dir_path = path.join(process.cwd(), choices.new_dir_name);

    if (
      fs.existsSync(new_dir_path) &&
      fs.statSync(new_dir_path).isDirectory()
    ) {
      throw new Error(`Directory ${new_dir_path} already exists.`);
    }

    // create all the folders we need
    fs.mkdirSync(new_dir_path, { recursive: true });
    fs.mkdirSync(path.join(new_dir_path, "src"), { recursive: true });
    fs.mkdirSync(path.join(new_dir_path, "public"), { recursive: true });
    fs.mkdirSync(path.join(new_dir_path, "src/styles"), { recursive: true });
    fs.mkdirSync(path.join(new_dir_path, "src/utils"), { recursive: true });
    fs.mkdirSync(path.join(new_dir_path, "src/pages"), { recursive: true });
    fs.mkdirSync(path.join(new_dir_path, "src/pages/__auth"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(new_dir_path, "src/pages/about"), {
      recursive: true,
    });

    // ts-config (still needed for JavaScript to do JSX)
    fs.writeFileSync(
      path.join(new_dir_path, "tsconfig.json"),
      await format(get_ts_config(options), {
        parser: "json",
      }),
      "utf8",
    );

    // tailwind-config
    if (options.css_preference === "tailwind") {
      fs.writeFileSync(
        path.join(
          new_dir_path,
          "tailwind.config" +
            (options.lang_preference === "typescript" ? ".ts" : ".js"),
        ),
        await format(get_tailwind_config(options), {
          parser:
            options.lang_preference === "typescript" ? "typescript" : "babel",
        }),
        "utf8",
      );
    }

    // readme
    fs.writeFileSync(
      path.join(new_dir_path, "README.md"),
      await format(get_readme(options), {
        parser: "markdown",
      }),
      "utf8",
    );

    // package-json
    fs.writeFileSync(
      path.join(new_dir_path, "package.json"),
      await format(get_package_json(options), {
        parser: "json",
      }),
      "utf8",
    );

    async function handle_ts_or_js_file_copy({
      code,
      destination_without_extension,
      is_jsx,
    }: {
      code: string;
      destination_without_extension: string;
      is_jsx: boolean;
    }) {
      const ts_ext = is_jsx ? ".tsx" : ".ts";
      if (options.lang_preference === "typescript") {
        fs.writeFileSync(
          path.join(new_dir_path, destination_without_extension + ts_ext),
          code,
          "utf8",
        );
      } else {
        const ext = is_jsx ? ".jsx" : ".js";
        let str = await transform(
          code,
          destination_without_extension + ts_ext,
          {
            prettierOptions: {},
          },
        );
        str = str.replaceAll(".tsx", ".jsx"); // modifies file references in tutorial copy
        fs.writeFileSync(
          path.join(new_dir_path, destination_without_extension + ext),
          str,
          "utf8",
        );
      }
    }

    // main
    await handle_ts_or_js_file_copy({
      code: await format(get_main(options), {
        parser:
          options.lang_preference === "typescript" ? "typescript" : "babel",
      }),
      destination_without_extension: "src/main",
      is_jsx: true,
    });

    // gitignore
    fs.writeFileSync(
      path.join(new_dir_path, ".gitignore"),
      get_gitignore(options),
      "utf8",
    );

    // client-entry
    await handle_ts_or_js_file_copy({
      code: await format(get_client_entry(options), {
        parser:
          options.lang_preference === "typescript" ? "typescript" : "babel",
      }),
      destination_without_extension: "src/client.entry",
      is_jsx: false,
    });

    const root_dir_path = path.join(
      dirname_from_import_meta(import.meta.url),
      `../`,
    );

    // public dir
    fs.cpSync(
      path.join(root_dir_path, "__public"),
      path.join(new_dir_path, "public"),
      { recursive: true },
    );

    // styles
    fs.cpSync(
      path.join(root_dir_path, "__common/styles/global.critical.css"),
      path.join(new_dir_path, "src/styles/global.critical.css"),
    );

    let standard_styles = fs.readFileSync(
      path.join(root_dir_path, "__common/styles/tw-input.css"),
      "utf8",
    );

    if (options.css_preference !== "tailwind") {
      standard_styles = standard_styles.replace(
        `@tailwind base;
@tailwind components;
@tailwind utilities;\n\n`,
        "",
      );
    }

    fs.writeFileSync(
      path.join(
        new_dir_path,
        "src/styles/" +
          (options.css_preference === "tailwind"
            ? "tw-input.css"
            : "global.bundle.css"),
      ),
      standard_styles,
      "utf8",
    );

    if (options.with_nprogress) {
      fs.cpSync(
        path.join(root_dir_path, "__common/styles/nprogress.bundle.css"),
        path.join(new_dir_path, "src/styles/nprogress.bundle.css"),
      );
    }

    if (options.css_preference === "vanilla") {
      fs.cpSync(
        path.join(root_dir_path, "__common/styles/_preflight.bundle.css"),
        path.join(new_dir_path, "src/styles/_preflight.bundle.css"),
      );
    }

    // utils
    await handle_ts_or_js_file_copy({
      code: fs.readFileSync(
        path.join(root_dir_path, "__common/utils/extract-simple-form-data.ts"),
        "utf8",
      ),
      destination_without_extension: "src/utils/extract-simple-form-data",
      is_jsx: false,
    });

    // pages
    const pages_to_copy = [
      "about.page",
      "$.page",
      "_index.page",
      "about/_index.page",
      "about/learn-more.page",
      "__auth/login.page",
    ];

    await Promise.all(
      pages_to_copy.map(async (page) => {
        return handle_ts_or_js_file_copy({
          code: fs.readFileSync(
            path.join(root_dir_path, "__common/pages/" + page + ".tsx"),
            "utf8",
          ),
          destination_without_extension: "src/pages/" + page,
          is_jsx: true,
        });
      }),
    );

    if (options.lang_preference === "javascript") {
      fs.writeFileSync(
        path.join(new_dir_path, "src/__ignore.ts"),
        `
/* 
 * Ignore this file.
 * It is here so your tsconfig.json does not complain.
 * The tsconfig.json is needed for Hono JSX to work.
 */
        `.trim() + "\n",
        "utf8",
      );
    }

    if (options.deployment_target === "vercel") {
      fs.mkdirSync(path.join(new_dir_path, "api"), { recursive: true });
      fs.writeFileSync(
        path.join(new_dir_path, "api/main.js"),
        "/* Commit this file to make Vercel happy. */\n",
        "utf8",
      );

      const vercel_json =
        `
{
  "rewrites": [{ "source": "/(.*)", "destination": "/api/main" }],
  "functions": {
    "api/main.js": { "includeFiles": "**/*" }
  }
}
`.trim() + "\n";

      fs.writeFileSync(
        path.join(new_dir_path, "vercel.json"),
        vercel_json,
        "utf8",
      );
    }

    if (get_is_target_deno(options)) {
      fs.writeFileSync(
        path.join(new_dir_path, "deno.json"),
        JSON.stringify(
          {
            imports: {
              hono: "npm:hono",
              hwy: `npm:hwy@${LATEST_HWY_VERSION}`,
              "hono/deno": "npm:hono/deno",
              "hono/logger": "npm:hono/logger",
              "hono/secure-headers": "npm:hono/secure-headers",
              ...(options.css_preference === "tailwind"
                ? { tailwindcss: "npm:tailwindcss" }
                : {}),
            },
            compilerOptions: {
              jsx: "react-jsx",
              jsxImportSource: "npm:hono/jsx",
            },
          },
          null,
          2,
        ) + "\n",
        "utf8",
      );
    }

    const applicable_instructions =
      options.deployment_target === "bun"
        ? bun_instructions
        : get_is_target_deno(options)
        ? deno_instructions
        : npm_instructions;

    console.log(
      pc.cyan(
        `\nNice. Your new Hwy project is ready to go.\n\nTo get started, run:\n\n  ${pc.green(
          `cd ` + choices.new_dir_name + applicable_instructions,
        )}\n\nBe sure to check out the docs at ${pc.bold(
          pc.underline(`https://hwy.dev`),
        )}.\n\nHappy hacking!\n`,
      ),
    );
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

const npm_instructions = `\n  npm i\n  npm run dev`;
const deno_instructions = `\n  npm i\n  deno task dev`;
const bun_instructions = `\n  bun i\n  bun run --bun dev`;

await main();
