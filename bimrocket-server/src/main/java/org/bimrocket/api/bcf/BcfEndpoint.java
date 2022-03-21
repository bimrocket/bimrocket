/*
 * BIMROCKET
 *
 * Copyright (C) 2021, Ajuntament de Sant Feliu de Llobregat
 *
 * This program is licensed and may be used, modified and redistributed under
 * the terms of the European Public License (EUPL), either version 1.1 or (at
 * your option) any later version as soon as they are approved by the European
 * Commission.
 *
 * Alternatively, you may redistribute and/or modify this program under the
 * terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either  version 3 of the License, or (at your option)
 * any later version.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the licenses for the specific language governing permissions, limitations
 * and more details.
 *
 * You should have received a copy of the EUPL1.1 and the LGPLv3 licenses along
 * with this program; if not, you may find them at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 * http://www.gnu.org/licenses/
 * and
 * https://www.gnu.org/licenses/lgpl.txt
 */

package org.bimrocket.api.bcf;

import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import static java.util.Arrays.asList;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Application;
import jakarta.ws.rs.core.Context;
import java.util.List;
import java.util.UUID;
import java.util.Collections;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import jakarta.ws.rs.core.Response;
import java.util.Base64;
import org.apache.commons.lang.StringUtils;
import org.bimrocket.api.InvalidRequestException;
import org.bimrocket.api.NotFoundException;
import org.bimrocket.dao.Dao;
import org.bimrocket.dao.DaoConnectionFactory;
import org.bimrocket.dao.DaoConnection;
import org.bimrocket.odata.SimpleODataParser;
import static org.bimrocket.api.bcf.BcfSnapshot.PNG_TYPE;

/**
 *
 * @author realor
 */
@Path("bcf/2.1")
@Tag(name="BCF", description="BIM Collaboration Format")
public class BcfEndpoint
{
  private static final String PROJECT_TEMPLATE = "project_template";

  private static final Map<String, String> topicFieldMap = new HashMap<>();

  static
  {
    topicFieldMap.put("topic_status", "topicStatus");
    topicFieldMap.put("topic_type", "topicType");
    topicFieldMap.put("priority", "priority");
    topicFieldMap.put("assigned_to", "assignedTo");
    topicFieldMap.put("creation_date", "creationDate");
    topicFieldMap.put("index", "index");
  }

  @Inject
  Application application;

  @Context
  ContainerRequestContext context;

  /* Auth */

  @GET
  @Path("/auth")
  @Produces(APPLICATION_JSON)
  @PermitAll
  public BcfAuthentication getAuth()
  {
    BcfAuthentication auth = new BcfAuthentication();
    auth.setHttpBasicSupported(true);

    return auth;
  }

  /* Projects */

