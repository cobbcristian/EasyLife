const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const buildId = "77d21a2d-8c6b-4a8d-92fc-a897e77f6ba4";
const statusPath = path.join(__dirname, "..", "STATUS.md");

function append(line) {
  fs.appendFileSync(statusPath, line + "\n");
  console.log(line);
}

function getStatus() {
  const raw = execSync(
    `npx eas-cli build:list --platform android --limit 5 --json`,
    { encoding: "utf8", cwd: path.join(__dirname, "..") },
  );
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end < 0) throw new Error("no json array");
  const builds = JSON.parse(raw.slice(start, end + 1));
  return builds.find((b) => b.id === buildId) || builds[0];
}

(async () => {
  for (let i = 1; i <= 60; i++) {
    await new Promise((r) => setTimeout(r, 120_000));
    try {
      const b = getStatus();
      const st = b.status;
      const t = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
      append(`- Check ${i} (${t}): ${st}`);
      console.log(`AGENT_LOOP_TICK_oceanside build=${st}`);
      if (st === "FINISHED") {
        const url = b.artifacts?.applicationArchiveUrl || "(see Expo dashboard)";
        append("");
        append("## DONE");
        append(`- AAB: ${url}`);
        append("- Upload to Play Internal testing next.");
        console.log(`BUILD_FINISHED ${url}`);
        break;
      }
      if (st === "ERRORED" || st === "CANCELED") {
        append("");
        append(`## FAILED: ${st}`);
        append("- Open Expo build logs.");
        console.log(`BUILD_FAILED ${st}`);
        break;
      }
    } catch (e) {
      append(`- Check ${i}: ${e.message}`);
    }
  }
})();
