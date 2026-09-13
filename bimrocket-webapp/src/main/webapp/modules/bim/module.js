/**
 * bim module
 *
 * @author realor
 */

import { BCFTool } from "./tools/BCFTool.js";
import { BIMDeltaTool } from "./tools/BIMDeltaTool.js";
import { BIMExplodeTool } from "./tools/BIMExplodeTool.js";
import { BIMInventoryTool } from "./tools/BIMInventoryTool.js";
import { BIMLayoutTool } from "./tools/BIMLayoutTool.js";
import { BSDDTool } from "./tools/BSDDTool.js";
import { IFCInspectorTool } from "./tools/IFCInspectorTool.js";
import { IFCDBTool } from "./tools/IFCDBTool.js";
import { BIMResetViewTool } from "./tools/BIMResetViewTool.js";
import { ServerAdminTool } from "./tools/ServerAdminTool.js";

import { IFCSTEPLoader } from "platform/io/ifc/IFCSTEPLoader.js";
import { IFCSTEPExporter } from "platform/io/ifc/IFCSTEPExporter.js";
import { BCFService } from "platform/io/BCFService.js";
import { IFCDBService } from "platform/io/IFCDBService.js";
import { WebdavService } from "platform/io/WebdavService.js";
import { IDBFileService } from "platform/io/IDBFileService.js";
import { SecurityService } from "platform/io/SecurityService.js";
import { IOManager } from "platform/io/IOManager.js";

import { IDSReportType } from "./reports/IDSReportType.js";

import { BundleManager } from "platform/i18n/BundleManager.js";
import { IconManager } from "platform/ui/IconManager.js";
import { CSSManager } from "platform/ui/CSSManager.js";
import { Environment } from "environment";
import "platform/io/ifc/schemas/IFC2X3.js";
import "platform/io/ifc/schemas/IFC4.js";
import "platform/io/ifc/schemas/IFC4X3_ADD2.js";

export function activate(application)
{
  BundleManager.setBundle("bim", "./i18n/bim", import.meta);
  IconManager.setSprite("bim", "./assets/icons/misc.svg", import.meta);
  CSSManager.setCSS("bim", "./assets/css/bim.css", import.meta);
  CSSManager.setCSS("adminpanel", "./assets/css/adminpanel.css", import.meta);
  CSSManager.setCSS("bcfpanel", "./assets/css/bcfpanel.css", import.meta);
  CSSManager.setCSS("bsddpanel", "./assets/css/bsddpanel.css", import.meta);
  CSSManager.setCSS("ifc", "./assets/css/ifc.css", import.meta);
  CSSManager.setCSS("ifcdbpanel", "./assets/css/ifcdbpanel.css", import.meta);

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
  const ifcInspectorTool = new IFCInspectorTool(application);
  const ifcDBTool = new IFCDBTool(application);
  const bcfTool = new BCFTool(application);
  const bsddTool = new BSDDTool(application);
  const bimDeltaTool = new BIMDeltaTool(application);
  const bimExplodeTool = new BIMExplodeTool(application);
  const bimResetViewTool = new BIMResetViewTool(application);
  const adminTool = new ServerAdminTool(application);

  // create menus
  const menuBar = application.menuBar;

  const panelsMenu = menuBar.getMenu("base|menu.panels");

  const bimMenu = menuBar.addMenu("BIM", panelsMenu?.getIndex());
  bimMenu.addMenuItem(bimLayoutTool);
  bimMenu.addMenuItem(bimInventoryTool);
  bimMenu.addMenuItem(ifcInspectorTool);
  bimMenu.addMenuItem(ifcDBTool);
  bimMenu.addMenuItem(bcfTool);
  bimMenu.addMenuItem(bsddTool);
  bimMenu.addMenuItem(bimDeltaTool);
  bimMenu.addMenuItem(bimExplodeTool);
  bimMenu.addMenuItem(bimResetViewTool);
  bimMenu.addMenuItem(adminTool);

  const toolBar = application.toolBar;
  toolBar.addSeparator("bim");
  toolBar.addToolButton(bimLayoutTool);
  toolBar.addToolButton(bimInventoryTool);
  toolBar.addToolButton(bcfTool);
  toolBar.addToolButton(ifcDBTool);

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
}