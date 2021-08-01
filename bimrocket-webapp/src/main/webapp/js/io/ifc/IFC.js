/**
 * IFC.js
 *
 * @author realor
 */

import { Solid } from "../../solid/Solid.js";
import * as THREE from "../../lib/three.module.js";

class IFC
{
  static RepresentationName = "IfcRepresentation";
  static MIN_CIRCLE_SEGMENTS = 16; // minimum circle segments
  static CIRCLE_SEGMENTS_BY_RADIUS = 64; // circle segments by meter of radius
  static HALF_SPACE_SIZE = 10000;

  static FACTOR_PREFIX =
  {
    ".EXA." : 10e17,
    ".PETA." : 10e14,
    ".TERA." : 10e11,
    ".GIGA." : 10e8,
    ".MEGA." : 10e5,
    ".KILO." : 10e2,
    ".HECTO." : 100,
    ".DECA." : 10,
    ".DECI." : 0.1,
    ".CENTI." : 0.01,
    ".MILLI." : 0.001,
    ".MICRO." : 10e-7,
    ".NANO." : 10e-10,
    ".PICO." : 10e-13,
    ".FEMTO." : 10e-16,
    ".ATTO." : 10e-19
  };

 static MATERIALS =
 {
   IfcWall : new THREE.MeshPhongMaterial({
     name : "Wall",
     color: 0xC0C080, shininess: 1,
     flatShading: false,
     side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.0,
     polygonOffsetUnits: 0.5}),

   IfcWallStandardCase : new THREE.MeshPhongMaterial({
     name : "Wall",
     color: 0xC0C080, shininess: 1,
     flatShading: false,
     side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.0,
     polygonOffsetUnits: 0.5}),

   IfcSlab : new THREE.MeshPhongMaterial({
     name : "Slab",
     color: 0xC0C0C0, shininess: 1,
     flatShading: false,
     side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.0,
     polygonOffsetUnits: 0.5}),

   IfcRailing : new THREE.MeshPhongMaterial({
     name : "Railing",
     flatShading: false,
     color: 0x606060, shininess: 1, side: THREE.DoubleSide}),

   IfcWindow : new THREE.MeshPhongMaterial({
     name : "Window",
     flatShading: false,
     color: 0x8080FF, opacity: 0.5, transparent: true, side: THREE.DoubleSide}),

   IfcDoor : new THREE.MeshPhongMaterial({
     name : "Door",
     flatShading: false,
     color: 0xC0C040, side: THREE.DoubleSide}),

   IfcCovering : new THREE.MeshPhongMaterial({
     name : "Covering",
     flatShading: false,
     color: 0xC0C0C0, side: THREE.FrontSide}),

   IfcBeam : new THREE.MeshPhongMaterial({
     name : "Beam",
     flatShading: false,
     color: 0x606070, side: THREE.FrontSide}),

   IfcColumn : new THREE.MeshPhongMaterial({
     name : "Column",
     flatShading: false,
     color: 0x808080, side: THREE.FrontSide}),

   IfcOpeningElement : new THREE.MeshPhongMaterial({
     name : "Opening",
     flatShading: false,
     color: 0x8080FF, opacity: 0.2, transparent: true, side: THREE.FrontSide}),

   IfcSpace : new THREE.MeshPhongMaterial({
     name : "Space",
     flatShading: false,
     color: 0xC0C0F0, opacity: 0.2, transparent: true}),

   IfcFlowTerminal : new THREE.MeshPhongMaterial({
     name : "FlowTerminal",
     flatShading: false,
     color: 0xFFFFFF, side: THREE.DoubleSide}),

   IfcFurnishingElement : new THREE.MeshPhongMaterial({
     name : "FurnishingElement",
     flatShading: false,
     color: 0xDEB887, side: THREE.DoubleSide}),

   IfcStair : new THREE.MeshPhongMaterial({
     name : "FurnishingElement",
     flatShading: false,
     color: 0xA0522D, side: THREE.DoubleSide}),

   IfcStairFlight : new THREE.MeshPhongMaterial({
     name : "FurnishingElement",
     flatShading: false,
     color: 0xA0522D, side: THREE.DoubleSide})
  };

  static modelFactor = 1.0;

  static getCircleSegments(radius)
  {
    let meterRadius = radius * this.modelFactor;

    let segments = Math.max(
      this.MIN_CIRCLE_SEGMENTS,
      Math.ceil(this.CIRCLE_SEGMENTS_BY_RADIUS * meterRadius));

    if (segments % 2 === 1) segments++;

    return segments;
  }

  static cloneObject3D(object)
  {
    // clone preserving _ifc property
    let clonedObject = object.clone(false);
    clonedObject._ifc = object._ifc;

    if (!(object instanceof Solid))
    {
      for (let child of object.children)
      {
        clonedObject.add(this.cloneObject3D(child));
      }
    }
    return clonedObject;
  }
}

export { IFC };
