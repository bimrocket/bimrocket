/*
 * ServerAdminDialog.js
 */

import { Dialog } from "./Dialog.js";
import { Controls } from "./Controls.js";
import { TabbedPane } from "./TabbedPane.js";
import { I18N } from "../i18n/I18N.js";
import { SecurityService } from "../io/SecurityService.js";
import { Environment } from "../Environment.js";
import { MessageDialog } from "./MessageDialog.js";
import { Toast } from "./Toast.js";
import { LoginDialog } from "./LoginDialog.js";

class ServerAdminDialog extends Dialog
{
  constructor(application, options = {})
  {
    super(options.title || "bim|title.admin_service");
    this.application = application;
    this.setI18N(this.application.i18n);
    
    this.setSize(800, 600);
    
    this.service = null;
    this.group = "security";
    this.usersTableElem = null;
    this.toolbar = null;
    this.tableContainer = null;
    this.usersLoaded = false;
    
    this.service = this.application.services[this.group];
  
    const mainContainer = this.createContainer('admin_panel', this.bodyElem);
    const connPanel = this.createContainer('admin_body', mainContainer);
    const mainWrapper = this.createContainer('admin_panel', this.bodyElem);
    const mainPanel = this.createContainer('admin_body', mainWrapper);
  
    this.connPanelElem = connPanel;
    this.mainContainer = mainWrapper;
    this.mainPanelElem = mainPanel;

    this.searchToolbar= null;

    this.filterContainer = null;
    this.filterTitle = null;
  
    this.apiServiceElem = Controls.addTextField(connPanel,
      "securityService", "bim|label.admin_service", "securityServiceUrl");
    this.apiServiceElem.value = `${Environment.SERVER_URL}/api`;
    this.apiServiceElem.placeholder = "https://bim.santfeliu.cat/api";
  
    const buttonsContainer = this.createContainer('admin_buttons', connPanel);
    this.connButtonsElem = buttonsContainer;
  
    this.connectButton = Controls.addButton(buttonsContainer, 
      "adminConnect", "button.connect", () => {
        this.updateSecurityService();
        this.searchUsers();
      });
  
    // hidden initially
    this.detailPanelElem = this.createContainer('admin_panel', mainContainer);
    this.detailPanelElem.style.display = "none";
  
    this.tabbedPane = new TabbedPane(mainContainer);
    this.tabbedPane.addClassName("h_full");
    this.tabbedPane.paneElem.style.display = "none";
    const usersTab = this.tabbedPane.addTab("users", "bim|label.users");
    
    this.createUsersTab(usersTab);
  
    const rolesTab =
      this.tabbedPane.addTab("roles", "bim|label.roles_management");
      rolesTab.textContent = "Roles feature coming soon";
    const configTab =
      this.tabbedPane.addTab("config", "bim|label.configuration");
      configTab.textContent = "Settings coming soon";
  
    this.createUserForm();
    
    this.addButton("close", "button.close", () => this.hide());
  
    if (this.usersLoaded && this.users) 
    {
      this.populateUsers(this.users);
      if (this.tabbedPane && this.tabbedPane.paneElem) 
      {
        this.tabbedPane.paneElem.style.display = "block";
      }
    }
  }

  updateSecurityService() 
  {
    const urlEntered = this.apiServiceElem.value.trim();

    if (!this.application.services[this.group]) 
    {
      this.application.services[this.group] = {};
    }

    this.service = new SecurityService({
      name: "security",
      url: urlEntered,
      credentialsAlias: Environment.SERVER_ALIAS
    });
    
    this.application.services[this.group] = this.service;
  }

