// Credentials are read from env and written to a mode-0600 file, never stdout.
import { writeFile } from "node:fs/promises";
const [label, output] = process.argv.slice(2);
if (
  !label ||
  !output ||
  !process.env.COWCOMING_RELAY_URL ||
  !process.env.COWCOMING_ADMIN_KEY
) {
  console.error(
    'Usage: COWCOMING_RELAY_URL=... COWCOMING_ADMIN_KEY=... node scripts/create-device.mjs "Desk cow" /private/path/device-keys.json',
  );
  process.exit(1);
}
const base = process.env.COWCOMING_RELAY_URL.replace(/\/$/, "");
const response = await fetch(`${base}/v1/rooms`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.COWCOMING_ADMIN_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ label }),
});
if (!response.ok) throw new Error(`Room creation failed (${response.status})`);
const result = await response.json();
await writeFile(
  output,
  JSON.stringify({ relayUrl: base, ...result }, null, 2) + "\n",
  { mode: 0o600, flag: "wx" },
);
console.log(
  `Created ${result.roomId}. Keys saved to the requested private file.`,
);
