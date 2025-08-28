/**
 * IFCDBPanel.js
 *
 * @author realor
 */

import { Panel } from "./Panel.js";
import { Controls } from "./Controls.js";
import { ServiceDialog } from "./ServiceDialog.js";
import { MessageDialog } from "./MessageDialog.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { LoginDialog } from "./LoginDialog.js";
import { Dialog } from "./Dialog.js";
import { TabbedPane } from "./TabbedPane.js";
import { Tree } from "./Tree.js";
import { Toast } from "./Toast.js";
import { Action } from "./Action.js";
import { ContextMenu } from "./ContextMenu.js";
import { WebUtils } from "../utils/WebUtils.js";
import { I18N } from "../i18n/I18N.js";
import { ServiceManager } from "../io/ServiceManager.js";
import { IFCDBService } from "../io/IFCDBService.js";
import * as THREE from "three";

class IFCDBPanel extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "ifcdb_panel";
    this.title = "IFCDB";
    this.position = "left";
    this.group = "ifcdb"; // service group
    this.minimumHeight = 200;

    this.service = null;
    this.inputFile = null;
    this.processing = false;

    this.contextActions = [];

    this.addContextAction(OpenModelAction);
    this.addContextAction(EditModelAction);
    this.addContextAction(DeleteModelAction);
    this.addContextAction(DownloadModelAction);

    this.contextMenu = new ContextMenu(this.application);
    this.contextMenu.actions = this.contextActions;

    // main panel
    this.mainPanelElem = document.createElement("div");
    this.bodyElem.appendChild(this.mainPanelElem);

    // connect panel
    this.bodyElem.classList.add("ifcdb_panel");

    this.connPanelElem = document.createElement("div");
    this.connPanelElem.className = "ifcdb_conn";
    this.mainPanelElem.appendChild(this.connPanelElem);

    this.ifcdbServiceElem = Controls.addSelectField(this.connPanelElem,
      "ifcdbService", "bim|label.ifcdb_service", []);
    this.ifcdbServiceElem.parentElement.className = "ifcdb_field";
    this.ifcdbServiceElem.addEventListener("change", event =>
    {
      let name = this.ifcdbServiceElem.value;
      this.service = this.application.services[this.group][name];
      this.modelTree.clear();
      this.messageElem.textContent = "";
    });

    this.connButtonsElem = document.createElement("div");
    this.connPanelElem.appendChild(this.connButtonsElem);
    this.connButtonsElem.className = "ifcdb_buttons";

    this.addServiceButton = Controls.addButton(this.connButtonsElem,
      "ifcdbAdd", "button.add", () => this.showAddDialog());

    this.editServiceButton = Controls.addButton(this.connButtonsElem,
      "ifcdbEdit", "button.edit", () => this.showEditDialog());

    this.deleteServiceButton = Controls.addButton(this.connButtonsElem,
      "ifcdbDelete", "button.delete", () => this.showDeleteDialog());

    this.tabbedPane = new TabbedPane(this.mainPanelElem);
    this.tabbedPane.paneElem.classList.add("ifcdb_tabs");

    this.modelTabElem =
      this.tabbedPane.addTab("mode", "bim|tab.ifcdb_models");

    this.commandTabElem =
      this.tabbedPane.addTab("command", "bim|tab.ifcdb_command");

    this.commandTabElem.style.textAlign = "left";

    this.modelNameFilterElem = Controls.addTextField(this.modelTabElem,
      "ifc_modelnamefilter", "bim|label.ifcdb_modelname");
    this.modelNameFilterElem.parentElement.className = "ifcdb_field";
    this.modelNameFilterElem.spellcheck = false;
    this.modelNameFilterElem.addEventListener("keyup", (event) =>
    {
      if (event.keyCode === 13) this.searchModels();
    });

    const modelButtonsElem = document.createElement("div");
    modelButtonsElem.className = "ifcdb_buttons";
    this.modelTabElem.appendChild(modelButtonsElem);

    this.searchModelsButton = Controls.addButton(modelButtonsElem, "search_ifc",
      "button.search", () => this.searchModels());

    this.messageElem = document.createElement("div");
    this.modelTabElem.appendChild(this.messageElem);

    this.modelTree = new Tree(this.modelTabElem);
    this.selectedNode = null;
    this.modelTree.getNodeLabel = (value) =>
    {
      if (value.id) // IfcModel
      {
        return `${value.name} (v${value.last_version})`;
      }
      else // IfcModelVersion
      {
        const modelVersion = value;
        const elementCount =
          new Intl.NumberFormat("es-ES").format(modelVersion.element_count);
        return `v${modelVersion.version} - ${modelVersion.creation_date} -
          ${modelVersion.creation_author}  (${elementCount})`;
      }
    };
    this.modelTree.addEventListener("expand",
      event => this.expandVersions(event));
    this.modelTree.addEventListener("click",
      event => this.selectNode(event));
    this.modelTree.addEventListener("dblclick",
      event => this.openModelByDblClick(event));
    this.modelTree.addEventListener("contextmenu", event =>
      {
        const originalEvent = event.originalEvent;
        this.selectNode(event);
        originalEvent.preventDefault();
        this.contextMenu.show(originalEvent);
      });

    this.uploadModelButton = Controls.addButton(modelButtonsElem, "up_ifc",
      "button.upload", () => this.selectFile());

    const commandPanelElem = document.createElement("div");
    commandPanelElem.className = "ifcdb_command";
    this.commandTabElem.appendChild(commandPanelElem);

    const { SQLDialect } = CM["@codemirror/lang-sql"];

    const OrientDBSQL = SQLDialect.define({
      keywords: "after and as asc batch before between breadth_first by " +
        "cluster contains containsall containskey containstext containsvalue " +
        "create default defined delete depth_first desc distinct edge " +
        "fetchplan from in increment insert instanceof into is let like " +
        "limit lock match matches maxdepth nocache not null or parallel " +
        "polymorphic retry return select set skip strategy timeout traverse " +
        "unsafe unwind update upsert vertex wait where while",
      types: "boolean integer short long float double datetime string binary " +
        "embedded embeddedlist embeddedset embeddedmap link linklist " +
        "linkset linkmap byte transient date custom decimal linkbag any",
      specialVar: "$",
      builtin: "@rid @class @version metadata:schema metadata:database " +
        "metadata:storage metadata:indexmanager",
      slashComments: false
    });

    this.queryOptions =
    {
      "language" : "sql",
      "height" : "200px",
      sqlConfig : { dialect : OrientDBSQL }
    };

    this.queryView = Controls.addCodeEditor(commandPanelElem,
      "command", "bim|label.ifcdb_command", "", this.queryOptions);

    const commandButtonsElem = document.createElement("div");
    commandButtonsElem.className = "ifcdb_buttons";
    commandPanelElem.appendChild(commandButtonsElem);

    this.executeStepButton = Controls.addButton(commandButtonsElem, "exec_ifcstep",
      "button.open", () => this.execute("step"));

    this.executeJsonButton = Controls.addButton(commandButtonsElem, "exec_ifcjson",
      "button.run", () => this.execute("json"));

    this.clearExecutionButton = Controls.addButton(commandButtonsElem, "exec_clear",
      "button.clear", () => this.clearExecution());

    this.resultElem = document.createElement("pre");
    this.resultElem.className = "ifcdb_result";
    this.resultElem.tabIndex = -1;
    commandPanelElem.appendChild(this.resultElem);

    // model panel
    this.modelPanelElem = document.createElement("div");
    this.bodyElem.appendChild(this.modelPanelElem);
    this.modelPanelElem.classList.add("hidden");

    const modelHeaderPanelElem = document.createElement("div");
    this.modelPanelElem.appendChild(modelHeaderPanelElem);

    this.backButton = Controls.addButton(modelHeaderPanelElem,
      "backTopics", "button.back", () => this.showPanel("main"));

    this.modelIdElem = Controls.addTextField(this.modelPanelElem,
      "ifc_modelid", "bim|label.ifcdb_modelid", null, "ifcdb_field");
    this.modelIdElem.readOnly = true;

    this.modelNameElem = Controls.addTextField(this.modelPanelElem,
      "ifc_modelname", "bim|label.ifcdb_modelname", null, "ifcdb_field");

    this.modelDescElem = Controls.addTextAreaField(this.modelPanelElem,
      "ifc_modeldesc", "bim|label.ifcdb_modeldesc", null, "flex flex_column p_4");
    this.modelDescElem.rows = 5;

    this.modelReadRoles = Controls.addTagsInput(this.modelPanelElem,
      "ifc_readroles", "bim|label.ifcdb_read_roles", "bim|placeholder.add_tags", [], "p_4");

    this.modelUploadRoles = Controls.addTagsInput(this.modelPanelElem,
      "ifc_uploadroles", "bim|label.ifcdb_upload_roles", "bim|placeholder.add_tags", [], "p_4");

    const modelFooterPanelElem = document.createElement("div");
    modelFooterPanelElem.className = "ifcdb_buttons";
    this.modelPanelElem.appendChild(modelFooterPanelElem);

    this.saveButton = Controls.addButton(modelFooterPanelElem,
      "updateModel", "button.save", () => this.updateModel());

    this.updateButtons();
  }

  addContextAction(contextActionClass)
  {
    this.contextActions.push(new contextActionClass(this));
  }

  onShow()
  {
    this.refreshServices();
  }

  refreshServices()
  {
    const application = this.application;
    const services = application.services[this.group];
    let options = [];

    for (let name in services)
    {
      let service = services[name];
      options.push([service.name, service.description || service.name]);
    }
    Controls.setSelectOptions(this.ifcdbServiceElem, options);

    if (options.length > 0)
    {
      let name = this.ifcdbServiceElem.value;
      this.service = application.services[this.group][name];
    }
    else
    {
      this.service = null;
    }
    let service = this.service;
    this.addServiceButton.style.display = "";
    this.editServiceButton.style.display = service ? "" : "none";
    this.deleteServiceButton.style.display = service ? "" : "none";
  }

  showAddDialog()
  {
    let serviceTypes = ServiceManager.getTypesOf(IFCDBService);
    let dialog = new ServiceDialog("Add IFCDB service", serviceTypes);
    dialog.services = this.application.services[this.group];

    dialog.serviceTypeSelect.disabled = true;
    dialog.setI18N(this.application.i18n);
    dialog.onSave = (serviceType, parameters) =>
    {
      const service = new ServiceManager.classes[serviceType];
      service.setParameters(parameters);
      this.application.addService(service, this.group);
      this.refreshServices();
      this.service = service;
      this.ifcdbServiceElem.value = service.name;
    };
    dialog.show();
  }

  showEditDialog()
  {
    if (this.service === null) return;

    const service = this.service;
    let serviceTypes = ServiceManager.getTypesOf(IFCDBService);
    let dialog = new ServiceDialog("Edit IFCDB service",
      serviceTypes, service.constructor.name, service);
    dialog.serviceTypeSelect.disabled = true;
    dialog.setI18N(this.application.i18n);
    dialog.nameElem.readOnly = true;
    dialog.onSave = (serviceType, parameters) =>
    {
      service.setParameters(parameters);
      this.application.addService(service, this.group);
      this.refreshServices();
    };
    dialog.show();
  }

  showDeleteDialog()
  {
    const application = this.application;
    let name = this.ifcdbServiceElem.value;
    if (name)
    {
      ConfirmDialog.create("bim|title.delete_ifcdb_service",
        "bim|question.delete_ifcdb_service", name)
        .setAction(() =>
        {
          let service = application.services[this.group][name];
          application.removeService(service, this.group);
          this.refreshServices();
        })
       .setAcceptLabel("button.delete")
       .setI18N(application.i18n).show();
    }
  }

  async searchModels()
  {
    if (this.processing) return;

    try
    {
      this.showProgressBar("Searching models...");

      const modelTree = this.modelTree;
      modelTree.clear();
      this.messageElem.textContent = "";
      this.selectedNode = null;
      this.updateButtons();

      let odataFilter = null;
      const modelNameFilterElem = this.modelNameFilterElem;
      let modelName = modelNameFilterElem.value;
      if (modelName)
      {
        let pattern = modelName.toUpperCase().replace(/'/g, "''");
        odataFilter = `contains(toupper(name), '${pattern}')`;
      }
      let odataOrderBy = "name";

      const models = await this.service.getModels(odataFilter, odataOrderBy);
      if (models.length === 0)
      {
        I18N.set(this.messageElem, "textContent", "bim|message.no_model_found");
        this.application.i18n.update(this.messageElem);
      }
      else
      {
        for (let model of models)
        {
          modelTree.addNode(model, null, "IfcProject", true);
        }
      }
    }
    catch (ex)
    {
      this.handleError(ex, () => this.searchModels());
    }
    finally
    {
      this.hideProgressBar();
    }
  }

  async execute(format = "step")
  {
    if (this.processing) return;

    try
    {
      const sql = this.queryView.state.doc.toString();
      const command = {
        "language" : "sql",
        "query" : sql,
        "outputFormat" : format
      };

      this.showProgressBar("Executing command...");
      const data = await this.service.execute(command);
      if (format === "json")
      {
        this.resultElem.innerHTML = "";
        this.resultElem.textContent = JSON.stringify(JSON.parse(data), null, 2);
      }
      else
      {
        this.loadModel(data);
      }
    }
    catch (ex)
    {
      this.handleError(ex, () => this.execute(format));
    }
    finally
    {
      this.hideProgressBar();
    }
  }

  selectNode(event)
  {
    event.originalEvent.preventDefault();
    const node = event.node;
    if (node.value instanceof HTMLElement) return;

    if (this.selectedNode)
    {
      this.selectedNode.removeClass("selected");
    }
    this.selectedNode = node;
    node.addClass("selected");
    this.updateButtons();
  }

  openModelByDblClick(event)
  {
    event.originalEvent.preventDefault();
    this.openSelectedModel();
  }

  openSelectedModel()
  {
    const node = this.selectedNode;
    if (node.value.id)
    {
      const modelId = node.value.id;
      this.openModel(modelId, 0);
    }
    else
    {
      const version = node.value.version;
      const modelId = node.parent.value.id;
      this.openModel(modelId, version);
    }
  }

  downloadSelectedModel()
  {
    const node = this.selectedNode;
    if (node.value.id)
    {
      const modelId = node.value.id;
      const filename = node.value.name.replace(/ /g, "_") + ".ifc";
      this.downloadModel(modelId, 0, filename);
    }
    else
    {
      const parentNode = node.parent;
      const version = node.value.version;
      const modelId = parentNode.value.id;
      const filename = parentNode.value.name.replace(/ /g, "_") +
        "-v" + version + ".ifc";
      this.downloadModel(modelId, version, filename);
    }
  }

  deleteSelectedModel()
  {
    const application = this.application;
    const node = this.selectedNode;

    if (node.value.id)
    {
      const model = node.value;

      ConfirmDialog.create("bim|title.delete_ifcdb_model",
        "bim|question.delete_ifcdb_model", model.name)
        .setAction(() =>
        {
          const modelId = model.id;
          this.deleteModel(modelId, 0);
        })
        .setAcceptLabel("button.delete")
        .setI18N(application.i18n).show();
    }
    else
    {
      const model = node.parent.value;
      const version = node.value.version;

      ConfirmDialog.create("bim|title.delete_ifcdb_model",
        "bim|question.delete_ifcdb_model", model.name + " - v" + version)
        .setAction(() =>
        {
          const modelId = model.id;
          this.deleteModel(modelId, version);
        })
        .setAcceptLabel("button.delete")
        .setI18N(application.i18n).show();
    }
  }

  async uploadModel(data)
  {
    if (this.processing) return;

    try
    {
      this.showProgressBar("Uploading model...");
      const response = await this.service.uploadModel(data);
      Toast.create("bim|message.model_saved")
       .setI18N(this.application.i18n).show();
    }
    catch (ex)
    {
      this.handleError(ex, () => this.uploadModel(data));
    }
    finally
    {
      this.hideProgressBar();
    }
    this.searchModels();
  }

  async openModel(modelId, version = 0)
  {
    if (this.processing) return;

    try
    {
      this.showProgressBar("Downloading model...");
      const data = await this.service.downloadModel(modelId, version);
      this.loadModel(data);
    }
    catch (ex)
    {
      this.handleError(ex, () => this.openModel(modelId, version));
    }
    finally
    {
      this.hideProgressBar();
    }
  }

  async downloadModel(modelId, version = 0, filename)
  {
    try
    {
      this.showProgressBar("Downloading model...");
      const data = await this.service.downloadModel(modelId, version);
      WebUtils.downloadFile(data, filename, "application/x-step");
    }
    catch (ex)
    {
      this.handleError(ex, () => this.downloadModel(modelId, version, filename));
    }
    finally
    {
      this.hideProgressBar();
    }
  }

  async deleteModel(modelId, version = 0)
  {
    if (this.processing) return;

    try
    {
      this.showProgressBar("Deleting model...");
      const response = await this.service.deleteModel(modelId, version);
      Toast.create("bim|message.model_deleted")
       .setI18N(this.application.i18n).show();
    }
    catch (ex)
    {
      this.handleError(ex, () => this.deleteModel(modelId, version));
    }
    finally
    {
      this.hideProgressBar();
    }
    this.searchModels();
  }

  async expandVersions(event)
  {
    const node = event.node;
    if (this.processing || node.hasChildren()) return;

    try
    {
      const modelId = node.value.id;
      this.showProgressBar("Obtaining model versions...");
      const modelVersions = await this.service.getModelVersions(modelId);
      modelVersions.reverse();
      for (let modelVersion of modelVersions)
      {
        node.addNode(modelVersion, null, "IfcModelVersion");
      }
    }
    catch (ex)
    {
      this.handleError(ex, () => this.expandVersions(event));
    }
    finally
    {
      this.hideProgressBar();
    }
  }

  async updateModel()
  {
    const model = {
      id : this.modelIdElem.value,
      name : this.modelNameElem.value,
      description : this.modelDescElem.value,
      read_roles : this.modelReadRoles.getTags(),
      upload_roles : this.modelUploadRoles.getTags()
    };

    try
    {
      this.showProgressBar("Updating model...");
      const response = await this.service.updateModel(model);
      Toast.create("bim|message.model_updated")
       .setI18N(this.application.i18n).show();
      this.showPanel("main");
    }
    catch (ex)
    {
      this.handleError(ex, () => this.updateModel());
    }
    finally
    {
      this.hideProgressBar();
    }
    this.searchModels();
  }

  editSelectedModel()
  {
    const model = this.selectedNode.value;
    this.modelIdElem.value = model.id;
    this.modelNameElem.value = model.name;
    this.modelDescElem.value = model.description;
    if (model.read_roles)
    {
      this.modelReadRoles.setTags(model.read_roles);
    }
    if (model.upload_roles)
    {
      this.modelUploadRoles.setTags(model.upload_roles);
    }
    this.showPanel("model");
  }

  showPanel(panelName)
  {
    if (panelName === "main")
    {
      this.mainPanelElem.classList.remove("hidden");
      this.modelPanelElem.classList.add("hidden");
    }
    else
    {
      this.mainPanelElem.classList.add("hidden");
      this.modelPanelElem.classList.remove("hidden");
    }
  }

  selectFile()
  {
    if (this.processing) return;

    this.removeInputFile();

    let inputFile = document.createElement("input");
    inputFile.type = "file";
    inputFile.id = this.name + "_file";
    inputFile.accept = ".ifc";
    this.inputFile = inputFile;

    document.body.appendChild(inputFile);
    inputFile.addEventListener("change", () => this.uploadFile(), false);
    document.body.addEventListener("focus", () => this.removeInputFile(), true);
    inputFile.click();
  }

  removeInputFile()
  {
    const inputFile = this.inputFile;
    if (inputFile)
    {
      let parentNode = inputFile.parentNode;
      if (parentNode)
      {
        parentNode.removeChild(inputFile);
      }
    }
  }

  uploadFile()
  {
    const application = this.application;
    let files = this.inputFile.files;
    if (files.length > 0)
    {
      let file = files[0];
      let reader = new FileReader();
      reader.onload = evt =>
      {
        let data = evt.target.result;
        this.uploadModel(data);
      };
      reader.readAsText(file);
    }
  }

  loadModel(data)
  {
    const application = this.application;

    let intent =
    {
      url : "file://model.ifc",
      data : data,
      onProgress : data =>
      {
        application.progressBar.visible = true;
        application.progressBar.progress = data.progress;
        application.progressBar.message = data.message;
      },
      onCompleted : object =>
      {
        const container = application.container;
        const baseObject = application.baseObject;
        const aspect = container.clientWidth / container.clientHeight;
        const camera = application.camera;

        object.updateMatrix();
        application.addObject(object, baseObject);

        ObjectUtils.reduceCoordinates(baseObject);
        ObjectUtils.zoomAll(camera, object, aspect);

        application.selection.set(object);
        application.initControllers(object);

        application.notifyObjectsChanged([baseObject, camera], this);
        application.progressBar.visible = false;
      },
      onError : error =>
      {
        console.error(error);
        application.progressBar.visible = false;
        MessageDialog.create("ERROR", error)
          .setClassName("error")
          .setI18N(application.i18n).show();
      },
      manager : this.application.loadingManager,
      units : application.setup.units
    };
    IOManager.load(intent); // async load
  }

  handleError(error, onLogin)
  {
    console.error("ERROR", error);

    this.hideProgressBar();

    if (error.code === 401)
    {
      this.requestCredentials("message.invalid_credentials", onLogin);
    }
    else if (error.code === 403)
    {
      this.requestCredentials("message.action_denied", onLogin);
    }
    else
    {
      let message = error.message;
      MessageDialog.create("ERROR", message)
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
  }

  requestCredentials(message, onLogin, onFailed)
  {
    const loginDialog = new LoginDialog(this.application, message);
    loginDialog.login = (username, password) =>
    {
      this.service.setCredentials(username, password);
      if (onLogin) onLogin();
    };
    loginDialog.onCancel = () =>
    {
      loginDialog.hide();
      if (onFailed) onFailed();
    };
    loginDialog.show();
  }

  showProgressBar(message = "")
  {
    this.application.progressBar.message = message;
    this.application.progressBar.progress = undefined;
    this.application.progressBar.visible = true;
    this.processing = true;
    this.updateButtons();
  }

  hideProgressBar()
  {
    this.application.progressBar.visible = false;
    this.processing = false;
    this.updateButtons();
  }

  updateButtons()
  {
    const processing = this.processing;
    this.searchModelsButton.disabled = processing;
    this.uploadModelButton.disabled = processing;
    this.executeStepButton.disabled = processing;
    this.executeJsonButton.disabled = processing;
  }

  clearExecution()
  {
    const queryView = this.queryView;
    queryView.dispatch(
    {
      changes: { from: 0, to: queryView.state.doc.length, insert: "" }
    });
    this.resultElem.innerHTML = "";
  }
}

class OpenModelAction extends Action
{
  constructor(panel)
  {
    super();
    this.panel = panel;
  }

  getLabel()
  {
    return "bim|action.open_model";
  }

  getClassName()
  {
    return "open";
  }

  isEnabled()
  {
    const panel = this.panel;
    return panel.selectedNode !== null;
  }

  perform()
  {
    const panel = this.panel;
    panel.openSelectedModel();
  }
}

class EditModelAction extends Action
{
  constructor(panel)
  {
    super();
    this.panel = panel;
  }

  getLabel()
  {
    return "bim|action.edit_model";
  }

  getClassName()
  {
    return "edit";
  }

  isEnabled()
  {
    const panel = this.panel;
    const node = panel.selectedNode;
    return node && node.value.id !== undefined;
  }

  perform()
  {
    const panel = this.panel;
    panel.editSelectedModel();
  }
}

class DeleteModelAction extends Action
{
  constructor(panel)
  {
    super();
    this.panel = panel;
  }

  getLabel()
  {
    return "bim|action.delete_model";
  }

  getClassName()
  {
    return "delete";
  }

  isEnabled()
  {
    const panel = this.panel;
    return panel.selectedNode !== null;
  }

  perform()
  {
    const panel = this.panel;
    panel.deleteSelectedModel();
  }
}

class DownloadModelAction extends Action
{
  constructor(panel)
  {
    super();
    this.panel = panel;
  }

  getLabel()
  {
    return "bim|action.download_model";
  }

  getClassName()
  {
    return "download";
  }

  isEnabled()
  {
    const panel = this.panel;
    return panel.selectedNode !== null;
  }

  perform()
  {
    const panel = this.panel;
    panel.downloadSelectedModel();
  }
}

export { IFCDBPanel };