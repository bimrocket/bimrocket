/*
 * Revolver.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { SweptSolidBuilder } from "./SweptSolidBuilder.js";
import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { Cord } from "../core/Cord.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import * as THREE from "../lib/three.module.js";

class Revolver extends SweptSolidBuilder
{
  angle = 90; // degrees
  location = new THREE.Vector3();
  axis = new THREE.Vector3(0, 1, 0);
  segments = 32; // segments per turn (360 degress)
  smoothAngle = 5; // degrees

  constructor(angle, location, axis, segments)
  {
    super();
    if (typeof angle === "number")
    {
      this.angle = angle;
    }
    if (location instanceof THREE.Vector3)
    {
      this.location.copy(location);
    }
    if (axis instanceof THREE.Vector3)
    {
      this.axis.copy(axis);
    }
    if (typeof segments === "number")
    {
      if (segments > 2)
      {
        this.segments = segments;
      }
    }
  }

  performBuild(solid)
  {
    let profile = this.findClosedProfile(solid);
    if (profile === undefined) return true;

    let [ outerRing, innerRings, stepVertexCount ] = this.prepareRings(profile);

    const yAxis = new THREE.Vector3();
    yAxis.copy(this.axis).normalize();
    const xAxis = new THREE.Vector3(yAxis.y, -yAxis.x, 0);
    const zAxis = new THREE.Vector3();
    zAxis.crossVectors(xAxis, yAxis);

    const baseMatrix = new THREE.Matrix4();
    baseMatrix.makeBasis(xAxis, yAxis, zAxis);
    baseMatrix.setPosition(this.location);

    const baseMatrixInverse = new THREE.Matrix4();
    baseMatrixInverse.copy(baseMatrix).invert();

    const rotationMatrix = new THREE.Matrix4();

    const geometry = new SolidGeometry();

    const matrix = new THREE.Matrix4();

    let angle = Math.abs(this.angle);
    if (angle > 360) angle = 360;
    let reverse = Math.sign(this.angle) === -1;

    let steps = Math.ceil(this.segments * angle / 360);
    const angleRad = THREE.MathUtils.degToRad(angle);
    let stepAngleRad = angleRad / steps;

    if (reverse)
    {
      stepAngleRad *= -1;
    }

    let offset1 = -1;
    let offset2 = 0;
    for (let i = 0; i <= steps; i++)
    {
      rotationMatrix.makeRotationY(stepAngleRad * i);

      matrix.copy(baseMatrix);
      matrix.multiply(rotationMatrix);
      matrix.multiply(baseMatrixInverse);
      matrix.multiply(profile.matrix);

      if (i === steps && angle === 360)
      {
        offset2 = 0;
      }
      else
      {
        this.addStepVertices(outerRing, innerRings, matrix, geometry);
      }

      // add faces
      if (i === 0 && angle < 360)
      {
        // first face
        this.addProfileFace(0, outerRing, innerRings, !reverse, geometry);
      }
      else if (i === steps && angle < 360)
      {
        // last face
        this.addProfileFace(offset2, outerRing, innerRings, reverse, geometry);
      }

      if (offset1 >= 0)
      {
        this.addLateralFaces(offset1, offset2, outerRing, innerRings,
          reverse, geometry);
      }

      offset1 = offset2;
      offset2 += stepVertexCount;
    }
    geometry.isManifold = true;
    geometry.smoothAngle = this.smoothAngle;
    solid.updateGeometry(geometry);

    return true;
  }

  copy(source)
  {
    this.angle = source.angle;
    this.location.copy(source.location);
    this.axis.copy(source.axis);
    this.stepAngle = source.stepAngle; // degress
    this.smoothAngle = source.smothAngle; // degrees
    this.minPointDistance = source.minPointDistance;

    return this;
  }
};

ObjectBuilder.addClass(Revolver);

export { Revolver };


