$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$qaCargoBin=Join-Path $env:USERPROFILE '.cargo/bin'
if(Test-Path $qaCargoBin){$env:Path=$qaCargoBin+';'+$env:Path}
if(-not(Get-Command cargo -ErrorAction SilentlyContinue)){throw 'Instala Rust MSVC antes de compilar.'}
$qaVswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
if(-not(Test-Path $qaVswhere)){throw 'Falta Visual Studio Build Tools con Desarrollo para el escritorio con C++.'}
$qaVsPath=& $qaVswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if(-not $qaVsPath){throw 'Instala la carga C++ con MSVC x64/x86 y Windows SDK.'}
npm.cmd ci
if($LASTEXITCODE -ne 0){throw 'Falló npm ci.'}
npm.cmd test
if($LASTEXITCODE -ne 0){throw 'Fallaron las pruebas.'}
npm.cmd run desktop:build -- --bundles nsis,msi
if($LASTEXITCODE -ne 0){throw 'Falló la compilación nativa; revisar el registro.'}
Write-Output 'Paquetes: src-tauri/target/release/bundle/. Probar apertura y persistencia antes de distribuir.'
