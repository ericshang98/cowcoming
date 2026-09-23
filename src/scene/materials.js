import * as THREE from "three";
// Reconstruct the reference's polished steel, dark armor and emissive glass
// from the model's painted surface colors. Keep the original texture channels.
export function robotMaterial(material, ao) {
  const m = material.clone();
  m.metalness = 1;
  m.roughness = 0.22;
  m.envMapIntensity = 1.05;
  m.transparent = false;
  m.depthWrite = true;
  m.alphaTest = 0;
  if ("clearcoat" in m) {
    m.clearcoat = 1;
    m.clearcoatRoughness = 0.08;
  }
  if ("specularIntensity" in m) m.specularIntensity = 1;
  m.emissiveIntensity = 1;
  ao.flipY = false;
  ao.colorSpace = THREE.NoColorSpace;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.surfaceAO = { value: ao };
    shader.fragmentShader =
      "uniform sampler2D surfaceAO;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      "void main() { float steel=0.0; float armor=0.0; float glass=0.0;",
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
#ifdef USE_MAP
float luminance=dot(diffuseColor.rgb,vec3(.299,.587,.114));
float high=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));
float low=min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b));
float saturation=(high-low)/max(high,.0001);
glass=smoothstep(.30,.55,saturation)*smoothstep(.14,.38,luminance);
steel=smoothstep(.42,.72,luminance)*(1.0-smoothstep(.16,.40,saturation))*(1.0-glass);
armor=(1.0-smoothstep(.05,.34,luminance))*(1.0-steel)*(1.0-glass);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.560,.580,.610),steel*.85);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.016,.024,.032),armor*.92);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.020,.030,.040),glass*.55);
#endif`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <metalnessmap_fragment>",
      "#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,0.0,glass);",
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      "#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.12,steel);roughnessFactor=mix(roughnessFactor,.24,armor);roughnessFactor=mix(roughnessFactor,.05,glass);",
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <aomap_fragment>",
      `#ifdef USE_MAP
float localAO=mix(1.0,texture2D(surfaceAO,vMapUv).r,.85);
reflectedLight.indirectDiffuse*=localAO;
#ifdef USE_CLEARCOAT
clearcoatSpecularIndirect*=localAO;
#endif
#ifdef USE_ENVMAP
reflectedLight.indirectSpecular*=computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),localAO,material.roughness);
#endif
#endif`,
    );
  };
  m.customProgramCacheKey = () => "replica-painted-steel-1";
  return m;
}
