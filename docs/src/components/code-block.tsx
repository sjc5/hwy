type Language = "tsx" | "typescript" | "bash" | "json";

function CodeBlock({ language, code }: { language: Language; code: string }) {
  return (
    <pre className="code-block">
      <code className={`language-${language}`}>{code.trim()}</code>
      <div />
    </pre>
  );
}

export { CodeBlock };
