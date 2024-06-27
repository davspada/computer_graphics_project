// shaders.js

export const vertexShaderSource = `
attribute vec4 a_position;    // Position of the vertex
attribute vec3 a_normal;      // Normal vector at the vertex
attribute vec3 a_tangent;     // Tangent vector at the vertex
attribute vec2 a_texcoord;    // Texture coordinates at the vertex
attribute vec4 a_color;       // Color at the vertex

uniform mat4 u_projection;    // Projection matrix
uniform mat4 u_view;          // View matrix
uniform mat4 u_world;         // World matrix (model transformation)
uniform mat4 u_textureMatrix; // Texture matrix for shadow mapping
uniform vec3 u_viewWorldPosition; // Camera position in world space

varying vec3 v_normal;        // Normal vector to pass to fragment shader
varying vec3 v_tangent;       // Tangent vector to pass to fragment shader
varying vec3 v_surfaceToView; // Vector from surface to camera
varying vec2 v_texcoord;      // Texture coordinates to pass to fragment shader
varying vec4 v_color;         // Color to pass to fragment shader
varying vec4 v_shadowCoord;   // Shadow texture coordinates

void main() {
  // Transform vertex position to world space
  vec4 worldPosition = u_world * a_position;
  // Transform vertex position to clip space
  gl_Position = u_projection * u_view * worldPosition;
  // Calculate the vector from the surface to the camera
  v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
  // Calculate the normal matrix and transform the normal and tangent vectors
  mat3 normalMat = mat3(u_world);
  v_normal = normalize(normalMat * a_normal);
  v_tangent = normalize(normalMat * a_tangent);

  // Pass texture coordinates and color to the fragment shader
  v_texcoord = a_texcoord;
  v_color = a_color;
  
  // Calculate shadow texture coordinates
  v_shadowCoord = u_textureMatrix * worldPosition;
}
`;

export const fragmentShaderSource = `
precision highp float;       // Set the precision for float types

varying vec3 v_normal;       // Normal vector from vertex shader
varying vec3 v_tangent;      // Tangent vector from vertex shader
varying vec3 v_surfaceToView;// Vector from surface to camera from vertex shader
varying vec2 v_texcoord;     // Texture coordinates from vertex shader
varying vec4 v_color;        // Color from vertex shader
varying vec4 v_shadowCoord;  // Shadow texture coordinates from vertex shader

uniform vec3 diffuse;        // Base diffuse color
uniform sampler2D diffuseMap;// Diffuse texture
uniform vec3 ambient;        // Ambient color
uniform vec3 emissive;       // Emissive color
uniform vec3 specular;       // Specular color
uniform sampler2D specularMap; // Specular texture
uniform float shininess;     // Shininess coefficient for specular reflection
uniform sampler2D normalMap; // Normal map texture
uniform float opacity;       // Opacity of the material
uniform vec3 u_lightDirection; // Direction of the light source
uniform vec3 u_ambientLight; // Ambient light color
uniform sampler2D u_projectedTexture; // Shadow map texture
uniform float u_bias;        // Bias to avoid shadow acne

// Shadow boolean to toggle shadows
uniform int shadows;
// Normal map toggle
uniform int useNormalMap;
// Specular intensity slider
uniform float specularIntensity;

float calculateShadow(vec4 shadowCoord) {
  // Perform perspective division to get the shadow coordinates
  vec3 projectedCoord = shadowCoord.xyz / shadowCoord.w;
  // Retrieve the closest depth value from the shadow map
  float closestDepth = texture2D(u_projectedTexture, projectedCoord.xy).r;
  // Current depth value
  float currentDepth = projectedCoord.z;
  // Determine if the current fragment is in shadow
  float shadow = currentDepth - u_bias > closestDepth ? 0.1 : 1.0;
  return shadow;
}

void main() {
  vec3 normal;
  if (useNormalMap == 1) {
    // Compute the tangent, bitangent, and normal matrix (TBN) for normal mapping
    vec3 tangent = normalize(v_tangent) * (float(gl_FrontFacing) * 2.0 - 1.0);
    vec3 bitangent = normalize(cross(normalize(v_normal), tangent));
    mat3 tbn = mat3(tangent, bitangent, normalize(v_normal));
    // Retrieve the normal from the normal map and transform it using TBN
    normal = texture2D(normalMap, v_texcoord).rgb * 2.0 - 1.0;
    normal = normalize(tbn * normal);
  } else {
    // Use the interpolated normal if normal mapping is not used
    normal = normalize(v_normal) * (float(gl_FrontFacing) * 2.0 - 1.0);
  }

  // Calculate direction vectors for lighting
  vec3 surfaceToViewDirection = normalize(v_surfaceToView);
  vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);

  // Compute the diffuse and specular lighting components
  float fakeLight = dot(u_lightDirection, normal) * 0.5 + 0.5;
  float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);
  vec4 specularMapColor = texture2D(specularMap, v_texcoord);
  vec3 effectiveSpecular = specular * specularMapColor.rgb * specularIntensity;
  
  vec4 diffuseMapColor = texture2D(diffuseMap, v_texcoord);
  vec3 effectiveDiffuse = diffuse * diffuseMapColor.rgb * v_color.rgb;
  float effectiveOpacity = opacity * diffuseMapColor.a * v_color.a;

  // Calculate shadow factor
  float shadow = calculateShadow(v_shadowCoord);

  // Combine all lighting components and apply shadows if enabled
  vec4 color;
  if (shadows == 1) {
    color = vec4(
      emissive +
      ambient * u_ambientLight +
      effectiveDiffuse * fakeLight * shadow +
      effectiveSpecular * pow(specularLight, shininess) * shadow,
      effectiveOpacity
    );
  } else {
    color = vec4(
      emissive +
      ambient * u_ambientLight +
      effectiveDiffuse * fakeLight +
      effectiveSpecular * pow(specularLight, shininess),
      effectiveOpacity
    );
  }

  // Output the final color
  gl_FragColor = color;
}
`;

export const vertexShadow = `
attribute vec4 a_position;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

void main() {
  // Transform vertex position to clip space for shadow mapping
  gl_Position = u_projection * u_view * u_world * a_position;
}
`;

export const fragmentShadow = `
precision mediump float;

uniform vec4 u_color;
void main() {
 // Output the color (used to store depth values in shadow mapping)
  gl_FragColor = u_color;
}
`