import { parse } from "https://deno.land/std/flags/mod.ts";
import { resolve, dirname } from "https://deno.land/std/path/mod.ts";
import { exists } from "https://deno.land/std/fs/mod.ts";
import { sprintf, underline, green, red, setColorEnabled } from "https://deno.land/std/fmt/mod.ts";
import { watch } from "./watcher.ts";

setColorEnabled(true);

const args = parse(Deno.args);

if (args._.length < 1 || !(await exists(args._[0]))) {
    fail("Could not start denon because no file was provided");
}

const file = resolve(args._[0]);
const path = dirname(file);
const runner = run();

log(`Watching ${path}, Running...`);

runner();

for await (const changes of await watch(path)) {
    log(`Detected ${changes.length} change(s). Rerunning...`);
    runner();
}

function run() {
    let proc: Deno.Process | undefined;

    return () => {
        if (proc) {
            proc.close();
        }

        const flags = [...Deno.args];
        flags.shift();

        proc = Deno.run({
            args: ["deno", "run", file, ...flags]
        });
    };
}

function fail(reason: string, code: number = 1) {
    console.log(red(`[DENON] ${reason}`));
    Deno.exit(code);
}

function log(text: string) {
    console.log(green(`[DENON] ${text}`));
}

function help() {}