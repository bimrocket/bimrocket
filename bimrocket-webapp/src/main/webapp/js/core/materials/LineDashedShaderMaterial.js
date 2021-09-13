/**
 * LineDashedShaderMaterial
 *
 * @author rabbib76, realor
 */

import * as THREE from "../../lib/three.module.js";

class LineDashedShaderMaterial extends THREE.ShaderMaterial
{
  static VERTEX_SHADER =
`
flat out vec3 startPos;
out vec3 vertPos;

void main()
{
  vec4 pos    = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = pos;
  vertPos     = pos.xyz / pos.w;
  startPos    = vertPos;
}
`
  static FRAGMENT_SHADER =
`
precision highp float;

flat in vec3 startPos;
in vec3 vertPos;

uniform vec3  u_color;
uniform vec2  u_resolution;
uniform float u_dashSize;
uniform float u_gapSize;

void main()
{
  vec2 dir   = (vertPos.xy - startPos.xy) * u_resolution / 2.0;
  float dist = length(dir);
  float dashGapSize = u_dashSize + u_gapSize;

  if (fract(dist / dashGapSize) > u_dashSize / dashGapSize)
    discard;
  gl_FragColor = vec4(u_color.rgb, 1.0);
}
`
  constructor(options = {})
  {
    const color = options.color || new THREE.Color(0, 0, 0);
    const dashSize = options.dashSize || 4;
    const gapSize = options.gapSize || 4;

    const uniforms =
    {
      u_color : {type: 'v3', value: {x: color.r, y: color.g, z: color.b}},
      u_resolution: {type: 'v2', value: {x: 1600, y: 1000}},
      u_dashSize : {type:'f', value: dashSize},
      u_gapSize : {type:'f', value: gapSize}
    };

    super(
    {
      uniforms : uniforms,
      vertexShader : LineDashedShaderMaterial.VERTEX_SHADER,
      fragmentShader : LineDashedShaderMaterial.FRAGMENT_SHADER,
      depthTest : options.depthTest === undefined ?
        true : options.depthTest,
      depthWrite : options.depthWrite === undefined ?
        true : options.depthWrite
    });
  }
};

export { LineDashedShaderMaterial };


