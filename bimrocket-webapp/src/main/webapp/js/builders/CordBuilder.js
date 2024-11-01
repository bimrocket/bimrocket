/*
 * CordBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import * as THREE from "three";

class CordBuilder extends ObjectBuilder
{
  traverseDependencies(cord, action)
  {
    // no dependencies by default
  }
};

export { CordBuilder };

