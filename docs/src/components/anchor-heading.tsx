function AnchorHeading({ content }: { content: string }) {
  const slugified = encodeURIComponent(
    content.toLowerCase().replace(/ /g, "-"),
  );

  return (
    <div id={slugified} className="anchor-heading">
      <a href={`#${slugified}`}>#</a>
      {content}
    </div>
  );
}

export { AnchorHeading };
