import { RodiumAI } from "rodiumai";
import fs from "node:fs";
import readline from "node:readline";

const client = new RodiumAI({ timeout: 150000 });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  let etape = "chat";
  while (true) {
    if (etape === "chat") {
      const q = await ask("Votre question : ");
      const r = await client.chat([{ role: "user", content: q }]);
      console.log(r.choices[0].message.content);
      console.log("Coût :", r.cost_rodi, "RODI");
    } else if (etape === "image") {
      const desc = await ask("Décrivez l'image : ");
      const img = await client.images({ model: "openai/gpt-image-1", prompt: desc });
      fs.writeFileSync("image.png", Buffer.from(img.data[0].b64_json, "base64"));
      console.log("Image enregistrée : image.png");
    } else {
      const desc = await ask("Décrivez la vidéo : ");
      const vid = await client.videos({ model: "google/veo-3.1-generate-preview",
        prompt: desc, duration_seconds: 4, timeout: 600000 });
      if (vid.data[0].b64_json) {
        fs.writeFileSync("video.mp4", Buffer.from(vid.data[0].b64_json, "base64"));
      } else {
        const v = await fetch(vid.data[0].url);
        fs.writeFileSync("video.mp4", Buffer.from(await v.arrayBuffer()));
      }
      console.log("Vidéo enregistrée : video.mp4");
    }
    const suite = (await ask("Revenir (b) / rester (r) / suivant (s) / quitter (q) ? ")).trim().toLowerCase();
    const ordre = ["chat", "image", "video"];
    const i = ordre.indexOf(etape);
    if (suite === "b" && i > 0) etape = ordre[i - 1];
    else if (suite === "s" && i < 2) etape = ordre[i + 1];
    else if (suite === "q") break;
  }
  rl.close();
}
main();
