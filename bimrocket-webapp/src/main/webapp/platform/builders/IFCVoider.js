/**
 * Voider.js
 *
 * @author realor
 */

import { Solid } from "platform/core/Solid.js";
import { BSP } from "platform/core/BSP.js";
import { ObjectBuilder } from "platform/builders/ObjectBuilder.js";
import { SolidBuilder } from "platform/builders/SolidBuilder.js";
import { IFC } from "platform/io/ifc/IFC.js";
import * as THREE from "three";

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
    if (!(unvoidedRepr instanceof Solid)) return;

    action(unvoidedRepr);

    const subtractReprs = this.findSubtractions(productRepr);

    for (let subtractRepr of subtractReprs)
    {
      action(subtractRepr);
    }
  }

  performBuild(productRepr)
  {
    // productRepr must be a Solid with a Solid child

    if (!(productRepr instanceof Solid)
        || !productRepr.hasComponents()) return true;

    const unvoidedRepr = productRepr.getComponent(0);
    if (!(unvoidedRepr instanceof Solid)) return true;

    if (!unvoidedRepr.geometry.isManifold)
    {
      unvoidedRepr.updateGeometry(unvoidedRepr.geometry, true);
    }

    const subtractReprs = this.findSubtractions(productRepr);

    if (subtractReprs.length === 0)
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

    for (let subtractRepr of subtractReprs)
    {
      if (subtractRepr.isValid())
      {
        let otherBSP = createBSP(subtractRepr);
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

  findSubtractions(productRepr)
  {
    const subtractReprs = [];
    let ancestor = productRepr.parent;
    while (ancestor)
    {
      if (ancestor.name === IFC.RepresentationName)
      {
        ancestor = ancestor.parent;
      }
      else
      {
        let ifcClassName = ancestor.userData.IFC?.ifcClassName;
        let globalId = ancestor.userData.IFC?.GlobalId;
        if (ifcClassName && globalId)
        {
          this.findDirectSubtractions(ancestor, subtractReprs);

          ancestor = ifcClassName === "IfcBuildingElementPart" ?
            ancestor.parent : null;
        }
        else
        {
          ancestor = null;
        }
      }
    }
    return subtractReprs;
  }

  findDirectSubtractions(productObject3D, subtractReprs)
  {
    for (let child of productObject3D.children)
    {
      let ifcClassName = child.userData.IFC?.ifcClassName;
      if (ifcClassName === "IfcOpeningElement" ||
          ifcClassName === "IfcVoidingFeature")
      {
        let subtractRepr = IFC.getRepresentation(child);
        if (subtractRepr instanceof Solid)
        {
          subtractReprs.push(subtractRepr);
        }
        else if (subtractRepr instanceof THREE.Group)
        {
          for (let subchild of subtractRepr.children)
          {
            if (subchild instanceof Solid)
            {
              subtractReprs.push(subchild);
            }
          }
        }
      }
    }
  }
};

ObjectBuilder.addClass(IFCVoider);

export { IFCVoider };

