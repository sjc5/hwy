import type { Options } from "./types.js";

function get_gitignore(options: Options) {
  let text = `
  
# standard exclusions
node_modules

# system artifacts
.DS_Store

# build artifacts
dist
public/dist

# development artifacts
.dev

# environment files
.env
.env.local

`.trim();

  if (options.deployment_target === "vercel") {
    const vercel_text = `\n\n# vercel
api/**/*
!api/main.js\n\n`;

    text += vercel_text;
  }

  if (options.css_preference === "tailwind") {
    let tw_text = `\n\n# tailwind artifacts
src/styles/tw-output.bundle.css\n\n`;

    if (options.deployment_target === "vercel") {
      // to not double up the "\n\n"
      tw_text = tw_text.trimStart();
    }

    text += tw_text;
  }

  return text.trim() + "\n";
}

export { get_gitignore };
