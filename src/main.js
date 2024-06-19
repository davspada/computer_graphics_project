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

  async function load_models(gl) {
    const objs = [];
    const garage = await loadOBJAndMTL(gl, "../res/obj/garage.obj");
    const trueno = await loadOBJAndMTL(gl, "../res/obj/AE-863.obj");
    objs.push(garage);
    objs.push(trueno);
    return objs;
  }

  const meshProgramInfo = webglUtils.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);

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
    translation: [17, -29, 0], // Example position relative to the garage
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

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const up = [0, 1, 0];
    const cameraPosition = cameraConfig.getCameraPosition();
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);
    const view = m4.inverse(camera);

    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
      u_viewWorldPosition: cameraPosition,
    };

    gl.useProgram(meshProgramInfo.program);
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
    });

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

main();
