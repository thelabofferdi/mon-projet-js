import { RodiumAI } from "rodiumai";
import fs from "node:fs";
import readline from "node:readline";

const client = new RodiumAI({ timeout: 150000 });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  let etape = "chat";
  while (true) {
    try {
      if (etape === "chat") {
        const q = await ask("Votre question : ");
        const r = await client.chat.completions.create({
          model: "openai/gpt-4o",
          messages: [{ role: "user", content: q }],
        });
        console.log(r.choices[0].message.content);
        console.log("Tokens :", r.usage?.total_tokens, "(cost_rodi non exposé par le SDK JS)");
      } else if (etape === "image") {
        const desc = await ask("Décrivez l'image : ");
        const img = await client.images.generate({ model: "openai/gpt-image-1", prompt: desc });
        fs.writeFileSync("image.png", Buffer.from(img.data[0].b64_json, "base64"));
        console.log("Image enregistrée : image.png");
      } else {
        const desc = await ask("Décrivez la vidéo : ");
        // Le SDK JS 0.2 ne supporte pas encore la vidéo : appel HTTP direct.
        const resp = await fetch("https://api.rodiumai.io/v1/videos/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RODIUMAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/veo-3.1-generate-preview",
            prompt: desc,
            duration_seconds: 4,
          }),
          signal: AbortSignal.timeout(600000),
        });
        const vid = await resp.json();
        if (resp.status !== 200) {
          console.log("Erreur :", resp.status, vid.error_code);
        } else {
          const data = vid.data[0];
          if (data.b64_json) {
            fs.writeFileSync("video.mp4", Buffer.from(data.b64_json, "base64"));
          } else {
            const v = await fetch(data.url);
            fs.writeFileSync("video.mp4", Buffer.from(await v.arrayBuffer()));
          }
          console.log("Vidéo enregistrée : video.mp4");
        }
      }
    } catch (err) {
      console.log("Erreur :", err.message);
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
