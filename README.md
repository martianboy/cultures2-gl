# Cultures 2 gl
This is a webgl renderer of cultures 2 maps.

# Building/running
This project needs the [cultures2-wasm](https://github.com/martianboy/cultures2-wasm) project in the same folder as this project directory is.
That means `cultures2-wasm` and `cultures2-gl` are in the same folder.
Additionally, `cultures2-wasm` has to be fully built first to be able to use `cultures2-gl`.

A moderately new version of node is required; tested with v12.20.0 and developed with v13.11.0.

A fully automatic server can be started by executing `npx webpack-dev-server`.
In the console output you should be able to find the url where the integrated webserver is reachable. In the browser, open the developer console (typically F12) to be able to catch any errors.

Now find your game directory and locate `DataX\Libs\data0001.lib`. Drag and drop this file onto the webpage and wait.
The terrain should be visible fairly soon, but it takes some time to load all landscape elements.

When loading is finished, the map is explorable by holding down any mouse button.
 
