export function initializeCarControls(carTransform) {
    const keyState = {};
    const speed = 0.25
    const rotate_speed = 0.05

    window.addEventListener('keydown', (event) => {
      keyState[event.key] = true;
    });
  
    window.addEventListener('keyup', (event) => {
      keyState[event.key] = false;
    });
  
    function updateCarTransform() {
      if (keyState['w']) {
        carTransform.translation[2] -= speed; // Move forward
      }
      if (keyState['s']) {
        carTransform.translation[2] += speed; // Move backward
      }
      if (keyState['a']) {
        carTransform.translation[0] -= speed; // Move left
      }
      if (keyState['d']) {
        carTransform.translation[0] += speed; // Move right
      }
      if (keyState['q']) {
        carTransform.rotation[1] -= rotate_speed; // Rotate left
      }
      if (keyState['e']) {
        carTransform.rotation[1] += rotate_speed; // Rotate right
      }
      if (keyState['z']) {
        carTransform.rotation[0] -= rotate_speed; // Rotate around x-axis (upwards)
      }
      if (keyState['c']) {
        carTransform.rotation[0] += rotate_speed; // Rotate around x-axis (downwards)
      }
      if (keyState['r']) {
        carTransform.rotation[0] = 0;
        carTransform.rotation[1] = 45;
        carTransform.rotation[2] = 0; // Reset position
        carTransform.translation[0] = 0
        carTransform.translation[1] = -3.25
        carTransform.translation[2] = 0
      }
    }
  
    return updateCarTransform;
  }
  