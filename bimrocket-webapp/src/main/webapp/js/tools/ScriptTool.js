/*
 * ScriptTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { FileExplorer } from "../ui/FileExplorer.js";
import { Dialog } from "../ui/Dialog.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.js";
import { Toast } from "../ui/Toast.js";
import { Solid } from "../core/Solid.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { ExtrudeSolidGeometry } from "../core/ExtrudeSolidGeometry.js";
import { Metadata, Result } from "../io/FileService.js";
import "../lib/codemirror.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class ScriptTool extends Tool
{
  static GLOBALS =
  {
    THREE : THREE,
    ObjectUtils : ObjectUtils,
    GeometryUtils : GeometryUtils,
    Solid : Solid,
    SolidGeometry : SolidGeometry,
    ExtrudeSolidGeometry : ExtrudeSolidGeometry,
    Toast : Toast
  };

  constructor(application, options)
  {
    super(application);
    this.name = "script";
    this.label = "tool.script.label";
    this.className = "script";
    this.setOptions(options);

    const dialog = this.createEditor();
    dialog.init("", "");
    this.dialog = dialog;

    this.saved = true;

    const panel = new FileExplorer(application);
    this.panel = panel;

    panel.title = this.label;
    panel.group = "script";

    const showFile = (url, data) =>
    {
      const index = url.lastIndexOf("/");
      let name = url.substring(index + 1);
      dialog.init(name, data);
      dialog.show();
      this.saved = true;
    };

    panel.openFile = (url, data) =>
    {
      if (!this.saved)
      {
        ConfirmDialog.create("title.unsaved_changes",
          "question.discard_changes")
          .setAction(() => showFile(url, data))
          .setAcceptLabel("button.discard")
          .setCancelLabel("button.no")
          .setI18N(application.i18n).show();
      }
      else
      {
        showFile(url, data);
      }
    };

    panel.addContextButton("editor", "Editor",
      () => dialog.show(), () => true);

    application.panelManager.addPanel(this.panel);
  }

  createEditor()
  {
    const application = this.application;

    const dialog = new Dialog("tool.script.editor");
    dialog.setSize(640, 540);
    dialog.setI18N(application.i18n);

    const nameField = dialog.addTextField("name", "tool.script.name", "",
      "script_name");

    const editorElem = document.createElement("div");
    editorElem.className = "script_code";

    dialog.bodyElem.appendChild(editorElem);

    const { basicSetup, EditorView } = CM["@codemirror/basic-setup"];
    const { javascript, javascriptLanguage } = CM["@codemirror/lang-javascript"];
    const { EditorState } = CM["@codemirror/state"];

    let theme = EditorView.theme({
      "&.cm-focused .cm-cursor" : {
        borderLeftColor: "#000",
        borderLeftWidth: "2px"
      },
      "&.cm-focused .cm-matchingBracket" : {
        "backgroundColor" : "yellow",
        "color" : "black"
      },
      "& .ͼa" : {
        "color" : "#444",
        "fontWeight" : "bold"
      },
      "& .ͼl" : {
        "color" : "#808080"
      },
      "& .ͼf" : {
        "color" : "#8080e0"
      },
      "& .ͼd" : {
        "color" : "#2020ff"
      },
      "& .ͼb" : {
        "color" : "#008000"
      },
      "& .cm-wrap" : {
        "height" : "100%"
      },
      "& .cm-scroller" : {
        "overflow" : "auto"
      }
    });

    let editorView = new EditorView(
    {
      parent: editorElem
    });

    const endEdition = () =>
    {
      dialog.scriptName = nameField.value;
      let code = editorView.state.doc.toString();
      if (code !== dialog.scriptCode)
      {
        dialog.scriptCode = code;
        this.saved = false;
      }
      dialog.hide();
    };

    dialog.addButton("run", "button.run", () =>
    {
      endEdition();
      this.run(dialog.scriptName, dialog.scriptCode);
    });

    const saveButton = dialog.addButton("save", "button.save", () =>
    {
      endEdition();
      this.save(dialog.scriptName, dialog.scriptCode);
    });

    dialog.addButton("cancel", "button.close", () =>
    {
      endEdition();
    });

    nameField.addEventListener("input", () =>
    {
      saveButton.disabled = nameField.value.trim().length === 0;
    });

    dialog.onShow = () =>
    {
      saveButton.disabled = nameField.value.trim().length === 0;
      if (dialog.scriptName === "")
      {
        nameField.focus();
      }
      else
      {
        editorView.focus();
      }
    };

    dialog.init = (name, code) =>
    {
      nameField.value = name;

      let editorState = EditorState.create(
      {
        doc: code,
          extensions : [basicSetup, javascript(), theme]
      });

      editorView.setState(editorState);

      dialog.scriptName = name;
      dialog.scriptCode = code;
    };

    return dialog;
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

  run(name, code)
  {
    this.addGlobals();
    try
    {
      const fn = new Function(code);
      const result = fn();
      if (typeof result !== "undefined")
      {
        MessageDialog.create(name || "", result)
          .setClassName("info")
          .setI18N(this.application.i18n).show();
      }
    }
    catch (ex)
    {
      MessageDialog.create("ERROR", ex)
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
    finally
    {
      this.removeGlobals();
    }
  }

  save(name, code)
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
        this.saved = result.status !== Result.ERROR;
      });
    }
    else
    {
      MessageDialog.create("ERROR", "message.select_directory")
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
  }

  addGlobals()
  {
    for (let name in ScriptTool.GLOBALS)
    {
      window[name] = ScriptTool.GLOBALS[name];
    }
  }

  removeGlobals()
  {
    for (let name in ScriptTool.GLOBALS)
    {
      delete window[name];
    }
  }
}

export { ScriptTool };