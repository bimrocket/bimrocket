/**
 * FileExplorer.js
 *
 * @author realor
 */

import { Panel } from "platform/ui/panel/Panel.js";
import { Controls } from "platform/ui/Controls.js";
import { Action } from "platform/ui/Action.js";
import { ContextMenu, MenuItem } from "platform/ui/menu/Menu.js";
import { ConfirmDialog } from "platform/ui/dialog/ConfirmDialog.js";
import { Toast } from "platform/ui/toast/Toast.js";
import { ServiceManager } from "platform/io/ServiceManager.js";
import { FileService, Metadata, Result, ACL } from "platform/io/FileService.js";
import { IOManager } from "platform/io/IOManager.js";
import { WebUtils } from "platform/utils/WebUtils.js";
import { I18N } from "platform/i18n/I18N.js";
import { FileAction } from "platform/ui/file/FileAction.js";
import { AddServiceAction } from "platform/ui/file/AddServiceAction.js";
import { CreateFolderAction } from "platform/ui/file/CreateFolderAction.js";
import { RenameFileAction } from "platform/ui/file/RenameFileAction.js";
import { DeleteFileAction } from "platform/ui/file/DeleteFileAction.js";
import { ShareFileAction } from "platform/ui/file/ShareFileAction.js";
import { CopyFileAction } from "platform/ui/file/CopyFileAction.js";
import { CutFileAction } from "platform/ui/file/CutFileAction.js";
import { PasteFileAction } from "platform/ui/file/PasteFileAction.js";
import { DownloadFileAction } from "platform/ui/file/DownloadFileAction.js";
import { EditACLAction } from "platform/ui/file/EditACLAction.js";
import { EditServiceAction } from "platform/ui/file/EditServiceAction.js";
import { OpenFolderAction } from "platform/ui/file/OpenFolderAction.js";
import { UploadFileAction } from "platform/ui/file/UploadFileAction.js";
import { ErrorHandler } from "platform/ui/ErrorHandler.js";

class FileExplorer extends Panel
{
  constructor(application, addContextActions = true)
  {
    super(application);
    this.id = "file_explorer";
    this.title = "title.file_explorer";
    this.iconName = "file-explorer";
    this.position = "left";
    this.group = "model"; // service group
    this.minimumHeight = 200;
    this.defaultHeight = 400;
    this.defaultMobileHeight = 300;
    this.priority = 8;

    this.groupData = {

    };

    /** @type {FileService} */
    this.service = null; // current service
    this.basePath = "/";
    this.selectedEntry = null;
    this._nextEntryName = null;
    this._lastClick = 0;
    this._source = null;
    this._isCopy = false;

    this.showFileSize = true;

    this.serviceElem = document.createElement("div");
    this.serviceElem.className = "fileexplorer-panel";

    this.headerElem = document.createElement("div");
    this.headerElem.className = "header";

    this.homeButtonElem = Controls.addIconButton(this.headerElem,
      "home", "button.home", "home", event => this.goHome());

    this.backButtonElem = Controls.addIconButton(this.headerElem,
      "back", "button.back", "arrow-left", event => this.goBack());

    this.directoryElem = document.createElement("div");
    this.directoryElem.className = "directory";

    this.entriesElem = document.createElement("ul");
    this.entriesElem.className = "path-entries";

    this.footerElem = document.createElement("div");
    this.footerElem.className = "footer";

    this.buttonsPanelElem = document.createElement("div");
    this.buttonsPanelElem.className = "buttons-panel";

    this.bodyElem.appendChild(this.serviceElem);

    this.serviceElem.appendChild(this.headerElem);
    this.serviceElem.appendChild(this.entriesElem);
    this.serviceElem.appendChild(this.footerElem);

    this.headerElem.appendChild(this.homeButtonElem);
    this.headerElem.appendChild(this.backButtonElem);
    this.headerElem.appendChild(this.directoryElem);

    this.contextMenu = new ContextMenu(this.application);
    this.contextMenuButton = this.contextMenu.createButton(
      () => !application.progressBar.visible);
    this.contextMenuButton.style.marginLeft = "6px";
    this.contextMenuButton.style.marginRight = "6px";

    this.createContextAction = (contextActionClass, options) =>
    {
      return new contextActionClass(this, options);
    };

    if (addContextActions)
    {
      this.addContextActions();
    }

    this.entriesElem.addEventListener("click", event =>
    {
      this.onClick(event);
    });

    this.entriesElem.addEventListener("contextmenu", event =>
    {
      this.onContextMenu(event);
    });
  }

