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
import { ServerAdminTool } from "../tools/ServerAdminTool.js";
import { IDSEditorTool } from "../tools/IDSEditorTool.js";
import { IFCSTEPLoader } from "../io/ifc/IFCSTEPLoader.js";
import { IFCSTEPExporter } from "../io/ifc/IFCSTEPExporter.js";
import { BCFService } from "../io/BCFService.js";
import { IFCDBService } from "../io/IFCDBService.js";
import { WebdavService } from "../io/WebdavService.js";
import { IDBFileService } from "../io/IDBFileService.js";
import { SecurityService } from "../io/SecurityService.js";
import { IOManager } from "../io/IOManager.js";
import { IDSReportType } from "../reports/IDSReportType.js";
import { CompareSnapshotAction } from "../ui/file/CompareSnapshotAction.js";
import { SaveSnapshotAction } from "../ui/file/SaveSnapshotAction.js";
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
    icon : "ifc",
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

  IOManager.formats["ids"] =
  {
    description : "Information Delivery Specification (*.ids)",
    extensions : ["ids"],
    mimeType : "application/xml",
    dataType : "text",
    icon : "report"
  };

  IOManager.formats["snp"] =
  {
    description : "IFC snapshot (*.snp)",
    extensions : ["snp"],
    mimeType : "application/json",
    dataType : "text",
    icon : "snapshot"
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
  const adminTool = new ServerAdminTool(application);
  const idsEditorTool = new IDSEditorTool(application);

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
  bimMenu.addMenuItem(idsEditorTool);
  bimMenu.addMenuItem(adminTool);

  const toolBar = application.toolBar;
  toolBar.addToolButton(bimLayoutTool);
  toolBar.addToolButton(bimInventoryTool);

  // restore services
  application.restoreServices("bcf");
  application.restoreServices("ifcdb");
  application.restoreServices("security");

  // create default services
  if (application.services.bcf === undefined)
  {
    if (typeof Environment.SERVER_URL === "string")
    {
      const bcf = new BCFService({
        name : "bcf",
        description : application.constructor.NAME + " BCF",
        url : Environment.SERVER_URL + "/api/bcf/2.1"
      });
      application.addService(bcf, "bcf", false);
    }
  }

  if (application.services.ifcdb === undefined)
  {
    if (typeof Environment.SERVER_URL === "string")
    {
      const ifcdb_2X3 = new IFCDBService({
        name : "ifcdb_2X3",
        description : application.constructor.NAME + " IFCDB (IFC2X3)",
        url : Environment.SERVER_URL + "/api/ifcdb/1.0/models/IFC2X3"
      });
      application.addService(ifcdb_2X3, "ifcdb", false);

      const ifcdb_4 = new IFCDBService({
        name : "ifcdb_4",
        description : application.constructor.NAME + " IFCDB (IFC4)",
        url : Environment.SERVER_URL + "/api/ifcdb/1.0/models/IFC4"
      });
      application.addService(ifcdb_4, "ifcdb", false);
    }
  }

  if (application.services.snapshots === undefined)
  {
    if (typeof Environment.SERVER_URL === "string")
    {
      const webdav = new WebdavService({
        name : "ifc_snapshots",
        description : "Remote",
        url : Environment.SERVER_URL + "/api/cloudfs/ifc_snapshots"
      });
      application.addService(webdav, "ifc_snapshots", false);
    }

    const idbfs = new IDBFileService({
      name : "idb_ifc_snapshots",
      description : "Local",
      url : "idb_snapshots"
    });
    application.addService(idbfs, "ifc_snapshots", false);
  }

  if (application.services.security === undefined)
  {
    if (typeof Environment.SERVER_URL === "string")
    {
      const security = new SecurityService({
        name : "security",
        description : "Security",
        url: Environment.SERVER_URL  + "/api/security"
      });
      application.addService(security, "security", false);
    }
  }

  // load bundles
  BundleManager.setBundle("base", "i18n/base");
  BundleManager.setBundle("bim", "i18n/bim");
  application.i18n.defaultBundle = BundleManager.getBundle("base");
  application.i18n.addSupportedLanguages("en", "es", "ca");
  application.i18n.updateTree(application.element);

  const explorerTool = application.tools["cloud_explorer"];
  if (explorerTool)
  {
    const contextMenu = explorerTool.fileExplorer.contextMenu;
    const action = explorerTool.fileExplorer.createContextAction;
    contextMenu.addMenuItem(action(CompareSnapshotAction), "default:top");
    contextMenu.addMenuItem(action(SaveSnapshotAction), "save");
  }
}