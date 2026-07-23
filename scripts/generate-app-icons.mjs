import sharp from "sharp";

const regular = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f8f3e9"/>
  <rect x="24" y="24" width="464" height="464" rx="116" fill="#24483a"/>
  <circle cx="416" cy="104" r="28" fill="#efb599"/>
  <text x="256" y="278" text-anchor="middle" dominant-baseline="middle" fill="#fffdf8"
    font-family="Georgia, Times New Roman, serif" font-size="196" font-weight="700" letter-spacing="-15">MB</text>
</svg>`);

const maskable = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#24483a"/>
  <circle cx="400" cy="112" r="26" fill="#efb599"/>
  <text x="256" y="278" text-anchor="middle" dominant-baseline="middle" fill="#fffdf8"
    font-family="Georgia, Times New Roman, serif" font-size="176" font-weight="700" letter-spacing="-14">MB</text>
</svg>`);

await Promise.all([
  sharp(regular).resize(192, 192).png().toFile("public/icon-192.png"),
  sharp(regular).png().toFile("public/icon-512.png"),
  sharp(regular).resize(180, 180).png().toFile("public/apple-touch-icon.png"),
  sharp(maskable).png().toFile("public/icon-maskable-512.png"),
]);