  activateGroup(group)
  {
    // save current group
    this.groupData[this.group] ||= {};
    this.groupData[this.group].service = this.service;
    this.groupData[this.group].basePath = this.basePath;

    // change group
    this.group = group;
    this.service = this.groupData[group]?.service || null;
    this.basePath = this.groupData[group]?.basePath || "/";

    this.refresh();
  }

  addContextActions()
  {
    const contextMenu = this.contextMenu;
    const action = this.createContextAction;

    contextMenu.addSeparator("default");
    contextMenu.addMenuItem(action(OpenFolderAction));

    contextMenu.addSeparator("edit");

    contextMenu.addSeparator("general");
    contextMenu.addMenuItem(action(RenameFileAction));
    contextMenu.addMenuItem(action(DeleteFileAction));

    contextMenu.addSeparator("copy_cut_paste");
    contextMenu.addMenuItem(action(CopyFileAction));
    contextMenu.addMenuItem(action(CutFileAction));
    contextMenu.addMenuItem(action(PasteFileAction));

    contextMenu.addSeparator("access");
    contextMenu.addMenuItem(action(EditACLAction));
    contextMenu.addMenuItem(action(ShareFileAction));

    contextMenu.addSeparator("upload_download");
    contextMenu.addMenuItem(action(UploadFileAction));
    contextMenu.addMenuItem(action(DownloadFileAction));

    contextMenu.addSeparator("services");
    contextMenu.addMenuItem(action(EditServiceAction));
    contextMenu.addMenuItem(action(AddServiceAction));

    contextMenu.addSeparator("create");
    contextMenu.addMenuItem(action(CreateFolderAction));

    contextMenu.addMenu("menu.file.create");

    contextMenu.addSeparator("save");
  }

  isServiceList()
  {
    return this.service === null;
  }

  isDirectoryList()
  {
    return this.service !== null;
  }

  isEntrySelected()
  {
    return this.selectedEntry !== null;
  }

  isServiceEntrySelected()
  {
    return this.selectedEntry?.type === 0;
  }

  isFileEntrySelected()
  {
    return this.selectedEntry?.type === Metadata.FILE;
  }

  isCollectionEntrySelected()
  {
    return this.selectedEntry?.type === Metadata.COLLECTION;
  }

  getBasePathName()
  {
    const service = this.service;
    const basePath = this.basePath;
    const serviceName = service.description || service.name;

    if (basePath === "/") // service home
    {
      return serviceName;
    }
    else
    {
      return serviceName + basePath;
    }
  }

  getSelectedPath()
  {
    if (this.selectedEntry)
    {
      return this.getAbsolutePath(this.selectedEntry.name);
    }
    return null;
  }

  getSelectedFileExtension()
  {
    if (this.isFileEntrySelected())
    {
      const entryName = this.selectedEntry.name;
      const index = entryName.lastIndexOf(".");
      if (index !== -1)
      {
        return entryName.substring(index + 1).toLowerCase();
      }
    }
    return null;
  }

  goHome()
  {
    this.selectedEntry = null;
    this.service = null;
    this.refreshServices();
  };

  goBack()
  {
    if (this.service === null) return;
    this.selectedEntry = null;
    if (this.basePath === "/")
    {
      this.service = null;
      this.refreshServices();
    }
    else
    {
      const index = this.basePath.lastIndexOf("/");
      if (index > 0)
      {
        this.basePath = this.basePath.substring(0, index);
      }
      else
      {
        this.basePath = "/";
      }
      this.list();
    }
  }

  refresh()
  {
    if (this.service)
    {
      this.list();
    }
    else
    {
      this.refreshServices();
    }
  }

  list(onSuccess)
  {
    this.showProgressBar("Reading directory...");
    this.service.find(this.basePath, null,
      result => this.handleOpenResult("", result, onSuccess),
      data => this.setProgress(data.progress, data.message));
  }

  open(onSuccess)
  {
    const entryName = this.selectedEntry?.name;
    if (!entryName) throw "No entry selected.";

    if (this.service === null)
    {
      this.service = this.application.services[this.group][entryName];
      this.basePath = "/";
      this.list(onSuccess);
    }
    else
    {
      const path = this.getFullPath(entryName);
      if (this.selectedEntry.type === Metadata.COLLECTION)
      {
        this.showProgressBar("Reading directory...");
        this.service.find(path, null,
          result => this.handleOpenResult(entryName, result, onSuccess),
          data => this.setProgress(data.progress, data.message));
      }
      else
      {
        this.showProgressBar("Reading file...");
        this.service.read(path,
          result => this.handleOpenResult(entryName, result, onSuccess),
          data => this.setProgress(data.progress, data.message));
      }
    }
  }

