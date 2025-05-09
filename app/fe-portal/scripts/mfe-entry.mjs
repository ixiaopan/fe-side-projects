import fs from "fs";
import path from "path";

export function pathResolve(dir) {
  return path.resolve(process.cwd(), ".", dir);
}

// Read all environment variable configuration files to process.env
export function wrapperEnv(envConf) {
  const ret = {};

  for (const envName of Object.keys(envConf)) {
    let realName = envConf[envName].replace(/\\n/g, "\n");
    realName =
      realName === "true" ? true : realName === "false" ? false : realName;

    if (envName === "VITE_PORT") {
      realName = Number(realName);
    }
    if (envName === "VITE_PROXY" && realName) {
      try {
        realName = JSON.parse(realName.replace(/'/g, '"'));
      } catch (error) {
        realName = "";
      }
    }
    ret[envName] = realName;
    if (typeof realName === "string") {
      process.env[envName] = realName;
    } else if (typeof realName === "object") {
      process.env[envName] = JSON.stringify(realName);
    }
  }
  return ret;
}

export function walkMicroFE(config, relPath = "") {
  const dir = path.resolve(relPath || process.cwd(), "packages");

  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      try {
        // 可能没有
        const data = fs.readFileSync(path.join(filePath, "package.json"));

        const jsonData = JSON.parse(data);

        // 说明这是一个mfe的包
        if (jsonData.name.startsWith("@fe-portal") && jsonData.devPort) {
          const id = jsonData.name.replace("@fe-portal/", "");

          config[id] = {
            mfeName: id == "base" ? "" : "app-" + id,
            name: jsonData.name,
            description: jsonData.description,
            devPort: jsonData.devPort,
            publicPath: jsonData.publicPath,
            outDir: jsonData.outDir,
          };
        }
      } catch (e) {}
    }
  });

  return config;
}
