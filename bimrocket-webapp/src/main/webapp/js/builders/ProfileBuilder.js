/*
 * ProfileBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";

class ProfileBuilder extends ObjectBuilder
{
  traverseDependencies(profile, action)
  {
    // no dependencies by default
  }
};

export { ProfileBuilder };

