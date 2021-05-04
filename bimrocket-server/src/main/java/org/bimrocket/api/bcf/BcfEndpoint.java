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

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Application;
import java.util.List;
import java.util.UUID;
import java.util.Collections;
import org.bimrocket.dao.DAO;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import org.bimrocket.dao.DAOConnection;
import org.bimrocket.dao.DAOConnectionFactory;
import jakarta.ws.rs.core.Response;
import java.util.ArrayList;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;

/**
 *
 * @author realor
 */
@Path("bcf/2.1")
@Tag(name="BCF", description="BIM Collaboration Format")
public class BcfEndpoint
{
  @Inject
  Application application;
        
  @HeaderParam("Authorization") 
  String autho;

  /* Auth */
  
  @GET
  @Path("/auth")
  @Produces(APPLICATION_JSON)
  public List<String> getAuth()
  {
    return new ArrayList<>();
  }
  
  /* Projects */

  @GET
  @Path("/projects")
  @Produces(APPLICATION_JSON)
  public List<BcfProject> getProjects()
  {
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfProject> dao = conn.getDAO(BcfProject.class);
      return dao.find(Collections.emptyMap());
    }
  }

  @GET
  @Path("/projects/{projectId}")
  @Produces(APPLICATION_JSON)
  public BcfProject getProject(@PathParam("projectId") String projectId)
  {
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfProject> dao = conn.getDAO(BcfProject.class);
      return dao.select(projectId);
    }
  }

  @GET
  @Path("/projects/{projectId}/extensions")
  @Produces(APPLICATION_JSON)
  public BcfExtensions getExtensions(@PathParam("projectId") String projectId)
  {
    try (DAOConnection conn = getDAOConnection())    
    {
      DAO<BcfExtensions> dao = conn.getDAO(BcfExtensions.class);
      List<BcfExtensions> extensionsList = dao.find(Collections.emptyMap());
      if (extensionsList.isEmpty())
      {
        BcfExtensions extensions = new BcfExtensions();
        dao.insert(extensions);
        return extensions;
      }
      else
      {
        return extensionsList.get(0);
      }
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
    try (DAOConnection conn = getDAOConnection())    
    {
      DAO<BcfProject> dao = conn.getDAO(BcfProject.class);
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

  /* Topics */

  @GET
  @Path("/projects/{projectId}/topics")
  @Produces(APPLICATION_JSON)
  public List<BcfTopic> getTopics(@PathParam("projectId") String projectId,
    @QueryParam("topic_status") String topicStatus)
  {
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfTopic> dao = conn.getDAO(BcfTopic.class);
      Map<String, Object> filter = new HashMap<>();
      filter.put("projectId", projectId);
      if (topicStatus != null)
      {
        filter.put("topicStatus", topicStatus);
      }
      return dao.find(filter);
    }
  }

  @GET
  @Path("/projects/{projectId}/topics/{topicId}")
  public BcfTopic getTopic(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId)
  {
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfTopic> dao = conn.getDAO(BcfTopic.class);
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
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfTopic> dao = conn.getDAO(BcfTopic.class);
      topic.setId(UUID.randomUUID().toString());
      topic.setProjectId(projectId);
      String dateString = getDateString();
      String username = getUsername();
      topic.setCreationDate(dateString);
      topic.setCreationAuthor(username);
      topic.setModifyDate(dateString);
      topic.setModifyAuthor(username);
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
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfTopic> dao = conn.getDAO(BcfTopic.class);
      BcfTopic topic = dao.select(topicId);
      if (topic == null) throw new RuntimeException("Topic not found");
      
      topic.setPriority(topicUpdate.getPriority());
      topic.setTitle(topicUpdate.getTitle());
      topic.setDueDate(topicUpdate.getDueDate());
      topic.setAssignedTo(topicUpdate.getAssignedTo());
      topic.setModifyAuthor(topicUpdate.getModifyAuthor());
      topic.setModifyDate(topicUpdate.getModifyDate());
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
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfTopic> dao = conn.getDAO(BcfTopic.class);
      dao.delete(topicId);
    }
    return Response.ok().build();
  }

  /* Comments */

  @GET
  @Path("/projects/{projectId}/topics/{topicId}/comments")
  @Produces(APPLICATION_JSON)
  public List<BcfComment> getComments(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId)
  {
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfComment> dao = conn.getDAO(BcfComment.class);
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);      
      return dao.find(filter);
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
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfComment> dao = conn.getDAO(BcfComment.class);
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
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfComment> dao = conn.getDAO(BcfComment.class);
      comment.setId(UUID.randomUUID().toString());
      comment.setTopicId(topicId);
      String dateString = getDateString();
      String username = getUsername();
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
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfComment> dao = conn.getDAO(BcfComment.class);
      BcfComment comment = dao.select(commentId);
      if (comment == null) throw new RuntimeException("Comment not found");
      
      comment.setComment(commentUpdate.getComment());
      comment.setViewpointId(commentUpdate.getViewpointId());
      comment.setReplayToCommentId(comment.getReplayToCommentId());
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
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfComment> dao = conn.getDAO(BcfComment.class);
      dao.delete(commentId);
    }
    return Response.ok().build();
  }

  /* Viewpoints */

  @GET
  @Path("/projects/{projectId}/topics/{topicId}/viewpoints")
  @Produces(APPLICATION_JSON)
  public List<BcfViewpoint> getViewpoints(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId)
  {
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfViewpoint> dao = conn.getDAO(BcfViewpoint.class);
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);
      return dao.find(filter);
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
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfViewpoint> dao = conn.getDAO(BcfViewpoint.class);
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
    try (DAOConnection conn = getDAOConnection())
    {
      DAO<BcfViewpoint> dao = conn.getDAO(BcfViewpoint.class);
      viewpoint.setId(UUID.randomUUID().toString());
      viewpoint.setTopicId(topicId);
      return dao.insert(viewpoint);
    }
  }
  
  private DAOConnection getDAOConnection()
  {
    DAOConnectionFactory daoFactory = 
      (DAOConnectionFactory)application.getProperties().get("bcfDAO");
    if (daoFactory == null) throw new RuntimeException("bcfDAO not found");

    return daoFactory.getConnection();
  }
  
  private String getDateString()
  {
    Date now = new Date();
    SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss");
    return df.format(now);
  }

  private String getUsername()
  {
    return "anonymous";
  }
}
