// Copyright 2020-present the denosaurs team. All rights reserved. MIT license.

import { log, extname } from "../deps.ts";
import { template } from "./util.ts";

type Command = string[];
type StdFile = "inherit" | "piped" | "null" | number;

export interface SpawnerConfig {
  exe: { [extension: string]: string | string[] };
  exeArgs?: string[];

  file: string;
  fileArgs?: string[];

  /**
   * Enviornment to pass to the child process
   */
  env?: { [key: string]: string };

  stdin?: StdFile;
  stdout?: StdFile;
  stderr?: StdFile;
}

export class Spawner {
  constructor(private config: SpawnerConfig) {}

  build(): Command {
    let ext = extname(this.config.file);
    ext = ext.startsWith(".") ? ext.slice(1) : ext;
    let exe = this.config.exe[ext];

    if (typeof exe == "string") {
      exe = exe.trim().replace(/\s\s+/g, " ");
      exe = exe.split(" ");
    }

    // deno specific.
    if (!exe) {
      exe = [
        "deno",
        "run",
        "${exe-args}",
        "${file}",
        "${file-args}",
      ];
    }

    let templateValues = {
      "exe-args": this.config.exeArgs,
      "file-args": this.config.fileArgs,
      "file": this.config.file,
    };

    return template(exe, templateValues);
  }

  /**
   * Execute process command.
   * @returns process spawned
   */
  execute(): Execution {
    const command = this.build();
    log.info(`starting \`${command.join(" ")}\``);
    const options = {
      cmd: command,
      env: this.config.env,
      stdin: this.config.stdin || "inherit",
      stdout: this.config.stdout || "inherit",
      stderr: this.config.stderr || "inherit",
    };
    return new Execution(options);
  }
}

export type ExecutionEvent =
  | ExecutionEventStdout
  | ExecutionEventStderr
  | ExecutionEventStatus;

export interface ExecutionEventStdout {
  type: "stdout";
  stdout: Uint8Array;
}

export interface ExecutionEventStderr {
  type: "stderr";
  stderr: Uint8Array;
}

export interface ExecutionEventStatus {
  type: "status";
  status: Deno.ProcessStatus;
}

class Execution implements AsyncIterable<ExecutionEvent> {
  process: Deno.Process;

  constructor(public options: Deno.RunOptions) {
    this.process = Deno.run(options);
  }

  close() {
    this.process.close();
    if (this.options.stdin === "piped" && this.process.stdin) {
      this.process.stdin.close();
    }
  }

  async *iterate(): AsyncIterator<ExecutionEvent> {
    if (this.options.stdout == "piped") {
      const stdout = await this.process.output();
      yield { type: "stdout", stdout };
    }
    if (this.options.stderr == "piped") {
      const stderr = await this.process.stderrOutput();
      yield { type: "stderr", stderr };
    }
    const status = await this.process.status();
    yield { type: "status", status };
  }

  [Symbol.asyncIterator](): AsyncIterator<ExecutionEvent> {
    return this.iterate();
  }
}