# Generates Android launcher icons from icon.png into the Capacitor android project.
# Run: powershell -ExecutionPolicy Bypass -File .\make-android-icons.ps1

param(
  [string]$IconPath = (Join-Path $PSScriptRoot 'icon.png'),
  [string]$ResPath  = (Join-Path $PSScriptRoot 'android\app\src\main\res'),
  [string]$BgColor  = '#f8f7f5'   # matches --bg in src/styles.css
)

Add-Type -AssemblyName System.Drawing

function New-Canvas([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bmp.SetResolution(96, 96)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality= [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  return @($bmp, $g)
}

function Save-Png($g, $bmp, [string]$path) {
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

$src = [System.Drawing.Image]::FromFile($IconPath)
$bg  = [System.Drawing.ColorTranslator]::FromHtml($BgColor)

# density -> @{ legacy = 48dp icon; adaptive = 108dp foreground }
$densities = [ordered]@{
  'mdpi'    = @{ legacy = 48;  adaptive = 108 }
  'hdpi'    = @{ legacy = 72;  adaptive = 162 }
  'xhdpi'   = @{ legacy = 96;  adaptive = 216 }
  'xxhdpi'  = @{ legacy = 144; adaptive = 324 }
  'xxxhdpi' = @{ legacy = 192; adaptive = 432 }
}

foreach ($d in $densities.GetEnumerator()) {
  $dir = Join-Path $ResPath ("mipmap-" + $d.Key)
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }

  # ---- legacy square icon: flat background + full artwork (keeps its own padding) ----
  $size = $d.Value.legacy
  $c = New-Canvas $size
  $bmp = $c[0]; $g = $c[1]
  $g.Clear($bg)
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $size, $size)))
  Save-Png $g $bmp (Join-Path $dir 'ic_launcher.png')

  # ---- legacy round icon: artwork inside a filled circle ----
  $c = New-Canvas $size
  $bmp = $c[0]; $g = $c[1]
  $g.Clear([System.Drawing.Color]::Transparent)
  $pad   = [int]($size * 0.02)
  $diam  = $size - (2 * $pad)
  $inset = [int]($diam * 0.08)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush($bg)),
    (New-Object System.Drawing.RectangleF($pad, $pad, $diam, $diam)))
  $inner = $diam - (2 * $inset)
  $artR  = New-Object System.Drawing.Rectangle(($pad + $inset), ($pad + $inset), $inner, $inner)
  $g.DrawImage($src, $artR)
  Save-Png $g $bmp (Join-Path $dir 'ic_launcher_round.png')

  # ---- adaptive foreground: artwork inside the 72/108 safe zone, transparent elsewhere ----
  $size = $d.Value.adaptive
  $c = New-Canvas $size
  $bmp = $c[0]; $g = $c[1]
  $g.Clear([System.Drawing.Color]::Transparent)
  $art = [int]($size * 0.66)          # 71.3dp of 108dp -> inside the 72dp safe zone
  $off = [int](($size - $art) / 2)
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle($off, $off, $art, $art)))
  Save-Png $g $bmp (Join-Path $dir 'ic_launcher_foreground.png')

  Write-Output ("{0,-8} legacy={1,3}px  adaptive={2,3}px" -f $d.Key, $d.Value.legacy, $d.Value.adaptive)
}

$src.Dispose()

# adaptive icon background colour (consumed by mipmap-anydpi-v26/ic_launcher.xml)
$bgFile = Join-Path $ResPath 'values\ic_launcher_background.xml'
Set-Content -LiteralPath $bgFile -Encoding UTF8 -Value @(
  '<?xml version="1.0" encoding="utf-8"?>'
  '<resources>'
  "    <color name=`"ic_launcher_background`">$BgColor</color>"
  '</resources>'
)

Write-Output "wrote $bgFile"
