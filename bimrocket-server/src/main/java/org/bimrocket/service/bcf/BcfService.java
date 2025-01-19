/*
 * BIMROCKET
 *
 * Copyright (C) 2021-2025, Ajuntament de Sant Feliu de Llobregat
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
package org.bimrocket.service.bcf;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.spi.CDI;
import jakarta.inject.Inject;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.commons.lang.StringUtils;
import org.bimrocket.api.bcf.BcfComment;
import org.bimrocket.api.bcf.BcfDocumentReference;
import org.bimrocket.api.bcf.BcfExtensions;
import org.bimrocket.api.bcf.BcfProject;
import org.bimrocket.api.bcf.BcfSnapshot;
import org.bimrocket.api.bcf.BcfTopic;
import org.bimrocket.api.bcf.BcfViewpoint;
import org.bimrocket.dao.Dao;
import org.bimrocket.exception.InvalidRequestException;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.odata.SimpleODataParser;
import org.bimrocket.service.mail.MailService;
import java.util.logging.Logger;
import org.apache.commons.text.StringSubstitutor;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import org.bimrocket.api.security.User;
import org.bimrocket.exception.AccessDeniedException;
import org.bimrocket.service.bcf.store.BcfDaoConnection;
import org.bimrocket.service.bcf.store.BcfDaoStore;
import org.bimrocket.service.bcf.store.empty.BcfEmptyDaoStore;
import org.bimrocket.service.security.SecurityService;
import org.eclipse.microprofile.config.Config;
import static java.util.Arrays.asList;
import static org.bimrocket.util.TextUtils.getISODate;
import static org.bimrocket.service.security.SecurityConstants.ADMIN_ROLE;


/**
 *
 * @author realor
 */
@ApplicationScoped
public class BcfService
{
  static final Logger LOGGER =
    Logger.getLogger(BcfService.class.getName());

  static final String BASE = "services.bcf.";

  static final Map<String, String> topicFieldMap = new ConcurrentHashMap<>();

  // Topic actions
  static final String READ = "read";
  static final String COMMENT = "comment";
  static final String CREATE = "create";
  static final String UPDATE = "update";
  static final String DELETE = "delete";

  // Exceptions
  static final String TOPIC_NOT_FOUND =
    "BCF001: Topic not found.";
  static final String TOPIC_NOT_FOUND_IN_PROJECT =
    "BCF002: Topic not found in project.";
  static final String COMMENT_NOT_FOUND =
    "BCF003: Comment not found.";
  static final String VIEWPOINT_NOT_FOUND =
    "BCF004: Viewpoint not found.";
  static final String VIEWPOINT_NOT_FOUND_IN_TOPIC =
    "BCF005: Viewpoint not found in topic.";
  static final String VIEWPOINT_NOT_FOUND_IN_PROJECT =
    "BCF006: Viewpoint not found in project.";
  static final String SNAPSHOT_NOT_FOUND =
    "BCF007: Snapshot not found.";
  static final String DOCUMENT_NOT_FOUND =
    "BCF008: Document not found.";
  static final String DOCUMENT_NOT_FOUND_IN_TOPIC =
    "BCF009: Document not found in topic.";
  static final String DOCUMENT_NOT_FOUND_IN_PROJECT =
    "BCF010: Document not found in project.";
  static final String CAN_NOT_SET_BOTH_GUID_AND_URL =
    "BCF011: Can not set both document guid and url.";
  static final String GUID_OR_URL_REQUIRED =
    "BCF012: Document guid or url are required.";

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
  Config config;

  @Inject
  MailService mailService;

  @Inject
  SecurityService securityService;

