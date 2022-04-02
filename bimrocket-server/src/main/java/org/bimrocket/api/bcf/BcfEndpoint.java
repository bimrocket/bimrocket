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
import jakarta.ws.rs.core.Context;
import java.util.List;
import jakarta.ws.rs.core.Response;
import java.util.Base64;
import org.bimrocket.service.bcf.BcfService;
import static org.bimrocket.api.bcf.BcfSnapshot.PNG_TYPE;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;

/**
 *
 * @author realor
 */
@Path("bcf/2.1")
@Tag(name="BCF", description="BIM Collaboration Format")
public class BcfEndpoint
{
  @Context
  ContainerRequestContext context;

  @Inject
  BcfService bcfService;

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
    return bcfService.getProjects();
  }

  @GET
  @Path("/projects/{projectId}")
  @Produces(APPLICATION_JSON)
  public BcfProject getProject(@PathParam("projectId") String projectId)
  {
    return bcfService.getProject(projectId);
  }

  @PUT
  @Path("/projects/{projectId}")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  public BcfProject updateProject(
    @PathParam("projectId") String projectId, BcfProject projectUpdate)
  {
    return bcfService.updateProject(projectId, projectUpdate);
  }

  /* Extensions */

  @GET
  @Path("/projects/{projectId}/extensions")
  @Produces(APPLICATION_JSON)
  public BcfExtensions getExtensions(@PathParam("projectId") String projectId)
  {
    return bcfService.getExtensions(projectId);
  }

  @PUT
  @Path("/projects/{projectId}/extensions")
  @Produces(APPLICATION_JSON)
  public BcfExtensions updateExtensions(
    @PathParam("projectId") String projectId,
    BcfExtensions extensionsUpdate)
  {
    return bcfService.updateExtensions(projectId, extensionsUpdate);
  }

  /* Topics */

  @GET
  @Path("/projects/{projectId}/topics")
  @Produces(APPLICATION_JSON)
  public List<BcfTopic> getTopics(@PathParam("projectId") String projectId,
    @QueryParam("$filter") String odataFilter,
    @QueryParam("$orderBy") String odataOrderBy)
  {
    return bcfService.getTopics(projectId, odataFilter, odataOrderBy);
  }

  @GET
  @Path("/projects/{projectId}/topics/{topicId}")
  @Produces(APPLICATION_JSON)
  public BcfTopic getTopic(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId)
  {
    return bcfService.getTopic(projectId, topicId);
  }

  @POST
  @Path("/projects/{projectId}/topics")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  public BcfTopic createTopic(
    @PathParam("projectId") String projectId, BcfTopic topic)
  {
    String username = getUsername();
    topic.setCreationAuthor(username);
    topic.setModifyAuthor(username);

    return bcfService.createTopic(projectId, topic);
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
    String username = getUsername();
    topicUpdate.setModifyAuthor(username);

    return bcfService.updateTopic(projectId, topicId, topicUpdate);
  }

  @DELETE
  @Path("/projects/{projectId}/topics/{topicId}")
  @Produces(APPLICATION_JSON)
  public Response deleteTopic(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId)
  {
    bcfService.deleteTopic(projectId, topicId);
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
    return bcfService.getComments(projectId, topicId);
  }

  @GET
  @Path("/projects/{projectId}/topics/{topicId}/comments/{commentId}")
  @Produces(APPLICATION_JSON)
  public BcfComment getComment(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    @PathParam("commentId") String commentId)
  {
    return bcfService.getComment(projectId, topicId, commentId);
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
    String username = getUsername();
    comment.setAuthor(username);
    comment.setModifyAuthor(username);

    return bcfService.createComment(projectId, topicId, comment);
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
    String username = getUsername();
    commentUpdate.setModifyAuthor(username);

    return bcfService.updateComment(projectId, topicId, commentId,
      commentUpdate);
  }

  @DELETE
  @Path("/projects/{projectId}/topics/{topicId}/comments/{commentId}")
  @Produces(APPLICATION_JSON)
  public Response deleteComment(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    @PathParam("commentId") String commentId)
  {
    bcfService.deleteComment(projectId, topicId, commentId);
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
    return bcfService.getViewpoints(projectId, topicId);
  }

  @GET
  @Path("/projects/{projectId}/topics/{topicId}/viewpoints/{viewpointId}")
  @Produces(APPLICATION_JSON)
  public BcfViewpoint getViewpoint(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId,
    @PathParam("viewpointId") String viewpointId)
  {
    return bcfService.getViewpoint(projectId, topicId, viewpointId);
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
    return bcfService.createViewpoint(projectId, topicId, viewpoint);
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
    bcfService.deleteViewpoint(projectId, topicId, viewpointId);
    return Response.ok().build();
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
    BcfSnapshot snapshot =
      bcfService.getViewpointSnapshot(projectId, topicId, viewpointId);

    String type = snapshot.getSnapshotType();
    String contentType = PNG_TYPE.equals(type) ? "image/png" : "image/jpg";
    String data = snapshot.getSnapshotData();
    byte[] bytes = Base64.getDecoder().decode(data);

    return Response.ok(bytes)
      .header("Content-Type", contentType)
      .header("Content-Length", bytes.length)
      .build();
  }

  @GET
  @Path("/projects/{projectId}/topics/{topicId}/document_references")
  @PermitAll
  @Produces(APPLICATION_JSON)
  public List<BcfDocumentReference> getDocumentReferences(
    @PathParam("projectId") String projectId,
    @PathParam("topicId") String topicId)
  {
    return bcfService.getDocumentReferences(projectId, topicId);
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
    return bcfService.createDocumentReference(projectId, topicId,
      documentReference);
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
    return bcfService.updateDocumentReference(projectId, topicId,
      documentReferenceId, documentReference);
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
    bcfService.deleteDocumentReference(projectId, topicId, documentReferenceId);
    return Response.ok().build();
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
}