  save(entryName, data, onSuccess)
  {
    this._nextEntryName = entryName;
    const path = this.getFullPath(entryName);
    this.showProgressBar("Saving...");
    this.service.write(path, data,
      result => this.handleSaveResult(entryName, data, result, onSuccess),
      data => this.setProgress(data.progress, data.message));
  }

  remove(onSuccess)
  {
    const entryName = this.selectedEntry?.name;
    if (!entryName) throw "No entry selected.";

    const path = this.getFullPath(entryName);
    this.showProgressBar("Deleting...");
    this.service.remove(path,
      result => this.handleRemoveResult(entryName, result, onSuccess));
  }

  makeFolder(entryName, onSuccess)
  {
    this._nextEntryName = entryName;
    const path = this.getFullPath(entryName);
    this.showProgressBar("Creating folder...");
    this.service.makeCollection(path,
      result => this.handleMakeFolderResult(entryName, result, onSuccess));
  }

  rename(newEntryName, onSuccess)
  {
    const entryName = this.selectedEntry?.name;
    if (!entryName) throw "No entry selected.";

    this._nextEntryName = newEntryName;
    const sourcePath = this.getFullPath(entryName);
    const destinationPath = this.getFullPath(newEntryName);

    this.showProgressBar("Renaming...");
    this.service.move(sourcePath, destinationPath,
      result => this.handleRenameResult(entryName, newEntryName,
        result, onSuccess));
  }

  download(onSuccess)
  {
    const entryName = this.selectedEntry?.name;
    if (!entryName) throw "No entry selected.";

    const path = this.getFullPath(entryName);
    this.showProgressBar("Downloading file...");
    this.service.read(path,
      result => this.handleDownloadResult(entryName, result, onSuccess),
      data => this.setProgress(data.progress));
  }

  upload(file, onSuccess)
  {
    const application = this.application;

    let reader = new FileReader();
    reader.onload = event =>
    {
      const data = event.target.result;
      const path = this.getFullPath(file.name);
      this._nextEntryName = file.name;
      this.showProgressBar("Uploading file...");
      this.service.write(path, data, result =>
      {
        this.handleUploadResult(file, result, onSuccess);
      },
      data => this.setProgress(data.progress));
    };

    let formatInfo = IOManager.getFormatInfo(file.name);
    if (formatInfo?.dataType === "text")
    {
      reader.readAsText(file);
    }
    else
    {
      reader.readAsArrayBuffer(file);
    }
  }

  copy()
  {
    if (this.selectedEntry)
    {
      this._source = {
        service : this.service,
        basePath : this.basePath,
        entryName : this.selectedEntry.name
      };
      this._isCopy = true;
    }
    this.highlight();
  }

  cut()
  {
    if (this.selectedEntry)
    {
      this._source = {
        service : this.service,
        basePath : this.basePath,
        entryName : this.selectedEntry.name
      };
      this._isCopy = false;
    }
    this.highlight();
  }

  isPasteEnabled()
  {
    return this._source !== null;
  }

  paste(onSuccess)
  {
    const service = this._source.service;
    const sourceBasePath = this._source.basePath;
    const sourceEntryName = this._source.entryName;

    if (service === this.service)
    {
      if (sourceBasePath === this.basePath)
      {
        if (this._isCopy)
        {
          const targetEntryName = this.getCopyEntryName(sourceEntryName);
          const sourcePath = sourceBasePath + "/" + sourceEntryName;
          const destinationPath = this.basePath + "/" + targetEntryName;
          this.showProgressBar("Copying file...");
          this.service.copy(sourcePath, destinationPath, result =>
            this.handlePasteResult(targetEntryName, result, onSuccess));
        }
        else
        {
          // cancel paste
          this._source = null;
          this.highlight();
        }
      }
      else // paste to other folder
      {
        const sourcePath = sourceBasePath + "/" + sourceEntryName;
        const destinationPath = this.basePath + "/" + sourceEntryName;

        if (this._isCopy)
        {
          this.showProgressBar("Copying file...");
          this.service.copy(sourcePath, destinationPath, result =>
            this.handlePasteResult(sourceEntryName, result, onSuccess));
        }
        else
        {
          this.showProgressBar("Moving file...");
          this.service.move(sourcePath, destinationPath, result =>
            this.handlePasteResult(sourceEntryName, result, onSuccess));
        }
      }
    }
  }

