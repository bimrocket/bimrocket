/**
 * BCFService.js
 *
 * @author realor
 */

import { Service } from "./Service.js";
import { ServiceManager } from "./ServiceManager.js";
import { WebUtils } from "../utils/WebUtils.js";

class BCFService extends Service
{
  constructor(parameters)
  {
    super(parameters);
  }

  getProjects(odataFilter, odataOrderBy, onCompleted, onError) 
  {
    let query = "";

    const nameFilter = odataFilter ? odataFilter.nameFilter : null;
    const conditions = [];

    if (nameFilter && nameFilter.trim()) 
    {
      const nameEscaped = nameFilter.trim().replace(/'/g, "''").toLowerCase();
      conditions.push(`contains(tolower(name),'${nameEscaped}')`);
    }

    if (conditions.length > 0 || odataOrderBy) 
    {
      query = "?";
      if (conditions.length > 0) 
      {
        const filterText = conditions.join(" and ");
        query += "$filter=" + encodeURIComponent(filterText);
        if (odataOrderBy) query += "&";
      }
      if (odataOrderBy) 
      {
        query += "$orderby=" + encodeURIComponent(odataOrderBy);
      }
    }

    this.invoke("GET", "projects" + query, null, onCompleted, onError);
  }
    

  getProject(projectId, onCompleted, onError)
  {
    this.invoke("GET", "projects/" + projectId, null, onCompleted, onError);
  }

  updateProject(projectId, project, onCompleted, onError)
  {
    this.invoke("PUT", "projects/" + projectId, project,
      onCompleted, onError);
  }

  deleteProject(projectId, onCompleted, onError)
  {
    this.invoke("DELETE", "projects/" + projectId, null, onCompleted, onError);
  }

  getExtensions(projectId, onCompleted, onError)
  {
    this.invoke("GET", "projects/" + projectId + "/extensions", null,
      onCompleted, onError);
  }

  updateExtensions(projectId, extensions, onCompleted, onError)
  {
    this.invoke("PUT", "projects/" + projectId + "/extensions",
      extensions, onCompleted, onError);
  }

  getTopics(projectId, odataFilter, odataOrderBy, onCompleted, onError)
  {
    let query = "";
    if (odataFilter.length > 0 || odataOrderBy.length > 0)
    {
      query = "?";
      if (odataFilter)
      {
        query += "$filter=" + odataFilter;
        if (odataOrderBy) query += "&";
      }
      if (odataOrderBy) query += "$orderBy=" + odataOrderBy;
    }

    this.invoke("GET", "projects/" + projectId + "/topics" + query,
      null, onCompleted, onError);
  }

  getTopic(projectId, topicGuid, onCompleted, onError)
  {
    this.invoke("GET", "projects/" + projectId + "/topics/" + topicGuid,
      null, onCompleted, onError);
  }

  createTopic(projectId, topic, onCompleted, onError)
  {
    this.invoke("POST", "projects/" + projectId + "/topics",
      topic, onCompleted, onError);
  }

  updateTopic(projectId, topicGuid, topic, onCompleted, onError)
  {
    this.invoke("PUT", "projects/" + projectId + "/topics/" +
      topicGuid, topic, onCompleted, onError);
  }

  deleteTopic(projectId, topicGuid, onCompleted, onError)
  {
    this.invoke("DELETE", "projects/" + projectId + "/topics/" + topicGuid,
      null, onCompleted, onError);
  }

  getViewpoints(projectId, topicGuid, onCompleted, onError)
  {
    this.invoke("GET",
      "projects/" + projectId +
      "/topics/" + topicGuid + "/viewpoints", null, onCompleted, onError);
  }

  getViewpoint(projectId, topicGuid, viewpointGuid, onCompleted, onError)
  {
    this.invoke("GET",
      "projects/" + projectId +
      "/topics/" + topicGuid + "/viewpoints/" + viewpointGuid, null,
      onCompleted, onError);
  }

  createViewpoint(projectId, topicGuid, viewpoint, onCompleted, onError)
  {
    this.invoke("POST",
      "projects/" + projectId + "/topics/" + topicGuid +
      "/viewpoints", viewpoint, onCompleted, onError);
  }

  deleteViewpoint(projectId, topicGuid, viewpointGuid, onCompleted, onError)
  {
    this.invoke("DELETE",
      "projects/" + projectId + "/topics/" + topicGuid +
      "/viewpoints/" + viewpointGuid, null, onCompleted, onError);
  }

  getComments(projectId, topicGuid, onCompleted, onError)
  {
    this.invoke("GET", "projects/" + projectId + "/topics/" +
      topicGuid + "/comments", null, onCompleted, onError);
  }

  getComment(projectId, topicGuid, commentGuid, onCompleted, onError)
  {
    this.invoke("GET", "projects/" + projectId + "/topics/" +
      topicGuid + "/comments/" + commentGuid, null, onCompleted, onError);
  }

  createComment(projectId, topicGuid, comment, onCompleted, onError)
  {
    this.invoke("POST",
      "projects/" + projectId + "/topics/" + topicGuid +
      "/comments", comment, onCompleted, onError);
  }

  updateComment(projectId, topicGuid, commentGuid, comment,
    onCompleted, onError)
  {
    this.invoke("PUT",
      "projects/" + projectId + "/topics/" + topicGuid +
      "/comments/" + commentGuid, comment, onCompleted, onError);
  }

  deleteComment(projectId, topicGuid, commentGuid, onCompleted, onError)
  {
    this.invoke("DELETE",
      "projects/" + projectId + "/topics/" + topicGuid +
      "/comments/" + commentGuid, null, onCompleted, onError);
  }

  getDocumentReferences(projectId, topicGuid, onCompleted, onError)
  {
    this.invoke("GET",
      "projects/" + projectId + "/topics/" + topicGuid +
      "/document_references", null, onCompleted, onError);
  }

  createDocumentReference(projectId, topicGuid, docRef, onCompleted, onError)
  {
    this.invoke("POST",
      "projects/" + projectId + "/topics/" + topicGuid +
      "/document_references", docRef, onCompleted, onError);
  }

  updateDocumentReference(projectId, topicGuid, docRefGuid, docRef,
    onCompleted, onError)
  {
    this.invoke("PUT",
      "projects/" + projectId + "/topics/" + topicGuid +
      "/document_references/" + docRefGuid, docRef, onCompleted, onError);
  }

  deleteDocumentReference(projectId, topicGuid, docRefGuid,
    onCompleted, onError)
  {
    this.invoke("DELETE",
      "projects/" + projectId + "/topics/" + topicGuid +
      "/document_references/" + docRefGuid, null, onCompleted, onError);
  }

  invoke(method, path, data, onCompleted, onError)
  {
    const request = new XMLHttpRequest();
    if (onError)
    {
      request.onerror = error =>
      {
        onError({code: 0, message: "Connection error"});
      };
    }

    if (onCompleted) request.onload = () =>
    {
      if (request.status === 200)
      {
        if (request.response)
        {
          try
          {
            onCompleted(JSON.parse(request.responseText));
          }
          catch (ex)
          {
            if (onError) onError({code: 0, message: ex});
          }
        }
        else
        {
          onCompleted();
        }
      }
      else
      {
        let error;
        try
        {
          error = JSON.parse(request.responseText);
        }
        catch (ex)
        {
          error = {code: request.status, message: "Error " + request.status};
        }
        if (onError) onError(error);
      }
    };

    request.open(method, this.url + "/bcf/2.1/" + path);
    request.setRequestHeader("Accept", "application/json");
    request.setRequestHeader("Content-Type", "application/json");

    const credentials = this.getCredentials();

    WebUtils.setBasicAuthorization(request,
      credentials.username, credentials.password);

    if (data)
    {
      request.send(JSON.stringify(data));
    }
    else
    {
      request.send();
    }
  }
}

ServiceManager.addClass(BCFService);

export { BCFService };