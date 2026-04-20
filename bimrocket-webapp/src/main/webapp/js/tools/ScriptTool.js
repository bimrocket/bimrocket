/*
 * ScriptTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { FileExplorer } from "../ui/file/FileExplorer.js";
import { RunScriptAction } from "../ui/file/RunScriptAction.js";
import { EditScriptAction } from "../ui/file/EditScriptAction.js";
import { CreateScriptAction } from "../ui/file/CreateScriptAction.js";
import { EditModelValidationAction } from "../ui/file/EditModelValidationAction.js";
import { CreateModelValidationAction } from "../ui/file/CreateModelValidationAction.js";
import { SaveModelValidationAction } from "../ui/file/SaveModelValidationAction.js";

import * as THREE from "three";

class ScriptTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "script";
    this.label = "tool.script.label";
    this.className = "script";
    this.setOptions(options);
    application.addTool(this);

    const fileExplorer = new FileExplorer(application);
    this.fileExplorer = fileExplorer;
    fileExplorer.showFileSize = false;
    fileExplorer.onClose = () => this.application.useTool(null);
    fileExplorer.title = this.label;
    fileExplorer.group = "script";

    application.panelManager.addPanel(fileExplorer);

    const contextMenu = fileExplorer.contextMenu;
    const action = fileExplorer.createContextAction;

    contextMenu.addMenuItem(action(RunScriptAction), "default");
    contextMenu.addMenuItem(action(EditScriptAction), "edit");
    contextMenu.addMenuItem(action(EditModelValidationAction), "edit");
    contextMenu.addMenuItem(action(CreateScriptAction), "create");
    contextMenu.addMenuItem(action(CreateModelValidationAction), "create");
    contextMenu.addMenuItem(action(SaveModelValidationAction), "save");
  }

  activate()
  {
    this.fileExplorer.visible = true;
    if (this.fileExplorer.service === null)
    {
      this.fileExplorer.goHome();
    }
  }

  deactivate()
  {
    this.fileExplorer.visible = false;
  }
}

export { ScriptTool };
