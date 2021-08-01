/*
 * BSP.js
 *
 * @author: realor
 */

import { GeometryUtils } from "../utils/GeometryUtils.js";
import { SolidGeometry } from "../solid/SolidGeometry.js";
import * as THREE from "../lib/three.module.js";

class BSP
{
  constructor()
  {
    this.plane = null; // divider plane
    this.coplanarPolygons = [];
    this.frontBSP = null; // front BSP
    this.backBSP = null; // back BSP
  }

  fromSolidGeometry(geometry, matrix)
  {
    let vertices = geometry.vertices;
    let faces = geometry.faces;
    for (let f = 0; f < faces.length; f++)
    {
      let face = faces[f];
      let vertexCount = face.getVertexCount();
      let polygon = new Polygon();
      for (let n = 0; n < vertexCount; n++)
      {
        let vertex = face.getVertex(n).clone();
        if (matrix)
        {
          vertex.applyMatrix4(matrix);
        }
        polygon.vertices.push(vertex);
      }
      polygon.updateNormal();
      this.addPolygon(polygon);
    }
  }

  toSolidGeometry()
  {
    let polygons = this.getPolygons();
    let geometry = new SolidGeometry();
    for (let i = 0; i < polygons.length; i++)
    {
      let polygon = polygons[i];
      let vertices = polygon.vertices;
      let face = geometry.addFace();
      for (let n = 0; n < vertices.length; n++)
      {
        face.addVertex(vertices[n].clone());
      }
      if (polygon.normal)
      {
        face.normal = polygon.normal.clone();
      }
      else
      {
        face.updateNormal();
      }
    }
    return geometry;
  }

  addPolygon(polygon)
  {
    if (this.plane === null)
    {
//      let vertex0 = polygon.vertices[0];
//      let vertex1 = polygon.vertices[1];
//      let vertex2 = polygon.vertices[2];
//      this.plane = new THREE.Plane();
//      this.plane.setFromCoplanarPoints(vertex0, vertex1, vertex2);
//      this.coplanarPolygons.push(polygon);
      
      let vertex0 = polygon.vertices[0];
      if (polygon.normal === null) polygon.updateNormal();
      this.plane = new THREE.Plane();
      this.plane.setFromNormalAndCoplanarPoint(polygon.normal, vertex0);
      this.coplanarPolygons.push(polygon);
    }
    else
    {
      let result = this.splitPolygon(polygon);

      if (result.frontPolygon)
      {
        if (this.frontBSP === null) this.frontBSP = new BSP();
        this.frontBSP.addPolygon(result.frontPolygon);
      }

      if (result.backPolygon)
      {
        if (this.backBSP === null) this.backBSP = new BSP();
        this.backBSP.addPolygon(result.backPolygon);
      }
      
      if (result.coplanarFrontPolygon)
      {
        this.coplanarPolygons.push(result.coplanarFrontPolygon);
      }

      if (result.coplanarBackPolygon)
      {
        this.coplanarPolygons.push(result.coplanarBackPolygon);
      }
    }
    return this;
  }

  addPolygons(polygons)
  {
    for (let i = 0; i < polygons.length; i++)
    {
      this.addPolygon(polygons[i]);
    }
    return this;
  }

  /**
   * Removes the polygons from this bsp that are inside the given bsp
   * @param bsp the clipping bsp
   * @returns this bsp clipped by the given bsp
   */
  clip(bsp) 
  {
    let insidePolygons = [];
    let outsidePolygons = [];

    bsp.classifyPolygons(this.coplanarPolygons, 
      insidePolygons, outsidePolygons);
    
    this.coplanarPolygons = outsidePolygons; // take only outside polygons

    if (this.frontBSP)
    {
      this.frontBSP.clip(bsp);
    }
    if (this.backBSP)
    {
      this.backBSP.clip(bsp);
    }    
    return this;
  };

  /**
   * Inverts this bsp tree
   * @returns this bsp inverted
   */
  invert()
  {
    for (let i = 0; i < this.coplanarPolygons.length; i++)
    {
      this.coplanarPolygons[i].flip();
    }

    this.plane.negate();
    
    if (this.frontBSP)
    {
      this.frontBSP.invert();
    }

    if (this.backBSP)
    {
      this.backBSP.invert();
    }

    let tempBSP = this.frontBSP;
    this.frontBSP = this.backBSP;
    this.backBSP = tempBSP;

    return this;
  }
  
  /**
   * Performs a union between this bsp and the given bsp
   * @param bsp the other bsp
   * @returns this bsp
   */
  union(bsp)
  {
    // union = a | b
    
    let a = this;
    let b = bsp;
    
    // mutual clip
    a.clip(b);
    b.clip(a);
    
    // remove from b coplanar polygons
    b.invert().clip(a).invert();
    
    a.addPolygons(b.getPolygons());
    
    return a;
  }

  /**
   * Performs a intersection between this bsp and the given bsp
   * @param bsp the other bsp
   * @returns this bsp
   */
  intersect(bsp)
  {
    // intersection = a & b = ~(~(a & b)) = ~(~a | ~b)
    
    let a = this;
    let b = bsp;

    a.invert();
    b.invert();

    a.clip(b);
    b.clip(a);
    
    b.invert().clip(a).invert();

    a.addPolygons(b.getPolygons()).invert();

//    Alternative method:
//    
//    a.invert();
//    b.clip(a);
//    b.invert();
//
//    a.clip(b);
//    b.clip(a);
//    
//    a.addPolygons(b.getPolygons()).invert();

    return a;
  }

