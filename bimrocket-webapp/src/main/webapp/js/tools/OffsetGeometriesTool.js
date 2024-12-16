/*
 * OffsetGeometriesTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { Cord } from "../core/Cord.js";
import * as THREE from "three";

class OffsetGeometriesTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "offset_geometries";
    this.label = "tool.offset_geometries.label";
    this.className = "offset_geometries";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
    
    this.geometryMap = new Map();
    this.matrix = new THREE.Matrix4();
  }

  execute()
  {
    const application = this.application;
    const roots = application.selection.roots;

    this.geometryMap.clear();

    for (let root of roots)
    {
      this.offsetGeometries(root, null);
    }
    console.info(this.geometryMap);

    application.notifyObjectsChanged(roots, this, "structureChanged");
  }

  offsetGeometries(object, parentOffsetVector)
  {
    let firstChildIndex = 0;
    let offsetVector = null;

    if (object instanceof Solid)
    {
      firstChildIndex = 2;
      let geometry = object.geometry;
      if (geometry?.vertices?.length > 0)
      {
        offsetVector = this.geometryMap.get(geometry.uuid) || null;
        if (offsetVector === null)
        {
          let firstPoint = geometry.vertices[0];
          offsetVector = GeometryUtils.getOffsetVectorForFloat32(firstPoint);
          if (offsetVector)
          {
            this.matrix.makeTranslation(
              -offsetVector.x, -offsetVector.y, -offsetVector.z);
            geometry.applyMatrix4(this.matrix);
            object.updateGeometry(geometry);
            this.geometryMap.set(geometry.uuid, offsetVector);
          }
        }
      }
    }
    else if (object instanceof Profile)
    {
      let geometry = object.geometry;
      let path = geometry?.path;
      if (path)
      {
        offsetVector = this.geometryMap.get(geometry.uuid) || null;
        if (offsetVector === null)
        {
          let rings = [];
          if (path instanceof THREE.Shape)
          {
            const points = path.extractPoints();
            let outerRing = points.shape;
            let innerRings = points.holes;
            rings.push(outerRing, ...innerRings);
          }
          else // THREE.Path
          {
            rings.push(path.getPoints());
          }
          let firstPoint = rings[0][0];

          offsetVector = GeometryUtils.getOffsetVectorForFloat32(firstPoint);
          if (offsetVector)
          {
            GeometryUtils.offsetRings(offsetVector, ...rings);

            if (path instanceof THREE.Shape)
            {
              path = new THREE.Shape(rings[0]);
              for (let i = 1; i < rings.length; i++)
              {
                let holePath = new THREE.Path(rings[i]);
                holePath.closePath();
                path.holes.push(holePath);
              }
            }
            else
            {
              path = new THREE.Path(rings[0]);
            }
            geometry.path = path;
            geometry.updateBuffers();
            this.geometryMap.set(geometry.uuid, offsetVector);
          }
        }
      }
    }
    else if (object instanceof Cord)
    {
      let geometry = object.geometry;
      let points = geometry?.points;
      if (points?.length > 0)
      {
        offsetVector = this.geometryMap.get(geometry.uuid) || null;
        if (offsetVector === null)
        {
          let firstPoint = points[0];
          offsetVector = GeometryUtils.getOffsetVectorForFloat32(firstPoint);
          if (offsetVector)
          {
            GeometryUtils.offsetRings(offsetVector, points);
            geometry.updateBuffers();
            this.geometryMap.set(geometry.uuid, offsetVector);
          }
        }
      }

    }

    if (offsetVector)
    {
      object.position.add(offsetVector);
    }

    if (parentOffsetVector)
    {
      object.position.sub(parentOffsetVector);
    }

    if (offsetVector || parentOffsetVector)
    {
      object.updateMatrix();
    }

    for (let i = firstChildIndex; i < object.children.length; i++)
    {
      this.offsetGeometries(object.children[i], offsetVector);
    }

  }
}

export { OffsetGeometriesTool };

