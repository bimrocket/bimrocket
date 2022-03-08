/*
 * ScriptTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { FileExplorer } from "../ui/FileExplorer.js";
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
import { ScriptDialog } from "../ui/ScriptDialog.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class ScriptTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "script";
    this.label = "tool.script.label";
    this.className = "script";
    this.setOptions(options);

    const panel = new FileExplorer(application);
    this.panel = panel;

    panel.title = this.label;
    panel.group = "script";

    const dialog = new ScriptDialog(this.application,
      (name, code) => this.onSave(name, code));
    this.dialog = dialog;

    panel.openFile = (url, code) =>
      this.openFile(() => this.showFile(url, code));

    panel.addContextButton("run", "button.run",
      () => this.openFile(() => this.runFile()),
      () => panel.isDirectoryList() && panel.isEntrySelected());

    panel.addContextButton("editor", "button.editor",
      () => dialog.show(), () => true);

    application.panelManager.addPanel(this.panel);
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
      panel.service.save(code, path, result =>
      {
        panel.handleSaveResult(path, result);
        this.dialog.saved = result.status !== Result.ERROR;
      });
    }
    else
    {
      MessageDialog.create("ERROR", "message.select_directory")
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
  }

  openFile(action)
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

  showFile(url, code)
  {
    const dialog = this.dialog;

    const index = url.lastIndexOf("/");
    let name = url.substring(index + 1);

    dialog.scriptName = name;
    dialog.scriptCode = code;
    dialog.saved = true;
    dialog.clearConsole();
    dialog.show();
  }

  runFile()
  {
    const dialog = this.dialog;
    const panel = this.panel;
    let path = panel.basePath + panel.entryName;

    panel.showProgressBar();

    panel.service.open(path, result =>
    {
      let code = result.data;
      dialog.scriptName = panel.entryName;
      dialog.scriptCode = code;
      dialog.saved = true;
      let error = dialog.run();
      panel.showButtonsPanel();
      if (error)
      {
        dialog.show();
      }
    }, data => panel.setProgress(data.progress, data.message));
  }
}

export { ScriptTool };