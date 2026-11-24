$flower = '[\s\u00A0]*(\uD83C\uDF38\uFE0F?[\s\u00A0]*)+$'
function Read-List($f) { if (Test-Path $f) { @(Get-Content $f -Encoding UTF8 | ForEach-Object { ($_ -replace $flower, '').Trim() } | Where-Object { $_ } | Select-Object -Unique) } else { @() } }
$add = Read-List 'D:\Smootie\quotes.txt'
$rem = Read-List 'D:\Smootie\quotes-remove.txt'
$js = 'window.extraQuotes = ' + (ConvertTo-Json -InputObject $add -Compress) + ';' + "`n" + 'window.removeQuotes = ' + (ConvertTo-Json -InputObject $rem -Compress) + ';'
[IO.File]::WriteAllText('D:\Smootie\quotes.js', $js, (New-Object Text.UTF8Encoding $false))
"add: $($add.Count), remove-phrases: $($rem.Count)"
