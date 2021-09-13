/**
 * Voider.js
 *
 * @author realor
 */

import { Solid } from "../../core/Solid.js";
import { BSP } from "../../core/BSP.js";
import { ObjectBuilder } from "../../core/ObjectBuilder.js";
import { IFC } from "./IFC.js";
import * as THREE from "../../lib/three.module.js";

class IFCVoider extends ObjectBuilder
{
  constructor()
  {
    super();
  }

  performMarking(productRepr)
  {
    if (productRepr.children.length < 3) return;

    const unvoidedRepr = productRepr.children[2];
    ObjectBuilder.mark(unvoidedRepr);

    let childrenNeedRebuild = false;
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
        ObjectBuilder.mark(child);
        if (child.needsRebuild)
        {
          childrenNeedRebuild = true;
        }
      }
    }
    if (childrenNeedRebuild
        || unvoidedRepr.needsRebuild
        || productObject3D.needsRebuild)
    {
      productRepr.needsRebuild = true;
    }
  }

  performBuild(productRepr)
  {
    if (productRepr.children.length < 3) return;

    const unvoidedRepr = productRepr.children[2];
    if (!unvoidedRepr instanceof Solid) return;

    ObjectBuilder.build(unvoidedRepr);

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
        ObjectBuilder.build(child);
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
    if (openingReprs.length === 0) return false;

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

export { IFCVoider };

