export function initializeCarControls(carTransform) {
  const keyState = {};
  const speed = 0.25;
  const rotate_speed = 0.05;

  window.addEventListener('keydown', (event) => {
    keyState[event.key] = true;
  });

  window.addEventListener('keyup', (event) => {
    keyState[event.key] = false;
  });

  function updateCarTransform() {
    // Keyboard controls
    if (keyState['w']) {
      carTransform.translation[2] -= speed; //move forward
    }
    if (keyState['s']) {
      carTransform.translation[2] += speed; //move backward
    }
    if (keyState['a']) {
      carTransform.translation[0] -= speed; //move left
    }
    if (keyState['d']) {
      carTransform.translation[0] += speed; //move right
    }
    if (keyState['q']) {
      carTransform.rotation[1] -= rotate_speed; //rotate left
    }
    if (keyState['e']) {
      carTransform.rotation[1] += rotate_speed; // right
    }
    if (keyState['z']) {
      carTransform.rotation[0] -= rotate_speed; //rotate around x-axis (up)
    }
    if (keyState['c']) {
      carTransform.rotation[0] += rotate_speed; //(down)
    }
    if (keyState['r']) { //reset car initial state
      carTransform.rotation[0] = 0;
      carTransform.rotation[1] = 45;
      carTransform.rotation[2] = 0; // Reset rotation
      carTransform.translation[0] = 0;
      carTransform.translation[1] = -3.25;
      carTransform.translation[2] = 0; // Reset position
    }

    // Gamepad controls
    const gamepads = navigator.getGamepads();
    if (gamepads[0]) {
      const gp = gamepads[0];
      const leftStickX = gp.axes[0];
      const leftStickY = gp.axes[1];
      const rightStickX = gp.axes[2];
      const rightStickY = gp.axes[3];

      //move the car with the left stick
      carTransform.translation[0] += leftStickX * speed;
      carTransform.translation[2] += leftStickY * speed;

      // Rotate the car with the D-pad
      if (gp.buttons[14].pressed) { // D-pad left
        carTransform.rotation[1] -= rotate_speed;
      }
      if (gp.buttons[15].pressed) { // D-pad right
        carTransform.rotation[1] += rotate_speed;
      }
      if (gp.buttons[12].pressed) { // D-pad up
        carTransform.rotation[0] -= rotate_speed;
      }
      if (gp.buttons[13].pressed) { // D-pad down
        carTransform.rotation[0] += rotate_speed;
      }

      if (gp.buttons[0].pressed) { // A or X button
        carTransform.rotation[0] = 0;
        carTransform.rotation[1] = 45;
        carTransform.rotation[2] = 0; // Reset rotation
        carTransform.translation[0] = 0;
        carTransform.translation[1] = -3.25;
        carTransform.translation[2] = 0; // Reset position
      }
    }
  }

  return updateCarTransform;
}
