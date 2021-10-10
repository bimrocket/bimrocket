/*
 * SolidBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import * as THREE from "../../lib/three.module.js";

class SolidBuilder extends ObjectBuilder
{
  traverseDependencies(object, action)
  {
    // traverse children skiping faces & edges objects
    const children = object.children;
    for (let i = 2; i < children.length; i++)
    {
      let child = children[i];
      action(child);
    }
  }
};

export { SolidBuilder };

