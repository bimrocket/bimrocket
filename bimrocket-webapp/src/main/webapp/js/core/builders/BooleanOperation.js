/*
 * BooleanOperation.js
 *
 * @author: realor
 */

import { ObjectBuilder } from "../ObjectBuilder.js";
import { SolidGeometry } from "../SolidGeometry.js";
import { Solid } from "../Solid.js";
import { BSP } from "../BSP.js";
import * as THREE from "../../lib/three.module.js";

class BooleanOperation extends ObjectBuilder
{
  static UNION = "union";
  static INTERSECT = "intersect";
  static SUBTRACT = "subtract";

  constructor(operation)
  {
    super();
    this.operation = operation || BooleanOperation.SUBTRACT;
  }

  performBuild(solid)
  {
    const solids = [];

    for (let i = 2; i < solid.children.length; i++)
    {
      let child = solid.children[i];
      if (child instanceof Solid)
      {
        ObjectBuilder.build(child);
        solids.push(child);
      }
    }
    if (solids.length === 0) return false;

    const createBSP = function(solid)
    {
      const bsp = new BSP();
      bsp.fromSolidGeometry(solid.geometry, solid.matrix);
      return bsp;
    };

    let resultBSP = createBSP(solids[0]);
    for (let i = 1; i < solids.length; i++)
    {
      let solid = solids[i];
      if (solid.isValid())
      {
        let otherBSP = createBSP(solid);
        switch (this.operation)
        {
          case BooleanOperation.UNION:
            resultBSP = resultBSP.union(otherBSP); break;
          case BooleanOperation.INTERSECT:
            resultBSP = resultBSP.intersect(otherBSP); break;
          case BooleanOperation.SUBTRACT:
            resultBSP = resultBSP.subtract(otherBSP); break;
        }
      }
    }
    let geometry = resultBSP.toSolidGeometry();

    solid.updateGeometry(geometry);

    return true;
  }
}

export { BooleanOperation };

