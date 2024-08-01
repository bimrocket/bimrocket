/**
 * IFCXMLLoader
 *
 * @author realor
 */

import { IFCLoader } from "./IFCLoader.js";

class IFCXMLLoader extends IFCLoader
{
	constructor(manager)
  {
    super(manager);
  }

  parseFile(text)
  {
    throw "Not implemented";
  }
};

export { IFCXMLLoader };
