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
import { Toast } from "./Toast.js";
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

    // connect panel

    this.bodyElem.classList.add("ifcdb_panel");

    this.connPanelElem = document.createElement("div");
    this.connPanelElem.className = "ifcdb_conn";
    this.bodyElem.appendChild(this.connPanelElem);

    this.ifcdbServiceElem = Controls.addSelectField(this.connPanelElem,
      "ifcdbService", "bim|label.ifcdb_service", []);
    this.ifcdbServiceElem.parentElement.className = "ifcdb_service";
    this.ifcdbServiceElem.addEventListener("change",
      event => {
        let name = this.ifcdbServiceElem.value;
        this.service = this.application.services[this.group][name];
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

    this.tabbedPane = new TabbedPane(this.bodyElem);
    this.tabbedPane.paneElem.classList.add("ifcdb_tabs");

    this.modelTabElem =
      this.tabbedPane.addTab("mode", "bim|tab.ifcdb_models");

    this.commandTabElem =
      this.tabbedPane.addTab("command", "bim|tab.ifcdb_command");

    this.commandTabElem.style.textAlign = "left";

    this.modelIdElem = Controls.addTextField(this.modelTabElem, "ifc_modelid", "bim|label.ifcdb_modelid");
    this.modelIdElem.parentElement.className = "ifcdb_modelid";
    this.modelIdElem.spellcheck = false;
    this.modelIdElem.addEventListener("keyup", () => this.updateButtons());

    const modelButtonsElem = document.createElement("div");
    modelButtonsElem.className = "ifcdb_buttons";
    this.modelTabElem.appendChild(modelButtonsElem);

    this.getModelButton = Controls.addButton(modelButtonsElem, "get_ifc",
      "button.open", () => this.getModel());

    this.putModelButton = Controls.addButton(modelButtonsElem, "put_ifc",
      "button.upload", () => this.selectFile());

    this.deleteModelButton = Controls.addButton(modelButtonsElem, "del_ifc",
      "button.delete", () => this.deleteModel());

    const commandPanelElem = document.createElement("div");
    commandPanelElem.className = "ifcdb_command";
    this.commandTabElem.appendChild(commandPanelElem);

    const { SQLDialect } = CM["@codemirror/lang-sql"];

    const OrientDB = SQLDialect.define({
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

    const sqlConfig = { dialect : OrientDB };

    this.extensionsView = Controls.addCodeEditor(commandPanelElem,
      "command", "bim|label.ifcdb_command", "",
      { "language" : "sql", "height" : "200px", sqlConfig : sqlConfig });

    const commandButtonsElem = document.createElement("div");
    commandButtonsElem.className = "ifcdb_buttons";
    commandPanelElem.appendChild(commandButtonsElem);

    this.executeButton = Controls.addButton(commandButtonsElem, "exec_ifcstep",
      "button.open", () => this.execute("step"));

    this.executeButton = Controls.addButton(commandButtonsElem, "exec_ifcjson",
      "button.run", () => this.execute("json"));

    this.resultElem = document.createElement("pre");
    this.resultElem.className = "ifcdb_result";
    this.resultElem.tabIndex = -1;
    commandPanelElem.appendChild(this.resultElem);
  }

  onShow()
  {
    this.updateServices();
    this.updateButtons();
  }

  updateServices()
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

  updateButtons()
  {
    const disabled = this.modelIdElem.value.trim().length === 0;
    this.getModelButton.disabled = disabled;
    this.putModelButton.disabled = disabled;
    this.deleteModelButton.disabled = disabled;
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
      this.updateServices();
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
      serviceTypes, service.constructor.name, service.getParameters());
    dialog.serviceTypeSelect.disabled = true;
    dialog.setI18N(this.application.i18n);
    dialog.nameElem.readOnly = true;
    dialog.onSave = (serviceType, parameters) =>
    {
      service.setParameters(parameters);
      this.application.addService(service, this.group);
      this.updateServices();
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
          this.updateServices();
        })
       .setAcceptLabel("button.delete")
       .setI18N(application.i18n).show();
    }
  }

  async execute(format = "step")
  {
    try
    {
      const sql = this.extensionsView.state.doc.toString();
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

  async getModel()
  {
    try
    {
      this.showProgressBar("Downloading model...");
      const modelId = this.modelIdElem.value.trim();
      const data = await this.service.getModel(modelId);
      this.loadModel(data);
    }
    catch (ex)
    {
      this.handleError(ex, () => this.getModel());
    }
    finally
    {
      this.hideProgressBar();
    }
  }

  async putModel(data)
  {
    try
    {
      this.showProgressBar("Uploading model...");
      const modelId = this.modelIdElem.value.trim();
      const response = await this.service.putModel(modelId, data);
      console.info(response);
    }
    catch (ex)
    {
      this.handleError(ex, () => this.putModel());
    }
    finally
    {
      this.hideProgressBar();
    }
  }

  async deleteModel()
  {
    try
    {
      this.showProgressBar("Deleting model...");
      const modelId = this.modelIdElem.value.trim();
      const response = await this.service.deleteModel(modelId);
      console.info(response);
    }
    catch (ex)
    {
      this.handleError(ex, () => this.deleteModel());
    }
    finally
    {
      this.hideProgressBar();
    }
  }

  selectFile()
  {
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
        this.putModel(data);
      };
      reader.readAsText(file);
    }
  }

  loadModel(data)
  {
    const application = this.application;
    const modelId = this.modelIdElem.value;

    let intent =
    {
      url : "file://" + modelId + ".ifc",
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
      this.service.username = username;
      this.service.password = password;
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
  }

  hideProgressBar()
  {
    this.application.progressBar.visible = false;
  }
}

export { IFCDBPanel };