  async confirmPaste(onSuccess)
  {
    const source = this._source;
    if (source.basePath === this.basePath)
    {
      this.paste(onSuccess);
    }
    else if (await this.confirmSave(source.entryName))
    {
      this.paste(onSuccess);
    }
  }

  confirmSave(entryName)
  {
    return new Promise(async resolve =>
    {
      const exists = await this.exists(entryName);
      if (exists)
      {
        ConfirmDialog.create("title.overwrite", "question.overwrite_file", entryName)
          .setAcceptLabel("button.yes")
          .setCancelLabel("button.no")
          .setAcceptAction(() => resolve(true))
          .setCancelAction(() => resolve(false))
          .setI18N(this.application.i18n)
          .show();
      }
      else resolve(true);
    });
  }

  getCopyEntryName(sourceEntryName)
  {
    const suffix = "_copy";
    const index = sourceEntryName.lastIndexOf(".");
    if (index === -1)
    {
      return sourceEntryName + suffix;
    }
    else
    {
      return sourceEntryName.substring(0, index) + suffix +
             sourceEntryName.substring(index);
    }
  }

  exists(entryName, onSuccess)
  {
    return new Promise(resolve =>
    {
      const path = this.getFullPath(entryName);
      this.service.find(path, { depth : "0" }, result =>
      {
        const exists = result.status === Result.OK;
        resolve(exists);

        onSuccess?.(exists);
      });
    });
  }

  handleOpenResult(entryName, result, onSuccess)
  {
    this.hideProgressBar();

    if (result.status === Result.OK)
    {
      if (result.metadata.type === Metadata.COLLECTION)
      {
        this.selectedEntry = null;
        this.showDirectory(entryName, result);
      }

      onSuccess?.(this.getAbsolutePath(entryName), result);
    }
    else
    {
      this.handleError(result.error, false,
        () => {
                if (entryName === "") this.list(onSuccess);
                else this.open(onSuccess);
              },
        () => { if (entryName === "") this.service = null; });
    }
  }

  handleSaveResult(entryName, data, result, onSuccess)
  {
    const application = this.application;
    this.hideProgressBar();

    if (result.status === Result.OK)
    {
      Toast.create("message.file_saved")
        .setI18N(application.i18n).show();

      this.selectedEntry = null;

      onSuccess?.(this.getAbsolutePath(entryName), result);

      this.list();
    }
    else
    {
      this.handleError(result.error, true,
        () => this.save(entryName, data, onSuccess));
    }
  }

  handleRemoveResult(entryName, result, onSuccess)
  {
    const application = this.application;
    this.hideProgressBar();

    if (result.status === Result.OK)
    {
      if (this.selectedEntry.type === Metadata.COLLECTION)
      {
        Toast.create("message.folder_deleted")
          .setI18N(application.i18n).show();
      }
      else
      {
        Toast.create("message.file_deleted")
          .setI18N(application.i18n).show();
      }
      this.selectedEntry = null;

      onSuccess?.(this.getAbsolutePath(entryName), result);

      this.list();

      this._source = null;
    }
    else
    {
      this.handleError(result.error, true, () => this.remove(onSuccess));
    }
  }

  handleMakeFolderResult(entryName, result, onSuccess)
  {
    const application = this.application;
    this.hideProgressBar();

    if (result.status === Result.OK)
    {
      onSuccess?.(this.getAbsolutePath(entryName), result);

      Toast.create("message.folder_created")
        .setI18N(application.i18n).show();

      this.selectedEntry = null;

      this.list();
    }
    else
    {
      this.handleError(result.error, true,
        () => this.makeFolder(entryName, onSuccess));
    }
  }

  handleRenameResult(entryName, newEntryName, result, onSuccess)
  {
    const application = this.application;
    this.hideProgressBar();

    if (result.status === Result.OK)
    {
      onSuccess?.(this.getAbsolutePath(entryName), result);

      Toast.create("message.renaming_completed")
        .setI18N(application.i18n).show();

      this.selectedEntry = null;

      this.list();
    }
    else
    {
      this.handleError(result.error, true,
        () => this.rename(newEntryName, onSuccess));
    }
  }

