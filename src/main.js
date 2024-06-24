import { parseOBJ, parseMTL } from './obj_mtl.js';
import { create1PixelTexture, createTexture, generateTangents, getGeometriesExtents, degToRad, maxVector, minVector } from './utils.js';
import { initializeCamera } from './camera.js';
import { vertexShaderSource, fragmentShaderSource } from './shaders.js';

async function loadOBJAndMTL(gl, objHref) {
  const response = await fetch(objHref);
  const text = await response.text();
  const obj = parseOBJ(text);

  const baseHref = new URL(objHref, window.location.href);
  const matTexts = await Promise.all(obj.materialLibs.map(async filename => {
    const matHref = new URL(filename, baseHref).href;
    const response = await fetch(matHref);
    return await response.text();
  }));
  const materials = parseMTL(matTexts.join('\n'));

  const textures = {
    defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
    defaultNormal: create1PixelTexture(gl, [127, 127, 255, 0]),
  };

  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith('Map'))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureHref = new URL(filename, baseHref).href;
          texture = createTexture(gl, textureHref);
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }

  Object.values(materials).forEach(m => {
    m.shininess = 25;
    m.specular = [3, 2, 1];
  });

  const defaultMaterial = {
    diffuse: [1, 1, 1],
    diffuseMap: textures.defaultWhite,
    normalMap: textures.defaultNormal,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    specularMap: textures.defaultWhite,
    shininess: 400,
    opacity: 1,
  };

  const parts = obj.geometries.map(({ material, data }) => {
    if (data.color) {
      if (data.position.length === data.color.length) {
        data.color = { numComponents: 3, data: data.color };
      }
    } else {
      data.color = { value: [1, 1, 1, 1] };
    }

    if (data.texcoord && data.normal) {
      data.tangent = generateTangents(data.position, data.texcoord);
    } else {
      data.tangent = { value: [1, 0, 0] };
    }

    if (!data.texcoord) {
      data.texcoord = { value: [0, 0] };
    }

    if (!data.normal) {
      data.normal = { value: [0, 0, 1] };
    }

    const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
    return {
      material: {
        ...defaultMaterial,
        ...materials[material],
      },
      bufferInfo,
    };
  });

  return { parts, extents: getGeometriesExtents(obj.geometries) };
}

