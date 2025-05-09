import { execa } from "execa";
import inquirer from "inquirer";
import detect from "detect-port";

import { walkMicroFE } from "./mfe-entry.mjs";

const config = walkMicroFE({});

function runMFE() {
  inquirer
    .prompt([
      {
        name: "devPackage",
        type: "list",
        message: "请选择要启动的子应用",
        choices: Object.keys(config)
          .filter((item) => item !== "base")
          .map((key) => {
            const { name, description, devPort } = config[key];
            return {
              name: `${name}(${description}:${devPort})`,
              value: key,
            };
          }),
      },
    ])
    .then(async (answers) => {
      await execa("pnpm", ["run", `dev:${answers.devPackage}`], {
        stdio: "inherit",
      });
    });
}

function init() {
  const baseDevPort = config.base.devPort;

  detect(baseDevPort).then(async (_port) => {
    if (baseDevPort == _port) {
      await execa("pnpm", ["run", "dev:base"], {
        stdio: "inherit",
      });
    } else {
      runMFE();
    }
  });
}

init();
