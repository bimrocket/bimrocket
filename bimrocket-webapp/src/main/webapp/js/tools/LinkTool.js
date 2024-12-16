/*
 * LinkTool.js
 *
 * @author realor
 */

import * as THREE from "three";
import { I18N } from "../i18n/I18N.js";
import { Controls } from "../ui/Controls.js";
import { Toast } from "../ui/Toast.js";
import { Tool } from "./Tool.js";

class LinkTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "link";
    this.label = "tool.link.label";
    this.help = "tool.link.help";
    this.className = "link";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.sourceObject = null;
    this.linkName;

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left", "panel_link");
    this.panel.preferredHeight = 160;

    this.messageElem = document.createElement("div");
    this.messageElem.style.marginBottom = "10px";
    this.panel.bodyElem.appendChild(this.messageElem);

    this.linkNameInput = Controls.addInputField(this.panel.bodyElem,
      "text", "link_name", "label.link_name");

    const divElem = document.createElement("div");
    divElem.className = "buttons_bar";
    this.panel.bodyElem.appendChild(divElem);

    this.nextButton = Controls.addButton(divElem,
      "link", "button.next", () => this.next());

    this.linkButton = Controls.addButton(divElem,
      "link", "button.link", () => this.link());

    this.panel.onHide = () =>
    {
      this.sourceObject = null;
    };
  }

  execute()
  {
    const application = this.application;
    this.sourceObject = null;
    this.linkName = null;

    I18N.set(this.messageElem, "textContent", "message.select_source_object");
    application.i18n.update(this.messageElem);
    this.linkNameInput.value = "";
    this.linkNameInput.parentElement.style.display = "";
    this.nextButton.style.display = "";
    this.linkButton.style.display = "none";
    this.panel.visible = true;
  }

  next()
  {
    const application = this.application;
    this.sourceObject = application.selection.object;
    this.linkName = this.linkNameInput.value.trim();

    if (this.sourceObject === null)
    {
      MessageDialog.create(this.label, "message.select_an_object")
        .setClassName("info")
        .setI18N(application.i18n).show();
    }
    else if (this.linkName.length === 0)
    {
      MessageDialog.create(this.label, "message.enter_link_name")
        .setClassName("info")
        .setI18N(application.i18n).show();
    }
    else
    {
      I18N.set(this.messageElem, "textContent", "message.select_target_object");
      application.i18n.update(this.messageElem);
      this.linkNameInput.parentElement.style.display = "none";
      this.nextButton.style.display = "none";
      this.linkButton.style.display = "";
      application.selection.clear();
    }
  }

  link()
  {
    const application = this.application;
    const targetObject = application.selection.object;
    if (targetObject)
    {
      if (this.sourceObject.links === undefined)
      {
        this.sourceObject.links = {};
      }
      this.sourceObject.links[this.linkName] = targetObject;
      application.selection.set(this.sourceObject);
      this.panel.visible = false;

      Toast.create("message.link_created")
        .setI18N(application.i18n).show();
    }
    else
    {
      MessageDialog.create(this.label, "message.select_an_object")
        .setClassName("info")
        .setI18N(application.i18n).show();
    }
  }
}

export { LinkTool };
