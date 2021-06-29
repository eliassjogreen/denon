// Copyright 2020-2021 the denosaurs team. All rights reserved. MIT license.

import {
  blue,
  bold,
  exists,
  grant,
  gray,
  log,
  reset,
  setColorEnabled,
  yellow,
} from "../deps.ts";

import {
  CompleteDenonConfig,
  getConfigFilename,
  writeConfigTemplate,
} from "./config.ts";
import { Runner } from "./runner.ts";

import { templates } from "./templates.ts";
import { VERSION } from "../info.ts";

const logger = log.create("main");

/** These are the permissions required for a clean run
 * of `denon`. If not provided through installation they
 * will be asked on every run by the `grant()` std function.
 *
 * The permissions required are:
 * - *read*, used to correctly load a configuration file and
 * to monitor for filesystem changes in the directory `denon`
 * is executed to reload scripts.
 * - *write*, write configuration templates.
 * - *run*, used to run scripts as child processes.
 * - *write*, download configuration templates and import
 * `denon.config.ts` file. */
export const PERMISSIONS: Deno.PermissionDescriptor[] = [
  { name: "read" },
  { name: "write" },
  { name: "run" },
];

/** These permissions are required on specific situations,
 * `denon` should not be installed with this permissions
 * but you should be granting them when they are required. */
export const PERMISSION_OPTIONAL: {
  [key: string]: Deno.PermissionDescriptor[];
} = {
  initializeConfig: [{ name: "write" }],
};

export async function grantPermissions(): Promise<void> {
  // @see PERMISSIONS .
  const permissions = await grant([...PERMISSIONS]);
  if (!permissions || permissions.length < PERMISSIONS.length) {
    logger.critical("Required permissions `read` and `run` not granted");
    Deno.exit(1);
  }
}
/** Create configuration file in the root of current work directory.
 * // TODO: make it interactive */
export async function initializeConfig(type = "json"): Promise<void> {
  const permissions = await grant(PERMISSION_OPTIONAL.initializeConfig);
  if (
    !permissions ||
    permissions.length < PERMISSION_OPTIONAL.initializeConfig.length
  ) {
    logger.critical("Required permissions for this operation not granted");
    Deno.exit(1);
  }
  const template = templates[type];
  if (!template) {
    logger.error(`\`${type}\` is not a valid template.`);
    logger.info(`valid templates are ${Object.keys(templates)}`);
    return;
  }

  if (!(await exists(template.filename))) {
    await writeConfigTemplate(template);
  } else {
    logger.error(`\`${template.filename}\` already exists in root dir`);
  }
}

/** Grab a fresh copy of denon */
export async function upgrade(version?: string): Promise<void> {
  const url = version !== "latest"
    ? `https://deno.land/x/denon@${version}/denon.ts`
    : "https://deno.land/x/denon/denon.ts";

  logger.debug(`Checking if ${url} exists`);
  if ((await fetch(url)).status !== 200) {
    logger.critical(`Upgrade url ${url} does not exist`);
    Deno.exit(1);
  }

  logger.info(
    `Running \`deno install -qAfr --unstable ${url}\``,
  );
  await Deno.run({
    cmd: ["deno", "install", "-qAfr", "--unstable", url],
    stdout: undefined,
  }).status();
  Deno.exit(0);
}

// /** Generate autocomplete suggestions */
// export function autocomplete(config: CompleteDenonConfig): void {
//   // Write your CLI template.
//   const completion = omelette.default(`denon <script>`);

//   // Bind events for every template part.
//   completion.on("script", function ({ reply }: { reply: Function }): void {
//     // const watcher = new Watcher(config.watcher);
//     const auto = Object.keys(config.scripts);
//     // for (const file of Deno.readDirSync(Deno.cwd())) {
//     //   if (file.isFile && watcher.isWatched(file.name)) {
//     //     auto.push(file.name);
//     //   } else {
//     //     // auto.push(file.name);
//     //   }
//     // }
//     console.log(auto);
//     reply(auto);
//   });

//   completion.init();
// }

/** List all available scripts declared in the config file.
 * // TODO(@qu4k): make it interactive */
export async function printAvailableScripts(
  config: CompleteDenonConfig,
): Promise<void> {
  if (Object.keys(config.scripts).length) {
    logger.info("available scripts:");
    const runner = new Runner(config);
    for (const name of Object.keys(config.scripts)) {
      const script = config.scripts[name];
      console.log();
      console.log(` - ${yellow(bold(name))}`);

      if (typeof script === "object" && !Array.isArray(script) && script.desc) {
        console.log(`   ${script.desc}`);
      }

      const commands = runner
        .build(name)
        .map((command) => command.cmd.join(" "))
        .join(bold(" && "));

      console.log(gray(`   $ ${commands}`));
    }
    console.log();
    console.log(
      `You can run scripts with \`${blue("denon")} ${yellow("<script>")}\``,
    );
  } else {
    logger.error("It looks like you don't have any scripts...");
    const config = getConfigFilename();
    if (config) {
      logger.info(
        `You can add scripts to your \`${config}\` file. Check the docs.`,
      );
    } else {
      logger.info(
        `You can create a config to add scripts to with \`${
          blue(
            "denon",
          )
        } ${yellow("--init")}${reset("`.")}`,
      );
    }
  }
  const latest = await fetchLatestVersion();
  if (latest && latest !== VERSION) {
    logger.warning(
      `New version available (${latest}). Upgrade with \`${
        blue(
          "denon",
        )
      } ${yellow("--upgrade")}${reset("`.")}`,
    );
  }
}

export async function fetchLatestVersion(): Promise<string | undefined> {
  const cdn = "https://cdn.deno.land/";
  const url = `${cdn}denon/meta/versions.json`;
  const res = await fetch(url);
  if (res.status !== 200) return undefined;
  const data = await res.json();
  return data.latest;
}

/** Help message to be shown if `denon`
 * is run with `--help` flag. */
export function printHelp(): void {
  setColorEnabled(true);
  console.log(
    `${blue("DENON")} - ${VERSION}
created by qu4k & eliassjogreen
Monitor any changes in your Deno application and automatically restart.

Usage:
    ${blue("denon")} ${yellow("<script name>")}     ${
      gray(
        "-- eg: denon start",
      )
    }
    ${blue("denon")} ${yellow("<command>")}         ${
      gray(
        "-- eg: denon run helloworld.ts",
      )
    }
    ${blue("denon")} [options]         ${gray("-- eg: denon --help")}

Options:
    -h --help               Show this screen.
    -v --version            Show version.
    -i --init               Create config file in current working dir.
    -u --upgrade <version>  Upgrade to latest version. (default: master)
       --cfg <file>      Use specific file as configuration.
`,
  );
}
