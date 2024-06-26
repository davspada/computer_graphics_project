export function initializeCamera(radius) {
  let cameraAngleRadians = 0;
  let cameraRadius = radius;
  const cameraPosition = [0, 0, radius];
  const cameraSpeedMouse = 0.025;
  const cameraSpeedKeyboard = 0.25;
  const zoomSpeed = 0.05;
  const cameraSpeedGamepad = 0.05;
  const zoomSpeedGamepad = 0.25;

  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let initialPinchDistance = null;


  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateCamera() {
    cameraPosition[0] = Math.sin(cameraAngleRadians) * cameraRadius;
    cameraPosition[2] = Math.cos(cameraAngleRadians) * cameraRadius;
    cameraRadius = clamp(cameraRadius, -28, 28); // Clamp cameraRadius between -28 and 28
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
      cameraAngleRadians -= deltaX * cameraSpeedMouse;
      cameraPosition[1] -= deltaY * zoomSpeed;
      lastX = event.clientX;
      lastY = event.clientY;
      updateCamera();
    }
  }
  function onWheel(event) {
    cameraRadius += event.deltaY * zoomSpeed;
    cameraRadius = clamp(cameraRadius, -28, 28);
    updateCamera();
  }
  function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function onTouchStart(event) {
    if (event.touches.length === 1) {
      isDragging = true;
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
    } else if (event.touches.length === 2) {
      isDragging = false;
      initialPinchDistance = getPinchDistance(event.touches);
    }
  }
  function onTouchMove(event) {
    if (isDragging && event.touches.length === 1) {
      const deltaX = event.touches[0].clientX - lastX;
      const deltaY = event.touches[0].clientY - lastY;
      cameraAngleRadians -= deltaX * cameraSpeedMouse;
      cameraPosition[1] -= deltaY * zoomSpeed;
      lastX = event.touches[0].clientX;
      lastY = event.touches[0].clientY;
      updateCamera();
    } else if (event.touches.length === 2) {
      const newPinchDistance = getPinchDistance(event.touches);
      const pinchDelta = newPinchDistance - initialPinchDistance;
      cameraRadius -= pinchDelta * (zoomSpeed / 100);
      cameraRadius = clamp(cameraRadius, -28, 28);
      initialPinchDistance = newPinchDistance;
      updateCamera();
    }
  }
  function onTouchEnd() {
    isDragging = false;
    initialPinchDistance = null;
  }
  function onKeyDown(event) {
    switch (event.key) {
      case 'ArrowUp':
        cameraRadius -= zoomSpeed;
        break;
      case 'ArrowDown':
        cameraRadius += zoomSpeed;
        break;
      case 'ArrowLeft':
        cameraAngleRadians -= cameraSpeedKeyboard;
        break;
      case 'ArrowRight':
        cameraAngleRadians += cameraSpeedKeyboard;
        break;
    }
    cameraRadius = clamp(cameraRadius, -28, 28);
    updateCamera();
  }
  function updateGamepad() {
    const gamepads = navigator.getGamepads();
    if (gamepads[0]) {
      const gp = gamepads[0];
      const leftStickX = gp.axes[2];
      const leftStickY = gp.axes[3];
      const leftTrigger = gp.buttons[6].value;
      const rightTrigger = gp.buttons[7].value;

      // Camera rotation
      cameraAngleRadians += leftStickX * cameraSpeedGamepad;
      cameraPosition[1] -= leftStickY * cameraSpeedGamepad;

      // Camera zoom
      cameraRadius -= (rightTrigger - leftTrigger) * zoomSpeedGamepad;
      cameraRadius = clamp(cameraRadius, -28, 28);
      updateCamera();
    }
    requestAnimationFrame(updateGamepad);
  }

  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mousemove', onMouseMove); 
  document.addEventListener('wheel', onWheel);
  document.addEventListener('touchstart', onTouchStart);
  document.addEventListener('touchmove', onTouchMove);
  document.addEventListener('touchend', onTouchEnd);
  document.addEventListener('keydown', onKeyDown);
  requestAnimationFrame(updateGamepad);
  return {
    getCameraPosition: () => cameraPosition,
    getCameraAngleRadians: () => cameraAngleRadians,
    getCameraRadius: () => cameraRadius,
  };
}