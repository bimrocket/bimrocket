/*
 * Solid.js
 *
 * @autor: realor
 */

BIMROCKET.Solid = class extends THREE.Object3D
{
  static EDGES_NAME = BIMROCKET.HIDDEN_PREFIX + "edges";
  static FACES_NAME = BIMROCKET.HIDDEN_PREFIX + "faces";
  static FaceMaterial = new THREE.MeshPhongMaterial({
    name: 'SolidFaceMaterial',
    color: 0xc0c0c0,
    side: THREE.FrontSide,
    shininess: 1,
    flatShading: false}); // CAUTION: flatShading: true => generates artifacts in clipping/stencil
  static EdgeMaterial = new THREE.LineBasicMaterial({
    name: 'SolidEdgeMaterial',
    color: 0x0,
    opacity: 0.4,
    transparent: true});

  constructor(geometry, material)
  {
    super();

    this.type = 'Solid';

    this._facesObject = new THREE.Mesh(undefined, BIMROCKET.Solid.FaceMaterial);
    this._facesObject.name = BIMROCKET.Solid.FACES_NAME;
    this._facesObject.matrixAutoUpdate = false;
    this._facesObject.visible = true;
    this._facesObject.raycast = function(){};
    this.add(this._facesObject);

    this._edgesObject = new THREE.LineSegments(undefined,
      BIMROCKET.Solid.EdgeMaterial);
    this._edgesObject.name = BIMROCKET.Solid.EDGES_NAME;
    this._edgesObject.matrixAutoUpdate = false;
    this._edgesObject.visible = true;
    this._edgesObject.raycast = function(){};
    this.add(this._edgesObject);

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
    this.visible = this.facesVisible || this.edgesVisible;
  }

  get edgesVisible()
  {
    return this._edgesObject.visible;
  }

  set edgesVisible(edgesVisible)
  {
    this._edgesObject.visible = edgesVisible;
    this.visible = this.facesVisible || this.edgesVisible;
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
      const bsp = new BIMROCKET.BSP();
      const geometry = solid.geometry;
      const matrixWorld = solid.matrixWorld;
      bsp.fromSolidGeometry(geometry, matrixWorld);
      return bsp;
    };

    if (solids instanceof BIMROCKET.Solid)
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
      solid = new BIMROCKET.Solid();
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

  clone(recursive)
  {
    let object = new BIMROCKET.Solid();
    object.copy(this, false);
    object._facesObject.geometry = this._facesObject.geometry.clone();
    object._edgesObject.geometry = this._edgesObject.geometry.clone();
    object._facesObject.material = this._facesObject.material;
    object._edgesObject.material = this._edgesObject.material;
    object.facesVisible = this.facesVisible;
    object.edgesVisible = this.edgesVisible;
    object.updateMatrix();

    if (recursive === true)
    {
      for (let i = 2; i < this.children.length; i++)
      {
        var child = this.children[i];
        object.add(child.clone());
      }
    }
    return object;
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

  updateGeometry(geometry, debug = false)
  {
    let solidGeometry = new BIMROCKET.SolidGeometry();
    solidGeometry.copy(geometry);

    let edgeMap = solidGeometry.fixEdges(debug);
    solidGeometry.update();
    this._facesObject.geometry = solidGeometry;

    let edgesGeometry = edgeMap.getEdgesGeometry(5); // 5 degres;
    this._edgesObject.geometry = edgesGeometry;
  }

  fixGeometry()
  {
    //this.updateGeometry(this.geometry, true);
    let edgeMap = this.geometry.fixEdges(true);
    let vertices = this.geometry.vertices;

    const edgeVertices = [];
    const faceVertices = [];

    for (let key in edgeMap.map)
    {
      let edge = edgeMap.map[key];

      let roundVertex = function(v)
      {
        return "[" + Math.round(100000 * v.x) / 100000 + ", " +
                     Math.round(100000 * v.y) / 100000 + ", " +
                     Math.round(100000 * v.z) / 100000 + "]";
      };

      if (edge.face2 === undefined)
      {
        let vertex1 = vertices[edge.index1];
        let vertex2 = vertices[edge.index2];

        console.info("bad egde", edge.index1, edge.index2,
          roundVertex(vertex1), roundVertex(vertex2),
          vertex2.clone().sub(vertex1).length());

        edgeVertices.push(vertex1.x, vertex1.y, vertex1.z);
        edgeVertices.push(vertex2.x, vertex2.y, vertex2.z);

        let face = edge.face1;
        console.info("bad face", face.indices);
        let vertexCount = face.getVertexCount();
        for (let n = 2; n < vertexCount; n++)
        {
          let vertex0 = face.getVertex(0);
          faceVertices.push(vertex0);

          let vertex1 = face.getVertex(n - 1);
          faceVertices.push(vertex1);

          let vertex2 = face.getVertex(n);
          faceVertices.push(vertex2);
        }
      }
    }
    console.info("faceVertices", faceVertices);
    console.info("edgeVertices", edgeVertices);

    if (faceVertices.length > 0)
    {
      const facesGeometry = new THREE.BufferGeometry();
      facesGeometry.setFromPoints(faceVertices);

      const errorFaceMaterial = new THREE.MeshPhongMaterial({
        name : "ErrorFaceMaterial",
        color: 0xFFFF00, shininess: 1,
        flatShading: true,
        side: THREE.DoubleSide});

      const errorMesh = new THREE.Mesh(facesGeometry, errorFaceMaterial);
      errorMesh.name = "ErrorFaces";
      BIMROCKET.application.addObject(errorMesh, this.parent);
    }

    if (edgeVertices.length > 0)
    {
      const edgesGeometry = new THREE.BufferGeometry();
      edgesGeometry.setAttribute('position',
        new THREE.Float32BufferAttribute(edgeVertices, 3));

      const errorEdgeMaterial = new THREE.LineBasicMaterial(
      {name: 'ErrorEdgeMaterial', color: 0xff0000, linewidth: 3,
        depthTest: false, depthWrite: false});

      let errorLines = new THREE.LineSegments(edgesGeometry, errorEdgeMaterial);
      errorLines.raycast = function(){};
      errorLines.name = "ErrorLines";

      BIMROCKET.application.addObject(errorLines, this.parent);
    }
  }
};
