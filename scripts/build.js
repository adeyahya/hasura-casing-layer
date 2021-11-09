#!/usr/bin/env node

const path = require("path");
const esbuild = require("esbuild");
const packageJson = require("../package.json");

const run = async () => {
  esbuild.build({
    entryPoints: [path.resolve(__dirname, "../src/index.js")],
    external: Object.keys(packageJson.peerDependencies),
    bundle: true,
    minify: true,
    platform: "node",
    format: "cjs",
    tsconfig: path.resolve(__dirname, "../tsconfig.json"),
    outfile: path.resolve(__dirname, "../dist/index.js"),
  });
};

run();
