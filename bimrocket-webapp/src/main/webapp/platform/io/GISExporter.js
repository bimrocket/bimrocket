/**
 * GISExporter.js
 *
 * @author realor
 */

import { Solid } from "platform/core/Solid.js";
import * as THREE from "three";

class GISExporter
{
  static options =
  {
    propertyGroups : ["GIS", "IFC"]
  }

  parse(object, options)
  {
    this.options = Object.assign({}, GISExporter.options, options);
  }

  exportObject(object, baseMatrix, output)
  {
    if (object.visible)
    {
      const matrix = new THREE.Matrix4();
      matrix.copy(baseMatrix).multiply(object.matrix);

      if (object instanceof Solid)
      {
        this.exportSolid(object, matrix, output);
      }
      else if (object instanceof Profile)
      {
        this.exportProfile(object, matrix, output);
      }
      else if (object instanceof Cord)
      {
        this.exportCord(object, matrix, output);
      }

      for (let child of object.children)
      {
        this.exportObject(child, matrix, output);
      }
    }
  }

  exportSolid(solid, matrix, output)
  {
    if (!solid.edgesVisible && !solid.facesVisible) return;

    const geometry = solid.geometry;
    const vertices = geometry.vertices;
    const faces = geometry.faces;
    const coords = [];
    for (let face of faces)
    {
      let faceCoords = this.getFaceCoordinates(face, vertices, matrix);
      if (faceCoords)
      {
        coords.push(faceCoords);
      }
    }
    if (coords.length > 0)
    {
      const properties = this.getProperties(solid);
      this.addFeature("MultiPolygon", coords, properties, output);
    }
  }

  exportProfile(profile, matrix, output)
  {
    const geometry = profile.geometry;
    const path = geometry.path;
    const divisions = geometry.divisions;
    const closed = path instanceof THREE.Shape;

    function addRing(points)
    {
      const ring = [];
      for (let point of points)
      {
        const vertex = new THREE.Vector3(point.x, point.y);
        vertex.applyMatrix4(matrix);
        ring.push([vertex.x, vertex.y]);
      }
      if (closed) ring.push(ring[0]);
      return ring;
    }

    const coords = [];
    const points = path.getPoints(divisions);
    coords.push(addRing(points));

    if (closed)
    {
      const pointsHoles = path.getPointsHoles(divisions);

      for (let pointsHole of pointsHoles)
      {
        coords.push(addRing(pointsHole));
      }
    }
    const properties = this.getProperties(profile);
    this.addFeature("Polygon", coords, properties, output);
  }

  exportCord(cord, matrix, output)
  {
    const geometry = cord.geometry;
    const points = geometry.points;
    const coords = [];
    for (let point of points)
    {
      const vertex = new THREE.Vector3(point.x, point.y);
      vertex.applyMatrix4(matrix);
      coords.push([vertex.x, vertex.y]);
    }
    const properties = this.getProperties(cord);
    this.addFeature("LineString", coords, properties, output);
  }

  addFeature(geomType, coords, properties, output)
  {
    throw "addFeature(geomType, coords, properties, output): not implemented";
  }

  getProperties(object)
  {
    const properties = { id: object.id };
    const propertyGroups = this.options.propertyGroups;

    if (propertyGroups.length > 0)
    {
      let ancestor = object.parent;
      while (ancestor && !ancestor.userData.selection?.group)
      {
        ancestor = ancestor.parent;
      }
      if (ancestor) object = ancestor; // take group object

      // find the first ancestor that contains any of the propertyGroups
      let groupCount = 0;
      while (object && groupCount === 0)
      {
        for (let propertyGroup of propertyGroups)
        {
          let group = object.userData[propertyGroup];
          if (typeof group === "object")
          {
            for (let key in group)
            {
              let value = group[key];
              if (["number", "string", "boolean"].includes(typeof value))
              {
                properties[key] = value;
              }
            }
            groupCount++;
          }
        }
        object = object.ancestor;
      }
    }
    return properties;
  }

  getFaceCoordinates(face, vertices, matrix)
  {
    if (!face.normal) face.updateNormal();

    const p1 = new THREE.Vector3();
    p1.setFromMatrixPosition(matrix);
    const p2 = face.normal.clone().applyMatrix4(matrix);
    p2.sub(p1);
    if (p2.z < 0.0001) return null;

    const coords = [];
    const outerLoop = [];
    for (let i of face.outerLoop.indices)
    {
      let v = vertices[i].clone().applyMatrix4(matrix);
      outerLoop.push([v.x, v.y]);
    }
    outerLoop.push(outerLoop[0]);
    coords.push(outerLoop);

    for (let hole of face.holes)
    {
      const innerLoop = [];
      for (let i of hole.indices)
      {
        let v = vertices[i].clone().applyMatrix4(matrix);
        innerLoop.push([v.x, v.y]);
      }
      innerLoop.push(innerLoop[0]);
      coords.push(innerLoop);
    }
    return coords;
  }
}

export { GISExporter };