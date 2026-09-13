/**
 * ShareFileDialog.js
 *
 * @author realor
 */

import { Dialog } from "platform/ui/dialog/Dialog.js";
import { Toast } from "platform/ui/toast/Toast.js";

class ShareFileDialog extends Dialog
{
  constructor()
  {
    super("title.share_file");

    this.setSize(400, 220);
    this.path = "";

    this.bodyElem.classList.add("flex");
    this.bodyElem.classList.add("flex-column");

    this.linkTypeElem = this.addRadioButtons("link_type", "label.share_link_type",
      [["download", "option.share_download"], ["view", "option.share_view"]],
      "download", "flex", () => this.updateLink());

    this.linkField = this.addTextAreaField("share_link", "label.share_link",
      "", "flex flex-column flex-grow-1");
    this.linkField.className = "h-full";
    this.linkField.style.resize = "none";
    this.linkField.readOnly = true;

    this.addButton("copy_link", "button.copy", () => this.copyUrl());
    this.addButton("close", "button.close", () => this.hide());
  }

  setPath(path)
  {
    this.path = path;

    let isViewable = false;
    const index = path.lastIndexOf(".");
    if (index !== -1)
    {
      const type = path.substring(index + 1).toLowerCase();
      const format = IOManager.formats[type];
      console.info(format);
      isViewable = Boolean(format?.loader);
    }

    let viewRadio = this.linkTypeElem.parentElement
      .querySelector("input[value=view]");

    if (viewRadio && !isViewable)
    {
      viewRadio.setAttribute("disabled", true);
      viewRadio.parentElement.style.opacity = "0.5";
    }
  }

  async copyUrl()
  {
    await navigator.clipboard.writeText(this.linkField.value);
    Toast.create("message.link_copied")
      .setI18N(this.i18n).show();
  }

  onShow()
  {
    this.updateLink();
  }

  updateLink()
  {
    const location = window.location;
    const type = this.linkTypeElem.getValue();

    if (type === "download")
    {
      let url = encodeURI(this.path);

      if (url.startsWith("/"))
      {
        const origin = location.origin;
        url = origin + url;
      }
      this.linkField.value = url;
    }
    else // view
    {
      const origin = location.origin;
      const pathname = location.pathname;

      let url = origin + pathname + "?url=" + encodeURI(this.path) +
          "&tool=zoom_all";
      this.linkField.value = url;
    }
  }
}

export { ShareFileDialog };
