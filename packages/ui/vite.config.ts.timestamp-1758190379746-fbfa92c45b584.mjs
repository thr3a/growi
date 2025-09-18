// vite.config.ts
import path from "node:path";
import react from "file:///workspace/growi/node_modules/.pnpm/@vitejs+plugin-react@4.3.1_vite@5.4.20_@types+node@20.14.0_sass@1.77.6_terser@5.44.0_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import glob from "file:///workspace/growi/node_modules/.pnpm/glob@8.1.0/node_modules/glob/glob.js";
import { nodeExternals } from "file:///workspace/growi/node_modules/.pnpm/rollup-plugin-node-externals@6.1.1_rollup@4.50.1/node_modules/rollup-plugin-node-externals/dist/index.js";
import { defineConfig } from "file:///workspace/growi/node_modules/.pnpm/vite@5.4.20_@types+node@20.14.0_sass@1.77.6_terser@5.44.0/node_modules/vite/dist/node/index.js";
import dts from "file:///workspace/growi/node_modules/.pnpm/vite-plugin-dts@3.9.1_@types+node@20.14.0_rollup@4.50.1_typescript@5.0.4_vite@5.4.20_@t_370c03098189cb1b0d66bee5b9fcd751/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "/workspace/growi/packages/ui";
var vite_config_default = defineConfig({
  plugins: [
    react(),
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
      entry: glob.sync(path.resolve(__vite_injected_original_dirname, "src/**/*.{ts,tsx}"), {
        ignore: "**/*.spec.ts"
      }),
      name: "ui-libs",
      formats: ["es"]
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvd29ya3NwYWNlL2dyb3dpL3BhY2thZ2VzL3VpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvd29ya3NwYWNlL2dyb3dpL3BhY2thZ2VzL3VpL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy93b3Jrc3BhY2UvZ3Jvd2kvcGFja2FnZXMvdWkvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgeyBub2RlRXh0ZXJuYWxzIH0gZnJvbSAncm9sbHVwLXBsdWdpbi1ub2RlLWV4dGVybmFscyc7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCBkdHMgZnJvbSAndml0ZS1wbHVnaW4tZHRzJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIGR0cyh7XG4gICAgICBjb3B5RHRzRmlsZXM6IHRydWUsXG4gICAgfSksXG4gICAge1xuICAgICAgLi4ubm9kZUV4dGVybmFscyh7XG4gICAgICAgIGRldkRlcHM6IHRydWUsXG4gICAgICAgIGJ1aWx0aW5zUHJlZml4OiAnaWdub3JlJyxcbiAgICAgIH0pLFxuICAgICAgZW5mb3JjZTogJ3ByZScsXG4gICAgfSxcbiAgXSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogZ2xvYi5zeW5jKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvKiovKi57dHMsdHN4fScpLCB7XG4gICAgICAgIGlnbm9yZTogJyoqLyouc3BlYy50cycsXG4gICAgICB9KSxcbiAgICAgIG5hbWU6ICd1aS1saWJzJyxcbiAgICAgIGZvcm1hdHM6IFsnZXMnXSxcbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBwcmVzZXJ2ZU1vZHVsZXM6IHRydWUsXG4gICAgICAgIHByZXNlcnZlTW9kdWxlc1Jvb3Q6ICdzcmMnLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXNRLE9BQU8sVUFBVTtBQUV2UixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sU0FBUztBQU5oQixJQUFNLG1DQUFtQztBQVN6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixJQUFJO0FBQUEsTUFDRixjQUFjO0FBQUEsSUFDaEIsQ0FBQztBQUFBLElBQ0Q7QUFBQSxNQUNFLEdBQUcsY0FBYztBQUFBLFFBQ2YsU0FBUztBQUFBLFFBQ1QsZ0JBQWdCO0FBQUEsTUFDbEIsQ0FBQztBQUFBLE1BQ0QsU0FBUztBQUFBLElBQ1g7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxLQUFLO0FBQUEsTUFDSCxPQUFPLEtBQUssS0FBSyxLQUFLLFFBQVEsa0NBQVcsbUJBQW1CLEdBQUc7QUFBQSxRQUM3RCxRQUFRO0FBQUEsTUFDVixDQUFDO0FBQUEsTUFDRCxNQUFNO0FBQUEsTUFDTixTQUFTLENBQUMsSUFBSTtBQUFBLElBQ2hCO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixpQkFBaUI7QUFBQSxRQUNqQixxQkFBcUI7QUFBQSxNQUN2QjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
