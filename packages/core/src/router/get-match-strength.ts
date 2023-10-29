import { SPLAT_SEGMENT } from "../../../common/index.mjs";

function get_match_strength({
  pattern,
  path,
}: {
  pattern: string;
  path: string;
}) {
  const pattern_segments = pattern.split("/").filter(Boolean);
  const real_segments = path.split("/").filter(Boolean);

  let score = 0;

  for (let i = 0; i < pattern_segments.length; i++) {
    if (pattern_segments[i] === real_segments[i]) {
      // literal match
      score = score + 3;
      continue;
    }

    if (pattern_segments[i] === SPLAT_SEGMENT) {
      // catch-all match
      score = score + 1;
      continue;
    }

    if (pattern_segments[i].startsWith(":")) {
      // named dynamic segment match
      score = score + 2;
      continue;
    }

    return {
      score: 0,
      realSegmentsLength: real_segments.length,
    };
  }

  return {
    score,
    realSegmentsLength: real_segments.length,
  };
}

export {
  // private
  get_match_strength,
};
