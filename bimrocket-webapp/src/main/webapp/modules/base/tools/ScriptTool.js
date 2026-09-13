/*
 * ScriptTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { RunScriptAction } from "../ui/file/RunScriptAction.js";
import { EditScriptAction } from "../ui/file/EditScriptAction.js";
import { CreateScriptAction } from "../ui/file/CreateScriptAction.js";

import * as THREE from "three";

class ScriptTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "script";
    this.label = "base|tool.script.label";
    this.className = "script";
    this.iconName = "base|script";

    this.setOptions(options);
    this.immediate = true;

    application.addTool(this);

    this.createPanel();
  }

  createPanel()
  {
    const application = this.application;
    const panelManager = application.panelManager;
    let fileExplorer = panelManager.getPanel("file_explorer");
    if (!fileExplorer)
    {
      fileExplorer = new FileExplorer(application);
      panelManager.addPanel(fileExplorer);
    }

    const contextMenu = fileExplorer.contextMenu;
    const action = fileExplorer.createContextAction;

    contextMenu.addMenuItem(action(RunScriptAction), "default:top");
    contextMenu.addMenuItem(action(EditScriptAction), "edit");

    const createMenu = contextMenu.getMenu("menu.file.create");
    createMenu.addMenuItem(action(CreateScriptAction,
      { label : "base|action.script" }));

    this.panel = fileExplorer;
  }

  execute()
  {
    const panel = this.panel;
    panel.visible = false;
    panel.title = this.label;
    panel.iconName = "base|script";
    panel.tool = this;
    panel.activateGroup("script");
    panel.visible = true;
  }
}

export { ScriptTool };
