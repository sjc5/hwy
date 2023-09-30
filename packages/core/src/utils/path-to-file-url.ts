function path_to_file_url(normalized_path: string): string {
  try {
    if (process.platform === "win32") {
      normalized_path = normalized_path.replace(/\\/g, "/");
      if (normalized_path[1] === ":") {
        normalized_path = "/" + normalized_path;
      }
    }
    return "file://" + normalized_path;
  } catch {
    return normalized_path;
  }
}

export { path_to_file_url };
