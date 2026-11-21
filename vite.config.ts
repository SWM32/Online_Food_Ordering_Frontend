import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Vite plugin that copies an image chosen from the admin's PC into `public/images/`
 * as-is (without resizing or compression) and returns its public location `/images/<filename>`
 * so that the image location can be stored directly in the backend database.
 */
function localImageLocationPlugin(): Plugin {
  return {
    name: "local-image-location",
    configureServer(server) {
      server.middlewares.use("/__local-image", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }

        const rawName = (req.headers["x-file-name"] as string) || "image.png";
        const safeName =
          path
            .basename(decodeURIComponent(rawName))
            .replace(/[^a-zA-Z0-9._-]/g, "_") || "image.png";

        const imagesDir = path.resolve(process.cwd(), "public", "images");
        fs.mkdirSync(imagesDir, { recursive: true });

        const targetPath = path.join(imagesDir, safeName);
        const writeStream = fs.createWriteStream(targetPath);

        req.pipe(writeStream);

        writeStream.on("finish", () => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ location: `/images/${safeName}` }));
        });

        writeStream.on("error", (err) => {
          res.statusCode = 500;
          res.end(JSON.stringify({ message: err.message }));
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localImageLocationPlugin()],
});
