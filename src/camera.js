export function initializeCamera(radius) {
  let cameraAngleRadians = 0;
  let cameraRadius = radius;
  const cameraPosition = [0, 0, radius];
  const cameraSpeed = 0.005;
  const zoomSpeed = 0.1;

  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  function updateCamera(event) {
    if (event.type === 'mousedown') {
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

  function onMouseDown(event) {
    isDragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function onMouseUp() {
    isDragging = false;
  }

  function onMouseMove(event) {
    if (isDragging) {
      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;
      cameraAngleRadians -= deltaX * cameraSpeed;
      cameraPosition[1] -= deltaY * zoomSpeed;
      lastX = event.clientX;
      lastY = event.clientY;
      updateCamera(event)
    }
  }

  function onWheel(event) {
    cameraRadius += event.deltaY * zoomSpeed;
    updateCamera(event)
  }

  //document.addEventListener('keydown', updateCamera);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('wheel', onWheel);

  return {
    getCameraPosition: () => cameraPosition,
    getCameraAngleRadians: () => cameraAngleRadians,
    getCameraRadius: () => cameraRadius,
  };
}
