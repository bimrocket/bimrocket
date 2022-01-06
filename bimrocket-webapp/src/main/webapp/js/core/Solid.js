/*
 * Solid.js
 *
 * @author realor
 */

import { BSP } from "./BSP.js";
import { SolidGeometry } from "./SolidGeometry.js";
import { SolidOptimizer } from "./SolidOptimizer.js";
import { Formula } from "../formula/Formula.js";
import * as THREE from "../lib/three.module.js";

class Solid extends THREE.Object3D
{
  static EDGES_NAME = "edges";
  static FACES_NAME = "faces";
  static FaceMaterial = new THREE.MeshPhongMaterial({
    name: 'SolidFaceMaterial',
    color: 0xc0c0c0,
    side: THREE.DoubleSide,
    shininess: 1,
    flatShading: false});
  static EdgeMaterial = new THREE.LineBasicMaterial({
    name: 'SolidEdgeMaterial',
    color: 0x0,
    opacity: 0.4,
    transparent: true});

  constructor(geometry, material)
  {
    super();

    this.type = 'Solid';

    this._facesObject = new THREE.Mesh(undefined, Solid.FaceMaterial);
    this._facesObject.name = THREE.Object3D.HIDDEN_PREFIX + Solid.FACES_NAME;
    this._facesObject.matrixAutoUpdate = false;
    this._facesObject.visible = true;
    this._facesObject.raycast = function(){};
    this.add(this._facesObject);

    this._edgesObject = new THREE.LineSegments(undefined, Solid.EdgeMaterial);
    this._edgesObject.name = THREE.Object3D.HIDDEN_PREFIX + Solid.EDGES_NAME;
    this._edgesObject.matrixAutoUpdate = false;
    this._edgesObject.visible = true;
    this._edgesObject.raycast = function(){};
    this.add(this._edgesObject);

    this.builder = null;

    if (geometry)
    {
      this.geometry = geometry;

      if (material)
      {
        this.material = material;
      }
    }
  }

  get geometry()
  {
    return this._facesObject.geometry;
  }

  set geometry(geometry)
  {
    this.updateGeometry(geometry);
  }

  get edgesGeometry()
  {
    return this._edgesObject.geometry;
  }

  get facesVisible()
  {
    return this._facesObject.visible;
  }

  set facesVisible(facesVisible)
  {
    this._facesObject.visible = facesVisible;
  }

  get edgesVisible()
  {
    return this._edgesObject.visible;
  }

  set edgesVisible(edgesVisible)
  {
    this._edgesObject.visible = edgesVisible;
  }

  get material()
  {
    return this._facesObject.material;
  }

  set material(material)
  {
    this._facesObject.material = material;
  }

  get faceMaterial()
  {
    return this._facesObject.material;
  }

  set faceMaterial(material)
  {
    this._facesObject.material = material;
  }

  get edgeMaterial()
  {
    return this._edgesObject.material;
  }

  set edgeMaterial(material)
  {
    this._edgesObject.material = material;
  }

  union(solids)
  {
    return this.booleanOperation("union", solids);
  }

  intersect(solids)
  {
    return this.booleanOperation("intersect", solids);
  }

  subtract(solids)
  {
    return this.booleanOperation("subtract", solids);
  }

  isValid()
  {
    return this._facesObject.geometry.faces.length > 3;
  }

  booleanOperation(oper, solids, newSolid)
  {
    if (!this.isValid()) return this;

    const createBSP = function(solid)
    {
      const bsp = new BSP();
      const geometry = solid.geometry;
      const matrixWorld = solid.matrixWorld;
      bsp.fromSolidGeometry(geometry, matrixWorld);
      return bsp;
    };

    if (solids instanceof Solid)
    {
      solids = [solids];
    }

    let resultBSP = createBSP(this);
    for (let i = 0; i < solids.length; i++)
    {
      let solid = solids[i];
      if (solid.isValid())
      {
        let otherBSP = createBSP(solid);
        switch (oper)
        {
          case "union":
            resultBSP = resultBSP.union(otherBSP); break;
          case "intersect":
            resultBSP = resultBSP.intersect(otherBSP); break;
          case "subtract":
           resultBSP = resultBSP.subtract(otherBSP); break;
        }
      }
    }
    let geometry = resultBSP.toSolidGeometry();

    let solid;
    if (newSolid)
    {
      solid = new Solid();
    }
    else
    {
      let inverseMatrixWorld = new THREE.Matrix4();
      inverseMatrixWorld.copy(this.matrixWorld).invert();
      geometry.applyMatrix4(inverseMatrixWorld);
      solid = this;
    }
    solid.updateGeometry(geometry);

    return solid;
  }

