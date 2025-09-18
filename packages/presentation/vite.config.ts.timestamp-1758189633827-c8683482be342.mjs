// vite.config.ts
import path from "node:path";
import react from "file:///workspace/growi/node_modules/.pnpm/@vitejs+plugin-react@4.3.1_vite@5.4.20_@types+node@20.14.0_sass@1.77.6_terser@5.44.0_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import glob from "file:///workspace/growi/node_modules/.pnpm/glob@8.1.0/node_modules/glob/glob.js";
import { nodeExternals } from "file:///workspace/growi/node_modules/.pnpm/rollup-plugin-node-externals@6.1.1_rollup@4.50.1/node_modules/rollup-plugin-node-externals/dist/index.js";
import { defineConfig } from "file:///workspace/growi/node_modules/.pnpm/vite@5.4.20_@types+node@20.14.0_sass@1.77.6_terser@5.44.0/node_modules/vite/dist/node/index.js";
import dts from "file:///workspace/growi/node_modules/.pnpm/vite-plugin-dts@3.9.1_@types+node@20.14.0_rollup@4.50.1_typescript@5.0.4_vite@5.4.20_@t_370c03098189cb1b0d66bee5b9fcd751/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "/workspace/growi/packages/presentation";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    dts({ copyDtsFiles: true }),
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
      name: "presentation-libs",
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvd29ya3NwYWNlL2dyb3dpL3BhY2thZ2VzL3ByZXNlbnRhdGlvblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3dvcmtzcGFjZS9ncm93aS9wYWNrYWdlcy9wcmVzZW50YXRpb24vdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3dvcmtzcGFjZS9ncm93aS9wYWNrYWdlcy9wcmVzZW50YXRpb24vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgeyBub2RlRXh0ZXJuYWxzIH0gZnJvbSAncm9sbHVwLXBsdWdpbi1ub2RlLWV4dGVybmFscyc7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCBkdHMgZnJvbSAndml0ZS1wbHVnaW4tZHRzJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIGR0cyh7IGNvcHlEdHNGaWxlczogdHJ1ZSB9KSxcbiAgICB7XG4gICAgICAuLi5ub2RlRXh0ZXJuYWxzKHtcbiAgICAgICAgZGV2RGVwczogdHJ1ZSxcbiAgICAgICAgYnVpbHRpbnNQcmVmaXg6ICdpZ25vcmUnLFxuICAgICAgfSksXG4gICAgICBlbmZvcmNlOiAncHJlJyxcbiAgICB9LFxuICBdLFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICBsaWI6IHtcbiAgICAgIGVudHJ5OiBnbG9iLnN5bmMocGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy8qKi8qLnRzJyksIHtcbiAgICAgICAgaWdub3JlOiAnKiovKi5zcGVjLnRzJyxcbiAgICAgIH0pLFxuICAgICAgbmFtZTogJ3ByZXNlbnRhdGlvbi1saWJzJyxcbiAgICAgIGZvcm1hdHM6IFsnZXMnXSxcbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBwcmVzZXJ2ZU1vZHVsZXM6IHRydWUsXG4gICAgICAgIHByZXNlcnZlTW9kdWxlc1Jvb3Q6ICdzcmMnLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9TLE9BQU8sVUFBVTtBQUVyVCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sU0FBUztBQU5oQixJQUFNLG1DQUFtQztBQVN6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixJQUFJLEVBQUUsY0FBYyxLQUFLLENBQUM7QUFBQSxJQUMxQjtBQUFBLE1BQ0UsR0FBRyxjQUFjO0FBQUEsUUFDZixTQUFTO0FBQUEsUUFDVCxnQkFBZ0I7QUFBQSxNQUNsQixDQUFDO0FBQUEsTUFDRCxTQUFTO0FBQUEsSUFDWDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLEtBQUs7QUFBQSxNQUNILE9BQU8sS0FBSyxLQUFLLEtBQUssUUFBUSxrQ0FBVyxhQUFhLEdBQUc7QUFBQSxRQUN2RCxRQUFRO0FBQUEsTUFDVixDQUFDO0FBQUEsTUFDRCxNQUFNO0FBQUEsTUFDTixTQUFTLENBQUMsSUFBSTtBQUFBLElBQ2hCO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixpQkFBaUI7QUFBQSxRQUNqQixxQkFBcUI7QUFBQSxNQUN2QjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
