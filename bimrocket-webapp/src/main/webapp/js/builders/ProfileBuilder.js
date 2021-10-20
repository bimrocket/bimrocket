/*
 * ProfileBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import * as THREE from "../lib/three.module.js";

class ProfileBuilder extends ObjectBuilder
{
  traverseDependencies(profile, action)
  {
    // no dependencies by default
  }
};

export { ProfileBuilder };

