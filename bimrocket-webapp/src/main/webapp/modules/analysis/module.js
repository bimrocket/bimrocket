/**
 * analysis module
 *
 * @author realor
 */

import { HistogramTool } from "./tools/HistogramTool.js";
import { MeasureAngleTool } from "./tools/MeasureAngleTool.js";
import { MeasureAreaTool } from "./tools/MeasureAreaTool.js";
import { MeasureLengthTool } from "./tools/MeasureLengthTool.js";
import { MeasureSelectionTool } from "./tools/MeasureSelectionTool.js";
import { ReportTool } from "./tools/ReportTool.js";
import { SearchTool } from "./tools/SearchTool.js";
import { SolarSimulatorTool } from "./tools/SolarSimulatorTool.js";

import { IDBFileService } from "platform/io/IDBFileService.js";
import { WebdavService } from "platform/io/WebdavService.js";

import { BRSReportType } from "./reports/BRSReportType.js";

import { BundleManager } from "platform/i18n/BundleManager.js";
import { IconManager } from "platform/ui/IconManager.js";
import { CSSManager } from "platform/ui/CSSManager.js";
import { Environment } from "environment";

import * as THREE from "three";

export function activate(application)
{
  BundleManager.setBundle("analysis", "./i18n/analysis", import.meta);
  IconManager.setSprite("analysis", "./assets/icons/misc.svg", import.meta);
  CSSManager.setCSS("analysis", "./assets/css/analysis.css", import.meta);

  // register formats
  IOManager.formats["brs"] =
  {
    description : "BIMROCKET Specification (*.brs)",
    extensions : ["brs"],
    mimeType : "text/javascript",
    dataType : "text",
    icon : "report"
  };

  // create tools
  const reportTool = new ReportTool(application);
  const histogramTool = new HistogramTool(application);
  const searchTool = new SearchTool(application);
  const measureLengthTool = new MeasureLengthTool(application);
  const measureAreaTool = new MeasureAreaTool(application);
  const measureAngleTool = new MeasureAngleTool(application);
  const measureSelectionTool = new MeasureSelectionTool(application);
  const solarSimulatorTool = new SolarSimulatorTool(application);

  // create menus
  const menuBar = application.menuBar;

  const panelsMenu = menuBar.getMenu("base|menu.panels");

  const analysisMenu = menuBar.addMenu("analysis|menu.analysis", panelsMenu?.getIndex());

  const measureMenu = analysisMenu.addMenu("analysis|menu.measure");
  measureMenu.addMenuItem(measureLengthTool);
  measureMenu.addMenuItem(measureAreaTool);
  measureMenu.addMenuItem(measureAngleTool);
  measureMenu.addMenuItem(measureSelectionTool);

  analysisMenu.addMenuItem(reportTool);
  analysisMenu.addMenuItem(histogramTool);
  analysisMenu.addMenuItem(searchTool);
  analysisMenu.addMenuItem(solarSimulatorTool);

  // add tools to toolbar
  const toolBar = application.toolBar;

  toolBar.addSeparator("analysis");
  toolBar.addToolButton(measureLengthTool);
  toolBar.addToolButton(searchTool);
  toolBar.addToolButton(reportTool);

  // restore services
  application.restoreServices("report");

  if (application.services.report === undefined)
  {
    if (typeof Environment.SERVER_URL === "string")
    {
      const webdav = new WebdavService({
        name : "reports",
        description : "Remote",
        url : Environment.SERVER_URL + "/api/cloudfs/reports"
      });
      application.addService(webdav, "report", false);
    }

    const idbfs = new IDBFileService({
      name : "idb_reports",
      description : "Local",
      url : "idb_reports"
    });
    application.addService(idbfs, "report", false);
  }
}
