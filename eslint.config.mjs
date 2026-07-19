import next from "eslint-config-next";

const config = [
  ...next,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "scripts/**",
      "ai-knowledge-base-v5.0/**",
    ],
  },
  {
    // React 19 的新规则较激进，先降级为 warning，避免阻塞开发
    // 后续可按需在具体文件中优化后再收严
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default config;
