/*
 * ReportTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { ReportType } from "../reports/ReportType.js";
import { FileExplorer } from "../ui/FileExplorer.js";
import { ReportPanel } from "../ui/ReportPanel.js";
import { ReportDialog } from "../ui/ReportDialog.js";
import { ReportTypeDialog } from "../ui/ReportTypeDialog.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.js";
import { Toast } from "../ui/Toast.js";
import { Solid } from "../core/Solid.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { Cord } from "../core/Cord.js";
import { CordGeometry } from "../core/CordGeometry.js";
import { Profile } from "../core/Profile.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import { Metadata, Result } from "../io/FileService.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "three";

class ReportTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "report";
    this.label = "tool.report.label";
    this.className = "report";
    this.setOptions(options);
    application.addTool(this);

    const panel = new FileExplorer(application, false);
    this.panel = panel;
    panel.showFileSize = false;
    panel.onHide = () => this.application.useTool(null);

    this.edit = false;

    const reportPanel = new ReportPanel(application);
    this.reportPanel = reportPanel;

    panel.title = this.label;
    panel.group = "report";

    const dialog = new ReportDialog(this.application,
      (name, code) => this.onSave(name, code));
    dialog.reportPanel = reportPanel;
    this.dialog = dialog;

    panel.openFile = (url, source) =>
    {
      this.openReport(() => this.setReport(url, source));
    };

    panel.addContextButton("open", "button.open",
      () => panel.openEntry(),
      () => panel.isEntrySelected() && !panel.isFileEntrySelected());

    panel.addContextButton("open_file", "button.run",
      () => panel.openEntry(),
      () => panel.isDirectoryList() && panel.isFileEntrySelected());

    panel.addContextButton("edit", "button.edit",
      () => { this.edit = true; panel.openEntry(); },
      () => panel.isDirectoryList() && panel.isEntrySelected());

    panel.addContextButton("new", "button.new",
      () => this.openReport(() => this.createReport()),
      () => true);

    panel.addContextButton("editor", "button.editor",
      () => dialog.show(),
      () => true);

    panel.addCommonContextButtons();
    panel.addServiceContextButtons();

    application.panelManager.addPanel(this.panel);
    application.panelManager.addPanel(this.reportPanel);
  }

  activate()
  {
    this.panel.visible = true;
    if (this.panel.service === null)
    {
      this.panel.goHome();
    }
  }

  deactivate()
  {
    this.panel.visible = false;
  }

  onSave(name, code)
  {
    const panel = this.panel;

    panel.entryName = name;
    panel.entryType = Metadata.FILE;
    const path = panel.basePath + "/" + name;

    if (panel.service)
    {
      panel.savePath(path, code, () =>
      {
        this.dialog.saved = true;
        this.dialog.hide();
      });
    }
    else
    {
      MessageDialog.create("ERROR", "message.select_directory")
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
  }

  createReport()
  {
    const typeDialog = new ReportTypeDialog(this.application, reportTypeName =>
    {
      const reportType = ReportType.types[reportTypeName];
      const source = reportType.getDefaultSource();
      this.edit = true;
      this.setReport("", source, reportTypeName);
    });
    typeDialog.show();
  }

  openReport(action)
  {
    const dialog = this.dialog;
    const application = this.application;

    if (!dialog.saved)
    {
      ConfirmDialog.create("title.unsaved_changes",
        "question.discard_changes", dialog.scriptName)
        .setAction(action)
        .setAcceptLabel("button.discard")
        .setCancelLabel("button.no")
        .setI18N(application.i18n).show();
    }
    else
    {
      action();
    }
  }

  setReport(url, source, reportTypeName = null)
  {
    let index = url.lastIndexOf("/");
    let reportName = index === -1 ? url : url.substring(index + 1);

    if (reportTypeName === null)
    {
      index = reportName.lastIndexOf(".");
      reportTypeName = index === -1 ?
        ReportType.getDefaultReportTypeName() :
        reportName.substring(index + 1).toLowerCase();
    }

    if (this.edit)
    {
      this.edit = false;
      const dialog = this.dialog;
      dialog.reportName = reportName;
      dialog.reportSource = source;
      dialog.reportTypeName = reportTypeName;
      dialog.saved = true;
      dialog.show();
    }
    else
    {
      this.reportPanel.execute(reportName, source, reportTypeName);
    }
  }
}

export { ReportTool };