async function main() {
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }
  
  const ext = gl.getExtension('WEBGL_depth_texture');
  if (!ext) {
    return alert('need WEBGL_depth_texture');  // eslint-disable-line
  }

  const depthTexture = gl.createTexture();
  const depthTextureSize = 512;
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(
      gl.TEXTURE_2D,      // target
      0,                  // mip level
      gl.DEPTH_COMPONENT, // internal format
      depthTextureSize,   // width
      depthTextureSize,   // height
      0,                  // border
      gl.DEPTH_COMPONENT, // format
      gl.UNSIGNED_INT,    // type
      null);              // data
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const depthFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER,       // target
      gl.DEPTH_ATTACHMENT,  // attachment point
      gl.TEXTURE_2D,        // texture target
      depthTexture,         // texture
      0);                   // mip level

  // create a color texture of the same size as the depth texture
  // see article why this is needed_
  const unusedTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, unusedTexture);
  gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      depthTextureSize,
      depthTextureSize,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // attach it to the framebuffer
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER,        // target
      gl.COLOR_ATTACHMENT0,  // attachment point
      gl.TEXTURE_2D,         // texture target
      unusedTexture,         // texture
      0);                    // mip level

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  const settings = {
    cameraX: 6,
    cameraY: 5,
    posX: 2.5,
    posY: 4.8,
    posZ: 4.3,
    targetX: 2.5,
    targetY: 0,
    targetZ: 3.5,
    projWidth: 1,
    projHeight: 1,
    perspective: true,
    fieldOfView: 120,
    bias: -0.006,
  };
  webglLessonsUI.setupUI(document.querySelector('#ui'), settings, [
    { type: 'slider',   key: 'cameraX',    min: -10, max: 10, change: render, precision: 2, step: 0.001, },
    { type: 'slider',   key: 'cameraY',    min:   1, max: 20, change: render, precision: 2, step: 0.001, },
    { type: 'slider',   key: 'posX',       min: -10, max: 10, change: render, precision: 2, step: 0.001, },
    { type: 'slider',   key: 'posY',       min:   1, max: 20, change: render, precision: 2, step: 0.001, },
    { type: 'slider',   key: 'posZ',       min:   1, max: 20, change: render, precision: 2, step: 0.001, },
    { type: 'slider',   key: 'targetX',    min: -10, max: 10, change: render, precision: 2, step: 0.001, },
    { type: 'slider',   key: 'targetY',    min:   0, max: 20, change: render, precision: 2, step: 0.001, },
    { type: 'slider',   key: 'targetZ',    min: -10, max: 20, change: render, precision: 2, step: 0.001, },
    { type: 'slider',   key: 'projWidth',  min:   0, max:  2, change: render, precision: 2, step: 0.001, },
    { type: 'slider',   key: 'projHeight', min:   0, max:  2, change: render, precision: 2, step: 0.001, },
    { type: 'checkbox', key: 'perspective', change: render, },
    { type: 'slider',   key: 'fieldOfView', min:  1, max: 179, change: render, },
    { type: 'slider',   key: 'bias',       min:  -0.01, max: 0.00001, change: render, precision: 4, step: 0.0001, },
  ]);

  const fieldOfViewRadians = degToRad(60);

  function drawScene(
    projectionMatrix,
    cameraMatrix,
    textureMatrix,
    lightWorldMatrix,
    programInfo) {
  // Make a view matrix from the camera matrix.
  const viewMatrix = m4.inverse(cameraMatrix);

  gl.useProgram(programInfo.program);

  // set uniforms that are the same for both the sphere and plane
  // note: any values with no corresponding uniform in the shader
  // are ignored.
  webglUtils.setUniforms(programInfo, {
    u_view: viewMatrix,
    u_projection: projectionMatrix,
    u_bias: settings.bias,
    u_textureMatrix: textureMatrix,
    u_projectedTexture: depthTexture,
    u_shininess: 150,
    u_innerLimit: Math.cos(degToRad(settings.fieldOfView / 2 - 10)),
    u_outerLimit: Math.cos(degToRad(settings.fieldOfView / 2)),
    u_lightDirection: lightWorldMatrix.slice(8, 11).map(v => -v),
    u_lightWorldPosition: [settings.posX, settings.posY, settings.posZ],
    u_viewWorldPosition: cameraMatrix.slice(12, 15),
  });

  objects.forEach((object, index) => {
    let u_world = m4.identity();
    const transform = index === 0 ? garageTransform : carTransform; // Use appropriate transform
    u_world = setTransformationMatrix(transform);
    u_world = m4.translate(u_world, ...objOffset);

    object.parts.forEach(({ bufferInfo, material }) => {
      webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      webglUtils.setUniforms(programInfo, { u_world }, material);
      webglUtils.drawBufferInfo(gl, bufferInfo);
    });
  });

  }

  async function load_models(gl) {
    const objs = [];
    const garage = await loadOBJAndMTL(gl, "../res/obj/Parking Garage.obj");
    const trueno = await loadOBJAndMTL(gl, "../res/obj/AE-863.obj");
    objs.push(garage);
    objs.push(trueno);
    return objs;
  }

  const meshProgramInfo = webglUtils.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);
  const colorProgramInfo = webglUtils.createProgramInfo(gl, ['color-vertex-shader', 'color-fragment-shader']);

  const objects = await load_models(gl);

  const allExtents = objects.map(obj => obj.extents);
  if (allExtents.length === 0) {
    console.error('No objects were loaded.');
    return;
  }

  const totalExtents = {
    min: allExtents.reduce((min, extents) => minVector(min, extents.min), allExtents[0].min),
    max: allExtents.reduce((max, extents) => maxVector(max, extents.max), allExtents[0].max),
  };

  const range = m4.subtractVectors(totalExtents.max, totalExtents.min);
  const objOffset = m4.scaleVector(m4.addVectors(totalExtents.min, m4.scaleVector(range, 0.5)), -1);
  const cameraTarget = [0, 0, 0];
  const radius = m4.length(range) * 0.5;
  const cameraConfig = initializeCamera(radius);
  const zNear = radius / 100;
  const zFar = radius * 3;

  const garageTransform = {
    scale: [1.0, 1.0, 1.0],
    rotation: [0, 0, 0],
    translation: [0, 0, 0],
  };

  const carTransform = {
    scale: [0.5, 0.5, 0.5],
    rotation: [0, 0, 0],
    translation: [10, -29, 0], //Car position relative to the garage
  };

  function setTransformationMatrix(transform) {
    let matrix = m4.identity();
    matrix = m4.scale(matrix, ...transform.scale);
    matrix = m4.translate(matrix, ...transform.translation);
    return matrix;
  }

  function render(time) {
    time *= 0.001;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE)

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

        // first draw from the POV of the light
    const lightWorldMatrix = m4.lookAt(
          [settings.posX, settings.posY, settings.posZ],          // position
          [settings.targetX, settings.targetY, settings.targetZ], // target
          [0, 1, 0],                                              // up
     );
     const lightProjectionMatrix = settings.perspective
     ? m4.perspective(
         degToRad(settings.fieldOfView),
         settings.projWidth / settings.projHeight,
         0.5,  // near
         10)   // far
     : m4.orthographic(
         -settings.projWidth / 2,   // left
          settings.projWidth / 2,   // right
         -settings.projHeight / 2,  // bottom
          settings.projHeight / 2,  // top
          0.5,                      // near
          10);                      // far

        // draw to the depth texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
        gl.viewport(0, 0, depthTextureSize, depthTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /*const up = [0, 1, 0];
    const cameraPosition = cameraConfig.getCameraPosition();
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);
    const view = m4.inverse(camera);*/
    drawScene(
      lightProjectionMatrix,
      lightWorldMatrix,
      m4.identity(),
      lightWorldMatrix,
      colorProgramInfo);

          // now draw scene to the canvas projecting the depth texture into the scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let textureMatrix = m4.identity();
    textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.multiply(textureMatrix, lightProjectionMatrix);
    // use the inverse of this world matrix to make
    // a matrix that will transform other positions
    // to be relative this world space.
    textureMatrix = m4.multiply(
        textureMatrix,
        m4.inverse(lightWorldMatrix));

    /*const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
      u_viewWorldPosition: cameraPosition,
    };*/

        // Compute the camera's matrix using look at.
        const cameraPosition = [settings.cameraX, settings.cameraY, 7];
        const target = [0, 0, 0];
        const up = [0, 1, 0];
        const cameraMatrix = m4.lookAt(cameraPosition, target, up);


        drawScene(
          projectionMatrix,
          cameraMatrix,
          textureMatrix,
          lightWorldMatrix,
          meshProgramInfo);

          
    /*gl.useProgram(meshProgramInfo.program);
    webglUtils.setUniforms(meshProgramInfo, sharedUniforms);

    objects.forEach((object, index) => {
      let u_world = m4.identity();
      const transform = index === 0 ? garageTransform : carTransform; // Use appropriate transform
      u_world = setTransformationMatrix(transform);
      u_world = m4.translate(u_world, ...objOffset);

      object.parts.forEach(({ bufferInfo, material }) => {
        webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);
        webglUtils.setUniforms(meshProgramInfo, { u_world }, material);
        webglUtils.drawBufferInfo(gl, bufferInfo);
      });
    });*/
    console.log("render")
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

main();
