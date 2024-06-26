export function initializeCarControls(carTransform) {
    const keyState = {};
    const speed = 0.1
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
        carTransform.rotation[1] -= speed; // Rotate left
      }
      if (keyState['e']) {
        carTransform.rotation[1] += speed; // Rotate right
      }
    }
  
    return updateCarTransform;
  }
  