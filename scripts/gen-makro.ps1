$ErrorActionPreference = "Stop"
$b = "I:\analiotik\master data\EXCEL + CSV\EXCEL + CSV\47. BPS"
Set-Location "I:\umkm\aplikasi\public\data"

function ReadLines($f) { @(Get-Content $f -Encoding UTF8) }

# Generic long-form extractor.
# $rel: relative path under $b
# $hdrOut: output header string
# $countyCol: column index where "Banjarnegara" appears
# $pick: array of column indices to include (in order)
function EmitLong($out, $rel, $hdrOut, $countyCol, $pick) {
  $lines = ReadLines ($b + "\" + $rel)
  $o = New-Object System.Collections.ArrayList
  $o.Add($hdrOut) | Out-Null
  for ($i = 1; $i -lt $lines.Length; $i++) {
    $raw = $lines[$i].Trim()
    if (-not $raw) { continue }
    $p = @($raw -split ",")
    if ($p[$countyCol] -ne "Banjarnegara") { continue }
    $vals = $pick | ForEach-Object { [string]$p[$_].Trim() }
    $o.Add(($vals -join ",")) | Out-Null
  }
  Set-Content -Path $out -Value $o -Encoding UTF8
  "$out : $($o.Count - 1) rows"
}

EmitLong "gini.csv"        "Perbandingan Indeks Gini\Nilai Indeks Gini CSV.csv"                                "Tahun,Nilai"                    2 @(0,1)
EmitLong "ipm.csv"         "Perbandingan Indeks Pembangunan Manusia\Nilai Indeks Pembangunan Manusia CSV.csv" "Tahun,Nilai"                    2 @(0,1)
EmitLong "pertumbuhan.csv" "Laju Pertumbuhan Ekonomi Banjarengara\Laju Pertumbuhan Ekonomi CSV.csv"             "Tahun,Laju"                     2 @(0,1)
EmitLong "garis_kemiskinan.csv" "Data Kemiskinan Banjarnegara\Data Garis Kemiskinan CSV.csv"                    "Tahun,GarisKemiskinan"          2 @(0,1)
# pop_miskin: no county column, all rows are Banjarnegara.
$lines = ReadLines ($b + "\Perbandingan Prosentase Penduduk Miskin\Data Penduduk Miskin CSV.csv")
$o = New-Object System.Collections.ArrayList
$o.Add("Tahun,JumlahPendudukMiskin,ProsentasePendudukMiskin") | Out-Null
for ($i = 1; $i -lt $lines.Length; $i++) {
  $raw = $lines[$i].Trim()
  if (-not $raw) { continue }
  $o.Add($raw) | Out-Null
}
Set-Content -Path "pop_miskin.csv" -Value $o -Encoding UTF8
"pop_miskin.csv : $($o.Count - 1) rows"
EmitLong "indeks_kedalaman.csv" "Perbandingan Indeks Kedalaman Kemiskinan\Data Indeks Kedalaman Kemiskinan CSV.csv" "Tahun,IndeksKedalaman"     2 @(0,1)
EmitLong "indeks_keparahan.csv" "Perbandingan Indeks Keparahan Kemiskinan\Data Indeks Keparahan Kemiskinan CSV.csv" "Tahun,IndeksKeparahan"     2 @(0,1)

# PDRB wide -> long. Header on L0, 4 columns: Sektor, Nilai, Kontribusi, Tahun.
function EmitPdrb($out, $rel) {
  $lines = ReadLines ($b + "\" + $rel)
  $o = New-Object System.Collections.ArrayList
  $o.Add("Sektor,Nilai,Kontribusi,Tahun") | Out-Null
  $seen = @{}
  for ($i = 1; $i -lt $lines.Length; $i++) {
    $raw = $lines[$i].Trim()
    if (-not $raw) { continue }
    $p = @($raw -split ",")
    if ($p.Count -lt 4) { continue }
    $sektor = $p[0].Trim()
    $tahun  = $p[3].Trim()
    if ($seen.ContainsKey($sektor + "|" + $tahun)) { continue }
    $seen[$sektor + "|" + $tahun] = $true
    $o.Add("$sektor,$($p[1].Trim()),$($p[2].Trim()),$tahun") | Out-Null
  }
  Set-Content -Path $out -Value $o -Encoding UTF8
  "$out : $($o.Count - 1) rows"
}

EmitPdrb "pdrb_berlaku.csv" "Nilai dan Kontribusi Lapangan Usaha dalam PDRB (Harga Berlaku)\Nilai dan Kontribusi Lapangan Usaha dalam PDRB CSV.csv"
EmitPdrb "pdrb_konstan.csv" "Nilai dan Kontribusi Lapangan Usaha dalam PDRB (Harga Konstan)\Nilai dan Kontribusi Lapangan Usaha dalam PDRB CSV.csv"
