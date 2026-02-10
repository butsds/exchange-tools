import { defineConfig } from "vite"
import { resolve, dirname } from "path"
import { fileURLToPath } from "node:url"
import dts from "vite-plugin-dts"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "ExchangeTools",
      fileName: "exchange-tools",
    },
    rollupOptions: {
      external: ["eventemitter3"],
      output: {
        globals: {
          eventemitter3: "EventEmitter3",
        },
      },
    },
  },
})
