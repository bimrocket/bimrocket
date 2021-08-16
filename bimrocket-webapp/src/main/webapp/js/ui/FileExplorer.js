/**
 * FileExplorer.js
 *
 * @author realor
 */

import { Panel } from "./Panel.js";
import { Controls } from "./Controls.js";
import { Dialog } from "./Dialog.js";
import { ServiceDialog } from "./ServiceDialog.js";
import { MessageDialog } from "./MessageDialog.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { Toast } from "./Toast.js";
import { ServiceManager } from "../io/ServiceManager.js";
import { FileService, Metadata, Result } from "../io/FileService.js";
import { I18N } from "../i18n/I18N.js";

class FileExplorer extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "file_explorer";
    this.title = "title.file_explorer";
    this.position = "left";
    this.group = "model"; // service group

    this.service = null; // current service
    this.basePath = "/";
    this.entryName = "";
    this.entryType = null; // COLLECTION or FILE

    this.serviceElem = document.createElement("div");
    this.serviceElem.className = "service_panel";

    this.headerElem = document.createElement("div");
    this.headerElem.className = "header";

    this.homeButtonElem = Controls.addImageButton(this.headerElem,
      "home", "button.home", event => this.goHome(), "image_button home");

    this.backButtonElem = Controls.addImageButton(this.headerElem,
      "home", "button.back", event => this.goBack(), "image_button back");

    this.directoryElem = document.createElement("div");
    this.directoryElem.className = "directory";

    this.entriesElem = document.createElement("ul");
    this.entriesElem.className = "path_entries";

    this.footerElem = document.createElement("div");
    this.footerElem.className = "footer";

    this.buttonsPanelElem = document.createElement("div");
    this.buttonsPanelElem.className = "buttons_panel";

    this.bodyElem.appendChild(this.serviceElem);

    this.serviceElem.appendChild(this.headerElem);
    this.serviceElem.appendChild(this.entriesElem);
    this.serviceElem.appendChild(this.footerElem);

    this.headerElem.appendChild(this.homeButtonElem);
    this.headerElem.appendChild(this.backButtonElem);
    this.headerElem.appendChild(this.directoryElem);

    this.footerElem.appendChild(this.buttonsPanelElem);
    this.showButtonsPanel();

    this.addContextButtons();
  }

  addContextButton(name, label, action, isVisible)
  {
    const buttonElem = Controls.addButton(this.buttonsPanelElem,
      name, label, action);
    buttonElem._isVisible = isVisible;
  }

  addContextButtons()
  {
    const isServiceList = () => this.service === null;
    const isDirectoryList = () => this.service !== null;
    const isEntrySelected = () => this.entryName !== "";

    this.addContextButton("open", "button.open",
      () => this.openEntry(), isEntrySelected);
    this.addContextButton("add", "button.add",
      () => this.showAddDialog(), isServiceList);
    this.addContextButton("edit", "button.edit",
      () => this.showEditDialog(), () => isServiceList() && isEntrySelected());
    this.addContextButton("delete", "button.delete",
      () => this.showDeleteDialog(), isEntrySelected);
    this.addContextButton("folder", "button.folder",
      () => this.showFolderDialog(), isDirectoryList);
    this.addContextButton("upload", "button.upload",
      () => this.showUploadDialog(), isDirectoryList);
    this.addContextButton("download", "button.download",
      () => this.download(this.basePath + "/" + this.entryName),
      () => isDirectoryList() && this.entryType === Metadata.FILE);
  }

  showAddDialog()
  {
    const serviceTypes = ServiceManager.getTypesOf(FileService);
    let dialog = new ServiceDialog("title.add_cloud_service", serviceTypes);
    dialog.setI18N(this.application.i18n);
    dialog.onSave = (serviceType, name, description, url, username, password) =>
    {
      const service = new ServiceManager.classes[serviceType];
      service.name = name;
      service.description = description;
      service.url = url;
      service.username = username;
      service.password = password;
      this.application.addService(service, this.group);
      this.showServices();
    };
    dialog.show();
  }

  showEditDialog()
  {
    const service = this.application.services[this.group][this.entryName];

    const serviceTypes = ServiceManager.getTypesOf(FileService);
    let dialog = new ServiceDialog("title.edit_cloud_service",
      serviceTypes, service.constructor.type, service.name, service.description,
      service.url, service.username, service.password);
    dialog.setI18N(this.application.i18n);
    dialog.serviceTypeSelect.disabled = true;
    dialog.nameElem.readOnly = true;
    dialog.onSave = (serviceType, name, description, url, username, password) =>
    {
      service.description = description;
      service.url = url;
      service.username = username;
      service.password = password;
      this.application.addService(service, this.group);
      this.showServices();
    };
    dialog.show();
  }

  showDeleteDialog()
  {
    const application = this.application;
    let name = this.entryName;
    if (this.service === null)
    {
      ConfirmDialog.create("title.delete_cloud_service",
        "question.delete_service", name)
        .setAction(() =>
        {
          let service = application.services[this.group][name];
          application.removeService(service, this.group);
          this.entryName = "";
          this.entryType = null;
          this.showServices();
        })
        .setAcceptLabel("button.delete")
        .setI18N(application.i18n).show();
    }
    else
    {
      let question = this.entryType === Metadata.FILE ?
        "question.delete_file" : "question.delete_folder";

      ConfirmDialog.create("title.delete_from_cloud", question, name)
        .setAction(() => this.deletePath(this.basePath + "/" + name))
        .setAcceptLabel("button.delete")
        .setI18N(application.i18n).show();
    }
  }

  showFolderDialog()
  {
    const application = this.application;
    const dialog = new Dialog("title.create_folder_in_cloud");
    dialog.setSize(250, 130);
    dialog.setI18N(application.i18n);
    let elem = dialog.addTextField("folder_name", "label.folder_name");
    dialog.addButton("folder_accept", "button.create", () => dialog.onAccept());
    dialog.addButton("folder_cancel", "button.cancel", () => dialog.onCancel());

    dialog.onAccept = () =>
    {
      this.makeFolder(this.basePath + "/" + elem.value);
      dialog.hide();
    };
    dialog.onCancel = () =>
    {
      dialog.hide();
    };
    dialog.onShow = () =>
    {
      elem.focus();
    };
    dialog.show();
  }

  showUploadDialog()
  {
    let inputFile = document.createElement("input");

    inputFile.type = "file";

    inputFile.addEventListener("change",
      event => this.upload(inputFile.files));
    inputFile.click();
  }

  openPath(path)
  {
    this.showProgressBar();

    this.service.open(path,
      result => this.handleOpenResult(path, result),
      data => this.setProgress(data.progress, data.message));
  }

  deletePath(path)
  {
    this.showProgressBar();
    this.service.remove(path,
      result => this.handleDeleteResult(path, result));
  }

  makeFolder(path)
  {
    this.showProgressBar();
    this.service.makeCollection(path,
      result => this.handleMakeFolderResult(path, result));
  }

  download(path)
  {
    this.showProgressBar();
    this.service.open(path,
      result => this.handleDownloadResult(result.data),
      data => this.setProgress(data.progress, data.message));
  }

  upload(files)
  {
    if (files.length > 0)
    {
      const application = this.application;
      let file = files[0];
      let reader = new FileReader();
      reader.onload = event =>
      {
        const data = event.target.result;
        const path = this.basePath + "/" + file.name;
        this.showProgressBar();
        this.service.save(data, path, result =>
          {
            this.entryName = file.name;
            this.entryType = Metadata.FILE;
            this.handleSaveResult(path, result);
          });
      };
      reader.readAsText(file);
    }
  }

  handleOpenResult(path, result)
  {
    this.showButtonsPanel();
    if (result.status === Result.ERROR)
    {
      if (path === "/") this.service = null;
      MessageDialog.create("ERROR", result.message)
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
    else
    {
      if (result.entries)
      {
        this.entryName = "";
        this.entryType = null;
        this.showDirectory(path, result);
      }
      else
      {
        this.openFile(this.service.url + path, result.data);
      }
    }
  }

  handleDeleteResult(path, result)
  {
    const application = this.application;
    this.showButtonsPanel();
    if (result.status === Result.ERROR)
    {
      MessageDialog.create("ERROR", result.message)
        .setClassName("error").setI18N(application.i18n).show();
    }
    else
    {
      if (this.entryType === Metadata.COLLECTION)
      {
        Toast.create("message.folder_deleted")
          .setI18N(application.i18n).show();
      }
      else
      {
        Toast.create("message.file_deleted")
          .setI18N(application.i18n).show();
      }

      this.entryName = "";
      this.entryType = null;

      // reload basePath
      this.openPath(this.basePath);
    }
  }

  handleMakeFolderResult(path, result)
  {
    const application = this.application;
    this.showButtonsPanel();
    if (result.status === Result.ERROR)
    {
      MessageDialog.create("ERROR", result.message)
        .setClassName("error")
        .setI18N(application.i18n).show();
    }
    else
    {
      Toast.create("message.folder_created")
        .setI18N(application.i18n).show();

      this.entryName = "";
      this.entryType = null;

      // reload basePath
      this.openPath(this.basePath);
    }
  }

  handleDownloadResult(data)
  {
    this.showButtonsPanel();

    if (this.downloadUrl)
    {
      window.URL.revokeObjectURL(this.downloadUrl);
    }
    const blob = new Blob([data], {type : 'application/octet-stream'});
    this.downloadUrl = window.URL.createObjectURL(blob);
    let linkElem = document.createElement("a");
    linkElem.download = this.entryName;
    linkElem.target = "_blank";
    linkElem.href = this.downloadUrl;
    linkElem.style.display = "block";
    linkElem.click();
  }

  showServices()
  {
    const application = this.application;

    this.basePath = "/";
    const COLLECTION = Metadata.COLLECTION;

    this.directoryElem.innerHTML = "/";
    this.entriesElem.innerHTML = "";
    let firstLink = null;
    for (let serviceName in application.services[this.group])
    {
      let service = application.services[this.group][serviceName];
      let entryElem = document.createElement("li");
      entryElem.className = "entry service";
      entryElem.entryName = service.name;
      let linkElem = document.createElement("a");
      linkElem.href = "#";
      linkElem.innerHTML = service.description || service.name;
      linkElem.addEventListener("click",
        event => this.onEntry(service.name, COLLECTION));
      linkElem.addEventListener("dblclick", event => this.openEntry());
      entryElem.appendChild(linkElem);
      if (firstLink === null) firstLink = linkElem;
      this.entriesElem.appendChild(entryElem);
    }
    this.hilight();
    this.updateButtons();
    if (firstLink) firstLink.focus();
  }

  showDirectory(path, result)
  {
    const application = this.application;
    const service = this.service;

    this.basePath = path;
    const FILE = Metadata.FILE;

    if (path === "/") // service home
    {
      this.directoryElem.innerHTML = service.description || service.name;
    }
    else
    {
      this.directoryElem.innerHTML = result.metadata.name;
    }
    let entries = result.entries;
    entries.sort(this.entryComparator);
    this.entriesElem.innerHTML = "";
    let firstLink = null;
    for (let entry of entries)
    {
      let entryElem = document.createElement("li");
      let className = "entry " +
        (entry.type === FILE ? "file" : "collection");
      entryElem.className = className;
      entryElem.entryName = entry.name;
      let linkElem = document.createElement("a");
      linkElem.href= "#";
      linkElem.innerHTML = entry.description;
      linkElem.addEventListener("click", event =>
        this.onEntry(entry.name, entry.type));
      linkElem.addEventListener("dblclick", event => this.openEntry());
      entryElem.appendChild(linkElem);
      if (firstLink === null) firstLink = linkElem;
      this.entriesElem.appendChild(entryElem);
    }
    this.hilight();
    this.updateButtons();
    if (firstLink) firstLink.focus();
  }

  hilight()
  {
    const entriesElem = this.entriesElem;
    for (let i = 0; i < entriesElem.childNodes.length; i++)
    {
      let childNode = entriesElem.childNodes[i];
      if (childNode.nodeName === "LI")
      {
        if (childNode.entryName === this.entryName)
        {
          childNode.classList.add("selected");
        }
        else
        {
          childNode.classList.remove("selected");
        }
      }
    }
  }

  goHome()
  {
    this.entryName = "";
    this.entryType = null;
    this.service = null;
    this.showServices();
  };

  goBack()
  {
    if (this.service === null) return;

    this.entryName = "";
    this.entryType = null;

    if (this.basePath === "/")
    {
      this.service = null;
      this.showServices();
    }
    else
    {
      const index = this.basePath.lastIndexOf("/");
      if (index <= 0)
      {
        this.openPath("/");
      }
      else
      {
        this.openPath(this.basePath.substring(0, index));
      }
    }
  }

  onEntry(entryName, entryType)
  {
    this.entryName = entryName;
    this.entryType = entryType;
    this.hilight();
    this.updateButtons();
    this.buttonsPanelElem.children[0].focus();
  }

  openEntry()
  {
    let path;
    if (this.service === null)
    {
      this.service = this.application.services[this.group][this.entryName];
      path = "/";
    }
    else
    {
      path = this.basePath;
      if (!this.basePath.endsWith("/")) path += "/";
      path += this.entryName;
    }
    this.openPath(path);
  }

  openFile(url, data)
  {
    this.application.progressBar.visible = false;
    this.showButtonsPanel();
  }

  updateButtons()
  {
    const children = this.buttonsPanelElem.children;
    for (let child of children)
    {
      child.style.display = child._isVisible() ? "inline" : "none";
    }
  }

  updateButtons2()
  {
    const entryType = this.entryType;

    if (this.service === null) // service list
    {
      this.addButtonElem.style.display = "inline";
      this.folderButtonElem.style.display = "none";
      this.uploadButtonElem.style.display = "none";
      this.downloadButtonElem.style.display = "none";
      this.openButtonElem.style.display = entryType ? "inline" : "none";
      this.editButtonElem.style.display = entryType ? "inline" : "none";
      this.deleteButtonElem.style.display = entryType ? "inline" : "none";
    }
    else
    {
      this.folderButtonElem.style.display = "inline";
      this.uploadButtonElem.style.display = "inline";
      this.addButtonElem.style.display = "none";
      this.editButtonElem.style.display = "none";
      this.openButtonElem.style.display = entryType ? "inline" : "none";
      this.deleteButtonElem.style.display = entryType ? "inline" : "none";
      this.downloadButtonElem.style.display =
        entryType === Metadata.FILE ? "inline" : "none";
    }
  }

  showButtonsPanel()
  {
    this.buttonsPanelElem.style.display = "block";
    this.application.progressBar.visible = false;
  }

  showProgressBar()
  {
    this.buttonsPanelElem.style.display = "none";
    this.application.progressBar.message = "Reading...";
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
};

export { FileExplorer };
