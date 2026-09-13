/**
 * EditTextFileAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";
import { TextFileDialog } from "../TextFileDialog.js";

// types with specific editor
const excludedTypes = ["js", "brs", "ids"];

class EditTextFileAction extends FileAction
{
  constructor(fileExplorer, options)
  {
    super(fileExplorer, options);

    if (!fileExplorer.textFileDialog)
    {
      fileExplorer.textFileDialog = new TextFileDialog(fileExplorer);
    }
  }

  isEnabled()
  {
    const fileExplorer = this.fileExplorer;

    const type = fileExplorer.getSelectedFileExtension();
    if (!type || excludedTypes.indexOf(type) !== -1) return false;

    const name = fileExplorer.selectedEntry.name;
    const formatInfo = IOManager.getFormatInfo(name);
    if (!formatInfo) return false;

    return !formatInfo.loader && formatInfo.dataType === "text";
  }

  getLabel()
  {
    return "base|action.edit_text";
  }

  getIconName()
  {
    return "edit";
  }

  perform()
  {
    this.fileExplorer.open((url, result) =>
    {
      this.setContent(url, result.data);
    });
  }

  setContent(url, content)
  {
    const fileExplorer = this.fileExplorer;
    const textFileDialog = fileExplorer.textFileDialog;

    let index = url.lastIndexOf("/");
    let name = url.substring(index + 1);

    const formatInfo = IOManager.getFormatInfo(name);

    textFileDialog.fileName = name;
    textFileDialog.setContent(content, this.getLanguage(formatInfo));
    textFileDialog.show();
  }

  getLanguage(formatInfo)
  {
    const mimeType = formatInfo.mimeType;
    switch (mimeType)
    {
      case "text/javascript":
        return "javascript";
      case "text/html":
        return "html";
      case "text/markdown":
        return "markdown";
      case "text/css":
        return "css";
      case "text/x-yaml":
        return "yaml";
      case "application/json":
        return "json";
      case "image/svg+xml":
      case "application/xml":
        return "xml";
    }
    return null;
  }
}

export { EditTextFileAction };
