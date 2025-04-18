# DOOM I + II Launcher – MS-DOS Style
Relive the nostalgia of 1993 with this classic DOOM I & II Launcher, designed to emulate the authentic MS-DOS experience from id Software's DeathManager—now on Windows 11.

## System requirements
- [x] Windows 11: Comes with the WebView2 Runtime preinstalled.
- [x] Linux: libwebkit2gtk-4.1-0 required
- [ ] macOS 15: Coming soon.

## Instructions
1. Download the [latest release here](https://github.com/schnalz-digital/deathmanager/releases/latest) on GitHub.
2. Extract the contents of the provided `.zip` file, which includes two files, into your DOOM folder.
3. Execute the `.exe` file to start the Launcher.
4. At the top of the Launcher, click on `Choose DOOM Port` and specify the path to your preferred DOOM Source Port ([Zandronum](https://zandronum.com/download) or [GZDOOM](https://zdoom.org/downloads)).
5. Click on the `+` icon next to `Game WAD` and designate the path to your `.wad` files. Add-ons in `.iwad, .pwad, .pk3, or .deh` format within the `WAD` folder will be automatically detected.
6. Choose a map and press `Go!` to frag demons.

> [!IMPORTANT]
> The `.exe` file requires the `resources.neu` file as a dependency to function properly.

## Instructions Linux
Launch the Linux shell and execute the following commands to install the necessary `webkit2gtk`:
```bash
sudo apt-get update
```
```bash
sudo apt install libwebkit2gtk-4.1-0
```
then run DM.EXE from shell:
```bash
./DM.EXE-linux_x64
```

## Instructions macOS
Launch the macOS Terminal and execute the following command to allow DM.EXE. (replace -mac_x64 with -mac_arm for Apple Silicon Processors):
```bash
sudo xattr -d -r com.apple.quarantine DM.EXE-mac_x64
```
then run DM.EXE from shell:
```bash
./DM.EXE-mac_x64
```

## Screenshots
![DeathLauncher - UI](https://raw.githubusercontent.com/schnalz-digital/deathmanager/refs/heads/main/screenshot1.png)


![DeathLauncher - Adding WADs folder](https://raw.githubusercontent.com/schnalz-digital/deathmanager/refs/heads/main/screenshot2.png)


![DeathLauncher - Choosing a Map](https://raw.githubusercontent.com/schnalz-digital/deathmanager/refs/heads/main/screenshot3.png)
