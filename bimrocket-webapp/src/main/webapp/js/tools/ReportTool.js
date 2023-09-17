/*
 * ReportTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { FileExplorer } from "../ui/FileExplorer.js";
import { ReportPanel } from "../ui/ReportPanel.js";
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
import { ReportDialog } from "../ui/ReportDialog.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class ReportTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "report";
    this.label = "tool.report.label";
    this.className = "report";
    this.setOptions(options);

    const panel = new FileExplorer(application, false);
    panel.showFileSize = false;
    this.panel = panel;
    this.edit = false;

    const reportPanel = new ReportPanel(application);
    this.reportPanel = reportPanel;

    panel.title = this.label;
    panel.group = "report";

    const dialog = new ReportDialog(this.application,
      (name, code) => this.onSave(name, code));
    this.dialog = dialog;

    panel.openFile = (url, code) =>
    {
      this.setReport(url, code);
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
      () => { this.edit = true; this.setReport("", ""); },
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

    this.reportPanel.visible = true;
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

  setReport(url, code)
  {
    const index = url.lastIndexOf("/");
    let name = url.substring(index + 1);

    if (this.edit)
    {
      this.edit = false;

      const dialog = this.dialog;
      dialog.reportName = name;
      dialog.reportCode = code;
      dialog.saved = true;
      dialog.show();
    }
    else
    {
      this.reportPanel.execute(name, code);
    }
  }
}

export { ReportTool };