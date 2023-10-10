/*
Adapted from: https://github.com/molefrog/wouter/blob/main/matcher.js
Original license: ISC
Copied from source on: August 3, 2023
*/

// creates a matcher function
function make_wouter_matcher(
  make_regexp_fn = path_to_regexp,
): (pattern: string, path: string) => [boolean, Record<string, string>] {
  const cache: Record<
    string,
    { regexp: RegExp; keys: Array<{ name: string | number }> }
  > = {};

  // obtains a cached regexp version of the pattern
  const get_regexp = (pattern: string) => {
    return cache[pattern] || (cache[pattern] = make_regexp_fn(pattern));
  };

  return (pattern: string, path: string) => {
    const { regexp, keys } = get_regexp(pattern || "");
    const out = regexp.exec(path);

    if (!out) return [false, {} as Record<string, string>];

    // formats an object with matched params
    const params = keys.reduce(
      (params, key, i) => {
        params[key.name] = out[i + 1];
        return params;
      },
      {} as Record<string, string>,
    );

    return [true, params];
  };
}

// escapes a regexp string (borrowed from path-to-regexp sources)
// https://github.com/pillarjs/path-to-regexp/blob/v3.0.0/index.js#L202
function escape_rx(str: string) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}

// returns a segment representation in RegExp based on flags
// adapted and simplified version from path-to-regexp sources
function rx_for_segment({
  repeat,
  optional,
  prefix,
}: {
  repeat: boolean;
  optional: boolean;
  prefix: number;
}) {
  let capture = repeat ? "((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*)" : "([^\\/]+?)";
  if (optional && prefix) capture = "(?:\\/" + capture + ")";
  return capture + (optional ? "?" : "");
}

function path_to_regexp(pattern: string) {
  const group_rx = /:([A-Za-z0-9_]+)([?+*]?)/g;

  let match = null,
    last_index = 0,
    result = "";
  const keys = [];

  while ((match = group_rx.exec(pattern)) !== null) {
    const [_, segment, mod] = match;

    // :foo  [1]      (  )
    // :foo? [0 - 1]  ( o)
    // :foo+ [1 - ∞]  (r )
    // :foo* [0 - ∞]  (ro)
    const repeat = mod === "+" || mod === "*";
    const optional = mod === "?" || mod === "*";
    const prefix = optional && pattern[match.index - 1] === "/" ? 1 : 0;

    const prev = pattern.substring(last_index, match.index - prefix);

    keys.push({ name: segment });
    last_index = group_rx.lastIndex;

    result += escape_rx(prev) + rx_for_segment({ repeat, optional, prefix });
  }

  result += escape_rx(pattern.substring(last_index));
  return { keys, regexp: new RegExp("^" + result + "(?:\\/)?$", "i") };
}

export { make_wouter_matcher };
