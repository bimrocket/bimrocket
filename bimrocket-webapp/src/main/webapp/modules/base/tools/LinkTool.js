/*
 * LinkTool.js
 *
 * @author realor
 */

import { I18N } from "platform/i18n/I18N.js";
import { Controls } from "platform/ui/Controls.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { Toast } from "platform/ui/toast/Toast.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { Tool } from "platform/ui/Tool.js";

class LinkTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "link";
    this.label = "base|tool.link.label";
    this.className = "link";
    this.iconName = "base|link";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.sourceObject = null;
    this.linkName;

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createToolPanel(this)
      .setClassName("panel-link")
      .setDefaultHeight(200)
      .setDefaultMobileHeight(180)
      .setMinimumHeight(140);

    this.messageElem = document.createElement("div");
    this.messageElem.style.marginBottom = "10px";
    this.panel.bodyElem.appendChild(this.messageElem);

    this.linkNameInput = Controls.addInputField(this.panel.bodyElem,
      "text", "link_name", "base|label.link_name");

    const divElem = document.createElement("div");
    divElem.className = "buttons-bar";
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

    I18N.set(this.messageElem, "textContent",
      "base|message.select_source_object");
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
      MessageDialog.create(this.label, "base|message.select_an_object")
        .setClassName("info")
        .setI18N(application.i18n).show();
    }
    else if (this.linkName.length === 0)
    {
      MessageDialog.create(this.label, "base|message.enter_link_name")
        .setClassName("info")
        .setI18N(application.i18n).show();
    }
    else
    {
      I18N.set(this.messageElem, "textContent", "base|message.select_target_object");
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
      ObjectUtils.createLink(this.sourceObject, targetObject, this.linkName);
      application.selection.set(this.sourceObject);
      this.panel.visible = false;

      Toast.create("base|message.link_created")
        .setI18N(application.i18n).show();
    }
    else
    {
      MessageDialog.create(this.label, "base|message.select_an_object")
        .setClassName("info")
        .setI18N(application.i18n).show();
    }
  }
}

export { LinkTool };
