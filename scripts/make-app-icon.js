/**
 * Build a multi-size Windows .ico from build/icon.png (16..256).
 * Works around Cyrillic project paths by doing all I/O under %TEMP%.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const root = path.join(__dirname, "..");
const srcPng = path.join(root, "build", "icon.png");
const outIco = path.join(root, "build", "icon.ico");
const sizes = [16, 24, 32, 48, 64, 128, 256];

if (!fs.existsSync(srcPng)) {
  console.error("Missing", srcPng);
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pc-ico-"));
const tmpPng = path.join(tmp, "icon.png");
const tmpIco = path.join(tmp, "icon.ico");
const ps1 = path.join(tmp, "make-ico.ps1");
fs.copyFileSync(srcPng, tmpPng);

fs.writeFileSync(
  ps1,
  `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${tmpPng.replace(/'/g, "''")}')
$sizes = @(${sizes.join(",")})
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $ms
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$sizes.Count)
$images = New-Object System.Collections.Generic.List[byte[]]
foreach ($size in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($src, 0, 0, $size, $size)
  $g.Dispose()
  $pngMs = New-Object System.IO.MemoryStream
  $bmp.Save($pngMs, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  [void]$images.Add($pngMs.ToArray())
  $pngMs.Dispose()
}
$src.Dispose()
$offset = 6 + (16 * $sizes.Count)
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]
  $data = $images[$i]
  $bw.Write([byte]$(if ($s -ge 256) { 0 } else { $s }))
  $bw.Write([byte]$(if ($s -ge 256) { 0 } else { $s }))
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]32)
  $bw.Write([UInt32]$data.Length)
  $bw.Write([UInt32]$offset)
  $offset += $data.Length
}
foreach ($data in $images) { $bw.Write($data) }
$bw.Flush()
[System.IO.File]::WriteAllBytes('${tmpIco.replace(/'/g, "''")}', $ms.ToArray())
$bw.Dispose(); $ms.Dispose()
Write-Output 'ok'
`,
  "utf8"
);

execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1], {
  stdio: "inherit",
});

fs.copyFileSync(tmpIco, outIco);
fs.copyFileSync(tmpIco, path.join(root, "assets", "icon.ico"));
fs.rmSync(tmp, { recursive: true, force: true });
console.log("Updated build/icon.ico and assets/icon.ico");
