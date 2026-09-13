/**
 * BCFService.js
 *
 * @author realor
 * @author alexis-i2cat
 */

import { Service } from "platform/io/Service.js";
import { RestServiceClient } from "platform/io/RestServiceClient.js";
import { ServiceManager } from "platform/io/ServiceManager.js";

const headers = { "Content-Type": "application/json" };

class BCFService extends Service
{
  constructor(parameters)
  {
    super(parameters);
    this.client = new RestServiceClient(this);
    if (this.serverType === undefined) this.serverType = "bimrocket";
  }

  getParameters()
  {
    const parameters = super.getParameters();
    parameters.serverType = this.serverType;
    return parameters;
  }

  setParameters(parameters)
  {
    super.setParameters(parameters);
    this.serverType = parameters.serverType;
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
        query += "$filter=" + filterText;
        if (odataOrderBy) query += "&";
      }
      if (odataOrderBy)
      {
        query += "$orderBy=" + odataOrderBy;
      }
    }

    this.client.call("GET",
      "projects" + query,
      { onCompleted, onError });
  }

  getProject(projectId, onCompleted, onError)
  {
    this.client.call("GET",
      "projects/" + projectId,
      { onCompleted, onError });
  }

  updateProject(projectId, project, onCompleted, onError)
  {
    const body = JSON.stringify(project);

    this.client.call("PUT",
      "projects/" + projectId,
      { headers, body, onCompleted, onError });
  }

  deleteProject(projectId, onCompleted, onError)
  {
    this.client.call("DELETE",
      "projects/" + projectId,
      { onCompleted, onError });
  }

  getExtensions(projectId, onCompleted, onError)
  {
    this.client.call("GET",
      "projects/" + projectId + "/extensions",
      { onCompleted, onError });
  }

  updateExtensions(projectId, extensions, onCompleted, onError)
  {
    const body = JSON.stringify(extensions);

    this.client.call("PUT",
      `projects/${projectId}/extensions`,
      { headers, body, onCompleted, onError });
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

    this.client.call("GET",
      `projects/${projectId}/topics${query}`,
      { onCompleted, onError });
  }

  getTopic(projectId, topicGuid, onCompleted, onError)
  {
    this.client.call("GET",
      `projects/${projectId}/topics/${topicGuid}`,
      { onCompleted, onError });
  }

  createTopic(projectId, topic, onCompleted, onError)
  {
    const body = JSON.stringify(topic);

    this.client.call("POST",
      `projects/${projectId}/topics`,
      { headers, body, onCompleted, onError });
  }

  updateTopic(projectId, topicGuid, topic, onCompleted, onError)
  {
    const body = JSON.stringify(topic);

    this.client.call("PUT",
      `projects/${projectId}/topics/${topicGuid}`,
      { headers, body, onCompleted, onError });
  }

  deleteTopic(projectId, topicGuid, onCompleted, onError)
  {
    this.client.call("DELETE",
      `projects/${projectId}/topics/${topicGuid}`,
      { onCompleted, onError });
  }

  getViewpoints(projectId, topicGuid, onCompleted, onError)
  {
    this.client.call("GET",
      `projects/${projectId}/topics/${topicGuid}/viewpoints`,
      { onCompleted, onError });
  }

  getViewpoint(projectId, topicGuid, viewpointGuid, onCompleted, onError)
  {
    this.client.call("GET",
      `projects/${projectId}/topics/${topicGuid}/viewpoints/${viewpointGuid}`,
      { onCompleted, onError });
  }

  createViewpoint(projectId, topicGuid, viewpoint, onCompleted, onError)
  {
    const body = JSON.stringify(viewpoint);

    this.client.call("POST",
      `projects/${projectId}/topics/${topicGuid}/viewpoints`,
      { headers, body, onCompleted, onError });
  }

  deleteViewpoint(projectId, topicGuid, viewpointGuid, onCompleted, onError)
  {
    this.client.call("DELETE",
      `projects/${projectId}/topics/${topicGuid}/viewpoints/${viewpointGuid}`,
      { onCompleted, onError });
  }

  getComments(projectId, topicGuid, onCompleted, onError)
  {
    this.client.call("GET",
      `projects/${projectId}/topics/${topicGuid}/comments`,
      { onCompleted, onError });
  }

  getComment(projectId, topicGuid, commentGuid, onCompleted, onError)
  {
    this.client.call("GET",
      `projects/${projectId}/topics/${topicGuid}/comments/${commentGuid}`,
      { onCompleted, onError });
  }

  createComment(projectId, topicGuid, comment, onCompleted, onError)
  {
    const body = JSON.stringify(comment);

    this.client.call("POST",
      `projects/${projectId}/topics/${topicGuid}/comments`,
      { headers, body, onCompleted, onError });
  }

  updateComment(projectId, topicGuid, commentGuid, comment,
    onCompleted, onError)
  {
    const body = JSON.stringify(comment);

    this.client.call("PUT",
      `projects/${projectId}/topics/${topicGuid}/comments/${commentGuid}`,
      { headers, body, onCompleted, onError });
  }

  deleteComment(projectId, topicGuid, commentGuid, onCompleted, onError)
  {
    this.client.call("DELETE",
      `projects/${projectId}/topics/${topicGuid}/comments/${commentGuid}`,
      { onCompleted, onError });
  }

  getDocumentReferences(projectId, topicGuid, onCompleted, onError)
  {
    this.client.call("GET",
      `projects/${projectId}/topics/${topicGuid}/document_references`,
      { onCompleted, onError });
  }

  createDocumentReference(projectId, topicGuid, docRef, onCompleted, onError)
  {
    const body = JSON.stringify(docRef);

    this.client.call("POST",
      `projects/${projectId}/topics/${topicGuid}/document_references`,
      { headers, body, onCompleted, onError });
  }

  updateDocumentReference(projectId, topicGuid, docRefGuid, docRef,
    onCompleted, onError)
  {
    const body = JSON.stringify(docRef);

    this.client.call("PUT",
      `projects/${projectId}/topics/${topicGuid}/document_references/${docRefGuid}`,
      { headers, body, onCompleted, onError });
  }

  deleteDocumentReference(projectId, topicGuid, docRefGuid,
    onCompleted, onError)
  {
    this.client.call("DELETE",
      `projects/${projectId}/topics/${topicGuid}/document_references/${docRefGuid}`,
      { onCompleted, onError });
  }
}

ServiceManager.addClass(BCFService);

export { BCFService };