/*
 * SolidBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import * as THREE from "../lib/three.module.js";

class SolidBuilder extends ObjectBuilder
{
  traverseDependencies(object, action)
  {
    // traverse children skiping faces & edges objects
    object.forEachComponent(action);
  }
};

export { SolidBuilder };

