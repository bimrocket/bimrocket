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
import { ConfirmDialog } from "./ConfirmDialog.js";

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
    this.rolesTableElem = null;
    this.rolesTabContainer = null;
    
    this.service = this.application.services[this.group];

    const mainContainer = this.createContainer('admin_panel', this.bodyElem);
    const connPanel = this.createContainer('admin_body', mainContainer);
    const mainWrapper = this.createContainer('admin_panel', this.bodyElem);
    const mainPanel = this.createContainer('admin_body', mainWrapper);
  
    this.connPanelElem = connPanel;
    this.mainContainer = mainWrapper;
    this.mainPanelElem = mainPanel;

    this.apiServiceElem = Controls.addTextField(connPanel,
      "securityService", "bim|label.admin_service", "securityServiceUrl");
    this.apiServiceElem.value = `${Environment.SERVER_URL}/api`;
    this.apiServiceElem.placeholder = "https://bim.santfeliu.cat/api";
  
    const buttonsContainer = this.createContainer('admin_buttons', connPanel);
    this.connButtonsElem = buttonsContainer;

    // hidden initially
    this.detailPanelElem = this.createContainer('admin_panel', mainContainer);
    this.detailPanelElem.style.display = "none";
  
    this.tabbedPane = new TabbedPane(mainContainer);
    this.tabbedPane.addClassName("h_full");
    
    const usersTab = 
      this.tabbedPane.addTab("users", "bim|label.users");
    this.createUsersTab(usersTab);

    const rolesTab = 
      this.tabbedPane.addTab("roles", "bim|label.roles_management");
    this.createRolesTab(rolesTab);

    const configTab = 
      this.tabbedPane.addTab("config", "bim|label.configuration");
      configTab.textContent = "Settings coming soon";
    
    this.createUserForm();

    this.createRoleForm();

    this.addButton("close", "button.close", () => this.hide());
  
  }

  updateSecurityService() 
  {
    const securityServiceUrl = this.apiServiceElem.value.trim();

    if (!this.application.services[this.group]) 
    {
      this.application.services[this.group] = {};
    }

    this.service = new SecurityService({
      name: "security",
      url: securityServiceUrl,
      credentialsAlias: Environment.SERVER_ALIAS
    });
    
    this.application.services[this.group] = this.service;
  }

  createTab(container, tabClassName, toolbarClassName, buttonId, buttonLabel, buttonCallback, tabContainerProperty, toolbarProperty, tableContainerProperty) 
  {
    if (this[tabContainerProperty] && this[tabContainerProperty].parentNode) 
    {
      this[tabContainerProperty].parentNode.removeChild(this[tabContainerProperty]);
      this[tabContainerProperty] = null;
    }
  
    const tabContent = document.createElement("div");
    tabContent.className = tabClassName;
    container.appendChild(tabContent);
  
    this[toolbarProperty] = document.createElement("div");
    this[toolbarProperty].className = toolbarClassName;
    tabContent.appendChild(this[toolbarProperty]);
  
    Controls.addButton(this[toolbarProperty], buttonId, buttonLabel, buttonCallback);
  
    this[tableContainerProperty] = document.createElement("div");
    this[tableContainerProperty].className = "table_container";
    tabContent.appendChild(this[tableContainerProperty]);
  
    this[tabContainerProperty] = tabContent;
  }
  
  createUsersTab(container) 
  {
    this.createTab(
      container,
      "users_tab_content",
      "admin_toolbar",
      "newUser",
      "bim|button.new_user",
      () => this.showUser(),
      "usersTabContainer",
      "toolbar",
      "tableContainer"
    );

    this.createUserSearchPanel();
  }
  
  createRolesTab(container) 
  {
    this.createTab(
      container,
      "roles_tab_content",
      "admin_toolbar",
      "newRole",
      "bim|button.new_role",
      () => this.newRoleForm(),
      "rolesTabContainer",
      "rolesToolbar",
      "rolesTableContainer"
    );

    this.createRoleSearchPanel();
  }

  createUserSearchPanel() 
  {
    if (!this.usersTabContainer) return;

    this.searchToolbar = document.createElement("div");
    this.searchToolbar.className = "search_panel";
    
    if (this.toolbar && this.toolbar.parentNode) 
    {
      this.toolbar.parentNode.insertBefore(this.searchToolbar, this.toolbar.nextSibling);
    } 
    else 
    {
      this.usersTabContainer.appendChild(this.searchToolbar);
    }

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
      
    this.clearButton = Controls.addButton(this.buttonContainer,
      "clearFilters", "button.clear", () => this.clearFilters());

    const updateSearchButton = () => 
    {
      const hasId = this.idFilterFieldElem.value.trim() !== "";
      const hasName = this.nameFilterFieldElem.value.trim() !== "";
    };
  
    this.idFilterFieldElem.addEventListener("input", updateSearchButton);
    this.nameFilterFieldElem.addEventListener("input", updateSearchButton);
  }

  createRoleSearchPanel() 
  {
    if (!this.rolesTabContainer) return;

    this.roleSearchToolbar = document.createElement("div");
    this.roleSearchToolbar.className = "search_panel";
    
    if (this.rolesToolbar && this.rolesToolbar.parentNode) 
    {
      this.rolesToolbar.parentNode.insertBefore(this.roleSearchToolbar, this.rolesToolbar.nextSibling);
    } 
    else 
    {
      this.rolesTabContainer.appendChild(this.roleSearchToolbar);
    }

    this.roleSearchBody = document.createElement("div");
    this.roleSearchBody.className = "admin_body";
    this.roleSearchToolbar.appendChild(this.roleSearchBody);
    
    this.roleFilterTitle = document.createElement("div");
    this.roleFilterTitle.style.fontWeight = "bold";
    this.roleFilterTitle.style.padding = "2px";
    I18N.set(this.roleFilterTitle, "textContent", "bim|label.search_roles");
    this.roleSearchBody.appendChild(this.roleFilterTitle);

    this.roleIdFilterFieldElem = Controls.addTextField(this.roleSearchBody,
      "role_idFilter", "bim|label.search_id");
    
    this.roleDescriptionFilterFieldElem = Controls.addTextField(this.roleSearchBody,
      "role_descriptionFilter", "bim|label.search_description");
    
    this.roleButtonContainer = document.createElement("div");
    this.roleButtonContainer.style.display = "flex";
    this.roleButtonContainer.style.justifyContent = "center";
    this.roleSearchBody.appendChild(this.roleButtonContainer);
    
    this.searchRolesButton = Controls.addButton(this.roleButtonContainer,
      "searchRoles", "button.search", () => this.searchRoles());
      
    this.clearRoleButton = Controls.addButton(this.roleButtonContainer,
      "clearRoleFilters", "button.clear", () => this.clearRoleFilters());
  }
  
  clearFilters = () => 
  {
    this.idFilterFieldElem.value = "";
    this.nameFilterFieldElem.value = "";
  };

  clearRoleFilters = () => 
  {
    this.roleIdFilterFieldElem.value = "";
    this.roleDescriptionFilterFieldElem.value = "";
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

    if (this.toolbar) 
    {
      this.toolbar.style.display = "flex";
    }
  }

  populateRoles(roles) 
  {
    this.filteredRoles = roles;
    if (!this.rolesTableContainer) 
    {
      return;
    }
    this.rolesTableContainer.style.display = "block";

    if (this.rolesTableElem) 
    {
      this.rolesTableElem.remove();
      this.rolesTableElem = null;
    }
    
    const columnKeys = ["bim|col.id", "bim|col.description", "bim|col.inherited_role"];
    const roleTableColumns = columnKeys.map(key => this.application.i18n.get(key));

    this.rolesTableElem = Controls.addTable(this.rolesTableContainer,
      "roleTable", roleTableColumns,
      "data");

    const tbody = this.rolesTableElem.tBodies[0];
    tbody.innerHTML = "";
    tbody.style.textAlign = "left";

    if (!roles || roles.length === 0) 
    {
      let row = tbody.insertRow();
      let cell = row.insertCell(0);
      cell.colSpan = 3;
      I18N.set(cell, "textContent", "bim|message.role_searched");
      this.application.i18n.update(cell);
      cell.style.textAlign = "center";
      return;
    }

    roles.forEach((role, index) => 
    {
      const row = Controls.addTableRow(this.rolesTableElem);
      
      Controls.addLink(row.children[0], role.id || "-", "#", null, null,
      () => this.showRoleDetails(role, index));
      
      row.children[1].textContent = role.description || "-";
      row.children[2].textContent = role.roles?.join(", ") || "-";
    });

    if (this.rolesToolbar) 
    {
      this.rolesToolbar.style.display = "flex";
    }
  }

  populateRolesSelect(roles) 
  { 
    if (!this.rolesSelectElem) return;
    
    this.rolesSelectElem.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = this.application.i18n.get("bim|label.select_role");
    this.rolesSelectElem.appendChild(defaultOption);

    const filteredRoles = roles.filter(role => role.id !== this.currentRoleId);
    
    filteredRoles.forEach((role) =>
    {
      const option = document.createElement("option");
      option.value = role.id;
      option.textContent = role.id;
      this.rolesSelectElem.appendChild(option);
    });
  }

  showUserDetails(user, index) 
  {
    this.currentUserIndex = index;
    this.showUser(user);
  }

  showRoleDetails(role, index) 
  {
    this.currentRoleIndex = index;
    this.showRole(role);
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
      this.handleError(error, () => this.deleteUser(userId));
    };
    if (userId)
    {
      this.showProgressBar();
      this.service.deleteUser(userId, onCompleted, onError);
    }
  }

  deleteRole(roleId) 
  {
    const onCompleted = () => 
    {
      this.hideProgressBar();
      this.searchRoles();
      Toast.create("bim|message.role_deleted")
        .setI18N(this.application.i18n)
        .show();
    };

    const onError = (error) => 
    {
      this.handleError(error, () => this.deleteRole(roleId));
    };

    if (roleId) 
    {
      this.showProgressBar();
      this.service.deleteRole(roleId, onCompleted, onError);
    }
  }

  authenticateAndLoadData() 
  {
    const onCompleted = () => 
    {
      this.searchUsers();
    };
    const onError = (error) => 
    {
      this.handleError(error, () => this.authenticateAndLoadData());
    };
    this.service.getUsers("", "", onCompleted, onError);
  }

  searchUsers() 
  {
    const securityServiceUrl = this.apiServiceElem.value.trim();

    if (!this.service || this.service.url !== securityServiceUrl)
    {
      this.updateSecurityService();
    }

    let odataFilter = this.buildODataFilter({
      id: this.idFilterFieldElem ? this.idFilterFieldElem.value : "",
      name: this.nameFilterFieldElem ? this.nameFilterFieldElem.value : ""
    });
    let odataOrderBy = "id";

    const onCompleted = users => 
    {
      this.hideProgressBar();
      this.users = users;
      this.usersLoaded = true;
      this.populateUsers(users);
      this.hideUserForm();
      
      if (this.tabbedPane && this.tabbedPane.paneElem) 
      {
        this.tabbedPane.paneElem.style.display = "block";
      }

    };
  
    const onError = error => 
    {
      this.hideProgressBar();
      this.handleError(error, () => this.searchUsers());
    };

    this.showProgressBar();
    this.service.getUsers(odataFilter, odataOrderBy, onCompleted, onError);
  }

  searchRoles() 
  {
    const securityServiceUrl = this.apiServiceElem.value.trim();

    if (!this.service || this.service.url !== securityServiceUrl) 
    {
      this.updateSecurityService();
    }

    let odataFilter = this.buildODataFilter({
      id: this.roleIdFilterFieldElem ? this.roleIdFilterFieldElem.value : "",
      description: this.roleDescriptionFilterFieldElem ? this.roleDescriptionFilterFieldElem.value : ""
    });
    let odataOrderBy = "id";

    const onCompleted = roles => 
    {
      this.hideProgressBar();
      this.filteredRoles = roles;
      this.populateRoles(roles);
      this.hideRoleForm();

      this.populateRolesSelect(roles);

      if (this.tabbedPane && this.tabbedPane.paneElem) 
      {
        this.tabbedPane.paneElem.style.display = "block";
      }
    };

    const onError = error => 
    {
      this.hideProgressBar();
      this.handleError(error, () => this.searchRoles());
    };

    this.showProgressBar();

    this.service.getRoles(odataFilter, odataOrderBy, onCompleted, onError);
  }

  buildODataFilter(filters)
  {
    const conditions = [];
    
    for (const [field, value] of Object.entries(filters)) 
    {
      if (value && value.trim() !== '') 
      {
        let pattern = value.toLowerCase().replace(/'/g, "''");
        conditions.push(`contains(tolower(${field}), '${pattern}')`);
      }
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
      "roles", "bim|label.roles", "bim|placeholder.add_tags", [], "", true);

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

  createRoleForm()
  {
    this.roleDetailPanelElem = this.roleDetailPanelElem || document.createElement("div");
    this.roleDetailPanelElem.className = "admin_panel";
    this.roleDetailPanelElem.style.display = "none";

    this.rolesTabContainer?.appendChild(this.roleDetailPanelElem);
    this.roleDetailPanelElem.innerHTML = '';

    this.roleDetailBodyElem = document.createElement("div");
    this.roleDetailBodyElem.className = "admin_body";
    this.roleDetailPanelElem.appendChild(this.roleDetailBodyElem);

    this.roleDetailHeaderElem = document.createElement("div");
    this.roleDetailHeaderElem.className = "admin_topic_nav";
    this.roleDetailBodyElem.appendChild(this.roleDetailHeaderElem);
    this.backRoleButton = Controls.addButton(this.roleDetailHeaderElem, "backRoles", "button.back", () => this.hideRoleForm());

    this.roleIdField = Controls.addTextField(this.roleDetailBodyElem, 
      "roleId", "bim|label.id");

    this.roleDescriptionField = Controls.addTextField(this.roleDetailBodyElem, 
      "roleDescription", "bim|label.description");

    this.rolesSelectElem = Controls.addSelectField(
      this.roleDetailBodyElem,
      "rolesSelect",
      "bim|label.inherited_roles",
      []
    );

    this.rolesSelectElem.addEventListener("change", (event) => {
      const selectedRoleId = this.rolesSelectElem.value;

      if (selectedRoleId && this.rolesTagsInput) {
        const currentTags = this.rolesTagsInput.getTags();
        if (!currentTags.includes(selectedRoleId)) {
          this.rolesTagsInput.addTag(selectedRoleId);
        }
        this.rolesSelectElem.value = "";
      }
    });

    this.rolesTagsInput = Controls.addTagsInput(this.roleDetailBodyElem, 
      "roles", "", "bim|placeholder.add_tags", [], "", false);

    this.roleDetailButtonsElem = document.createElement("div");
    this.roleDetailButtonsElem.className = "admin_buttons";
    this.roleDetailBodyElem.appendChild(this.roleDetailButtonsElem);

    this.saveRoleButton = Controls.addButton(this.roleDetailButtonsElem, "saveRole", 
      "button.save", () => this.saveRole());

    this.deleteRoleButton = Controls.addButton(this.roleDetailButtonsElem, 
      "deleteRole", "button.delete", () => {
        ConfirmDialog.create("bim|title.delete_role", 
          "bim|question.delete_role")
          .setAction(() => {
            this.deleteRole(this.currentRoleId);
            this.hideRoleForm();
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
    
  hideRoleForm()
  {
    this.roleDetailPanelElem.style.display = "none";
    
    this.rolesTableContainer && (this.rolesTableContainer.style.display = "block");
    this.rolesToolbar && (this.rolesToolbar.style.display = "flex");
    this.roleSearchToolbar && (this.roleSearchToolbar.style.display = "flex");
  }
    
  saveUser()
  {
    const securityServiceUrl = this.apiServiceElem.value.trim();

    if (!this.service || this.service.url !== securityServiceUrl) 
    {
      this.updateSecurityService();
    }

    const application = this.application;
    const id = this.idField.value;
    const username = this.usernameField.value.trim();
    const newPassword = this.passwordField.value;
    const email = this.emailField.value.trim();
    const roles = this.tagsInput.getTags();

    if (!username || !email) 
    {
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

  saveRole() 
  {
    const { application } = this;
    const id = this.roleIdField.value;
    const description = this.roleDescriptionField.value.trim();
    const roles = this.rolesTagsInput.getTags();

    if (!id) 
    {
      MessageDialog.create("ERROR", "bim|message.id_field_required")
        .setClassName("error")
        .setI18N(application.i18n).show();
      return; 
    }

    const role = {
      id: id,
      description: description,
      roles: roles,
    };

    const onCompleted = () => 
    {
      this.hideProgressBar();
      this.hideRoleForm();
      this.searchRoles();
      Toast.create("bim|message.role_saved")
        .setI18N(application.i18n).show();
    };

    const onError = error => 
    {
      this.hideProgressBar();
      this.handleError(error, () => this.saveRole());
    };

    this.showProgressBar();
    this.currentRoleId
      ? this.service.updateRole(role, onCompleted, onError)
      : this.service.createRole(role, onCompleted, onError);
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
      let message = this.cleanErrorMessage(error.message);
      MessageDialog.create("ERROR", message)
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
  }

  cleanErrorMessage(errorMessage) 
  {
    if (!errorMessage) return this.application.i18n.get("Error");

    const recordIndex = errorMessage.indexOf("#");
    if (recordIndex !== -1) 
    {
      const afterHash = errorMessage.slice(recordIndex);
      const secondColon = afterHash.indexOf(":", afterHash.indexOf(":") + 1);
      if (secondColon !== -1) 
      {
        return afterHash.slice(secondColon + 1).trim();
      }
    }
    const firstColon = errorMessage.indexOf(":");
    if (firstColon !== -1) 
    {
      return errorMessage.slice(firstColon + 1).trim();
    }

    return errorMessage;
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

  toggleVisibility(container, toolbar, detailPanelElem, parentContainer) 
  {
    if (container) {
      container.style.display = "none";
    }
    if (toolbar) {
      toolbar.style.display = "none";
    }
    if (!detailPanelElem.parentNode) {
      parentContainer.appendChild(detailPanelElem);
    }
    detailPanelElem.style.display = "block";
  }
  
  updateFields(fields) 
  {
    fields.forEach(({ field, value, readOnly, placeholder, required }) => 
    {
      if (field) 
      {
        field.value = value || "";
        if (readOnly !== undefined) field.readOnly = readOnly;
        if (placeholder !== undefined) field.placeholder = placeholder;
        if (required !== undefined) field.required = required;
      }
    });
  }

  showUser(user = null) 
  {
    this.toggleVisibility(this.tableContainer, this.toolbar, this.detailPanelElem, this.usersTabContainer);

    if (this.searchToolbar) {
      this.searchToolbar.style.display = "none";
    }

    this.deleteButton.disabled = (user === null);
  
    const isCreation = user === null;
    this.currentUserData = isCreation ? null : user;
    this.currentUserId = isCreation ? null : user.id;
  
    this.updateFields([
      { field: this.idField, value: user?.id, readOnly: !isCreation },
      { field: this.usernameField, value: user?.name },
      { field: this.emailField, value: user?.email },
      { field: this.passwordField, value: "", placeholder: isCreation ? "" : this.application.i18n.get("bim|placeholder.keep_password"), required: isCreation },
      { field: this.passwordConfirmField, value: "", placeholder: isCreation ? "" : this.application.i18n.get("bim|placeholder.confirm_password"), required: isCreation }
    ]);    
  
    this.tagsInput.setTags(user?.roles || []);
  }

  showRole(role = null) 
  {
    this.toggleVisibility(this.rolesTableContainer, this.rolesToolbar, this.roleDetailPanelElem, this.rolesTabContainer);
    if (this.roleSearchToolbar) 
    {
      this.roleSearchToolbar.style.display = "none";
    }

    this.deleteRoleButton.disabled = (role === null);

    const isCreation = role === null;
    this.currentRoleData = isCreation ? null : role;
    this.currentRoleId = isCreation ? null : role.id;

    this.updateFields([
      { field: this.roleIdField, value: role?.id, readOnly: !isCreation },
      { field: this.roleDescriptionField, value: role?.description }
    ]);

    if (this.rolesTagsInput) 
    {
      this.rolesTagsInput.setTags(role?.roles || []);
    }

    if (this.allRoles) 
    {
      this.populateRolesSelect(this.allRoles);
    }
  }

  newRoleForm()
  {
    if (this.allRoles && this.allRoles.length > 0)
    {
      this.showRole();
      return;
    }

    const securityServiceUrl = this.apiServiceElem.value.trim();

    if (!this.service || this.service.url !== securityServiceUrl)
    {
      this.updateSecurityService();
    }

    const onCompleted = (roles) =>
    {
      this.hideProgressBar();
      this.allRoles = roles;
      this.populateRolesSelect(roles);
      this.showRole();
    };

    const onError = (error) =>
    {
      this.hideProgressBar();
      this.handleError(error, () => this.newRoleForm());
    };

    this.showProgressBar();
    this.service.getRoles("", "id", onCompleted, onError);
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