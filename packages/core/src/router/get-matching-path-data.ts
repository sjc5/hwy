import path from "node:path";
import type { Context } from "hono";
import { matcher } from "../router/matcher.js";
import { get_path_to_use } from "../utils/get-path-to-use.js";
import type { Paths } from "@hwy-js/build";
import { ROOT_DIRNAME } from "../setup.js";
import { get_matching_paths_internal } from "./get-matching-path-data-internal.js";
import { get_match_strength } from "./get-match-strength.js";
import type { DataFunctionArgs } from "../types.js";
import { path_to_file_url_string } from "../utils/url-polyfills.js";

function fully_decorate_paths({
  matching_paths,
  splat_segments,
}: {
  matching_paths: ReturnType<typeof semi_decorate_paths>;
  splat_segments: string[];
}) {
  const is_cloudflare = (globalThis as any).__hwy__is_cloudflare;

  return (
    matching_paths?.map((_path) => {
      const get_imported = () => {
        if (is_cloudflare) {
          return (globalThis as any)["./" + _path.importPath];
        }
        const inner = path.join(ROOT_DIRNAME || "./", _path.importPath);
        return import(path_to_file_url_string(inner));
      };

      // public
      return {
        ..._path,
        splatSegments: splat_segments,
        componentImporter: async () => {
          try {
            const imported = await get_imported();
            return imported.default;
          } catch (e) {
            console.error(e);
            throw e;
          }
        },
        errorBoundaryImporter: async () => {
          try {
            const imported = await get_imported();
            return imported.ErrorBoundary ? imported.ErrorBoundary : undefined;
          } catch (e) {
            console.error(e);
            throw e;
          }
        },
        headImporter: async () => {
          try {
            const imported = await get_imported();
            return imported.head ? imported.head : () => [];
          } catch (e) {
            console.error(e);
            throw e;
          }
        },
        loader: async (loader_args: DataFunctionArgs) => {
          try {
            const imported = await get_imported();
            return imported.loader ? imported.loader(loader_args) : undefined;
          } catch (e) {
            if (e instanceof Response) return e;
            console.error(e);
            throw e;
          }
        },
        action: async (action_args: DataFunctionArgs) => {
          try {
            const imported = await get_imported();
            return imported.action ? imported.action(action_args) : undefined;
          } catch (e) {
            if (e instanceof Response) return e;
            console.error(e);
            throw e;
          }
        },
      };
    }) ?? []
  );
}

type SemiDecoratedPath = Paths[number] & {
  importUrlString: string;
  pattern: string;
  matches: boolean;
  params: Record<string, string>;
  isUltimateCatch: boolean;
} & ReturnType<typeof get_match_strength>;

function semi_decorate_paths({
  c,
  redirectTo,
  paths,
}: {
  c: Context;
  redirectTo?: string;
  paths: Paths;
}): SemiDecoratedPath[] {
  return paths?.map((path) => {
    return {
      // public shape
      ...path,
      ...matcher({
        pattern: path.path,
        path: get_path_to_use(c, redirectTo),
      }),
      isUltimateCatch: path.path === "/:catch*",
      importUrlString: path.importPath.split("/pages/")[1],
    };
  });
}

async function getMatchingPathData({
  c,
  redirectTo,
}: {
  c: Context;
  redirectTo?: string;
}) {
  const paths: Paths = (globalThis as any).__hwy__paths;

  const semi_decorated_paths = semi_decorate_paths({
    c,
    redirectTo,
    paths,
  });

  const { paths: matching_paths, splat_segments } =
    get_matching_paths_internal(semi_decorated_paths);

  const active_paths = matching_paths?.map((path) => path.pattern);

  const fully_decorated_matching_paths = fully_decorate_paths({
    matching_paths,
    splat_segments,
  });

  const last_path =
    fully_decorated_matching_paths?.[fully_decorated_matching_paths.length - 1];

  const params = last_path?.params;

  async function get_action_data() {
    try {
      if (c.req.method !== "GET") {
        return await last_path?.action?.({
          c,
          params,
          splatSegments: splat_segments,
        });
      }
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      throw e;
    }
  }

  let action_data: any;
  let action_data_error: any;

  try {
    action_data = await get_action_data();
  } catch (e) {
    action_data_error = e;
  }

  let [
    active_data_obj,
    active_components,
    active_heads,
    active_error_boundaries,
  ] = await Promise.all([
    Promise.all(
      (fully_decorated_matching_paths || [])?.map(async (path) => {
        return path
          ?.loader?.({
            c,
            params,
            splatSegments: splat_segments,
          })
          .then((result) => ({ error: undefined, result }))
          .catch((error) => {
            if (error instanceof Response)
              return { result: error, error: undefined };
            console.error("Loader error:", error);
            return { error, result: undefined };
          });
      }),
    ),

    Promise.all(
      (fully_decorated_matching_paths || [])?.map((path) => {
        return path?.componentImporter();
      }),
    ),

    Promise.all(
      (fully_decorated_matching_paths || []).map((path) => {
        return path?.headImporter();
      }),
    ),

    Promise.all(
      (fully_decorated_matching_paths || []).map((path) => {
        return path?.errorBoundaryImporter();
      }),
    ),
  ]);

  const errors = active_data_obj.map((item) => item.error);
  const active_data = active_data_obj.map((item) => item.result);

  const there_are_errors = Boolean(
    action_data_error || errors.some((error) => error),
  );

  let highest_error_index = errors?.findIndex((error) => error);

  if (action_data_error) {
    highest_error_index = active_data_obj.length - 1;
  }

  let closest_parent_error_boundary_index;

  if (
    there_are_errors &&
    highest_error_index !== undefined &&
    highest_error_index !== -1
  ) {
    closest_parent_error_boundary_index = active_error_boundaries
      .slice(0, highest_error_index + 1)
      .reverse()
      .findIndex((boundary) => boundary != null);

    if (closest_parent_error_boundary_index !== -1) {
      closest_parent_error_boundary_index =
        highest_error_index - closest_parent_error_boundary_index;
    }

    if (
      closest_parent_error_boundary_index !== undefined &&
      closest_parent_error_boundary_index !== -1
    ) {
      const closest_parent_error_boundary =
        active_error_boundaries[closest_parent_error_boundary_index];
      active_components = [
        ...active_components.slice(0, closest_parent_error_boundary_index),
        closest_parent_error_boundary,
      ];
    }
  }

  const responses = [
    ...active_data,
    ...(action_data ? [action_data] : []),
  ]?.filter((data) => data instanceof Response);

  if (responses.length) {
    return {
      fetchResponse: responses[responses.length - 1],
    };
  }

  const import_url_strings = (matching_paths || [])?.map(
    (path) => path.importUrlString,
  );

  const should_render_loader_error =
    highest_error_index < active_data_obj.length - 1 ||
    (highest_error_index === active_data_obj.length - 1 && !action_data_error);

  const error_to_render = should_render_loader_error
    ? errors[highest_error_index]
    : action_data_error;

  return {
    matchingPaths: fully_decorated_matching_paths,
    activeData: active_data,
    actionData: action_data,
    activePaths: active_paths,
    activeComponents: active_components,
    activeHeads: active_heads,
    importUrlStrings: import_url_strings,
    errorToRender: error_to_render,
    activeErrorBoundaries: active_error_boundaries,
    params,
    splatSegments: splat_segments,
    outermostErrorBoundaryIndex: closest_parent_error_boundary_index,
  };
}

export { getMatchingPathData };
export type { SemiDecoratedPath };
