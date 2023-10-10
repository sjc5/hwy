type Options = {
  project_name: string;
  lang_preference: "typescript" | "javascript";
  css_preference: "tailwind" | "vanilla" | "none";
  deployment_target: "bun" | "vercel" | "node" | "deno_deploy" | "deno";
  with_nprogress: boolean;
};

export type { Options };
