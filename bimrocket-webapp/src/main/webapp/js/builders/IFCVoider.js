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
    // productRepr nust be a Solid with a Solid child

    if (!(productRepr instanceof Solid)
        || !productRepr.hasComponents()) return;

    const unvoidedRepr = productRepr.getComponent(0);
    if (!unvoidedRepr instanceof Solid) return;

    let productObject3D = this.findIfcProduct(productRepr);
    if (productObject3D === null) return;

    action(unvoidedRepr);

    action(productObject3D);

    for (let child of productObject3D.children)
    {
      if (child.userData.IFC?.ifcClassName === "IfcOpeningElement")
      {
        action(child);
      }
    }
  }

  performBuild(productRepr)
  {
    // productRepr must be a Solid with a Solid child

    if (!(productRepr instanceof Solid)
        || !productRepr.hasComponents()) return true;

    const unvoidedRepr = productRepr.getComponent(0);
    if (!unvoidedRepr instanceof Solid) return true;

    let productObject3D = this.findIfcProduct(productRepr);
    if (productObject3D === null) return true;

    const openingReprs = [];

    for (let child of productObject3D.children)
    {
      if (child.userData.IFC?.ifcClassName === "IfcOpeningElement")
      {
        let openingRepr = IFC.getRepresentation(child);
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
      productRepr.updateGeometry(unvoidedRepr.geometry);
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

    productRepr.updateGeometry(geometry, true);

    return true;
  }

  findIfcProduct(object)
  {
    // find the nearest ancestor object with GlobalId (IfcProduct) that is not
    // an IfcBuildingElementPart

    while (object)
    {
      let ifcClassName = object.userData.IFC?.ifcClassName;
      let globalId = object.userData.IFC?.GlobalId;

      if (globalId && ifcClassName !== "IfcBuildingElementPart") return object;

      object = object.parent;
    }
    return null;
  }
};

ObjectBuilder.addClass(IFCVoider);

export { IFCVoider };

