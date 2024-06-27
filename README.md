# computer_graphics_project
   Davide Spada - 0001134790

WebGL Project Documentation
===========================

Project Overview
----------------

This project is a WebGL-based application that loads and renders 3D models: it represents a Garage with a Toyota AE86. It includes functionality for lighting, shadows, toggle of the various features, user interaction through GUI controls, mouse, keyboard, touch, and gamepad.

Please note that the project is available at [this link](https://davspada.github.io/computer_graphics_project/)

Key Features
------------

*   Loading and parsing OBJ and MTL files
*   Handling textures and materials
*   Rendering in real time
*   Implementing depth textures for shadow mapping
*   Implementing different features like transparency, normal mapping, etc.
*   Interactive GUI for adjusting lighting, projection, and other settings
*   Interactive controls via mouse, keyboard, touch, and gamepad

File Structure
--------------

The project is organized into the following main files:

*   `index.html`: The main HTML file
*   `src/main.js`: The main JavaScript file containing the application logic
*   `src/obj_mtl.js`: Handles the parsing of .obj and .mtl files
*   `src/utils.js`: Utility functions for the application
*   `src/shaders.js`: Vertex and fragment shaders
*   `src/camera.js`: Code handling camera controls (mouse, keyboard, touch, gamepad)
*   `src/carControls.js`: Code handling car controls (keyboard, gamepad)
*   `res/`: Directory containing OBJ and MTL files for 3D models, their textures, additional code(GUI).

How to Run the Project
----------------------

To run the project, follow these steps:

1.  Clone the repository to your local machine.
2.  Ensure you have a local web server to serve the files.
3.  Open the `index.html` file in your browser.
4.  Interact with the GUI controls to adjust lighting, shadows, and other settings.

Core Components
---------------

### Main Application

The main application sets up the WebGL context, loads the models, and handles rendering. It also includes a GUI for user interaction.

    async function main() {
      // WebGL context setup
      const canvas = document.querySelector("#canvas");
      const gl = canvas.getContext("webgl");
    
      // Load models
      const objects = await load_models(gl);
    
      // render loop
      requestAnimationFrame(render);
    }

### Rendering Function

The rendering function handles the drawing of the scene, including depth texture rendering for shadows and the main scene rendering with lighting and shadows applied.

    function render(time) {
      // Configure needed variable
      // Draw to the depth texture (to handle shadows)
      // Main scene rendering
      requestAnimationFrame(render);
    }

WebGL Functionalities Utilized
------------------------------

*   Creating and managing WebGL contexts
*   Loading and parsing OBJ and MTL files
*   Handling textures and materials
*   Depth texture creation and shadow mapping
*   Implementing normal mapping
*   Transparency setup
*   Interactive GUI for user input
*   Handling input from mouse, keyboard, touch, and gamepad

Dependencies
------------

This project relies on the following libraries:

*   WebGLUtils: Utility functions for WebGL
*   dat.GUI: A lightweight graphical user interface for changing variables in JavaScript
*   m4: matrix utility
