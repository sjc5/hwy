function AnchorHeading({ content }: { content: string }) {
  const slugified = encodeURIComponent(
    content.toLowerCase().replace(/ /g, "-")
  );

  return (
    <div class="flex gap-3 text-xl font-bold pt-4" id={slugified}>
      <a
        class="hover:underline text-[#777] hover:text-[unset]"
        href={`#${slugified}`}
      >
        #
      </a>
      {content}
    </div>
  );
}

export { AnchorHeading };
