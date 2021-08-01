/*
 * CloudExplorerTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { Dialog } from "../ui/Dialog.js";
import { ServiceDialog } from "../ui/ServiceDialog.js";
import { SaveDialog } from "../ui/SaveDialog.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.js";
import { Toast } from "../ui/Toast.js";
import { ServiceManager } from "../io/ServiceManager.js";
import { IOService, IOMetadata, IOResult } from "../io/IOService.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { I18N } from "../i18n/I18N.js";

class CloudExplorerTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "cloud_explorer";
    this.label = "tool.cloud_explorer.label";
    this.help = "tool.cloud_explorer.help";
    this.className = "cloud_explorer";
    this.setOptions(options);

    this.createPanel();

    this.basePath = "";
    this.entryName = "";
    this.entryType = null; // COLLECTION or OBJECT
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");

    this.serviceElem = document.createElement("div");
    this.serviceElem.className = "service_panel";

    this.headerElem = document.createElement("div");
    this.headerElem.className = "header";

    this.homeButtonElem = document.createElement("div");
    this.homeButtonElem.className = "image_button home";
    this.homeButtonElem.setAttribute("role", "button");
    I18N.set(this.homeButtonElem, "title", "button.home");
    I18N.set(this.homeButtonElem, "alt", "button.home");

    this.backButtonElem = document.createElement("div");
    this.backButtonElem.className = "image_button back";
    this.backButtonElem.setAttribute("role", "button");
    I18N.set(this.backButtonElem, "title", "button.back");
    I18N.set(this.backButtonElem, "alt", "button.back");

    this.directoryElem = document.createElement("div");
    this.directoryElem.className = "directory";

    this.entriesElem = document.createElement("ul");
    this.entriesElem.className = "path_entries";

    this.footerElem = document.createElement("div");
    this.footerElem.className = "footer";

    this.buttonsPanelElem = document.createElement("div");
    this.buttonsPanelElem.className = "buttons_panel";

    this.panel.bodyElem.appendChild(this.serviceElem);

    this.serviceElem.appendChild(this.headerElem);
    this.serviceElem.appendChild(this.entriesElem);
    this.serviceElem.appendChild(this.footerElem);

    this.headerElem.appendChild(this.homeButtonElem);
    this.headerElem.appendChild(this.backButtonElem);
    this.headerElem.appendChild(this.directoryElem);

    this.footerElem.appendChild(this.buttonsPanelElem);
    this.showButtonsPanel();

    this.homeButtonElem.addEventListener('click', event => this.goHome());
    this.backButtonElem.addEventListener('click', event => this.goBack());

    this.openButtonElem = document.createElement("button");
    I18N.set(this.openButtonElem, "innerHTML", "button.open");
    this.openButtonElem.addEventListener('click', event => this.openEntry());
    this.buttonsPanelElem.appendChild(this.openButtonElem);

    this.saveButtonElem = document.createElement("button");
    I18N.set(this.saveButtonElem, "innerHTML", "button.save");
    this.saveButtonElem.addEventListener('click', event =>
      this.showSaveDialog());
    this.saveButtonElem.style.display = "none";
    this.buttonsPanelElem.appendChild(this.saveButtonElem);

    this.addButtonElem = document.createElement("button");
    I18N.set(this.addButtonElem, "innerHTML", "button.add");
    this.addButtonElem.addEventListener('click', event =>
      this.showAddDialog());
    this.addButtonElem.style.display = "none";
    this.buttonsPanelElem.appendChild(this.addButtonElem);

    this.editButtonElem = document.createElement("button");
    I18N.set(this.editButtonElem, "innerHTML","button.edit");
    this.editButtonElem.addEventListener('click', event =>
      this.showEditDialog());
    this.editButtonElem.style.display = "none";
    this.buttonsPanelElem.appendChild(this.editButtonElem);

    this.deleteButtonElem = document.createElement("button");
    I18N.set(this.deleteButtonElem, "innerHTML", "button.delete");
    this.deleteButtonElem.addEventListener('click', event =>
      this.showDeleteDialog());
    this.deleteButtonElem.style.display = "none";
    this.buttonsPanelElem.appendChild(this.deleteButtonElem);

    this.folderButtonElem = document.createElement("button");
    I18N.set(this.folderButtonElem, "innerHTML", "button.folder");
    this.folderButtonElem.addEventListener('click', event =>
      this.showFolderDialog());
    this.folderButtonElem.style.display = "none";
    this.buttonsPanelElem.appendChild(this.folderButtonElem);

    this.uploadButtonElem = document.createElement("button");
    I18N.set(this.uploadButtonElem, "innerHTML", "button.upload");
    this.uploadButtonElem.addEventListener('click', event =>
      this.showUploadDialog());
    this.uploadButtonElem.style.display = "none";
    this.buttonsPanelElem.appendChild(this.uploadButtonElem);

    this.downloadButtonElem = document.createElement("button");
    I18N.set(this.downloadButtonElem, "innerHTML", "button.download");
    this.downloadButtonElem.addEventListener('click', event =>
      this.download(this.basePath + "/" + this.entryName));
    this.downloadButtonElem.style.display = "none";
    this.buttonsPanelElem.appendChild(this.downloadButtonElem);
  }

  activate()
  {
    if (this.basePath === "") this.goHome();
    this.panel.visible = true;
  }

  deactivate()
  {
    this.panel.visible = false;
  }

  showSaveDialog()
  {
    let dialog = new SaveDialog("title.save_to_cloud", this.entryName);
    dialog.setI18N(this.application.i18n);
    dialog.onSave = (name, format, onlySelection) =>
    {
      this.entryName = name;
      this.entryType = IOMetadata.OBJECT;
      this.savePath(this.basePath + "/" + name);
    };
    dialog.show();
  }

  showAddDialog()
  {
    const serviceTypes = ServiceManager.getClassesForType("io");
    let dialog = new ServiceDialog("title.add_cloud_service", serviceTypes);
    dialog.setI18N(this.application.i18n);
    dialog.onSave = (serviceType, name, description, url, username, password) =>
    {
      const serviceClass = ServiceManager.classes[serviceType];
      const service = new serviceClass;
      service.name = name;
      service.description = description;
      service.url = url;
      service.username = username;
      service.password = password;
      this.application.addService(service);
      this.showServices();
    };
    dialog.show();
  }

  showEditDialog()
  {
    const service = this.application.services.io[this.entryName];

    const serviceTypes = ServiceManager.getClassesForType("io");
    let dialog = new ServiceDialog("title.edit_cloud_service",
      serviceTypes, service.constructor.type, service.name, service.description,
      service.url, service.username, service.password);
    dialog.setI18N(this.application.i18n);
    dialog.serviceTypeSelect.disabled = true;
    dialog.nameElem.readOnly = true;
    dialog.onSave = (serviceType, name, description, url, username, password) =>
    {
      service.serviceType = serviceType;
      service.description = description;
      service.url = url;
      service.username = username;
      service.password = password;
      this.application.addService(service);
      this.showServices();
    };
    dialog.show();
  }

  showDeleteDialog()
  {
    const application = this.application;
    let name = this.entryName;
    if (this.basePath === "")
    {
      ConfirmDialog.create("title.delete_cloud_service",
        "question.delete_service", name)
        .setAction(() =>
        {
          let service = application.services.io[name];
          application.removeService(service);
          this.entryName = "";
          this.entryType = null;
          this.showServices();
        })
        .setAcceptLabel("button.delete")
        .setI18N(application.i18n).show();
    }
    else
    {
      let question = this.entryType === IOMetadata.OBJECT ?
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
    const application = this.application;
    if (path === "/")
    {
      this.showServices();
    }
    else
    {
      const parts = this.parsePath(path);
      const serviceName = parts[0];
      const servicePath = parts[1];
      // call to service
      const service = application.services.io[serviceName];
      if (service)
      {
        const options = { units : application.units };
        this.showProgressBar();

        service.open(servicePath, options,
          result => this.handleOpenResult(path, result),
          data => this.setProgress(data.progress, data.message));
      }
      else
      {
        MessageDialog.create("ERROR", "message.invalid_service", serviceName)
          .setClassName("error")
          .setI18N(application.i18n).show();
      }
    }
  }

  savePath(path)
  {
    const application = this.application;
    const parts = this.parsePath(path);
    const serviceName = parts[0];
    const servicePath = parts[1];
    // call to service
    const service = application.services.io[serviceName];
    if (service)
    {
      let object = application.selection.object || application.baseObject;

      const options = {};
      this.showProgressBar();
      service.save(object, servicePath, options, result =>
        this.handleSaveResult(path, result));
    }
    else
    {
      MessageDialog.create("ERROR", "message.invalid_service", serviceName)
        .setClassName("error")
        .setI18N(application.i18n).show();
    }
  }

  deletePath(path)
  {
    const application = this.application;
    const parts = this.parsePath(path);
    const serviceName = parts[0];
    const servicePath = parts[1];
    // call to services
    const service = application.services.io[serviceName];
    if (service)
    {
      this.showProgressBar();
      service.remove(servicePath, result =>
        this.handleDeleteResult(path, result));
    }
    else
    {
      MessageDialog.create("ERROR", "message.invalid_service", serviceName)
        .setClassName("error")
        .setI18N(application.i18n).show();
    }
  }

  makeFolder(path)
  {
    const application = this.application;
    const parts = this.parsePath(path);
    const serviceName = parts[0];
    const servicePath = parts[1];
    // call to service
    const service = application.services.io[serviceName];
    if (service)
    {
      this.showProgressBar();
      service.makeCollection(servicePath, result =>
        this.handleMakeFolderResult(path, result));
    }
    else
    {
      MessageDialog.create("ERROR", "message.invalid_service", serviceName)
        .setClassName("error")
        .setI18N(application.i18n).show();
    }
  }

  download(path)
  {
    const application = this.application;
    const parts = this.parsePath(path);
    const serviceName = parts[0];
    const servicePath = parts[1];
    // call to service
    const service = application.services.io[serviceName];
    if (service)
    {
      const options = {};
      this.showProgressBar();

      service.download(servicePath, options,
        result => { this.showButtonsPanel();
          this.handleDownloadResult(result.data); },
        data => this.setProgress(data.progress, data.message));
    }
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
        const parts = this.parsePath(path);
        const serviceName = parts[0];
        const servicePath = parts[1];
        // call to service
        const service = application.services.io[serviceName];
        if (service)
        {
          const options = {};
          this.showProgressBar();
          service.upload(data, servicePath, options, result =>
            {
              this.entryName = file.name;
              this.entryType = IOMetadata.OBJECT;
              this.handleSaveResult(path, result);
            });
        }
        else
        {
          MessageDialog.create("ERROR", "message.invalid_service", serviceName)
            .setClassName("error")
            .setI18N(application.i18n).show();
        }
      };
      reader.readAsText(file);
    }
  }

  handleOpenResult(path, result)
  {
    this.showButtonsPanel();
    if (result.status === IOResult.ERROR)
    {
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
        this.addObject(result.object);
      }
    }
  }

  handleSaveResult(path, result)
  {
    const application = this.application;
    this.showButtonsPanel();
    if (result.status === IOResult.ERROR)
    {
      MessageDialog.create("ERROR", result.message)
        .setClassName("error")
        .setI18N(application.i18n).show();
    }
    else
    {
      Toast.create("message.file_saved")
        .setI18N(application.i18n).show();

      // reload basePath
      this.openPath(this.basePath);
    }
  }

  handleDeleteResult(path, result)
  {
    const application = this.application;
    this.showButtonsPanel();
    if (result.status === IOResult.ERROR)
    {
      MessageDialog.create("ERROR", result.message)
        .setClassName("error").setI18N(application.i18n).show();
    }
    else
    {
      if (this.entryType === IOMetadata.COLLECTION)
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
    if (result.status === IOResult.ERROR)
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

    this.basePath = "";
    const COLLECTION = IOMetadata.COLLECTION;

    this.directoryElem.innerHTML = "/";
    this.entriesElem.innerHTML = "";
    for (let serviceName in application.services.io)
    {
      let service = application.services.io[serviceName];
      let entryElem = document.createElement("li");
      entryElem.className = "entry service";
      entryElem.innerHTML = service.description || service.name;
      entryElem.id = "svc_entry_" + service.name;
      entryElem.addEventListener("click", event =>
        this.onClick(service.name, COLLECTION));
      entryElem.addEventListener("dblclick", event => this.openEntry());
      this.entriesElem.appendChild(entryElem);
    }
    this.hilight();
    this.updateButtons();
  }

  showDirectory(path, result)
  {
    const application = this.application;

    this.basePath = path;
    const OBJECT = IOMetadata.OBJECT;

    if (path.lastIndexOf("/") === 0)
    {
      const serviceName = path.substring(1);
      const service = application.services.io[serviceName];
      this.directoryElem.innerHTML = service.description || service.name;
    }
    else
    {
      this.directoryElem.innerHTML = result.metadata.name;
    }
    let entries = result.entries;
    entries.sort(this.entryComparator);
    this.entriesElem.innerHTML = "";
    for (let i = 0; i < entries.length; i++)
    {
      let entry = entries[i];
      let entryElem = document.createElement("li");
      let className = "entry " +
        (entry.type === OBJECT ? "object" : "collection");
      entryElem.className = className;
      entryElem.id = "svc_entry_" + entry.name;
      entryElem.innerHTML = entry.description;
      entryElem.addEventListener("click", event =>
        this.onClick(entry.name, entry.type));
      entryElem.addEventListener("dblclick", event => this.openEntry());
      this.entriesElem.appendChild(entryElem);
    }
    this.hilight();
    this.updateButtons();
  }

  parsePath(path)
  {
    // path format: /<svc_name>/<path>
    let serviceName, servicePath;
    let subpath = path.substring(1);
    let index = subpath.indexOf("/");
    if (index !== -1)
    {
      serviceName = subpath.substring(0, index);
      servicePath = subpath.substring(index);
    }
    else
    {
      serviceName = subpath;
      servicePath = "/";
    }
    return [serviceName, servicePath];
  }

  hilight()
  {
    const id = "svc_entry_" + (this.entryName || "");
    const entriesElem = this.entriesElem;
    for (let i = 0; i < entriesElem.childNodes.length; i++)
    {
      let childNode = entriesElem.childNodes[i];
      if (childNode.nodeName === "LI")
      {
        if (childNode.id === id)
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
    this.openPath("/");
  };

  goBack()
  {
    this.entryName = "";
    this.entryType = null;
    const index = this.basePath.lastIndexOf("/");
    if (index === 0)
    {
      this.openPath("/");
    }
    else
    {
      this.openPath(this.basePath.substring(0, index));
    }
  }

  onClick(entryName, entryType)
  {
    this.entryName = entryName;
    this.entryType = entryType;
    this.hilight();
    this.updateButtons();
  }

  openEntry()
  {
    this.openPath(this.basePath + "/" + this.entryName);
  }

  updateButtons()
  {
    const entryType = this.entryType;

    if (this.basePath === "") // service list
    {
      this.addButtonElem.style.display = "inline";
      this.saveButtonElem.style.display = "none";
      this.folderButtonElem.style.display = "none";
      this.uploadButtonElem.style.display = "none";
      this.downloadButtonElem.style.display = "none";
      this.openButtonElem.style.display = entryType ? "inline" : "none";
      this.editButtonElem.style.display = entryType ? "inline" : "none";
      this.deleteButtonElem.style.display = entryType ? "inline" : "none";
    }
    else
    {
      this.saveButtonElem.style.display = "inline";
      this.folderButtonElem.style.display = "inline";
      this.uploadButtonElem.style.display = "inline";
      this.addButtonElem.style.display = "none";
      this.editButtonElem.style.display = "none";
      this.openButtonElem.style.display = entryType ? "inline" : "none";
      this.deleteButtonElem.style.display = entryType ? "inline" : "none";
      this.downloadButtonElem.style.display =
        entryType === IOMetadata.OBJECT ? "inline" : "none";
    }
  }

  addObject(object)
  {
    const application = this.application;

    object.updateMatrix();

    application.addObject(object, application.baseObject);
    let container = application.container;
    let aspect = container.clientWidth / container.clientHeight;
    let camera = application.camera;

    object.updateMatrixWorld(true);
    ObjectUtils.zoomAll(camera, object, aspect);

    let changeEvent = {type: "nodeChanged", objects: [camera],
      source : this};
    application.notifyEventListeners("scene", changeEvent);
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
    const COLLECTION = IOMetadata.COLLECTION;
    const OBJECT = IOMetadata.OBJECT;

    if (a.type === COLLECTION && b.type === OBJECT) return -1;
    if (a.type === OBJECT && b.type === COLLECTION) return 1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  }
}

export { CloudExplorerTool };