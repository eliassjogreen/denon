// Copyright 2020-present the denosaurs team. All rights reserved. MIT license.

import { parseArgs } from "./args.ts";
import { assertEquals } from "../test_deps.ts";

Deno.test({
  name: "args | parseArgs | option",
  fn: () => {
    assertEquals(parseArgs(["--cfg", "config.json"]), {
      cmd: [],
      config: "config.json",
      help: false,
      init: undefined,
      upgrade: undefined,
      version: false,
    });
    assertEquals(
      parseArgs(
        [
          "run",
          "-A",
          "--config",
          "tsconfig.json",
          "--cfg",
          "config.json",
          "mod.ts",
        ],
      ),
      {
        cmd: ["run", "-A", "--config", "tsconfig.json", "mod.ts"],
        config: "config.json",
        help: false,
        init: undefined,
        upgrade: undefined,
        version: false,
      },
    );
  },
});

Deno.test({
  name: "args | parseArgs | option | upgrade",
  fn: () => {
    assertEquals(parseArgs(["--upgrade", "latest"]), {
      cmd: [],
      config: undefined,
      help: false,
      init: undefined,
      upgrade: "latest",
      version: false,
    });
    assertEquals(parseArgs(["--upgrade"]), {
      cmd: [],
      config: undefined,
      help: false,
      init: undefined,
      upgrade: "latest",
      version: false,
    });
    assertEquals(parseArgs(["--upgrade", "2.4.5"]), {
      cmd: [],
      config: undefined,
      help: false,
      init: undefined,
      upgrade: "v2.4.5",
      version: false,
    });
    assertEquals(parseArgs(["--upgrade", "v2.4.5"]), {
      cmd: [],
      config: undefined,
      help: false,
      init: undefined,
      upgrade: "v2.4.5",
      version: false,
    });
  },
});
