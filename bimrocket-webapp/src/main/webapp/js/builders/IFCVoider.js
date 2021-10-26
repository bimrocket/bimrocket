/**
 * Voider.js
 *
 * @author realor
 */

import { Solid } from "../core/Solid.js";
import { BSP } from "../core/BSP.js";
import { ObjectBuilder } from "./ObjectBuilder.js";
import { SolidBuilder } from "./SolidBuilder.js";
import { IFC } from "../io/ifc/IFC.js";
import * as THREE from "../lib/three.module.js";

class IFCVoider extends SolidBuilder
{
  constructor()
  {
    super();
  }

  traverseDependencies(productRepr, action)
  {
    if (!(productRepr instanceof Solid) 
        || productRepr.children.length < 3) return;

    action(productRepr.parent);

    const unvoidedRepr = productRepr.children[2];
    action(unvoidedRepr);

    let productObject3D = productRepr.parent;
    if (productObject3D.userData.IFC &&
        productObject3D.userData.IFC.ifcClassName === "IfcBuildingElementPart")
    {
      productObject3D = productObject3D.parent;
    }

    for (let child of productObject3D.children)
    {
      if (child !== productRepr)
      {
        action(child);
      }
    }
  }

  performBuild(productRepr)
  {
    if (productRepr.children.length < 3) return true;

    const unvoidedRepr = productRepr.children[2];
    if (!unvoidedRepr instanceof Solid) return true;

    const openingReprs = [];

    let productObject3D = productRepr.parent;
    if (productObject3D.userData.IFC &&
        productObject3D.userData.IFC.ifcClassName === "IfcBuildingElementPart")
    {
      productObject3D = productObject3D.parent;
    }

    for (let child of productObject3D.children)
    {
      let userData = child.userData;
      if (userData.IFC && userData.IFC.ifcClassName === "IfcOpeningElement")
      {
        let openingRepr = child.getObjectByName(IFC.RepresentationName);
        if (openingRepr instanceof Solid)
        {
          openingReprs.push(openingRepr);
        }
        else if (openingRepr instanceof THREE.Group)
        {
          for (let subchild of openingRepr.children)
          {
            if (subchild instanceof Solid)
            {
              openingReprs.push(subchild);
            }
          }
        }
      }
    }
    if (openingReprs.length === 0)
    {
      productRepr.updateGeometry(unvoidedRepr.geometry, false);
      return true;
    }

    const createBSP = function(solid)
    {
      const bsp = new BSP();
      bsp.fromSolidGeometry(solid.geometry, solid.matrixWorld);
      return bsp;
    };

    let resultBSP = createBSP(unvoidedRepr);
    for (let openingRepr of openingReprs)
    {
      if (openingRepr.isValid())
      {
        let otherBSP = createBSP(openingRepr);
        resultBSP = resultBSP.subtract(otherBSP);
      }
    }
    let geometry = resultBSP.toSolidGeometry();

    let inverseMatrixWorld = new THREE.Matrix4();
    inverseMatrixWorld.copy(productRepr.matrixWorld).invert();
    geometry.applyMatrix4(inverseMatrixWorld);

    productRepr.updateGeometry(geometry);

    return true;
  }
};

ObjectBuilder.addClass(IFCVoider);

export { IFCVoider };