  @GET
  @Path("/projects")
  @Produces(APPLICATION_JSON)
  public List<BcfProject> getProjects()
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfProject> dao = conn.getDao(BcfProject.class);
      return dao.select(Collections.emptyMap(), asList("name"));
    }
  }

  @GET
  @Path("/projects/{projectId}")
  @Produces(APPLICATION_JSON)
  public BcfProject getProject(@PathParam("projectId") String projectId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfProject> dao = conn.getDao(BcfProject.class);
      return dao.select(projectId);
    }
  }

  @PUT
  @Path("/projects/{projectId}")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  public BcfProject updateProject(
    @PathParam("projectId") String projectId,
    BcfProject projectUpdate)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfProject> dao = conn.getDao(BcfProject.class);
      BcfProject project = dao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setId(projectId);
        project.setName(projectUpdate.getName());
        project = dao.insert(project);
      }
      else
      {
        project.setName(projectUpdate.getName());
        project = dao.update(project);
      }
      return project;
    }
  }

  /* Extensions */

  @GET
  @Path("/projects/{projectId}/extensions")
  @Produces(APPLICATION_JSON)
  public BcfExtensions getExtensions(@PathParam("projectId") String projectId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfProject> projectDao = conn.getDao(BcfProject.class);
      BcfProject project = projectDao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setName("Project " + projectId);
        project.setId(projectId);
        projectDao.insert(project);
      }

      Dao<BcfExtensions> dao = conn.getDao(BcfExtensions.class);
      BcfExtensions extensions = dao.select(projectId);
      if (extensions == null)
      {
        extensions = new BcfExtensions();
        BcfExtensions template = dao.select(PROJECT_TEMPLATE);
        if (template == null)
        {
          extensions.setDefaultValues();
        }
        else
        {
          extensions = template;
        }
        extensions.setProjectId(projectId);
        extensions = dao.insert(extensions);
      }
      return extensions;
    }
  }

  @PUT
  @Path("/projects/{projectId}/extensions")
  @Produces(APPLICATION_JSON)
  public BcfExtensions updateExtensions(
    @PathParam("projectId") String projectId,
    BcfExtensions extensionsUpdate)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfProject> projectDao = conn.getDao(BcfProject.class);
      BcfProject project = projectDao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setName("Project " + projectId);
        project.setId(projectId);
        projectDao.insert(project);
      }

      Dao<BcfExtensions> dao = conn.getDao(BcfExtensions.class);
      BcfExtensions extensions = dao.select(projectId);
      if (extensions == null)
      {
        extensionsUpdate.setProjectId(projectId);
        return dao.insert(extensionsUpdate);
      }
      else
      {
        extensionsUpdate.setProjectId(projectId);
        return dao.update(extensionsUpdate);
      }
    }
  }

  /* Topics */

  @GET
  @Path("/projects/{projectId}/topics")
  @Produces(APPLICATION_JSON)
  public List<BcfTopic> getTopics(@PathParam("projectId") String projectId,
    @QueryParam("$filter") String odataFilter,
    @QueryParam("$orderBy") String odataOrderBy)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfTopic> dao = conn.getDao(BcfTopic.class);
      SimpleODataParser parser = new SimpleODataParser(topicFieldMap);
      Map<String, Object> filter = parser.parseFilter(odataFilter);
      filter.put("projectId", projectId);
      List<String> orderBy = parser.parseOrderBy(odataOrderBy);
      return dao.select(filter, orderBy);
    }
  }

  @GET
  @Path("/projects/{projectId}/topics/{topicId}")
  @Produces(APPLICATION_JSON)
  public BcfTopic getTopic(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfTopic> dao = conn.getDao(BcfTopic.class);
      return dao.select(topicId);
    }
  }

  @POST
  @Path("/projects/{projectId}/topics")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  public BcfTopic createTopic(
    @PathParam("projectId") String projectId,
    BcfTopic topic)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfProject> projectDao = conn.getDao(BcfProject.class);
      BcfProject project = projectDao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setName("Project " + projectId);
        project.setId(projectId);
        project.incrementLastTopicIndex();
        project = projectDao.insert(project);
      }
      else
      {
        project.incrementLastTopicIndex();
        project = projectDao.update(project);
      }

      Dao<BcfTopic> dao = conn.getDao(BcfTopic.class);
      topic.setId(UUID.randomUUID().toString());
      topic.setProjectId(projectId);
      String dateString = getDateString();
      String username = getUsername();

      topic.setCreationDate(dateString);
      topic.setCreationAuthor(username);
      topic.setModifyDate(dateString);
      topic.setModifyAuthor(username);
      topic.setIndex(project.getLastTopicIndex());
      return dao.insert(topic);
    }
  }

  @PUT
  @Path("/projects/{projectId}/topics/{topicId}")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  public BcfTopic updateTopic(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    BcfTopic topicUpdate)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfTopic> dao = conn.getDao(BcfTopic.class);
      BcfTopic topic = dao.select(topicId);
      if (topic == null) throw new RuntimeException("Topic not found");

      topic.setTitle(topicUpdate.getTitle());
      topic.setTopicType(topicUpdate.getTopicType());
      topic.setPriority(topicUpdate.getPriority());
      topic.setStage(topicUpdate.getStage());
      topic.setTopicStatus(topicUpdate.getTopicStatus());
      topic.setReferenceLinks(topicUpdate.getReferenceLinks());
      topic.setDescription(topicUpdate.getDescription());
      topic.setDueDate(topicUpdate.getDueDate());
      topic.setAssignedTo(topicUpdate.getAssignedTo());
      String dateString = getDateString();
      String username = getUsername();
      topic.setModifyDate(dateString);
      topic.setModifyAuthor(username);
      return dao.update(topic);
    }
  }

  @DELETE
  @Path("/projects/{projectId}/topics/{topicId}")
  @Produces(APPLICATION_JSON)
  public Response deleteTopic(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfTopic> dao = conn.getDao(BcfTopic.class);
      dao.delete(topicId);

      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);

      Dao<BcfComment> commentDao = conn.getDao(BcfComment.class);
      commentDao.delete(filter);

      Dao<BcfViewpoint> viewpointDao = conn.getDao(BcfViewpoint.class);
      viewpointDao.delete(filter);
      return Response.ok().build();
    }
  }

  /* Comments */

  @GET
  @Path("/projects/{projectId}/topics/{topicId}/comments")
  @Produces(APPLICATION_JSON)
  public List<BcfComment> getComments(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfComment> dao = conn.getDao(BcfComment.class);
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);
      return dao.select(filter, asList("date"));
    }
  }

  @GET
  @Path("/projects/{projectId}/topics/{topicId}/comments/{commentId}")
  @Produces(APPLICATION_JSON)
  public BcfComment getComment(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    @PathParam("commentId") String commentId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfComment> dao = conn.getDao(BcfComment.class);
      return dao.select(commentId);
    }
  }

  @POST
  @Path("/projects/{projectId}/topics/{topicId}/comments")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  public BcfComment createComment(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    BcfComment comment)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfComment> dao = conn.getDao(BcfComment.class);
      comment.setId(UUID.randomUUID().toString());
      comment.setTopicId(topicId);
      String dateString = getDateString();
      String username = getUsername();
      comment.setAuthor(username);
      comment.setDate(dateString);
      comment.setModifyDate(dateString);
      comment.setModifyAuthor(username);
      return dao.insert(comment);
    }
  }

  @PUT
  @Path("/projects/{projectId}/topics/{topicId}/comments/{commentId}")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  public BcfComment updateComment(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    @PathParam("commentId") String commentId,
    BcfComment commentUpdate)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfComment> dao = conn.getDao(BcfComment.class);
      BcfComment comment = dao.select(commentId);
      if (comment == null) throw new RuntimeException("Comment not found");

      comment.setComment(commentUpdate.getComment());
      comment.setViewpointId(commentUpdate.getViewpointId());
      comment.setReplayToCommentId(comment.getReplayToCommentId());
      String dateString = getDateString();
      String username = getUsername();
      comment.setModifyDate(dateString);
      comment.setModifyAuthor(username);
      return dao.update(comment);
    }
  }

  @DELETE
  @Path("/projects/{projectId}/topics/{topicId}/comments/{commentId}")
  @Produces(APPLICATION_JSON)
  public Response deleteComment(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    @PathParam("commentId") String commentId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfComment> dao = conn.getDao(BcfComment.class);
      dao.delete(commentId);
      return Response.ok().build();
    }
  }

  /* Viewpoints */

  @GET
  @Path("/projects/{projectId}/topics/{topicId}/viewpoints")
  @Produces(APPLICATION_JSON)
  public List<BcfViewpoint> getViewpoints(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfViewpoint> dao = conn.getDao(BcfViewpoint.class);
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);
      return dao.select(filter, asList("index"));
    }
  }

  @GET
  @Path("/projects/{projectId}/topics/{topicId}/viewpoints/{viewpointId}")
  @Produces(APPLICATION_JSON)
  public BcfViewpoint getViewpoint(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    @PathParam("viewpointId") String viewpointId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfViewpoint> dao = conn.getDao(BcfViewpoint.class);
      return dao.select(viewpointId);
    }
  }

  @POST
  @Path("/projects/{projectId}/topics/{topicId}/viewpoints")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  public BcfViewpoint createViewpoint(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    BcfViewpoint viewpoint)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfTopic> topicDao = conn.getDao(BcfTopic.class);
      BcfTopic topic = topicDao.select(topicId);
      if (topic == null) return null;
      topic.incrementLastViewpointIndex();
      topicDao.update(topic);

      Dao<BcfViewpoint> dao = conn.getDao(BcfViewpoint.class);
      viewpoint.setId(UUID.randomUUID().toString());
      viewpoint.setTopicId(topicId);
      viewpoint.setIndex(topic.getLastViewpointIndex());

      return dao.insert(viewpoint);
    }
  }

  @DELETE
  @Path("/projects/{projectId}/topics/{topicId}/viewpoints/{viewpointId}")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  public Response deleteViewpoint(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    @PathParam("viewpointId") String viewpointId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfViewpoint> dao = conn.getDao(BcfViewpoint.class);
      dao.delete(viewpointId);
      return Response.ok().build();
    }
  }

  @GET
  @Path("/projects/{projectId}/topics/{topicId}/viewpoints/{viewpointId}/snapshot")
  @PermitAll
  @Produces(APPLICATION_JSON)
  public Response getViewpointSnapshot(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    @PathParam("viewpointId") String viewpointId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfViewpoint> dao = conn.getDao(BcfViewpoint.class);
      BcfViewpoint viewpoint = dao.select(viewpointId);
      if (viewpoint == null)
        throw new NotFoundException("Viewpoint not found");

      BcfSnapshot snapshot = viewpoint.getSnapshot();
      if (snapshot == null)
        throw new NotFoundException("Snapshot not found");

      String type = snapshot.getSnapshotType();
      String contentType = PNG_TYPE.equals(type) ? "image/png" : "image/jpg";
      String data = snapshot.getSnapshotData();
      byte[] bytes = Base64.getDecoder().decode(data);

      return Response.ok(bytes)
        .header("Content-Type", contentType)
        .header("Content-Length", bytes.length)
        .build();
    }
  }

  @GET
  @Path("/projects/{projectId}/topics/{topicId}/document_references")
  @PermitAll
  @Produces(APPLICATION_JSON)
  public List<BcfDocumentReference> getDocumentReferences(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfDocumentReference> dao = conn.getDao(BcfDocumentReference.class);
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);

      return dao.select(filter, null);
    }
  }

  @POST
  @Path("/projects/{projectId}/topics/{topicId}/document_references")
  @PermitAll
  @Produces(APPLICATION_JSON)
  public BcfDocumentReference createDocumentReference(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    BcfDocumentReference documentReference)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      validate(documentReference);
      documentReference.setTopicId(topicId);

      Dao<BcfDocumentReference> dao = conn.getDao(BcfDocumentReference.class);
      documentReference.setId(UUID.randomUUID().toString());
      return dao.insert(documentReference);
    }
  }

  @PUT
  @Path("/projects/{projectId}/topics/{topicId}/document_references/{documentReferenceId}")
  @PermitAll
  @Produces(APPLICATION_JSON)
  public BcfDocumentReference updateDocumentReference(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    @PathParam("documentReferenceId") String documentReferenceId,
    BcfDocumentReference documentReference)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      validate(documentReference);
      documentReference.setTopicId(topicId);

      Dao<BcfDocumentReference> dao = conn.getDao(BcfDocumentReference.class);

      if (documentReference.getId() == null)
      {
        documentReference.setId(documentReferenceId);
        return dao.update(documentReference);
      }
      else if (documentReferenceId.equals(documentReference.getId()))
      {
        return dao.update(documentReference);
      }
      else
      {
        dao.delete(documentReferenceId);
        return dao.insert(documentReference);
      }
    }
  }

  @DELETE
  @Path("/projects/{projectId}/topics/{topicId}/document_references/{documentReferenceId}")
  @PermitAll
  @Produces(APPLICATION_JSON)
  public Response deleteDocumentReference(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    @PathParam("documentReferenceId") String documentReferenceId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfDocumentReference> dao = conn.getDao(BcfDocumentReference.class);
      dao.delete(documentReferenceId);

      return Response.ok().build();
    }
  }


  /* internal methods */

  private void validate(BcfDocumentReference documentReference)
  {
    int refs = 0;
    if (!StringUtils.isBlank(documentReference.getDocumentGuid())) refs++;
    if (!StringUtils.isBlank(documentReference.getUrl())) refs++;

    if (refs == 2)
      throw new InvalidRequestException("Can not define both document_guid and url");

    if (refs == 0)
      throw new InvalidRequestException("Must define document_guid or url");
  }

  private DaoConnection getDaoConnection()
  {
    DaoConnectionFactory daoFactory =
      (DaoConnectionFactory)application.getProperties().get("bcfDao");
    if (daoFactory == null) throw new RuntimeException("bcfDAO not found");

    return daoFactory.getConnection();
  }

  private String getUsername()
  {
    Object value = context.getProperty("username");
    if (value instanceof String)
    {
      return String.valueOf(value);
    }
    return "anonymous";
  }

  private String getDateString()
  {
    Date now = new Date();
    SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss");
    return df.format(now);
  }
}
