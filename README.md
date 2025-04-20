# DOOM, Heretic and Hexen Launcher – MS-DOS Style
<!-- ![NeutralionJS](https://img.shields.io/badge/Neutralionsjs-F89901?style=for-the-badge&logo=neutralinojs&logoColor=white) -->


DeathManager (DM) is a frontend for launching single- and multiplayer games of DOOM, Heretic and Hexen. Relive the nostalgia of 1993 with this classic launcher, designed to emulate the authentic MS-DOS experience from [id Software's DeathManager](https://doomwiki.org/wiki/DeathManager!). Now on Windows 11, macOS 15+ and Linux. 

![DeathLauncher - UI](https://raw.githubusercontent.com/schnalz-digital/DeathManager/refs/heads/main/deathmanager-ui.png)

## Table of Contents
- [OS Compatibility](#os-compatibility)
- [Getting Started](#getting-started)
- [Instructions for macOS](#instructions-for-macos)
- [Instructions for Linux](#instructions-for-linux)
- [Screenshots](#screenshots)
- [Donate](#donate)

## OS Compatibility
- [x] Windows 11
- [ ] macOS 15
- [ ] Linux

## Getting Started
Follow these steps to get up and running:
1. Download the [latest release here](https://github.com/schnalz-digital/deathmanager/releases/latest) on GitHub.
2. **Extract** the contents of the provided `.zip` file, which includes two files, into your **DOOM folder**.
3. **Run the executable** file to start the **Launcher**.
4. At the top of the Launcher, click on `CHOOSE DOOM PORT ...` and specify the path to your preferred DOOM Source Port ([Zandronum](https://zandronum.com/download) or [GZDOOM](https://zdoom.org/downloads)).
5. Click on the `+` **icon** next to `Game WAD` and designate the path to your `.wad` files. Add-ons in `.iwad, .pwad, .pk3, or .deh` format within the `WAD` folder will be **automatically detected**.
6. Optional: Set Deathmatch flags to your liking (e.g., weapon stay, keep keys, etc.).
7. Choose a map and press `Go!` to send demons back to hell.

> [!IMPORTANT]
> The `executable` file requires the `resources.neu` file as a dependency to function properly.

## Instructions for macOS
Follow the steps below to allow and run `DM.EXE` on macOS.
> **Note:** Replace `-mac_arm` with `-mac_x64` if you're using an Intel-based Mac.

1. Open the **Terminal** and type the following command:
```bash
sudo xattr -d -r com.apple.quarantine
```
2. After typing the command, **drag and drop** the `DM.EXE-mac_arm` **file into the Terminal** to append its full path, then press **Enter**.

3. Type the following command to make the file executable:
```bash
chmod +x 
```
4. Once again, **drag and drop** the `DM.EXE-mac_arm` **file into the Terminal** to complete the path, then press **Enter**. 

5. To run the executable, **drag and drop** `DM.EXE-mac_arm` **into the Terminal** and press **Enter**.

## Instructions for Linux
1. Launch the Linux shell and execute the following commands to install the necessary `webkit2gtk`:
```bash
sudo apt-get update
```
```bash
sudo apt install libwebkit2gtk-4.1-0
```
2. Next, execute `DM.EXE-linux_x64` directly from shell:
```bash
./DM.EXE-linux_x64
```


## Screenshots
![DeathLauncher - UI](https://raw.githubusercontent.com/schnalz-digital/DeathManager/refs/heads/main/deathmanager-ui.png)


![DeathLauncher - Adding WADs folder](https://raw.githubusercontent.com/schnalz-digital/DeathManager/refs/heads/main/deathmanager-wads.png)


![DeathLauncher - Choosing a Map](https://raw.githubusercontent.com/schnalz-digital/DeathManager/refs/heads/main/deathmanager-maps.png)


![DeathLauncher - Setting DM flags](https://raw.githubusercontent.com/schnalz-digital/DeathManager/refs/heads/main/deathlauncher-dm-flags.png)


## Donate
This project is the result of countless hours of dedication and passion. If you'd like to support our work and its future, your donation would be appreciated. Thank you!

### Ko-Fi
https://ko-fi.com/deathmanager

### USDT (via Base network)
> [!IMPORTANT]
> Only send Base network assets to this address. Other assets will be lost forever.
```bash
0x21492311803D7df17A889D35A36F32DACE268C83
```

## Credits
- Uschiklo (dev of current DeathManager!)
- John Carmack
- John Romero (dev of original DeathManager!)
- Tom Hall
- Adrian Carmack
