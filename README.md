# Rolling_trials
Rolling Trials is a 3D third-person arcade puzzle-platformer built with WebGPU. You control a rolling ball that moves through connected rooms, collecting diamonds and solving puzzles to open doors and reach the goal as fast as possible.

# WebGPU Examples
A collection of WebGPU examples for undergraduate computer graphics courses.

# Building and running
The examples do not need to be built, but some of them require a server
capable of serving static files (WebGL+CORS restrictions). A basic Node.js
implementation is available in `server.js`.

# Project structure
The project is structured as follows:

- The root directory contains `index.html`, the project's front page that
  lists all examples with links to their respective pages.
- The `engine` directory contains the engine that the examples are built with.
- The `lib` directory holds the libraries. We use libraries when something
  is too tedious or prone to error if written by hand or out of the scope of
  this project.
- The `models` directory contains models and their respective textures that
  are used in multiple examples.
- Finally, the `examples` directory contains a folder for every example.
  Each example holds at least a .html and a .js file as an entry point,
  potentially along with other support files associated with the example.