  copy(source, recursive = true)
  {
    super.copy(source, false);

    // TODO: dispose geometries & materials?
    this._facesObject.geometry = source._facesObject.geometry;
    this._edgesObject.geometry = source._edgesObject.geometry;

    this._facesObject.material = source._facesObject.material;
    this._edgesObject.material = source._edgesObject.material;
    this.facesVisible = source.facesVisible;
    this.edgesVisible = source.edgesVisible;
    this.builder = source.builder ? source.builder.clone() : null;
    this.updateMatrix();

    Formula.copy(this, source);

    if (recursive === true)
    {
      for (let i = 2; i < source.children.length; i++)
      {
        let child = source.children[i];
        this.add(child.clone());
      }
    }
    return this;
  }

  raycast(raycaster, intersects)
  {
    if (this.facesVisible)
    {
      let solidInter = [];
      THREE.Mesh.prototype.raycast.call(this._facesObject,
        raycaster, solidInter);
      for (let i = 0; i < solidInter.length; i++)
      {
        let intersection = solidInter[i];
        intersection.object = this;
        intersects.push(intersection);
      }
    }
  }

  getArea()
  {
    let area = 0;
    const geometry = this.geometry;
    if (geometry)
    {
      const triangle = new THREE.Triangle();
      const matrixWorld = this.matrixWorld;

      const vertices = geometry.vertices;
      for (let face of geometry.faces)
      {
        let triangles = face.getTriangles();
        for (let tri of triangles)
        {
          let vertex0 = vertices[tri[0]];
          let vertex1 = vertices[tri[1]];
          let vertex2 = vertices[tri[2]];

          triangle.a.copy(vertex0).applyMatrix4(matrixWorld);
          triangle.b.copy(vertex1).applyMatrix4(matrixWorld);
          triangle.c.copy(vertex2).applyMatrix4(matrixWorld);
          area += triangle.getArea();
        }
      }
    }
    return area;
  }

  getVolume()
  {
    let volume = 0;
    const geometry = this.geometry;
    if (geometry)
    {
      const matrixWorld = this.matrixWorld;
      const vertex0 = new THREE.Vector3();
      const vertex1 = new THREE.Vector3();
      const vertex2 = new THREE.Vector3();

      const vertices = geometry.vertices;
      for (let face of geometry.faces)
      {
        let triangles = face.getTriangles();
        for (let tri of triangles)
        {
          vertex0.copy(vertices[tri[0]]).applyMatrix4(matrixWorld);
          vertex1.copy(vertices[tri[1]]).applyMatrix4(matrixWorld);
          vertex2.copy(vertices[tri[2]]).applyMatrix4(matrixWorld);

          volume += vertex0.dot(vertex1.cross(vertex2)) / 6.0;
        }
      }
    }
    return volume;
  }

  updateGeometry(geometry, optimize = false)
  {
    this._facesObject.geometry.dispose();
    this._edgesObject.geometry.dispose();

    let solidGeometry;
    if (geometry instanceof SolidGeometry)
    {
      solidGeometry = geometry;
    }
    else
    {
      solidGeometry = new SolidGeometry();
      solidGeometry.copy(geometry);
    }

    if (optimize)
    {
      let optimizer = new SolidOptimizer(solidGeometry);
      solidGeometry = optimizer.optimize();
    }

    solidGeometry.updateBuffers();
    this._facesObject.geometry = solidGeometry;
    this._edgesObject.geometry = solidGeometry.getEdgesGeometry();
  }
}

export { Solid };