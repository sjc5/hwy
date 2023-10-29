type Language = "tsx" | "typescript" | "bash" | "json";

function CodeBlock({ language, code }: { language: Language; code: string }) {
  return (
    <pre class="code-block">
      <code class={`language-${language}`}>{code.trim()}</code>
      <div />
    </pre>
  );
}

export { CodeBlock };
