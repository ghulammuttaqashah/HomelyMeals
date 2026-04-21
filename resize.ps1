Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("d:\Study\FYP\HomelyMeals\customer\public\customer+admin.png")
$bmp = New-Object System.Drawing.Bitmap 192, 192
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($img, 0, 0, 192, 192)
$bmp.Save("d:\Study\FYP\HomelyMeals\customer\public\notification-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("d:\Study\FYP\HomelyMeals\cook\public\notification-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
$bmp.Dispose()
$g.Dispose()
