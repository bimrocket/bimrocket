/**
 * BIMUtils.js
 *
 * @author realor
 */

import { IFC } from "../io/ifc/IFC.js";
import { IFCVoider } from "../builders/IFCVoider.js";
import { Solid } from "../core/Solid.js";
import { ObjectUtils } from "./ObjectUtils.js";
import * as THREE from "three";

class BIMUtils
{
  static getGeolocation(object)
  {
    let ifcSite = null;

    while (object)
    {
      if (object.userData.IFC?.ifcClassName === "IfcSite")
      {
        ifcSite = object;
        break;
      }
      object = object.parent;
    }

    if (ifcSite &&
        ifcSite.userData.IFC?.RefLongitude instanceof Array &&
        ifcSite.userData.IFC?.RefLatitude instanceof Array &&
        typeof ifcSite.userData.IFC?.RefElevation === "number")
    {
      const lonArray = ifcSite.userData.IFC.RefLongitude;
      const latArray = ifcSite.userData.IFC.RefLatitude;

      while (lonArray.length < 4) lonArray.push(0);
      while (latArray.length < 4) latArray.push(0);

      const k1 = 60;
      const k2 = k1 * 60;
      const k3 = k2 * 1000000;

      const longitude =
        lonArray[0] + lonArray[1] / k1 + lonArray[2] / k2 + lonArray[3] / k3;

      const latitude =
        latArray[0] + latArray[1] / k1 + latArray[2] / k2 + latArray[3] / k3;

      const decimals = 1000000;

      return {
        longitude: Math.round(longitude * decimals) / decimals,
        latitude: Math.round(latitude * decimals) / decimals,
        elevation: ifcSite.userData.IFC.RefElevation
      };
    }
    return null;
  }

  static createVoidings(productObject3D, voidingFilter = [])
  {
    let openingCount = 0;

    let reprObjects = [];

    for (let child of productObject3D.children)
    {
      if (child.name === IFC.RepresentationName)
      {
        reprObjects.push(child);
      }
      else
      {
        let ifcClassName = child.userData.IFC?.ifcClassName;
        if (ifcClassName === "IfcBuildingElementPart")
        {
          let reprObject3D = IFC.getRepresentation(child);
          if (reprObject3D)
          {
            reprObjects.push(reprObject3D);
          }
        }
        else if (ifcClassName === "IfcOpeningElement")
        {
          openingCount++;
        }
      }
    }
    if (openingCount === 0 || reprObjects.length === 0) return;

    // voiding is required: add a parent Solid with IFCVoider for each Solid

    let changed = false;

    for (let reprObject3D of reprObjects)
    {
      if (reprObject3D instanceof Solid)
      {
        changed = this.createVoidedSolidFor(reprObject3D, voidingFilter);
      }
      else if (reprObject3D instanceof THREE.Group)
      {
        if (reprObject3D.builder === undefined) // apply only for simple groups
        {
          for (let reprPartObject3D of reprObject3D.children)
          {
            if (reprPartObject3D instanceof Solid)
            {
              if (this.createVoidedSolidFor(reprPartObject3D, voidingFilter))
              {
                changed = true;
              }
            }
          }
        }
      }
    }
    return changed;
  }

  static createVoidedSolidFor(reprObject3D, voidingFilter = [])
  {
    if (reprObject3D.builder instanceof IFCVoider) return false;

    let ifcClassName = reprObject3D.userData.IFC?.ifcClassName;

    if (voidingFilter.length === 0 ||
        voidingFilter.includes(ifcClassName))
    {
      let parent = reprObject3D.parent;
      let index = parent.children.indexOf(reprObject3D);

      let voidedSolid = new Solid();
      voidedSolid.name = reprObject3D.name;
      voidedSolid.material = reprObject3D.material;
      voidedSolid.userData = reprObject3D.userData;
      voidedSolid.position.copy(reprObject3D.position);
      voidedSolid.rotation.copy(reprObject3D.rotation);
      voidedSolid.scale.copy(reprObject3D.scale);
      voidedSolid.builder = new IFCVoider();
      voidedSolid._ifc = reprObject3D._ifc;

      ObjectUtils.setChildAtIndex(parent, index, voidedSolid);
      voidedSolid.add(reprObject3D);
      voidedSolid.updateMatrix();

      reprObject3D.name = "Unvoided";
      reprObject3D.visible = false;
      reprObject3D.facesVisible = false;
      reprObject3D.edgesVisible = false;
      reprObject3D.position.set(0, 0, 0);
      reprObject3D.rotation.set(0, 0, 0);
      reprObject3D.scale.set(1, 1, 1);
      reprObject3D.updateMatrix();

      parent.updateMatrixWorld();

      return true;
    }
    return false;
  }
}

window.BIMUtils = BIMUtils;

export { BIMUtils };

