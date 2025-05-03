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
import { BSDDTool } from "../tools/BSDDTool.js";
import { BIMDeltaTool } from "../tools/BIMDeltaTool.js";
import { BIMResetViewTool } from "../tools/BIMResetViewTool.js";
import { BIMExplodeTool } from "../tools/BIMExplodeTool.js";
import { IFCSTEPLoader } from "../io/ifc/IFCSTEPLoader.js";
import { IFCSTEPExporter } from "../io/ifc/IFCSTEPExporter.js";
import { BCFService } from "../io/BCFService.js";
import { IFCDBService } from "../io/IFCDBService.js";
import { WebdavService } from "../io/WebdavService.js";
import { IDBFileService } from "../io/IDBFileService.js";
import { IOManager } from "../io/IOManager.js";
import { IDSReportType } from "../reports/IDSReportType.js";
import { BundleManager } from "../i18n/BundleManager.js";
import { Environment } from "../Environment.js";
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
  const bsddTool = new BSDDTool(application);
  const bimDeltaTool = new BIMDeltaTool(application);
  const bimExplodeTool = new BIMExplodeTool(application);
  const bimResetViewTool = new BIMResetViewTool(application);

  // create menus
  const menuBar = application.menuBar;

  const bimMenu = menuBar.addMenu("BIM", menuBar.menus.length - 2);
  bimMenu.addMenuItem(bimLayoutTool);
  bimMenu.addMenuItem(bimInventoryTool);
  bimMenu.addMenuItem(bimInspectorTool);
  bimMenu.addMenuItem(ifcDBTool);
  bimMenu.addMenuItem(bcfTool);
  bimMenu.addMenuItem(bsddTool);
  bimMenu.addMenuItem(bimDeltaTool);
  bimMenu.addMenuItem(bimExplodeTool);
  bimMenu.addMenuItem(bimResetViewTool);

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
      url : (Environment.SERVER_URL || "/bimrocket-server") + "/api",
      credentialsAlias : Environment.SERVER_ALIAS || "bimrocket"
    });
    application.addService(bcf, "bcf", false);
  }

  if (application.services.ifcdb === undefined)
  {
    const ifcdb_2X3 = new IFCDBService({
      name : "ifcdb_2X3",
      description : application.constructor.NAME + " IFCDB (IFC2X3)",
      url : (Environment.SERVER_URL || "/bimrocket-server") + "/api/ifcdb/1.0/models/IFC2X3",
      credentialsAlias : Environment.SERVER_ALIAS || "bimrocket"
    });
    application.addService(ifcdb_2X3, "ifcdb", false);

    const ifcdb_4 = new IFCDBService({
      name : "ifcdb_4",
      description : application.constructor.NAME + " IFCDB (IFC4)",
      url : (Environment.SERVER_URL || "/bimrocket-server") + "/api/ifcdb/1.0/models/IFC4",
      credentialsAlias : Environment.SERVER_ALIAS || "bimrocket"
    });
    application.addService(ifcdb_4, "ifcdb", false);
  }

  if (application.services.snapshots === undefined)
  {
    const webdav = new WebdavService({
      name : "ifc_snapshots",
      description : "Remote",
      url : (Environment.SERVER_URL || "/bimrocket-server") + "/api/cloudfs/ifc_snapshots"
    });
    application.addService(webdav, "ifc_snapshots", false);

    const idbfs = new IDBFileService({
      name : "idb_ifc_snapshots",
      description : "Local",
      url : "idb_snapshots"
    });
    application.addService(idbfs, "ifc_snapshots", false);
  }

  // load bundles
  BundleManager.setBundle("base", "i18n/base");
  BundleManager.setBundle("bim", "i18n/bim");
  application.i18n.defaultBundle = BundleManager.getBundle("base");
  application.i18n.addSupportedLanguages("en", "es", "ca");
  application.i18n.updateTree(application.element);
}