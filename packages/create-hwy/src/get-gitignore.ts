import type { Options } from "../index.js";

const vercel_text = `\n\n# vercel\napi/**/*\n!api/main.js\n\n`;
const cloudflare_text = `\n\n# wrangler\n.dev.vars\n.wrangler/\n\n`;
let tw_text = `\n\n# tailwind artifacts\nsrc/styles/tw-output.bundle.css\n\n`;

function get_gitignore(options: Options) {
  let text = `
  
# standard exclusions
node_modules

# system artifacts
.DS_Store

# build artifacts
dist
public/dist

# environment files
.env
.env.local

`.trim();

  if (options.deployment_target === "vercel-lambda") {
    text += vercel_text;
  }

  if (options.deployment_target === "cloudflare-pages") {
    text += cloudflare_text;
  }

  if (options.css_preference === "tailwind") {
    if (
      options.deployment_target === "vercel-lambda" ||
      options.deployment_target === "cloudflare-pages"
    ) {
      // to not double up the "\n\n"
      tw_text = tw_text.trimStart();
    }

    text += tw_text;
  }

  return text.trim() + "\n";
}

export { get_gitignore };