  createUsersTab(container) 
  {

    if (this.usersTabContainer && this.usersTabContainer.parentNode) 
    {
      this.usersTabContainer.parentNode.removeChild(this.usersTabContainer);
      this.usersTabContainer = null;
    }

    const tabContent = document.createElement("div");
    tabContent.className = "users_tab_content";
    container.appendChild(tabContent);

    this.toolbar = document.createElement("div");
    this.toolbar.className = "admin_toolbar";
    this.toolbar.style.display = "none"; // hidden initially
    tabContent.appendChild(this.toolbar);

    this.newUserButton = Controls.addButton(this.toolbar,
      "newUser", "bim|button.new_user", () => {
        this.showUser();
        this.searchToolbar.style.display = "none";
        console.log(this.searchToolbar)
    });

    this.searchToolbar = document.createElement("div");
    this.searchToolbar.className = "search_panel";
    tabContent.appendChild(this.searchToolbar);

    this.searchBody = document.createElement("div");
    this.searchBody.className = "admin_body";
    this.searchToolbar.appendChild(this.searchBody);
    
    this.filterTitle = document.createElement("div");
    this.filterTitle.style.fontWeight = "bold";
    this.filterTitle.style.padding = "2px";
    I18N.set(this.filterTitle, "textContent", "bim|label.search_users");
    this.searchBody.appendChild(this.filterTitle);

    this.idFilterFieldElem = Controls.addTextField(this.searchBody,
      "user_idFilter", "bim|label.search_id");
    
    this.nameFilterFieldElem = Controls.addTextField(this.searchBody,
      "user_nameFilter", "bim|label.search_name");
    
    this.buttonContainer = document.createElement("div");
    this.buttonContainer.style.display = "flex";
    this.buttonContainer.style.justifyContent = "center";
    this.searchBody.appendChild(this.buttonContainer);
    
    
    this.searchUsersButton = Controls.addButton(this.buttonContainer,
      "searchTopics", "button.search", () => this.searchUsers());
    this.searchUsersButton.disabled = true;
      
    this.clearButton= Controls.addButton(this.buttonContainer,
      "clearFilters", "button.clear", () => this.clearFilters());
    
    this.tableContainer = document.createElement("div");
    this.tableContainer.className = "table_container";
    tabContent.appendChild(this.tableContainer);

    this.usersTabContainer = tabContent;

    const updateSearchButton = () => {
      const hasId = this.idFilterFieldElem.value.trim() !== "";
      const hasName = this.nameFilterFieldElem.value.trim() !== "";
      this.searchUsersButton.disabled = !(hasId || hasName);
    };
  
    this.idFilterFieldElem.addEventListener("input", updateSearchButton);
    this.nameFilterFieldElem.addEventListener("input", updateSearchButton);
  }
  
  clearFilters = () => {
    this.searchUsersButton.disabled = true;
    this.idFilterFieldElem.value = "";
    this.nameFilterFieldElem.value = "";

    this.searchUsers();
  };

  populateUsers(users) 
  {
    this.allUsers = users;

    if (!this.tableContainer) 
    {
      return;
    }
    this.tableContainer.style.display = "block";

    if (this.usersTableElem) 
    {
      this.usersTableElem.remove();
      this.usersTableElem = null;
    }
    
    const columnKeys = ["bim|col.id", "bim|col.name", "bim|col.role"];
    const userTableColumns = columnKeys.map(key => this.application.i18n.get(key));

    this.usersTableElem = Controls.addTable(this.tableContainer,
      "userTable", userTableColumns,
      "data");

    const tbody = this.usersTableElem.tBodies[0];
    tbody.innerHTML = "";
    tbody.style.textAlign = "left";

    if (!users || users.length === 0) 
    {
      let row = tbody.insertRow();
      let cell = row.insertCell(0);
      cell.colSpan = 3;
      I18N.set(cell, "textContent", "bim|message.user_searched");
      this.application.i18n.update(cell);
      cell.style.textAlign = "center";
      if (this.toolbar) this.toolbar.style.display = "none";
      return;
    }

    users.forEach((user, index) => 
    {
      const row = Controls.addTableRow(this.usersTableElem);

      Controls.addLink(row.children[0], user.id || "-", "#", null, null,
        () => this.showUserDetails(user, index));

      Controls.addLink(row.children[1], user.name || "-", "#", null, null,
        () => this.showUserDetails(user, index));

      row.children[2].textContent = user.roles?.join(", ") || "-";

    });

    if (this.addUserButton) 
    {
      this.addUserButton.style.display = "block";
    }
  } 
  
  showUserDetails(user, index) 
  {
    this.currentUserIndex = index;
    this.showUser(user);
  }

  deleteUser(userId)
  {
    const onCompleted = () =>
    {
      this.hideProgressBar();
      this.searchUsers();
      Toast.create("bim|message.user_deleted")
        .setI18N(this.application.i18n).show();
    };

    const onError = error =>
    {
      this.handleError(error, () => this.deleteTopic(userId));
    };
    if (userId)
    {
      this.showProgressBar();
      this.service.deleteUser(userId, onCompleted, onError);
    }
  }

