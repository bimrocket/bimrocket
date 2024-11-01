/*
 * SweptSolidBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { SolidBuilder } from "./SolidBuilder.js";
import { Profile } from "../core/Profile.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import * as THREE from "three";

class SweptSolidBuilder extends SolidBuilder
{
  minPointDistance = 0.0001;

  constructor()
  {
    super();
  }

  findClosedProfile(solid)
  {
    for (let child of solid.children)
    {
      if (child instanceof Profile)
      {
        if (child.geometry && child.geometry.isClosed())
          return child;
      }
    }
    return undefined;
  }

  prepareRings(profile)
  {
    profile.visible = false;

    const shape = profile.geometry.path;

    const points = shape.extractPoints(profile.geometry.divisions);
    let outerRing = points.shape;
    let innerRings = points.holes;

    // prepare shape, orient rings and remove duplicated vertices

    const removeDuplicatedVertices = ring =>
    {
      let i = 0;
      for (let j = 1; j < ring.length; j++)
      {
        let point1 = ring[i];
        let point2 = ring[j];
        if (point1.distanceTo(point2) >= this.minPointDistance)
        {
          i++;
          ring[i] = point2;
        }
      }
      while (i < ring.length - 1)
      {
        ring.pop();
      }

      if (ring.length >= 2 &&
          ring[0].distanceTo(ring[ring.length - 1]) < this.minPointDistance)
      {
        ring.pop();
      }
    };

    removeDuplicatedVertices(outerRing);

    if (outerRing.length < 3)
    {
      throw "Can't extrude an invalid profile";
    }

    innerRings.forEach(removeDuplicatedVertices);
    innerRings = innerRings.filter(innerRing => innerRing.length >= 3);

    let stepVertexCount = outerRing.length;

    if (THREE.ShapeUtils.isClockWise(outerRing))
    {
      outerRing = outerRing.reverse();
    }

    for (let h = 0; h < innerRings.length; h++)
    {
      let innerRing = innerRings[h];
      stepVertexCount += innerRing.length;

      if (THREE.ShapeUtils.isClockWise(innerRing))
      {
        innerRings[h] = innerRing.reverse();
      }
    }

    return [ outerRing, innerRings, stepVertexCount ];
  }

  addStepVertices(outerRing, innerRings, matrix, geometry)
  {
    const addVertices = ring =>
    {
      for (let i = 0; i < ring.length; i++)
      {
        let vertex2 = ring[i];
        let vertex3 = new THREE.Vector3(vertex2.x, vertex2.y, 0);
        vertex3.applyMatrix4(matrix);
        geometry.vertices.push(vertex3);
      }
    };

    addVertices(outerRing);
    for (let h = 0; h < innerRings.length; h++)
    {
      let innerRing = innerRings[h];
      addVertices(innerRing);
    }
  }

  addProfileFace(offset, outerRing, innerRings, reverse, geometry)
  {
    let indices = [];
    for (let i = 0; i < outerRing.length; i++)
    {
      indices.push(offset++);
    }
    if (reverse) indices.reverse();
    let face = geometry.addFace(...indices);
    for (let innerRing of innerRings)
    {
      indices = [];
      for (let i = 0; i < innerRing.length; i++)
      {
        indices.push(offset++);
      }
      if (reverse) indices.reverse();
      face.addHole(...indices);
    }
    return face;
  }

  addLateralFaces(offset1, offset2, outerRing, innerRings, reverse, geometry)
  {
    // add outer ring side faces
    for (let i = 0; i < outerRing.length; i++)
    {
      let va1 = offset1 + i;
      let vb1 = offset1 + (i + 1) % outerRing.length;

      let va2 = offset2 + i;
      let vb2 = offset2 + (i + 1) % outerRing.length;

      if (reverse)
      {
        this.addFace(va2, vb2, vb1, va1, geometry);
      }
      else
      {
        this.addFace(va1, vb1, vb2, va2, geometry);
      }
    }

    // add inner rings side faces

    let innerRingOffset = outerRing.length;
    for (let r = 0; r < innerRings.length; r++)
    {
      let innerRing = innerRings[r];

      for (let i = 0; i < innerRing.length; i++)
      {
        let va1 = offset1 + innerRingOffset + i;
        let vb1 = offset1 + innerRingOffset + (i + 1) % innerRing.length;

        let va2 = offset2 + innerRingOffset + i;
        let vb2 = offset2 + innerRingOffset + (i + 1) % innerRing.length;

        if (reverse)
        {
          this.addFace(va1, vb1, vb2, va2, geometry);
        }
        else
        {
          this.addFace(va2, vb2, vb1, va1, geometry);
        }
      }
      innerRingOffset += innerRing.length;
    }
  }

  addFace(va1, vb1, vb2, va2, geometry)
  {
    const vertices = geometry.vertices;
    const pa1 = vertices[va1];
    const pb1 = vertices[vb1];
    const pa2 = vertices[va2];
    const pb2 = vertices[vb2];

    let equalsA = pa1.distanceTo(pa2) < this.minPointDistance;
    let equalsB = pb1.distanceTo(pb2) < this.minPointDistance;

    if (!equalsA && !equalsB)
    {
      geometry.addFace(va1, vb1, vb2, va2);
    }
    else if (!equalsA && equalsB)
    {
      geometry.addFace(va1, vb1, va2);
    }
    else if (equalsA && !equalsB)
    {
      geometry.addFace(va1, vb1, vb2);
    }
  }
};

export { SweptSolidBuilder };


