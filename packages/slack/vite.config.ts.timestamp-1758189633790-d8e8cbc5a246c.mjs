// vite.config.ts
import path from "node:path";
import glob from "file:///workspace/growi/node_modules/.pnpm/glob@8.1.0/node_modules/glob/glob.js";
import { nodeExternals } from "file:///workspace/growi/node_modules/.pnpm/rollup-plugin-node-externals@6.1.1_rollup@4.50.1/node_modules/rollup-plugin-node-externals/dist/index.js";
import { defineConfig } from "file:///workspace/growi/node_modules/.pnpm/vite@5.4.20_@types+node@20.14.0_sass@1.77.6_terser@5.44.0/node_modules/vite/dist/node/index.js";
import dts from "file:///workspace/growi/node_modules/.pnpm/vite-plugin-dts@3.9.1_@types+node@20.14.0_rollup@4.50.1_typescript@5.0.4_vite@5.4.20_@t_370c03098189cb1b0d66bee5b9fcd751/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "/workspace/growi/packages/slack";
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
        ignore: "**/*.{spec,test}.ts"
      }),
      name: "slack-libs",
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvd29ya3NwYWNlL2dyb3dpL3BhY2thZ2VzL3NsYWNrXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvd29ya3NwYWNlL2dyb3dpL3BhY2thZ2VzL3NsYWNrL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy93b3Jrc3BhY2UvZ3Jvd2kvcGFja2FnZXMvc2xhY2svdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7IG5vZGVFeHRlcm5hbHMgfSBmcm9tICdyb2xsdXAtcGx1Z2luLW5vZGUtZXh0ZXJuYWxzJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IGR0cyBmcm9tICd2aXRlLXBsdWdpbi1kdHMnO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIGR0cyh7XG4gICAgICBjb3B5RHRzRmlsZXM6IHRydWUsXG4gICAgfSksXG4gICAge1xuICAgICAgLi4ubm9kZUV4dGVybmFscyh7XG4gICAgICAgIGRldkRlcHM6IHRydWUsXG4gICAgICAgIGJ1aWx0aW5zUHJlZml4OiAnaWdub3JlJyxcbiAgICAgIH0pLFxuICAgICAgZW5mb3JjZTogJ3ByZScsXG4gICAgfSxcbiAgXSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogZ2xvYi5zeW5jKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvKiovKi50cycpLCB7XG4gICAgICAgIGlnbm9yZTogJyoqLyoue3NwZWMsdGVzdH0udHMnLFxuICAgICAgfSksXG4gICAgICBuYW1lOiAnc2xhY2stbGlicycsXG4gICAgICBmb3JtYXRzOiBbJ2VzJywgJ2NqcyddLFxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIHByZXNlcnZlTW9kdWxlczogdHJ1ZSxcbiAgICAgICAgcHJlc2VydmVNb2R1bGVzUm9vdDogJ3NyYycsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1EsT0FBTyxVQUFVO0FBRWhTLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUM5QixTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFNBQVM7QUFMaEIsSUFBTSxtQ0FBbUM7QUFRekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLE1BQ0YsY0FBYztBQUFBLElBQ2hCLENBQUM7QUFBQSxJQUNEO0FBQUEsTUFDRSxHQUFHLGNBQWM7QUFBQSxRQUNmLFNBQVM7QUFBQSxRQUNULGdCQUFnQjtBQUFBLE1BQ2xCLENBQUM7QUFBQSxNQUNELFNBQVM7QUFBQSxJQUNYO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsS0FBSztBQUFBLE1BQ0gsT0FBTyxLQUFLLEtBQUssS0FBSyxRQUFRLGtDQUFXLGFBQWEsR0FBRztBQUFBLFFBQ3ZELFFBQVE7QUFBQSxNQUNWLENBQUM7QUFBQSxNQUNELE1BQU07QUFBQSxNQUNOLFNBQVMsQ0FBQyxNQUFNLEtBQUs7QUFBQSxJQUN2QjtBQUFBLElBQ0EsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04saUJBQWlCO0FBQUEsUUFDakIscUJBQXFCO0FBQUEsTUFDdkI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
