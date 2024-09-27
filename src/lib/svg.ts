import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";

type SvgObj = {
    paths: THREE.ShapePath[]
}

type LoaderOptions = {
    meshMapperFn?: (svgData: string | SvgObj) => THREE.Group<THREE.Object3DEventMap>,
    reCenter?: undefined | boolean | THREE.Vector3
    scaleVector?: THREE.Vector3
}

const fillMaterial = new THREE.MeshBasicMaterial({ color: "#F3FBFB" });
const strokeMaterial = new THREE.LineBasicMaterial({ color: "#00A5E6" });

export const svgLoader = (resourceUrl: string, options: LoaderOptions = {}): Promise<THREE.Group<THREE.Object3DEventMap>> => {
    const {
        meshMapperFn,
        reCenter,
        scaleVector
    } = {
        // Defaults
        meshMapperFn: svgStr2ExtrudedMeshGroup,
        reCenter: true,
        ...options
    }

    const loader = new SVGLoader();

    return new Promise((resolve, reject) => {
        loader.load(
            resourceUrl,
            (data: any) => {
                const shapes = meshMapperFn(data)
                const group = new THREE.Group()
                const axesHelper = new THREE.AxesHelper(100)
                group.add(shapes)
                group.add(axesHelper)
                if (scaleVector) {
                    group.scale.set(scaleVector.x, scaleVector.y, scaleVector.z)
                }
                if (reCenter) {
                    const bBox = new THREE.Box3()
                    const center = new THREE.Vector3()
                    // Center the shapes by shifting position by the center of the bounding box
                    bBox.setFromObject(shapes)
                    bBox.getCenter(center)
                    shapes.position.x = -center.x
                    shapes.position.y = -center.y
                    if (reCenter instanceof THREE.Vector3) {
                        shapes.position.x += reCenter.x
                        shapes.position.y += reCenter.y
                    }
                    console.log('Svg reCentered!')
                    resolve(group);
                }
                resolve(group);
            },
            (xhr: any) => {
                console.log(`${resourceUrl} - ${(xhr.loaded / xhr.total * 100)}% loaded`);

            },
            (error: any) => {
                reject(error)
            }
        );
    })
}

export const svgStr2MeshGroup = (svg: string | SvgObj) => {
    const loader = new SVGLoader();
    const svgData = typeof svg === 'string'
        ? loader.parse(svg)
        : svg
    const svgGroup = new THREE.Group();
    const paths = svgData.paths;

    for (let i = 0; i < paths.length; i++) {

        const path = paths[i];

        const material = new THREE.MeshBasicMaterial({
            color: path.color,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const shapes = SVGLoader.createShapes(path);

        for (let j = 0; j < shapes.length; j++) {
            const shape = shapes[j];
            const geometry = new THREE.ShapeGeometry(shape);
            const mesh = new THREE.Mesh(geometry, material);
            svgGroup.add(mesh);

        }

    }
    return svgGroup
}

export const svgStr2ExtrudedMeshGroup = (svg: string | SvgObj, extrusion = 2) => {
    const loader = new SVGLoader();
    const svgData = typeof svg === 'string'
        ? loader.parse(svg)
        : svg
    const svgGroup = new THREE.Group();
    const updateMap = [];

    svgGroup.scale.y *= -1;
    svgData.paths.forEach((path) => {
        const shapes = SVGLoader.createShapes(path);

        shapes.forEach((shape) => {
            const meshGeometry = new THREE.ExtrudeGeometry(shape, {
                depth: extrusion,
                bevelEnabled: false,
            });
            const linesGeometry = new THREE.EdgesGeometry(meshGeometry);
            const mesh = new THREE.Mesh(meshGeometry, fillMaterial);
            const lines = new THREE.LineSegments(linesGeometry, strokeMaterial);

            updateMap.push({ shape, mesh, lines });
            svgGroup.add(mesh, lines);
        });
    });
    return svgGroup
}
