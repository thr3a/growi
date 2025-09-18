// vite.config.ts
import path from "node:path";
import glob from "file:///workspace/growi/node_modules/.pnpm/glob@8.1.0/node_modules/glob/glob.js";
import { nodeExternals } from "file:///workspace/growi/node_modules/.pnpm/rollup-plugin-node-externals@6.1.1_rollup@4.50.1/node_modules/rollup-plugin-node-externals/dist/index.js";
import { defineConfig } from "file:///workspace/growi/node_modules/.pnpm/vite@5.4.20_@types+node@20.14.0_sass@1.77.6_terser@5.44.0/node_modules/vite/dist/node/index.js";
import dts from "file:///workspace/growi/node_modules/.pnpm/vite-plugin-dts@3.9.1_@types+node@20.14.0_rollup@4.50.1_typescript@5.0.4_vite@5.4.20_@t_370c03098189cb1b0d66bee5b9fcd751/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "/workspace/growi/packages/core";
var vite_config_default = defineConfig({
  plugins: [
    dts({
      copyDtsFiles: true
    }),
    {
      ...nodeExternals({
        devDeps: true,
        builtinsPrefix: "ignore"
      }),
      enforce: "pre"
    }
  ],
  build: {
    outDir: "dist",
    sourcemap: true,
    lib: {
      entry: glob.sync(path.resolve(__vite_injected_original_dirname, "src/**/*.ts"), {
        ignore: "**/*.spec.ts"
      }),
      name: "core-libs",
      formats: ["es", "cjs"]
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: "src"
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvd29ya3NwYWNlL2dyb3dpL3BhY2thZ2VzL2NvcmVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi93b3Jrc3BhY2UvZ3Jvd2kvcGFja2FnZXMvY29yZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vd29ya3NwYWNlL2dyb3dpL3BhY2thZ2VzL2NvcmUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7IG5vZGVFeHRlcm5hbHMgfSBmcm9tICdyb2xsdXAtcGx1Z2luLW5vZGUtZXh0ZXJuYWxzJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IGR0cyBmcm9tICd2aXRlLXBsdWdpbi1kdHMnO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIGR0cyh7XG4gICAgICBjb3B5RHRzRmlsZXM6IHRydWUsXG4gICAgfSksXG4gICAge1xuICAgICAgLi4ubm9kZUV4dGVybmFscyh7XG4gICAgICAgIGRldkRlcHM6IHRydWUsXG4gICAgICAgIGJ1aWx0aW5zUHJlZml4OiAnaWdub3JlJyxcbiAgICAgIH0pLFxuICAgICAgZW5mb3JjZTogJ3ByZScsXG4gICAgfSxcbiAgXSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogZ2xvYi5zeW5jKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvKiovKi50cycpLCB7XG4gICAgICAgIGlnbm9yZTogJyoqLyouc3BlYy50cycsXG4gICAgICB9KSxcbiAgICAgIG5hbWU6ICdjb3JlLWxpYnMnLFxuICAgICAgZm9ybWF0czogWydlcycsICdjanMnXSxcbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBwcmVzZXJ2ZU1vZHVsZXM6IHRydWUsXG4gICAgICAgIHByZXNlcnZlTW9kdWxlc1Jvb3Q6ICdzcmMnLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRRLE9BQU8sVUFBVTtBQUU3UixPQUFPLFVBQVU7QUFDakIsU0FBUyxxQkFBcUI7QUFDOUIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxTQUFTO0FBTGhCLElBQU0sbUNBQW1DO0FBUXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxNQUNGLGNBQWM7QUFBQSxJQUNoQixDQUFDO0FBQUEsSUFDRDtBQUFBLE1BQ0UsR0FBRyxjQUFjO0FBQUEsUUFDZixTQUFTO0FBQUEsUUFDVCxnQkFBZ0I7QUFBQSxNQUNsQixDQUFDO0FBQUEsTUFDRCxTQUFTO0FBQUEsSUFDWDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLEtBQUs7QUFBQSxNQUNILE9BQU8sS0FBSyxLQUFLLEtBQUssUUFBUSxrQ0FBVyxhQUFhLEdBQUc7QUFBQSxRQUN2RCxRQUFRO0FBQUEsTUFDVixDQUFDO0FBQUEsTUFDRCxNQUFNO0FBQUEsTUFDTixTQUFTLENBQUMsTUFBTSxLQUFLO0FBQUEsSUFDdkI7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGlCQUFpQjtBQUFBLFFBQ2pCLHFCQUFxQjtBQUFBLE1BQ3ZCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
