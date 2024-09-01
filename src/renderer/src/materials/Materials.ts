import * as THREE from 'three'

const vertexShader = `
	uniform float amplitude;
			attribute float displacement;
			varying vec2 vUv;
			void main() {

				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}
`

const fragmentShader = `
			varying vec2 vUv;
			uniform vec3 color;

			void main() {
        vec4 result = vec4(0.0, 0.0, 1.0, 1.0);
        result.xyz = color;

        // float distance_to_edge = min(0.5 - abs(vUv.x - 0.5), 0.5 - abs(vUv.y - 0.5));

        // result *= distance_to_edge ;

				gl_FragColor = result;
			}
`

class Materials {
  static GetEventMaterial(color: THREE.Color): THREE.Material {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: color },
        time: { value: 1.0 }
      },
      vertexShader,
      fragmentShader
    })
  }
}

export { Materials }
