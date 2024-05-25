// camera.js

export function initializeCamera(radius) {
    let cameraAngleRadians = 0;
    let cameraRadius = radius;
    const cameraPosition = [0, 0, radius];
    const cameraSpeed = 0.1;
    const zoomSpeed = 0.1;
  
    function updateCamera(event) {
      if (event.type === 'keydown') {
        switch (event.key) {
          case 'ArrowUp':
            cameraRadius -= zoomSpeed;
            break;
          case 'ArrowDown':
            cameraRadius += zoomSpeed;
            break;
          case 'ArrowLeft':
            cameraAngleRadians -= cameraSpeed;
            break;
          case 'ArrowRight':
            cameraAngleRadians += cameraSpeed;
            break;
        }
      }
      cameraPosition[0] = Math.sin(cameraAngleRadians) * cameraRadius;
      cameraPosition[2] = Math.cos(cameraAngleRadians) * cameraRadius;
    }
  
    document.addEventListener('keydown', updateCamera);
  
    return {
      getCameraPosition: () => cameraPosition,
      getCameraAngleRadians: () => cameraAngleRadians,
      getCameraRadius: () => cameraRadius,
    };
  }
  