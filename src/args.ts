// Copyright 2020-2021 the denosaurs team. All rights reserved. MIT license.

/** Regex to test if string matches version format */
const reVersion = /^v?[0-9]+\.[0-9]+\.[0-9]+$/;

/** Map of supported flags that modify
 * `denon` behavior. */
export interface Args {
  help: boolean;
  version: boolean;

  init?: string;
  upgrade?: string;
  config?: string;

  cmd: string[];
}

/** Parse Deno.args into a flag map (`Args`)
 * to be handled by th CLI. */
export function parseArgs(args: string[] = Deno.args): Args {
  if (args[0] === "--") {
    args = args.slice(1);
  }

  const flags: Args = {
    help: false,
    version: false,
    init: undefined,
    upgrade: undefined,
    config: undefined,
    cmd: [],
  };

  const indexOf = (...flags: string[]) => {
    for (const flag of flags) {
      const i = args.indexOf(flag);
      if (i >= 0) {
        return i;
      }
    }
    return -1;
  };

  const indexConfig = indexOf("--cfg");
  if (indexConfig >= 0) {
    flags.config = args.splice(indexConfig, 2)[1];
  }

  const indexHelp = indexOf("--help", "-h");
  if (indexHelp >= 0) {
    flags.help = true;
    args.splice(indexHelp, 1);
  }

  const indexVersion = indexOf("--version", "-v");
  if (indexVersion >= 0) {
    flags.version = true;
    args.splice(indexVersion, 1);
  }

  const indexInit = indexOf("--init", "-i");
  if (indexInit >= 0) {
    const [, next] = args.splice(indexInit, 2);

    flags.init = next || "json";
  }

  const indexUpgrade = indexOf("--upgrade", "-u");
  if (indexUpgrade >= 0) {
    const [, next] = args.splice(indexUpgrade, 2);

    if (next && (next !== "latest" || reVersion.test(next))) {
      flags.upgrade = !next.startsWith("v") ? "v" + next : next;
    } else {
      flags.upgrade = "latest";
    }
  }

  flags.cmd = args;
  return flags;
}