  searchUsers() {
    if (!this.service || this.service.url !== this.apiServiceElem.value.trim()) 
    {
      this.updateSecurityService();
    }
  
    const id = this.idFilterFieldElem ? this.idFilterFieldElem.value : "";
    const name = this.nameFilterFieldElem ? this.nameFilterFieldElem.value : "";
  
    let odataFilter = this.buildODataFilter(id, name);
    let odataOrderBy = "id";

    const onCompleted = users => {
      this.hideProgressBar();
      this.users = users; 
      this.usersLoaded = true;
      this.populateUsers(users); 
      this.hideUserForm();
      
      if (this.tabbedPane && this.tabbedPane.paneElem) {
        this.tabbedPane.paneElem.style.display = "block";
      }
    };
  
    const onError = error => {
      this.hideProgressBar();
      this.handleError(error, () => this.searchUsers());
    };
  
    this.showProgressBar();
    
    this.service.getUsers(odataFilter, odataOrderBy, onCompleted, onError);
  }
   
  buildODataFilter(id, name)
  {
    const conditions = [];
    if (id) 
    {
      let pattern = id.toLowerCase().replace(/'/g, "''");
      conditions.push(`contains(tolower(id), '${pattern}')`);
    }
    
    if (name) 
    {
      let pattern = name.toLowerCase().replace(/'/g, "''");
      conditions.push(`contains(tolower(name), '${pattern}')`);
    }
    
    if (conditions.length === 0) 
    {
      return '';
    }
    
    return conditions.join(' and ');
  }

  createUserForm() 
  {
    if (!this.detailPanelElem) 
    {
      this.detailPanelElem = document.createElement("div");
      this.detailPanelElem.className = "admin_panel";
      this.detailPanelElem.style.display = "none";
    }

    if (this.usersTabContainer) 
    {
      this.usersTabContainer.appendChild(this.detailPanelElem);
    }
  
    this.detailPanelElem.innerHTML = '';
  
    this.detailBodyElem = document.createElement("div");
    this.detailBodyElem.className = "admin_body";
    this.detailPanelElem.appendChild(this.detailBodyElem);
  
    this.detailHeaderElem = document.createElement("div");
    this.detailHeaderElem.className = "admin_topic_nav";
    this.detailBodyElem.appendChild(this.detailHeaderElem);

    this.backButton = Controls.addButton(this.detailHeaderElem,
      "backUsers", "button.back", () => this.hideUserForm());

    this.idField = Controls.addTextField(this.detailBodyElem, 
      "id", "bim|label.id");

    this.usernameField = Controls.addTextField(this.detailBodyElem, 
      "username", "label.name");

    this.emailField = Controls.addTextField(this.detailBodyElem, 
      "email", "bim|label.email");

    this.passwordField = Controls.addTextField(this.detailBodyElem, 
      "password", "label.password");
    this.passwordField.type = "password";

    this.passwordConfirmField = Controls.addTextField(this.detailBodyElem, 
      "passwordConfirm", "bim|label.confirm_password");
    this.passwordConfirmField.type = "password";

    this.tagsInput = Controls.addTagsInput(this.detailBodyElem,
      "roles", "bim|label.roles", "bim|placeholder.add_tags", []);

    this.detailButtonsElem = document.createElement("div");
    this.detailButtonsElem.className = "admin_buttons";
    this.detailBodyElem.appendChild(this.detailButtonsElem);

    this.saveButton = Controls.addButton(this.detailButtonsElem,
      "saveUser", "button.save", () => 
      {
        if (this.validatePasswords()) 
        {
          this.saveUser();
        } 
        else 
        {
          MessageDialog.create("ERROR", "bim|message.confirm_password_error")
            .setClassName("error")
            .setI18N(this.application.i18n).show();
          this.passwordConfirmField.focus();
        }
      }
    );

    this.deleteButton = Controls.addButton(this.detailButtonsElem,
      "deleteUser", "button.delete", () => {
        ConfirmDialog.create("bim|title.delete_user",
          "bim|question.delete_user")
          .setAction(() => {
            this.deleteUser(this.currentUserId);
            this.hideUserForm();
          })
          .setAcceptLabel("button.delete")
          .setI18N(this.application.i18n).show();
      }
    );
  }

  validatePasswords() 
  {
    return this.passwordField.value === this.passwordConfirmField.value;
  }

  hideUserForm() 
  {
    this.detailPanelElem.style.display = "none";
    
    if (this.tableContainer) 
    {
      this.tableContainer.style.display = "block";
    }
    if (this.toolbar) 
    {
      this.toolbar.style.display = "flex";
    }
    if (this.searchToolbar) 
    {
      this.searchToolbar.style.display = "flex";
    }
  }

  saveUser() {
    const application = this.application;
    const id = this.idField.value;
    const username = this.usernameField.value.trim();
    const newPassword = this.passwordField.value;
    const email = this.emailField.value.trim();
    const roles = this.tagsInput.getTags();


    if (!username || !email) {
      MessageDialog.create("ERROR", "bim|message.fields_required")
        .setClassName("error")
        .setI18N(application.i18n).show();
      return;
    }

    const user = {
      active: true,
      id: id,
      name: username,
      email: email,
      roles: roles,
      password: newPassword
    };
    
    if (this.currentUserData?.creation_date) 
    {
      user.creation_date = this.currentUserData.creation_date;
    }

    const onCompleted = () => 
    {
      this.hideProgressBar();
      this.hideUserForm();
      this.searchUsers();
      Toast.create("bim|message.user_saved")
        .setI18N(application.i18n).show();
    };

    const onError = error => 
    {
      this.hideProgressBar();
      this.handleError(error, () => this.saveUser());
    };

    this.showProgressBar();
    if (this.currentUserId) // update
    {
      this.service.updateUser(this.currentUserId, user,
        onCompleted, onError);
    } 
    else // creation
    { 
      this.service.createUser(user, onCompleted, onError);
    }
  }

  handleError(error, onLogin)
  {
    this.hideProgressBar();

    if (error.code === 401)
    {
      this.requestCredentials("message.access_denied", onLogin);
    }
    else if (error.code === 403)
    {
      this.requestCredentials("message.action_denied", onLogin);
    }
    else
    {
      let message = error.message?.split(":").slice(1).join(":").trim() || error.message;
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
      this.service.setCredentials("admin", "bimrocket");
      if (onLogin) onLogin();
    };
    loginDialog.onCancel = () =>
    {
      loginDialog.hide();
      if (onFailed) onFailed();
    };
    loginDialog.show();
  }

  showUser(user = null) 
  {
    if (this.tableContainer) 
    {
      this.tableContainer.style.display = "none";
    }
    if (this.toolbar) 
    {
      this.toolbar.style.display = "none";
    }
    if (this.searchToolbar)
    {
      this.searchToolbar.style.display = "none";
    }
    
    if (!this.detailPanelElem.parentNode) {
      this.usersTabContainer.appendChild(this.detailPanelElem);
    }
    this.detailPanelElem.style.display = "block";
    this.deleteButton.disabled = (user === null);
    if (user) 
    {
      // update
      this.currentUserData = user;
      this.idField.value = user.id || "";
      this.idField.readOnly = true;
      this.usernameField.value = user.name || "";
      this.emailField.value = user.email || "";
      this.tagsInput.setTags(user.roles || []);
      this.currentUserId = user.id;
  
      this.passwordField.value = "";
      this.passwordField.placeholder = this.application.i18n.get("bim|placeholder.keep_password");
      this.passwordField.required = false;
      
      this.passwordConfirmField.value = "";
      this.passwordConfirmField.placeholder = this.application.i18n.get("bim|placeholder.confirm_password");
      this.passwordConfirmField.required = false;
    } 
    else 
    {
      // creation
      this.currentUserData = null;
      this.idField.value = "";
      this.idField.readOnly = false;
      this.usernameField.value = "";
      this.emailField.value = "";
      this.tagsInput.setTags([]);
      this.currentUserId = null;
  
      this.passwordField.value = "";
      this.passwordField.placeholder ="";
      this.passwordField.required = true;
      
      this.passwordConfirmField.value = "";
      this.passwordConfirmField.placeholder = "";
      this.passwordConfirmField.required = true;
    }
  
  }
  showProgressBar()
  {
    this.application.progressBar.message = "";
    this.application.progressBar.progress = undefined;
    this.application.progressBar.visible = true;
  }

  hideProgressBar()
  {
    this.application.progressBar.visible = false;
  }

  createContainer(className, parent)
  {
    const elem = document.createElement("div");
    elem.className = className;
    if (parent) parent.appendChild(elem);
    return elem;
  }
}

export { ServerAdminDialog };