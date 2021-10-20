/*
 * CordBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import * as THREE from "../lib/three.module.js";

class CordBuilder extends ObjectBuilder
{
  traverseDependencies(cord, action)
  {
    // no dependencies by default
  }
};

export { CordBuilder };

