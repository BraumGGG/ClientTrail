const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({ testDir: "./tests", timeout: 120000, reporter: "line" });
