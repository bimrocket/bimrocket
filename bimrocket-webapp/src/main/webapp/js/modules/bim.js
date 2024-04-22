/**
 * bim.js
 *
 * @author realor
 */

import { BIMInventoryTool } from "../tools/BIMInventoryTool.js";
import { BIMLayoutTool } from "../tools/BIMLayoutTool.js";
import { BIMInspectorTool } from "../tools/BIMInspectorTool.js";
import { BCFTool } from "../tools/BCFTool.js";
import { IFCSTEPLoader } from "../io/ifc/IFCSTEPLoader.js";
import { BCFService } from "../io/BCFService.js";
import { IOManager } from "../io/IOManager.js";
import { BundleManager } from "../i18n/BundleManager.js";
import "../io/ifc/schemas/IFC2X3.js";
import "../io/ifc/schemas/IFC4.js";
import "../io/ifc/schemas/IFC4X3_ADD2.js";

export function load(application)
{
  // register formats
  IOManager.formats["ifc"] =
  {
    description : "Industry foundation classes (*.ifc)",
    extensions: ["ifc"],
    mimeType : "application/x-step",
    loader :
    {
      class : IFCSTEPLoader,
      loadMethod : 2,
      dataType : "text"
    }
  };

  // create tools
  const bimInventoryTool = new BIMInventoryTool(application);
  const bimLayoutTool = new BIMLayoutTool(application);
  const bimInspectorTool = new BIMInspectorTool(application);
  const bcfTool = new BCFTool(application);

  application.addTool(bimInventoryTool);
  application.addTool(bimLayoutTool);
  application.addTool(bimInspectorTool);
  application.addTool(bcfTool);

  // create menus
  const menuBar = application.menuBar;

  const bimMenu = menuBar.addMenu("BIM", menuBar.menus.length - 2);
  bimMenu.addMenuItem(bimLayoutTool);
  bimMenu.addMenuItem(bimInventoryTool);
  bimMenu.addMenuItem(bimInspectorTool);
  bimMenu.addMenuItem(bcfTool);

  const toolBar = application.toolBar;
  toolBar.addToolButton(bimLayoutTool);
  toolBar.addToolButton(bimInventoryTool);

  // restore services
  application.restoreServices("bcf");

  // create default services
  if (application.services.bcf === undefined)
  {
    const bcf = new BCFService("bcf",
      application.constructor.NAME + " BCF", "/bimrocket-server/api");
    application.addService(bcf, "bcf", false);
  }

  // load bundles
  BundleManager.setBundle("base", "i18n/base");
  BundleManager.setBundle("bim", "i18n/bim");
  application.i18n.defaultBundle = BundleManager.getBundle("base");
  application.i18n.addSupportedLanguages("en", "es", "ca");
  application.i18n.updateTree(application.element);
}