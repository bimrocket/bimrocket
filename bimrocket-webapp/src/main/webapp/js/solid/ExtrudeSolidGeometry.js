/*
 * ExtrudeSolidGeometry.js
 */

BIMROCKET.ExtrudeSolidGeometry = class extends BIMROCKET.SolidGeometry
{
  constructor(shape, settings)
  {
    super();
    this.type = "ExtrudeSolidGeometry";
    this.shape = shape;
    this.settings = settings; // depth
    this.isManifold = true;
    this.build();
  }

  build()
  {
    if (this.vertices.length > 0) this.vertices = [];
    if (this.faces.length > 0) this.faces = [];

    const points = this.shape.extractPoints();
    let outerRing = points.shape;
    const innerRings = points.holes;
    
    function removeDuplicatedVertex(ring)
    {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first.equals(last))
      {
        ring.pop();
      }
    }
    
    removeDuplicatedVertex(outerRing);
    innerRings.forEach(removeDuplicatedVertex);
    
    if (THREE.ShapeUtils.isClockWise(outerRing))
    {
      outerRing = outerRing.reverse();
    }

    for (let h = 0; h < innerRings.length; h++)
    {
      let innerRing = innerRings[h];

      if (THREE.ShapeUtils.isClockWise(innerRing)) 
      {
        innerRings[h] = innerRing.reverse();
      }
    }

    const triangles = THREE.ShapeUtils.triangulateShape(outerRing, innerRings);
    const depth = this.settings.depth;
    const vertices = this.vertices;

    function addVertices(ring, depth)
    {
      for (let i = 0; i < ring.length; i++)
      {
        let vertex2 = ring[i];
        let vertex3 = new THREE.Vector3(vertex2.x, vertex2.y, depth);
        vertices.push(vertex3);
      }
    };

    // top face
    addVertices(outerRing, depth);
    for (let h = 0; h < innerRings.length; h++)
    {
      let innerRing = innerRings[h];
      addVertices(innerRing, depth);
    }
    // bottom face
    addVertices(outerRing, 0);
    for (let h = 0; h < innerRings.length; h++)
    {
      let innerRing = innerRings[h];
      addVertices(innerRing, 0);
    }
    const k = this.vertices.length / 2;
    const scope = this;

    for (let t = 0; t < triangles.length; t++)
    {
      let triangle = triangles[t];
      let a = triangle[0];
      let b = triangle[1];
      let c = triangle[2];

      // top triangle
      scope.addFace(a, b, c);

      // bottom triangle (reverse face)
      scope.addFace(k + c, k + b, k + a);
    }

    function addSideFaces(start, end, reverse)
    {
      for (let i = start; i < end; i++)
      {
        let j = i + 1;
        if (j === end) j = start;
        if (reverse)
        {
          scope.addFace(i, j, k + j, k + i);
        }
        else
        {
          scope.addFace(j, i, k + i, k + j);
        }
      }
    }

    // outer side faces
    addSideFaces(0, outerRing.length, false);
    let start = outerRing.length;
    for (let h = 0; h < innerRings.length; h++)
    {
      let innerRing = innerRings[h];
      let end = start + innerRing.length;
      addSideFaces(start, end, true);
      start = end;
    }    
  }
};


