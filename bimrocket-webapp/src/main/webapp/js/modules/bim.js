/**
 * bim.js
 *
 * @author realor
 */

import { BIMInventoryTool } from "../tools/BIMInventoryTool.js";
import { BIMLayoutTool } from "../tools/BIMLayoutTool.js";
import { BIMInspectorTool } from "../tools/BIMInspectorTool.js";
import { IFCDBTool } from "../tools/IFCDBTool.js";
import { BCFTool } from "../tools/BCFTool.js";
import { IFCSTEPLoader } from "../io/ifc/IFCSTEPLoader.js";
import { IFCSTEPExporter } from "../io/ifc/IFCSTEPExporter.js";
import { BCFService } from "../io/BCFService.js";
import { IFCDBService } from "../io/IFCDBService.js";
import { IOManager } from "../io/IOManager.js";
import { IDSReportType } from "../reports/IDSReportType.js";
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
    extensions : ["ifc"],
    mimeType : "application/x-step",
    dataType : "text",
    loader :
    {
      class : IFCSTEPLoader,
      loadMethod : 2
    },
    exporter :
    {
      class : IFCSTEPExporter
    }
  };

  // create tools
  const bimInventoryTool = new BIMInventoryTool(application);
  const bimLayoutTool = new BIMLayoutTool(application);
  const bimInspectorTool = new BIMInspectorTool(application);
  const ifcDBTool = new IFCDBTool(application);
  const bcfTool = new BCFTool(application);

  application.addTool(bimInventoryTool);
  application.addTool(bimLayoutTool);
  application.addTool(bimInspectorTool);
  application.addTool(ifcDBTool);
  application.addTool(bcfTool);

  // create menus
  const menuBar = application.menuBar;

  const bimMenu = menuBar.addMenu("BIM", menuBar.menus.length - 2);
  bimMenu.addMenuItem(bimLayoutTool);
  bimMenu.addMenuItem(bimInventoryTool);
  bimMenu.addMenuItem(bimInspectorTool);
  bimMenu.addMenuItem(ifcDBTool);
  bimMenu.addMenuItem(bcfTool);

  const toolBar = application.toolBar;
  toolBar.addToolButton(bimLayoutTool);
  toolBar.addToolButton(bimInventoryTool);

  // restore services
  application.restoreServices("bcf");
  application.restoreServices("ifcdb");

  // create default services
  if (application.services.bcf === undefined)
  {
    const bcf = new BCFService({
      name : "bcf",
      description : application.constructor.NAME + " BCF",
      url : "/bimrocket-server/api"
    });
    application.addService(bcf, "bcf", false);
  }

  if (application.services.ifcdb === undefined)
  {
    const ifcdb_2X3 = new IFCDBService({
      name : "ifcdb_2X3",
      description : application.constructor.NAME + " IFCDB (IFC2X3)",
      url : "/bimrocket-server/api/ifcdb/1.0/models/IFC2X3"
    });
    application.addService(ifcdb_2X3, "ifcdb", false);

    const ifcdb_4 = new IFCDBService({
      name : "ifcdb_4",
      description : application.constructor.NAME + " IFCDB (IFC4)",
      url : "/bimrocket-server/api/ifcdb/1.0/models/IFC4"
    });
    application.addService(ifcdb_4, "ifcdb", false);
  }

  // load bundles
  BundleManager.setBundle("base", "i18n/base");
  BundleManager.setBundle("bim", "i18n/bim");
  application.i18n.defaultBundle = BundleManager.getBundle("base");
  application.i18n.addSupportedLanguages("en", "es", "ca");
  application.i18n.updateTree(application.element);
}