  BcfDaoStore daoStore;

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.INFO, "Init BcfService");

    CDI<Object> cdi = CDI.current();

    try
    {
      @SuppressWarnings("unchecked")
      Class<BcfDaoStore> storeClass =
        config.getValue(BASE + "store.class", Class.class);
      daoStore = cdi.select(storeClass).get();
    }
    catch (Exception ex)
    {
      LOGGER.log(Level.SEVERE, "Invalid BcfDaoStore: {0}",
        config.getOptionalValue(BASE + "store.class", String.class).orElse(null));
      daoStore = new BcfEmptyDaoStore();
    }
    LOGGER.log(Level.INFO, "BcfDaoStore: {0}", daoStore.getClass());
  }

  @PreDestroy
  public void destroy()
  {
    LOGGER.log(Level.INFO, "Destroying BcfService");
    daoStore.close();
  }

  /* Projects */

  public List<BcfProject> getProjects()
  {
    LOGGER.log(Level.FINE, "getProjects");

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject> projectDao = conn.getProjectDao();
      return projectDao.select(Collections.emptyMap(), asList("name"));
    }
  }

  public BcfProject getProject(String projectId)
  {
    LOGGER.log(Level.FINE, "projectId: {0}", projectId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject> projectDao = conn.getProjectDao();
      return projectDao.select(projectId);
    }
  }

  public BcfProject updateProject(
    String projectId, BcfProject projectUpdate)
  {
    LOGGER.log(Level.FINE, "projectId: {0}", projectId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject> projectDao = conn.getProjectDao();
      BcfProject project = projectDao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setId(projectId);
        project.setName(projectUpdate.getName());
        project = projectDao.insert(project);
      }
      else
      {
        project.setName(projectUpdate.getName());
        project = projectDao.update(project);
      }
      return project;
    }
  }

  public void deleteProject(String projectId)
  {
    LOGGER.log(Level.FINE, "projectId: {0}", projectId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject> projectDao = conn.getProjectDao();
      Dao<BcfExtensions> extensionsDao = conn.getExtensionsDao();
      Dao<BcfTopic> topicDao = conn.getTopicDao();
      Dao<BcfComment> commentDao = conn.getCommentDao();
      Dao<BcfViewpoint> viewpointDao = conn.getViewpointDao();
      Dao<BcfDocumentReference> docDao = conn.getDocumentReferenceDao();

      projectDao.delete(projectId);

      extensionsDao.delete(projectId);

      Map<String, Object> filter = new HashMap<>();
      filter.put("projectId", projectId);

      Map<String, Object> topicFilter = new HashMap<>();

      List<BcfTopic> topics = topicDao.select(filter, Collections.emptyList());
      for (BcfTopic topic : topics)
      {
        topicDao.delete(topic.getId());

        topicFilter.put("topicId", topic.getId());
        commentDao.delete(topicFilter);
        viewpointDao.delete(topicFilter);
        docDao.delete(topicFilter);
      }
    }
  }

  /* Extensions */

  public BcfExtensions getExtensions(String projectId)
  {
    LOGGER.log(Level.FINE, "projectId: {0}", projectId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject> projectDao = conn.getProjectDao();
      BcfProject project = projectDao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setName("Project " + projectId);
        project.setId(projectId);
        projectDao.insert(project);
      }

      Dao<BcfExtensions> extensionsDao = conn.getExtensionsDao();
      BcfExtensions extensions = extensionsDao.select(projectId);
      if (extensions == null)
      {
        Optional<String> templateProjectName =
          config.getOptionalValue(BASE + "templateProjectName", String.class);

        if (templateProjectName.isPresent())
        {
          Map<String, Object> filter = new HashMap<>();
          filter.put("name", templateProjectName.get());
          List<BcfProject> projects =
            projectDao.select(filter, Collections.emptyList());
          if (!projects.isEmpty())
          {
            String templateProjectId = projects.get(0).getId();
            extensions = extensionsDao.select(templateProjectId);
          }
        }
        if (extensions == null)
        {
          extensions = new BcfExtensions();
          extensions.setDefaultValues();
        }
        extensions.setProjectId(projectId);
        extensions = extensionsDao.insert(extensions);
      }
      return extensions;
    }
  }

  public BcfExtensions updateExtensions(
    String projectId, BcfExtensions extensionsUpdate)
  {
    LOGGER.log(Level.FINE, "projectId: {0}", projectId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject> projectDao = conn.getProjectDao();
      BcfProject project = projectDao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setName("Project " + projectId);
        project.setId(projectId);
        projectDao.insert(project);
      }

      Dao<BcfExtensions> extensionsDao = conn.getExtensionsDao();
      BcfExtensions extensions = extensionsDao.select(projectId);
      if (extensions == null)
      {
        extensionsUpdate.setProjectId(projectId);
        return extensionsDao.insert(extensionsUpdate);
      }
      else
      {
        extensionsUpdate.setProjectId(projectId);
        return extensionsDao.update(extensionsUpdate);
      }
    }
  }

  /* Topics */

  public List<BcfTopic> getTopics(String projectId,
    String odataFilter, String odataOrderBy)
  {
    LOGGER.log(Level.FINE, "projectId: {0}", projectId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      checkProjectAccess(conn, projectId, READ);

      Dao<BcfTopic> topicDao = conn.getTopicDao();
      SimpleODataParser parser = new SimpleODataParser(topicFieldMap);
      Map<String, Object> filter = parser.parseFilter(odataFilter);
      filter.put("projectId", projectId);
      List<String> orderBy = parser.parseOrderBy(odataOrderBy);
      return topicDao.select(filter, orderBy);
    }
  }

  public BcfTopic getTopic(String projectId, String topicId)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic> topicDao = conn.getTopicDao();
      return topicDao.select(topicId);
    }
  }

  public BcfTopic createTopic(String projectId, BcfTopic topic)
  {
    LOGGER.log(Level.FINE, "projectId: {0}", projectId);

    String userId = securityService.getCurrentUser().getId();
    topic.setCreationAuthor(userId);
    topic.setModifyAuthor(userId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      checkProjectAccess(conn, projectId, CREATE);

      Dao<BcfProject> projectDao = conn.getProjectDao();
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

      Dao<BcfTopic> topicDao = conn.getTopicDao();
      topic.setId(UUID.randomUUID().toString());
      topic.setProjectId(projectId);
      String dateString = getISODate();

      topic.setCreationDate(dateString);
      topic.setModifyDate(dateString);
      topic.setIndex(project.getLastTopicIndex());
      topic = topicDao.insert(topic);

      String assignedTo = topic.getAssignedTo();

      if (mailService.isEnabled() && assignedTo != null
          && assignedTo.contains("@"))
      {
        Map<String, String> vars = new HashMap<>();
        vars.put("project.name", project.getName());
        vars.put("project.id", project.getId());
        vars.put("index", String.valueOf(topic.getIndex()));
        vars.put("id", topic.getId());
        vars.put("title", topic.getTitle());
        vars.put("priority", topic.getPriority());
        vars.put("description", topic.getDescription());

        String mailSubjectPattern =
          config.getValue(BASE + "mail.createTopic.subject", String.class);

        String mailBodyPattern =
          config.getValue(BASE + "mail.createTopic.body", String.class);

        StringSubstitutor substitutor = new StringSubstitutor(vars, "#{", "}");
        String subject = substitutor.replace(mailSubjectPattern);
        String message = substitutor.replace(mailBodyPattern);

        mailService.asyncSendMail(null, topic.getAssignedTo(), subject,
          message, null);
      }
      return topic;
    }
  }

  public BcfTopic updateTopic(String projectId, String topicId,
    BcfTopic topicUpdate)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    String username = securityService.getCurrentUser().getId();
    topicUpdate.setModifyAuthor(username);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.select(topicId);
      if (topic == null) throw new NotFoundException(TOPIC_NOT_FOUND);

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(TOPIC_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, UPDATE);

      topic.setTitle(topicUpdate.getTitle());
      topic.setTopicType(topicUpdate.getTopicType());
      topic.setPriority(topicUpdate.getPriority());
      topic.setStage(topicUpdate.getStage());
      topic.setTopicStatus(topicUpdate.getTopicStatus());
      topic.setReferenceLinks(topicUpdate.getReferenceLinks());
      topic.setDescription(topicUpdate.getDescription());
      topic.setDueDate(topicUpdate.getDueDate());
      topic.setAssignedTo(topicUpdate.getAssignedTo());
      String dateString = getISODate();
      topic.setModifyDate(dateString);
      topic.setModifyAuthor(topicUpdate.getModifyAuthor());
      return topicDao.update(topic);
    }
  }

  public void deleteTopic(String projectId, String topicId)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.select(topicId);
      if (topic == null) return; // topic do not exists

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(TOPIC_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, DELETE);

      topicDao.delete(topicId);

      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);

      Dao<BcfComment> commentDao = conn.getCommentDao();
      commentDao.delete(filter);

      Dao<BcfViewpoint> viewpointDao = conn.getViewpointDao();
      viewpointDao.delete(filter);

      Dao<BcfDocumentReference> docDao = conn.getDocumentReferenceDao();
      docDao.delete(filter);
    }
  }

  /* Comments */

  public List<BcfComment> getComments(String projectId, String topicId)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfComment> commentDao = conn.getCommentDao();
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);
      return commentDao.select(filter, asList("date"));
    }
  }

  public BcfComment getComment(String projectId, String topicId,
    String commentId)
  {
    LOGGER.log(Level.FINE, "commentId: {0}", commentId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfComment> commentDao = conn.getCommentDao();
      return commentDao.select(commentId);
    }
  }

  public BcfComment createComment(String projectId, String topicId,
    BcfComment comment)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.select(topicId);
      if (topic == null) throw new NotFoundException(TOPIC_NOT_FOUND);

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(TOPIC_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, COMMENT);

      Dao<BcfComment> commentDao = conn.getCommentDao();
      comment.setId(UUID.randomUUID().toString());
      comment.setTopicId(topicId);
      String dateString = getISODate();
      comment.setDate(dateString);
      comment.setModifyDate(dateString);

      String username = securityService.getCurrentUser().getId();
      comment.setAuthor(username);
      comment.setModifyAuthor(username);

      return commentDao.insert(comment);
    }
  }

  public BcfComment updateComment(String projectId, String topicId,
    String commentId, BcfComment commentUpdate)
  {
    LOGGER.log(Level.FINE, "commentId: {0}", commentId);

    String username = securityService.getCurrentUser().getId();
    commentUpdate.setModifyAuthor(username);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfComment> commentDao = conn.getCommentDao();
      BcfComment comment = commentDao.select(commentId);
      if (comment == null)
        throw new NotFoundException(COMMENT_NOT_FOUND);

      String userId = comment.getAuthor();
      User user = securityService.getCurrentUser();
      if (!user.getId().equals(userId) &&
          !user.getRoleIds().contains(ADMIN_ROLE))
        throw new AccessDeniedException();

      comment.setComment(commentUpdate.getComment());
      comment.setViewpointId(commentUpdate.getViewpointId());
      comment.setReplayToCommentId(comment.getReplayToCommentId());
      String dateString = getISODate();
      comment.setModifyDate(dateString);
      return commentDao.update(comment);
    }
  }

  public void deleteComment(String projectId, String topicId, String commentId)
  {
    LOGGER.log(Level.FINE, "commentId: {0}", commentId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfComment> commentDao = conn.getCommentDao();
      BcfComment comment = commentDao.select(commentId);
      if (comment == null) return; // comment already deleted

      String userId = comment.getAuthor();
      User user = securityService.getCurrentUser();
      if (!user.getId().equals(userId) &&
          !user.getRoleIds().contains(ADMIN_ROLE))
        throw new AccessDeniedException();

      commentDao.delete(commentId);
    }
  }

  /* Viewpoints */

  public List<BcfViewpoint> getViewpoints(String projectId, String topicId)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfViewpoint> viewpointDao = conn.getViewpointDao();
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);
      return viewpointDao.select(filter, asList("index"));
    }
  }

  public BcfViewpoint getViewpoint(
    String projectId, String topicId, String viewpointId)
  {
    LOGGER.log(Level.FINE, "viewpointId: {0}", viewpointId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfViewpoint> viewpointDao = conn.getViewpointDao();
      return viewpointDao.select(viewpointId);
    }
  }

  public BcfViewpoint createViewpoint(
    String projectId, String topicId, BcfViewpoint viewpoint)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.select(topicId);
      if (topic == null) throw new NotFoundException(TOPIC_NOT_FOUND);

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(TOPIC_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, UPDATE);

      topic.incrementLastViewpointIndex();
      topicDao.update(topic);

      Dao<BcfViewpoint> viewpointDao = conn.getViewpointDao();
      viewpoint.setId(UUID.randomUUID().toString());
      viewpoint.setTopicId(topicId);
      viewpoint.setIndex(topic.getLastViewpointIndex());

      return viewpointDao.insert(viewpoint);
    }
  }

  public void deleteViewpoint(String projectId, String topicId,
    String viewpointId)
  {
    LOGGER.log(Level.FINE, "viewpointId: {0}", viewpointId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfViewpoint> viewpointDao = conn.getViewpointDao();

      BcfViewpoint viewpoint = viewpointDao.select(viewpointId);
      if (viewpoint == null) return; // viewpoint already deleted

      if (!viewpoint.getTopicId().equals(topicId))
        throw new NotFoundException(VIEWPOINT_NOT_FOUND_IN_TOPIC);

      Dao<BcfTopic> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.select(topicId);

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(VIEWPOINT_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, DELETE);

      viewpointDao.delete(viewpointId);
    }
  }

  public BcfSnapshot getViewpointSnapshot(
    String projectId, String topicId, String viewpointId)
  {
    LOGGER.log(Level.FINE, "viewpointId: {0}", viewpointId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfViewpoint> viewpointDao = conn.getViewpointDao();
      BcfViewpoint viewpoint = viewpointDao.select(viewpointId);
      if (viewpoint == null)
        throw new NotFoundException(VIEWPOINT_NOT_FOUND);

      BcfSnapshot snapshot = viewpoint.getSnapshot();
      if (snapshot == null)
        throw new NotFoundException(SNAPSHOT_NOT_FOUND);

      return snapshot;
    }
  }

  public List<BcfDocumentReference> getDocumentReferences(
    String projectId, String topicId)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfDocumentReference> docRefDao = conn.getDocumentReferenceDao();
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);

      return docRefDao.select(filter, null);
    }
  }

  public BcfDocumentReference createDocumentReference(
    String projectId, String topicId, BcfDocumentReference documentReference)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.select(topicId);
      if (topic == null) throw new NotFoundException(TOPIC_NOT_FOUND);

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(TOPIC_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, UPDATE);

      validate(documentReference);

      Dao<BcfDocumentReference> docRefDao = conn.getDocumentReferenceDao();
      documentReference.setId(UUID.randomUUID().toString());
      documentReference.setTopicId(topicId);
      return docRefDao.insert(documentReference);
    }
  }

  public BcfDocumentReference updateDocumentReference(
    String projectId, String topicId, String documentReferenceId,
    BcfDocumentReference documentReference)
  {
    LOGGER.log(Level.FINE, "documentReferenceId: {0}", documentReferenceId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfDocumentReference> docRefDao = conn.getDocumentReferenceDao();

      BcfDocumentReference docRef = docRefDao.select(documentReferenceId);
      if (docRef == null)
        throw new NotFoundException(DOCUMENT_NOT_FOUND);

      if (!docRef.getTopicId().equals(topicId))
        throw new NotFoundException(DOCUMENT_NOT_FOUND_IN_TOPIC);

      Dao<BcfTopic> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.select(topicId);

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(DOCUMENT_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, UPDATE);

      validate(documentReference);
      documentReference.setId(documentReferenceId);
      documentReference.setTopicId(topicId);

      return docRefDao.update(documentReference);
    }
  }

  public void deleteDocumentReference(
    String projectId, String topicId, String documentReferenceId)
  {
    LOGGER.log(Level.FINE, "documentReferenceId: {0}", documentReferenceId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfDocumentReference> docRefDao = conn.getDocumentReferenceDao();

      BcfDocumentReference docRef = docRefDao.select(documentReferenceId);
      if (docRef == null) return; // docRef already deleted

      if (!docRef.getTopicId().equals(topicId))
        throw new NotFoundException(DOCUMENT_NOT_FOUND_IN_TOPIC);

      Dao<BcfTopic> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.select(topicId);

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(DOCUMENT_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, DELETE);

      docRefDao.delete(documentReferenceId);
    }
  }

  /* private methods */

  private void checkProjectAccess(BcfDaoConnection conn,
    String projectId, String action)
  {
    Dao<BcfExtensions> extensionsDao = conn.getExtensionsDao();
    BcfExtensions extensions = extensionsDao.select(projectId);
    if (extensions == null) return;

    User user = securityService.getCurrentUser();
    Set<String> roleIds = user.getRoleIds();

    Set<String> actionRoleIds;
    switch (action)
    {
      case READ:
        actionRoleIds = extensions.getReadRoleIds();
        break;
      case COMMENT:
        actionRoleIds = extensions.getCommentRoleIds();
        break;
      case CREATE:
        actionRoleIds = extensions.getCreateRoleIds();
        break;
      case UPDATE:
        actionRoleIds = extensions.getUpdateRoleIds();
        break;
      case DELETE:
        actionRoleIds = extensions.getDeleteRoleIds();
        break;
      default:
        actionRoleIds = null;
    }

    if (actionRoleIds == null || actionRoleIds.isEmpty()) return;

    if (!roleIds.contains(ADMIN_ROLE) &&
        Collections.disjoint(roleIds, actionRoleIds))
      throw new AccessDeniedException();
  }

  private void validate(BcfDocumentReference documentReference)
  {
    int refs = 0;
    if (!StringUtils.isBlank(documentReference.getDocumentGuid())) refs++;
    if (!StringUtils.isBlank(documentReference.getUrl())) refs++;

    if (refs == 2)
      throw new InvalidRequestException(CAN_NOT_SET_BOTH_GUID_AND_URL);

    if (refs == 0)
      throw new InvalidRequestException(GUID_OR_URL_REQUIRED);
  }
}