  handleDownloadResult(entryName, result, onSuccess)
  {
    this.hideProgressBar();

    if (result.status === Result.OK)
    {
      onSuccess?.(this.getAbsolutePath(entryName), result);

      const data = result.data;
      WebUtils.downloadFile(data, entryName);
    }
    else
    {
      this.handleError(result.error, false, () => this.download(onSuccess));
    }
  }

  handleUploadResult(file, result, onSuccess)
  {
    const application = this.application;
    this.hideProgressBar();

    if (result.status === Result.OK)
    {
      onSuccess?.(this.getAbsolutePath(file.name), result);

      Toast.create("message.file_saved").setI18N(application.i18n).show();

      this.list();
    }
    else
    {
      this.handleError(result.error, true, () => this.upload(file, onSuccess));
    }
  }

  handlePasteResult(entryName, result, onSuccess)
  {
    const application = this.application;
    this.hideProgressBar();

    if (result.status === Result.OK)
    {
      onSuccess?.(this.getAbsolutePath(entryName), result);

      const message = this._isCopy ?
        "message.copy_completed": "message.move_completed";

      Toast.create(message).setI18N(application.i18n).show();

      this._nextEntryName = entryName;
      this.list();
      this._source = null;
    }
    else
    {
      this.handleError(result.error, true, () => this.paste(onSuccess));
    }
  }

  refreshServices()
  {
    const application = this.application;

    this.basePath = "/";
    const COLLECTION = Metadata.COLLECTION;

    this.directoryElem.textContent = "/";
    this.entriesElem.innerHTML = "";
    let firstNameElem = null;
    for (let serviceName in application.services[this.group])
    {
      let service = application.services[this.group][serviceName];
      let entryElem = document.createElement("li");
      entryElem.className = "entry service";
      entryElem.entry = new Metadata(service.name, service.description, 0);
      let nameElem = document.createElement("div");
      nameElem.tabIndex = "0";
      nameElem.textContent = service.description || service.name;
      entryElem.appendChild(nameElem);
      if (firstNameElem === null) firstNameElem = nameElem;
      this.entriesElem.appendChild(entryElem);
    }
    this.addLastEntry();
    this.highlight();
    if (firstNameElem) firstNameElem.focus();
  }

  showDirectory(entryName, result)
  {
    const application = this.application;

    this.basePath = this.getFullPath(entryName);
    const FILE = Metadata.FILE;
    this.directoryElem.textContent = this.getBasePathName();
    let entries = result.entries || [];
    entries.sort(this.entryComparator);
    this.entriesElem.innerHTML = "";
    let firstNameElem = null;
    for (let entry of entries)
    {
      let entryElem = document.createElement("li");
      entryElem.classList.add("entry");
      if (entry.type === FILE)
      {
        entryElem.classList.add("file");
        let formatInfo = IOManager.getFormatInfo(entry.name);
        if (formatInfo?.icon)
        {
          entryElem.classList.add(formatInfo.icon);
        }
      }
      else
      {
        entryElem.classList.add("collection");
      }
      entryElem.entry = entry;
      let nameElem = document.createElement("div");
      nameElem.tabIndex = "0";
      let label = entry.description;
      nameElem.textContent = label;
      const size = entry.size;
      if (entry.type === FILE && this.showFileSize)
      {
        const sizeElem = document.createElement("span");
        sizeElem.className = "size";
        let sizeText = "(";
        if (size > 1000000) sizeText += (size / 1000000).toFixed(0) + " Mb";
        else if (size > 1000) sizeText += (size / 1000).toFixed(0) + " Kb";
        else sizeText += (size + " bytes");
        sizeText += ")";
        sizeElem.textContent = sizeText;
        nameElem.appendChild(sizeElem);
      }
      entryElem.appendChild(nameElem);
      if (firstNameElem === null) firstNameElem = nameElem;
      this.entriesElem.appendChild(entryElem);
      if (entry.name === this._nextEntryName)
      {
        this.selectedEntry = entry;
      }
    }
    this.addLastEntry();

    if (entryName)
    {
      if (firstNameElem) firstNameElem.focus();
    }
    this.highlight(true);
    this._nextEntryName = null;
  }

