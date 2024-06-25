import { parseOBJ, parseMTL } from './obj_mtl.js';
import { create1PixelTexture, createTexture, generateTangents, getGeometriesExtents, degToRad, maxVector, minVector } from './utils.js';
import { initializeCamera } from './camera.js';
import { vertexShaderSource, fragmentShaderSource, vertexShadow, fragmentShadow } from './shaders.js';

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
    return alert('need WEBGL_depth_texture');
  }

  //buffer for the frustum
  const cubeLinesBufferInfo = webglUtils.createBufferInfoFromArrays(gl, {
    position: [
      -1, -1, -1,
       1, -1, -1,
      -1,  1, -1,
       1,  1, -1,
      -1, -1,  1,
       1, -1,  1,
      -1,  1,  1,
       1,  1,  1,
    ],
    indices: [
      0, 1,
      1, 3,
      3, 2,
      2, 0,

      4, 5,
      5, 7,
      7, 6,
      6, 4,

      0, 4,
      1, 5,
      3, 7,
      2, 6,
    ],
  });

  async function load_models(gl) {
    const objs = [];
    const garage = await loadOBJAndMTL(gl, "../res/obj/Parking Garage2.obj")
    const trueno = await loadOBJAndMTL(gl, "../res/obj/trueno.obj");
    objs.push(garage)
    objs.push(trueno);
    return objs;
  }

  const meshProgramInfo = webglUtils.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);
  const colorProgramInfo = webglUtils.createProgramInfo(gl, [vertexShadow, fragmentShadow]);

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

  gl.framebufferTexture2D(
      gl.FRAMEBUFFER,        // target
      gl.COLOR_ATTACHMENT0,  // attachment point
      gl.TEXTURE_2D,         // texture target
      unusedTexture,         // texture
      0);                    // mip level

  const settings = {
    cameraX: 6,
    cameraY: 5,
    posX: 2.5,
    posY: 4.8,
    posZ: 4.3,
    //targetX: 2.5,
    //targetY: 0,
    //targetZ: 3.5,
    projWidth: 10,
    projHeight: 10,
    //perspective: false,
    fieldOfView: 20,
    bias: -0.004,
    alphaEnable: false,
    shadows: true,
    viewFrustum: false
  };

  const gui = new dat.GUI();
  gui.add(settings, 'posX', -50, 50).name('Light X');
  gui.add(settings, 'posY', -50, 50).name('Light Y');
  gui.add(settings, 'posZ', -50, 50).name('Light Z');
  //gui.add(settings, 'targetX', -50, 50).name('Target X');
  //gui.add(settings, 'targetY', -50, 50).name('Target Y');
  //gui.add(settings, 'targetZ', -50, 50).name('Target Z');
  gui.add(settings, 'projWidth', 1, 50).name('Proj Width');
  gui.add(settings, 'projHeight', 1, 50).name('Proj Height');
  gui.add(settings, 'bias', 1, 0.004).name('Shadow Bias');
  gui.add(settings, 'alphaEnable').onChange(function (value) {
    settings.alphaEnable = value;
  }); 
  gui.add(settings, 'shadows').onChange(function (value) {
    settings.shadows = value;
  });
  gui.add(settings, 'viewFrustum').onChange(function (value) {
    settings.viewFrustum = value;
  }); 

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

  const carTransform = {
    scale: [1,1,1],
    rotation: [0, 0, 0],
    translation: [0, 0, 0],
  };

  function setTransformationMatrix(transform) {
    let matrix = m4.identity();
    matrix = m4.translate(matrix, ...transform.translation);
    matrix = m4.xRotate(matrix, transform.rotation[0]);
    matrix = m4.yRotate(matrix, transform.rotation[1]);
    matrix = m4.zRotate(matrix, transform.rotation[2]);
    matrix = m4.scale(matrix, ...transform.scale);
    return matrix;
  }

  function render(time) {
    time *= 0.001;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    //settings per la trasparenza
    if(settings.alphaEnable){
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }else{
      gl.disable(gl.BLEND); 
    }

    // First draw from the POV of the light
    /*const lightWorldMatrix = m4.lookAt(
      [settings.posX, settings.posY, settings.posZ],          // position
      [0,0,0], // target
      [0, 1, 0],                                              // up
    );*/

    const lightWorldMatrix = m4.translation(settings.posX, settings.posY, settings.posZ)
    m4.xRotate(lightWorldMatrix, degToRad(-45), lightWorldMatrix)



    const lightProjectionMatrix = settings.perspective
      ? m4.perspective(
          degToRad(settings.fieldOfView),
          settings.projWidth / settings.projHeight,
          0.5,  // near
          50)   // far
      : m4.orthographic(
          -settings.projWidth / 2,   // left
          settings.projWidth / 2,    // right
          -settings.projHeight / 2,  // bottom
          settings.projHeight / 2,   // top
          0.5,                       // near
          50);                       // far

    // Draw to the depth texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.viewport(0, 0, depthTextureSize, depthTextureSize);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(colorProgramInfo.program);
    webglUtils.setUniforms(colorProgramInfo, {
      u_view: m4.inverse(lightWorldMatrix),
      u_projection: lightProjectionMatrix,
    });

    objects.forEach((object) => {
      let u_world = m4.identity();
      u_world = setTransformationMatrix(carTransform);
      u_world = m4.translate(u_world, ...objOffset);

      object.parts.forEach(({ bufferInfo }) => {
        webglUtils.setBuffersAndAttributes(gl, colorProgramInfo, bufferInfo);
        webglUtils.setUniforms(colorProgramInfo, { u_world });
        webglUtils.drawBufferInfo(gl, bufferInfo);
      });
    });

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Prepare to draw the scene with the depth texture
    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const up = [0, 1, 0];
    const cameraPosition = cameraConfig.getCameraPosition();
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);
    const view = m4.inverse(camera);

    //allows to "translate" object coordinates for the shadows
    let textureMatrix = m4.identity();
    textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.multiply(textureMatrix, lightProjectionMatrix);
    textureMatrix = m4.multiply(textureMatrix, m4.inverse(lightWorldMatrix));

    gl.useProgram(meshProgramInfo.program);
    const sharedUniforms = {
      u_view: view,
      u_projection: projection,
      u_viewWorldPosition: cameraPosition,
      u_textureMatrix: textureMatrix,
      u_projectedTexture: depthTexture,
      u_lightWorldPosition: [settings.posX, settings.posY, settings.posZ],
      u_bias: settings.bias,
      shadows: settings.shadows
    };

    webglUtils.setUniforms(meshProgramInfo, sharedUniforms);

    objects.forEach((object) => {
      let u_world = m4.identity();
      u_world = setTransformationMatrix(carTransform);
      u_world = m4.translate(u_world, ...objOffset);

      object.parts.forEach(({ bufferInfo, material }) => {
        webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);
        webglUtils.setUniforms(meshProgramInfo, { u_world }, material);
        webglUtils.drawBufferInfo(gl, bufferInfo);
      });
    });

    if(settings.viewFrustum){
      const viewMatrix = m4.inverse(camera);

      gl.useProgram(colorProgramInfo.program);

      // Setup all the needed attributes.
      webglUtils.setBuffersAndAttributes(gl, colorProgramInfo, cubeLinesBufferInfo);

      // scale the cube in Z so it's really long
      // to represent the texture is being projected to
      // infinity
      const mat = m4.multiply(
          lightWorldMatrix, m4.inverse(lightProjectionMatrix));

      // Set the uniforms we just computed
      webglUtils.setUniforms(colorProgramInfo, {
        u_color: [1, 1, 1, 1],
        u_view: viewMatrix,
        u_projection: projection,
        u_world: mat,
      });

      // calls gl.drawArrays or gl.drawElements
      webglUtils.drawBufferInfo(gl, cubeLinesBufferInfo, gl.LINES);
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
main();
