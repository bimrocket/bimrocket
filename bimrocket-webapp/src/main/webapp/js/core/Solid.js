/*
 * Solid.js
 *
 * @author realor
 */

import { BSP } from "./BSP.js";
import { SolidGeometry } from "./SolidGeometry.js";
import { SolidOptimizer } from "./SolidOptimizer.js";
import { Formula } from "../formula/Formula.js";
import * as THREE from "three";

class Solid extends THREE.Object3D
{
  static EDGES_NAME = "edges";
  static FACES_NAME = "faces";
  static FaceMaterial = new THREE.MeshPhongMaterial({
    name: 'SolidFaceMaterial',
    color: 0xc0c0c0,
    side: THREE.DoubleSide,
    polygonOffset : true,
    polygonOffsetFactor : 1,
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

    this.castShadow = true;
    this.receiveShadow = true;

    if (geometry)
    {
      this.geometry = geometry;
    }

    if (material)
    {
      this.material = material;
    }
  }

  get facesObject()
  {
    return this._facesObject;
  }

  get edgesObject()
  {
    return this._edgesObject;
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

  get castShadow()
  {
    return this._facesObject ? this._facesObject.castShadow : false;
  }

  set castShadow(shadow)
  {
    if (this._facesObject)
    {
      this._facesObject.castShadow = shadow;
    }
  }

  get receiveShadow()
  {
    return this._facesObject ? this._facesObject.receiveShadow : false;
  }

  set receiveShadow(shadow)
  {
    if (this._facesObject)
    {
      this._facesObject.receiveShadow = shadow;
    }
  }

  get material()
  {
    return this.faceMaterial;
  }

  set material(material)
  {
    this.faceMaterial = material;
  }

  get faceMaterial()
  {
    return this._facesObject.material;
  }

  set faceMaterial(material)
  {
    if (material instanceof THREE.Material)
    {
      if (this._facesObject.material !== material)
      {
        this._facesObject.material.dispose();
        this._facesObject.material = material;
      }
    }
  }

  get edgeMaterial()
  {
    return this._edgesObject.material;
  }

  set edgeMaterial(material)
  {
    if (material instanceof THREE.Material)
    {
      if (this._edgesObject.material !== material)
      {
        this._edgesObject.material.dispose();
        this._edgesObject.material = material;
      }
    }
  }

  hasComponents()
  {
    return this.children.length > 2;
  }

  getComponentCount()
  {
    return this.children.length - 2;
  }

  getComponent(index)
  {
    return this.children[index + 2];
  }

  forEachComponent(fn)
  {
    const children = this.children;
    for (let i = 2; i < children.length; i++)
    {
      fn(children[i], i - 2);
    }
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
    solid.updateGeometry(geometry, true);

    return solid;
  }

  copy(source, recursive = true)
  {
    super.copy(source, false);

    // TODO: dispose geometries & materials?
    this._facesObject.geometry = source._facesObject.geometry;
    this._edgesObject.geometry = source._edgesObject.geometry;

    this.faceMaterial = source.faceMaterial;
    this.edgeMaterial = source.edgeMaterial;

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