/*
 * CordBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";

class CordBuilder extends ObjectBuilder
{
  traverseDependencies(cord, action)
  {
    // no dependencies by default
  }
};

export { CordBuilder };

