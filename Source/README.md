## Installation Instructions for Development

Requires: 
- [nodejs with npm (npm comes with nodejs)](https://nodejs.org/en/download)
- [Neutralinojs](https://neutralino.js.org)

Follow these steps to get up and running developing:

1. Open Terminal or Powershell
2. If you haven't installed Neutralinojs yet, install [Neutralinojs](https://neutralino.js.org/docs/getting-started/your-first-neutralinojs-app) globally
    > ```
    > npm install -g @neutralinojs/neu
    > ```
3. Goto Subfolder `/DM.EXE/` and run update command of neutralinojs to download all needed dependencies
    > ```
    > neu update
    > ```
4. Goto Subfolder `/DM.EXE/DMEXESvelte/` and run install command of npm to download all needed dependencies for `vite` files
    > ```
    > npm install
    > ```
5. Goto Subfolder `/DM.EXE/` again and start the app with:
    > ```
    > neu run
    > ```

This autoloads the Vite Svelte Server with autoreloading when changing HTML and Javascript while enutralinojs app is running.