import { SPLAT_SEGMENT } from "../../../common/index.mjs";
import { get_match_strength } from "./get-match-strength.js";
import { make_wouter_matcher } from "./make-wouter-matcher.js";

const wouter_matcher = make_wouter_matcher();

function matcher({ pattern, path }: { pattern: string; path: string }) {
  const result_one = wouter_matcher(pattern + `/${SPLAT_SEGMENT}`, path);
  const result_two = wouter_matcher(pattern + "/:catch?", path);
  const strength = get_match_strength({ pattern, path });

  const params = result_one[1];
  if ("catch" in params) delete params["catch"];

  return {
    path,
    pattern,
    matches: result_one[0] || result_two[0],
    params,
    ...strength,
  };
}

export { matcher };