  /**
   * Performs the subtraction between this bsp and the given bsp
   * @param bsp the other bsp
   * @returns this bsp
   */
  subtract(bsp)
  {
    // substract = a - b = ~(~(a & ~b)) = ~(~a | b)

    let a = this;
    let b = bsp;
    
    a.invert();
            
    // mutual clip
    a.clip(b);
    b.clip(a);
            
    // remove from b coplanar polygons
    b.invert().clip(a).invert();
    
    a.addPolygons(b.getPolygons()).invert();

    return a;
  }

  classifyPolygon(polygon, insidePolygons, outsidePolygons)
  {
    if (this.plane === null) return;

    let result = this.splitPolygon(polygon);
    
    let frontPolygon = result.frontPolygon || result.coplanarFrontPolygon;
    let backPolygon = result.backPolygon || result.coplanarBackPolygon;
    
    let localInsidePolygons = [];
    let localOutsidePolygons = [];
    
    if (frontPolygon)
    {
      if (this.frontBSP)
      {
        this.frontBSP.classifyPolygon(frontPolygon,
          localInsidePolygons, localOutsidePolygons);
      }
      else
      {
        localOutsidePolygons.push(frontPolygon);
      }
    }

    if (backPolygon)
    {
      if (this.backBSP)
      {
        this.backBSP.classifyPolygon(backPolygon,
          localInsidePolygons, localOutsidePolygons);
      }
      else
      {
        localInsidePolygons.push(backPolygon);
      }
    }
    
    if (localInsidePolygons.length > 0 && localOutsidePolygons.length > 0)
    {
      insidePolygons.push(...localInsidePolygons);
      outsidePolygons.push(...localOutsidePolygons);
    }
    else if (localInsidePolygons.length > 0)
    {
      insidePolygons.push(polygon);      
    }
    else if (localOutsidePolygons.length > 0)
    {
      outsidePolygons.push(polygon);      
    }
  }

  classifyPolygons(polygons, insidePolygons, outsidePolygons)
  {
    for (let i = 0; i < polygons.length; i++)
    {
      polygons[i].id = i;
      this.classifyPolygon(polygons[i], insidePolygons, outsidePolygons);
    }
  }

  splitPolygon(polygon, epsilon = 0.00001)
  {
    let result = {
      frontPolygon : null, 
      backPolygon : null,
      coplanarFrontPolygon : null,
      coplanarBackPolygon : null
    };
    
    let plane = this.plane;
    let frontCount = 0;
    let backCount = 0;
    const pos = [];

    for (let i = 0; i < polygon.vertices.length; i++)
    {
      let vertex = polygon.vertices[i];
      let d = plane.distanceToPoint(vertex);
      if (Math.abs(d) < epsilon) d = 0;
      if (d > 0) frontCount++;
      else if (d < 0) backCount++;
      pos.push(Math.sign(d));
    }

    if (frontCount === 0 && backCount === 0)
    {
      if (plane.normal.dot(polygon.normal) > 0)
      {
        result.coplanarFrontPolygon = polygon;
      }
      else
      {
        result.coplanarBackPolygon = polygon;        
      }
    }
    else if (frontCount > 0 && backCount === 0)
    {
      result.frontPolygon = polygon;
    }
    else if (backCount > 0 && frontCount === 0)
    {
      result.backPolygon = polygon;
    }
    else
    {
      let frontPolygon = new Polygon();
      let backPolygon = new Polygon();

      for (let i = 0; i < polygon.vertices.length; i++)
      {
        let j = (i + 1) % polygon.vertices.length;
        let vi = polygon.vertices[i];
        let vj = polygon.vertices[j];
        let pi = pos[i];
        let pj = pos[j];
        if (pi >= 0)
        {
          frontPolygon.addVertex(vi);
        }
        if (pi <= 0)
        {
          backPolygon.addVertex(vi);
        }
        if (pi !== pj && pi + pj === 0)
        {
          let vij = GeometryUtils.intersectLinePlane(vi, vj, plane);
          frontPolygon.addVertex(vij);
          backPolygon.addVertex(vij);
        }
      }
      if (frontPolygon.vertices.length >= 3) // ??
      {
        frontPolygon.updateNormal();
        result.frontPolygon = frontPolygon;
      }
      if (backPolygon.vertices.length >= 3) // ??
      {
        backPolygon.updateNormal();
        result.backPolygon = backPolygon;
      }
    }
    return result;
  }

  getPolygons(polygons = [])
  {
    for (let i = 0; i < this.coplanarPolygons.length; i++)
    {
      polygons.push(this.coplanarPolygons[i]);
    }

    if (this.frontBSP)
    {
      this.frontBSP.getPolygons(polygons);
    }

    if (this.backBSP)
    {
      this.backBSP.getPolygons(polygons);
    }
    return polygons;
  }
};

class Polygon
{
  constructor()
  {
    this.vertices = [];
    this.normal = null;
  }
  
  addVertex(vertex)
  {
    this.vertices.push(vertex);
  }
  
  updateNormal()
  {
    this.normal = GeometryUtils.calculateNormal(this.vertices);
  }
  
  flip()
  {
    this.normal.negate();
    this.vertices = this.vertices.reverse();
  }
};

export { BSP };