  highlight(center = false)
  {
    const entriesElem = this.entriesElem;
    const entryName = this.selectedEntry?.name || "";

    if (!entryName)
    {
      this.contextMenuButton.remove();
    }

    for (let childNode of entriesElem.childNodes)
    {
      if (childNode.nodeName === "LI")
      {
        let currentEntryName = childNode.entry?.name;
        if (currentEntryName === entryName)
        {
          childNode.classList.add("selected");
          childNode.focus();
          if (center)
          {
            childNode.scrollIntoView(
            {
              behavior: "smooth",
              block: "center"
            });
          }
          if (this.contextMenuButton.parentElement !== childNode)
          {
            this.contextMenuButton.remove();
            childNode.appendChild(this.contextMenuButton);
            this.application.i18n.update(this.contextMenuButton);
          }
        }
        else
        {
          childNode.classList.remove("selected");
        }

        childNode.classList.remove("cut");
        childNode.classList.remove("copy");

        if (this._source && this._source.basePath === this.basePath &&
                currentEntryName === this._source.entryName)
        {
          childNode.classList.add(this._isCopy ? "copy" : "cut");
        }
      }
    }
  }

  onClick(event)
  {
    event.preventDefault();
    if (this.application.progressBar.visible) return;

    const changed = this.selectEntry(event.target);

    const isEntryClicked = event.target.nodeName === "DIV" ||
      event.target.parentElement?.nodeName === "DIV";

    if (isEntryClicked)
    {
      if (!changed)
      {
        const ellapsed = Date.now() - this._lastClick;

        if (ellapsed < 500)
        {
          this.executeSelectedEntry();
        }
      }
      this._lastClick = Date.now();
    }
  }

  onContextMenu(event)
  {
    event.preventDefault();

    if (this.application.progressBar.visible) return;

    this.selectEntry(event.target);
    this.contextMenu.show(event);
  }

  executeSelectedEntry()
  {
    // double click, execute default action
    for (let menuItem of this.contextMenu.menuItems)
    {
      if (menuItem instanceof MenuItem)
      {
        let action = menuItem.action; // FileAction
        if (action.isEnabled() && action.isDefaultAction?.())
        {
          action.perform();
          break;
        }
      }
    }
  }

  selectEntry(element)
  {
    const prevSelectedEntry = this.selectedEntry;
    this.selectedEntry =
      element.entry ||
      element.parentElement?.entry ||
      element.parentElement?.parentElement?.entry ||
      null;

    if (this.selectedEntry !== prevSelectedEntry)
    {
      this.highlight();
      return true;
    }
    return false;
  }

  addLastEntry()
  {
   // last entry with the contextMenu button
    const application = this.application;
    const contextMenu = this.contextMenu;
    let lastEntryElem = document.createElement("li");
    lastEntryElem.className = "entry last";
    lastEntryElem.entry = null;
    const button = this.contextMenu.createButton(() =>
    {
      if (application.progressBar.visible) return false;

      this.selectedEntry = null;
      this.highlight();
      return true;
    });
    button.style.marginLeft = "3px";
    lastEntryElem.appendChild(button);
    this.application.i18n.update(button);
    this.entriesElem.appendChild(lastEntryElem);
  }

  hideProgressBar()
  {
    this.application.progressBar.visible = false;
  }

  showProgressBar(message = "")
  {
    this.buttonsPanelElem.style.display = "none";
    this.application.progressBar.message = message;
    this.application.progressBar.progress = undefined;
    this.application.progressBar.visible = true;
  }

  setProgress(progress, message)
  {
    this.application.progressBar.progress = progress;
    if (message)
    {
      this.application.progressBar.message = message;
    }
  }

  entryComparator(a, b)
  {
    const COLLECTION = Metadata.COLLECTION;
    const FILE = Metadata.FILE;

    if (a.type === COLLECTION && b.type === FILE) return -1;
    if (a.type === FILE && b.type === COLLECTION) return 1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  }

  handleError(error, isWriteAction, onResolved, onFailed)
  {
    ErrorHandler.handleError(this.application, this.service,
      error, isWriteAction, onResolved, onFailed);
  }

  setServiceParameters(dialog, service, parameters)
  {
    service.setParameters(parameters);
    this.application.addService(service, this.group);
    this.refreshServices();
  }

  getFullPath(name)
  {
    if (name)
    {
      if (this.basePath.endsWith("/")) return this.basePath + name;
      else return this.basePath + "/" + name;
    }
    return this.basePath;
  }

  getAbsolutePath(name)
  {
    return this.service.url + this.getFullPath(name);
  }
};

export { FileExplorer };
