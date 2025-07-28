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
import java.lang.reflect.Field;
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
import org.bimrocket.service.mail.MailService;
import java.util.logging.Logger;
import org.apache.commons.text.StringSubstitutor;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Level;
import org.bimrocket.api.security.User;
import org.bimrocket.exception.AccessDeniedException;
import org.bimrocket.service.bcf.store.BcfDaoConnection;
import org.bimrocket.service.bcf.store.BcfDaoStore;
import org.bimrocket.service.bcf.store.empty.BcfEmptyDaoStore;
import org.bimrocket.service.security.SecurityService;
import org.eclipse.microprofile.config.Config;
import static java.util.Arrays.asList;
import java.util.Iterator;
import org.bimrocket.dao.expression.Expression;
import static org.bimrocket.dao.expression.Expression.fn;
import static org.bimrocket.dao.expression.Expression.property;
import static org.bimrocket.dao.expression.Function.AND;
import static org.bimrocket.dao.expression.Function.EQ;
import org.bimrocket.dao.expression.OrderByExpression;
import static org.bimrocket.util.TextUtils.getISODate;
import static org.bimrocket.service.security.SecurityConstants.ADMIN_ROLE;
import org.bimrocket.util.EntityDefinition;


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

  public static final Map<String, Field> topicFieldMap =
    EntityDefinition.getInstance(BcfTopic.class).getFieldMap();

  // Topic actions
  static final String READ = "read";
  static final String COMMENT = "comment";
  static final String CREATE = "create";
  static final String UPDATE = "update";
  static final String DELETE = "delete";

  // Exceptions
  static final String PROJECT_NOT_FOUND =
    "BCF000: Project not found.";
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

  @Inject
  Config config;

  @Inject
  MailService mailService;

  @Inject
  SecurityService securityService;

  BcfDaoStore daoStore;

  BcfExtensions defaultExtensions;
  long lastExtensionsRefresh = 0;
  long extensionsExpiration = 3 * 60 * 1000; // 3 minutes

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
      LOGGER.log(Level.SEVERE, "Error initializing BcfDaoStore [{0}]: {1}",
        new Object[] {
          config.getOptionalValue(BASE + "store.class", String.class).orElse(null),
          ex.toString()
        });
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
      Set<String> roleIds = securityService.getCurrentUser().getRoleIds();
      List<BcfProject> projects = conn.findProjects(roleIds);

      if (!securityService.getCurrentUser().getRoleIds().contains(ADMIN_ROLE))
      {
        // remove template project if user is not ADMIN
        removeTemplateProject(projects);
      }
      return projects;
    }
  }

  public BcfProject getProject(String projectId)
  {
    LOGGER.log(Level.FINE, "projectId: {0}", projectId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject, String> projectDao = conn.getProjectDao();
      return projectDao.findById(projectId);
    }
  }

  public BcfProject updateProject(String projectId, BcfProject projectUpdate)
  {
    LOGGER.log(Level.FINE, "projectId: {0}", projectId);

    // admin method
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject, String> projectDao = conn.getProjectDao();
      BcfProject project = projectDao.findById(projectId);
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

    // admin method
    BcfDaoConnection conn = daoStore.getConnection();
    try
    {
      Dao<BcfProject, String> projectDao = conn.getProjectDao();
      Dao<BcfExtensions, String> extensionsDao = conn.getExtensionsDao();
      Dao<BcfTopic, String> topicDao = conn.getTopicDao();
      Dao<BcfComment, String> commentDao = conn.getCommentDao();
      Dao<BcfViewpoint, String> viewpointDao = conn.getViewpointDao();
      Dao<BcfDocumentReference, String> docDao = conn.getDocumentReferenceDao();

      projectDao.deleteById(projectId);

      extensionsDao.deleteById(projectId);

      Expression filter = fn(EQ, property("projectId"), projectId);

      List<BcfTopic> topics = topicDao.find(filter, Collections.emptyList());
      for (BcfTopic topic : topics)
      {
        topicDao.deleteById(topic.getId());

        Expression topicFilter = fn(EQ, property("topicId"), topic.getId());

        commentDao.delete(topicFilter);
        viewpointDao.delete(topicFilter);
        docDao.delete(topicFilter);
      }
    }
    catch (RuntimeException ex)
    {
      conn.rollback();
      throw ex;
    }
    finally
    {
      conn.close();
    }
  }

  /* Extensions */

  public BcfExtensions getExtensions(String projectId)
  {
    LOGGER.log(Level.FINE, "projectId: {0}", projectId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfExtensions, String> extensionsDao = conn.getExtensionsDao();
      BcfExtensions extensions = extensionsDao.findById(projectId);
      if (extensions != null) return extensions;

      // default extensions are also returned when the project does not exist
      return getDefaultExtensions(conn);
    }
  }

  public BcfExtensions updateExtensions(
    String projectId, BcfExtensions extensionsUpdate)
  {
    LOGGER.log(Level.FINE, "projectId: {0}", projectId);

    // admin method
    BcfDaoConnection conn = daoStore.getConnection();
    try
    {
      Dao<BcfProject, String> projectDao = conn.getProjectDao();
      BcfProject project = projectDao.findById(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setName("Project " + projectId);
        project.setId(projectId);
        projectDao.insert(project);
      }
      else if (project.getName().equals(getTemplateProjectName()))
      {
        defaultExtensions = extensionsUpdate;
        lastExtensionsRefresh = System.currentTimeMillis();
      }

      Dao<BcfExtensions, String> extensionsDao = conn.getExtensionsDao();
      BcfExtensions extensions = extensionsDao.findById(projectId);
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
    catch (RuntimeException ex)
    {
      conn.rollback();
      throw ex;
    }
    finally
    {
      conn.close();
    }
  }

  /* Topics */

  public List<BcfTopic> getTopics(String projectId,
    Expression filter, List<OrderByExpression> orderBy)
  {
    LOGGER.log(Level.FINE, "projectId: {0}", projectId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      checkProjectAccess(conn, projectId, READ);

      Dao<BcfTopic, String> topicDao = conn.getTopicDao();
      Expression finalFilter = fn(EQ, property("projectId"), projectId);
      if (filter != null)
      {
        finalFilter = fn(AND, finalFilter, filter);
      }
      return topicDao.find(finalFilter, orderBy);
    }
  }

  public BcfTopic getTopic(String projectId, String topicId)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic, String> topicDao = conn.getTopicDao();
      return topicDao.findById(topicId);
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

      Dao<BcfProject, String> projectDao = conn.getProjectDao();
      BcfProject project = projectDao.findById(projectId);
      if (project == null)
      {
        throw new NotFoundException(PROJECT_NOT_FOUND);
      }
      else
      {
        project.incrementLastTopicIndex();
        project = projectDao.update(project);
      }

      Dao<BcfTopic, String> topicDao = conn.getTopicDao();
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
      Dao<BcfTopic, String> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.findById(topicId);
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

    BcfDaoConnection conn = daoStore.getConnection();
    try
    {
      Dao<BcfTopic, String> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.findById(topicId);
      if (topic == null) return; // topic do not exists

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(TOPIC_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, DELETE);

      topicDao.deleteById(topicId);

      Expression filter = fn(EQ, property("topicId"), topicId);

      Dao<BcfComment, String> commentDao = conn.getCommentDao();
      commentDao.delete(filter);

      Dao<BcfViewpoint, String> viewpointDao = conn.getViewpointDao();
      viewpointDao.delete(filter);

      Dao<BcfDocumentReference, String> docDao = conn.getDocumentReferenceDao();
      docDao.delete(filter);
    }
    catch (RuntimeException ex)
    {
      conn.rollback();
      throw ex;
    }
    finally
    {
      conn.close();
    }
  }

  /* Comments */

  public List<BcfComment> getComments(String projectId, String topicId)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfComment, String> commentDao = conn.getCommentDao();
      Expression filter = fn(EQ, property("topicId"), topicId);
      OrderByExpression orderBy = new OrderByExpression(property("date"));
      return commentDao.find(filter, asList(orderBy));
    }
  }

  public BcfComment getComment(String projectId, String topicId,
    String commentId)
  {
    LOGGER.log(Level.FINE, "commentId: {0}", commentId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfComment, String> commentDao = conn.getCommentDao();
      return commentDao.findById(commentId);
    }
  }

  public BcfComment createComment(String projectId, String topicId,
    BcfComment comment)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic, String> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.findById(topicId);
      if (topic == null) throw new NotFoundException(TOPIC_NOT_FOUND);

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(TOPIC_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, COMMENT);

      Dao<BcfComment, String> commentDao = conn.getCommentDao();
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
      Dao<BcfComment, String> commentDao = conn.getCommentDao();
      BcfComment comment = commentDao.findById(commentId);
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
      Dao<BcfComment, String> commentDao = conn.getCommentDao();
      BcfComment comment = commentDao.findById(commentId);
      if (comment == null) return; // comment already deleted

      String userId = comment.getAuthor();
      User user = securityService.getCurrentUser();
      if (!user.getId().equals(userId) &&
          !user.getRoleIds().contains(ADMIN_ROLE))
        throw new AccessDeniedException();

      commentDao.deleteById(commentId);
    }
  }

  /* Viewpoints */

  public List<BcfViewpoint> getViewpoints(String projectId, String topicId)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfViewpoint, String> viewpointDao = conn.getViewpointDao();
      Expression filter = fn(EQ, property("topicId"), topicId);
      OrderByExpression orderBy = new OrderByExpression(property("index"));
      return viewpointDao.find(filter, asList(orderBy));
    }
  }

  public BcfViewpoint getViewpoint(
    String projectId, String topicId, String viewpointId)
  {
    LOGGER.log(Level.FINE, "viewpointId: {0}", viewpointId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfViewpoint, String> viewpointDao = conn.getViewpointDao();
      return viewpointDao.findById(viewpointId);
    }
  }

  public BcfViewpoint createViewpoint(
    String projectId, String topicId, BcfViewpoint viewpoint)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    BcfDaoConnection conn = daoStore.getConnection();
    try
    {
      Dao<BcfTopic, String> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.findById(topicId);
      if (topic == null) throw new NotFoundException(TOPIC_NOT_FOUND);

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(TOPIC_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, UPDATE);

      topic.incrementLastViewpointIndex();
      topicDao.update(topic);

      Dao<BcfViewpoint, String> viewpointDao = conn.getViewpointDao();
      viewpoint.setId(UUID.randomUUID().toString());
      viewpoint.setTopicId(topicId);
      viewpoint.setIndex(topic.getLastViewpointIndex());

      return viewpointDao.insert(viewpoint);
    }
    catch (RuntimeException ex)
    {
      conn.rollback();
      throw ex;
    }
    finally
    {
      conn.close();
    }
  }

  public void deleteViewpoint(String projectId, String topicId,
    String viewpointId)
  {
    LOGGER.log(Level.FINE, "viewpointId: {0}", viewpointId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfViewpoint, String> viewpointDao = conn.getViewpointDao();

      BcfViewpoint viewpoint = viewpointDao.findById(viewpointId);
      if (viewpoint == null) return; // viewpoint already deleted

      if (!viewpoint.getTopicId().equals(topicId))
        throw new NotFoundException(VIEWPOINT_NOT_FOUND_IN_TOPIC);

      Dao<BcfTopic, String> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.findById(topicId);

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(VIEWPOINT_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, DELETE);

      viewpointDao.deleteById(viewpointId);
    }
  }

  public BcfSnapshot getViewpointSnapshot(
    String projectId, String topicId, String viewpointId)
  {
    LOGGER.log(Level.FINE, "viewpointId: {0}", viewpointId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfViewpoint, String> viewpointDao = conn.getViewpointDao();
      BcfViewpoint viewpoint = viewpointDao.findById(viewpointId);
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
      Dao<BcfDocumentReference, String> docRefDao = conn.getDocumentReferenceDao();
      Expression filter = fn(EQ, property("topicId"), topicId);

      return docRefDao.find(filter, Collections.emptyList());
    }
  }

  public BcfDocumentReference createDocumentReference(
    String projectId, String topicId, BcfDocumentReference documentReference)
  {
    LOGGER.log(Level.FINE, "topicId: {0}", topicId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic, String> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.findById(topicId);
      if (topic == null) throw new NotFoundException(TOPIC_NOT_FOUND);

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(TOPIC_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, UPDATE);

      validate(documentReference);

      Dao<BcfDocumentReference, String> docRefDao = conn.getDocumentReferenceDao();
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
      Dao<BcfDocumentReference, String> docRefDao = conn.getDocumentReferenceDao();

      BcfDocumentReference docRef = docRefDao.findById(documentReferenceId);
      if (docRef == null)
        throw new NotFoundException(DOCUMENT_NOT_FOUND);

      if (!docRef.getTopicId().equals(topicId))
        throw new NotFoundException(DOCUMENT_NOT_FOUND_IN_TOPIC);

      Dao<BcfTopic, String> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.findById(topicId);

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
      Dao<BcfDocumentReference, String> docRefDao = conn.getDocumentReferenceDao();

      BcfDocumentReference docRef = docRefDao.findById(documentReferenceId);
      if (docRef == null) return; // docRef already deleted

      if (!docRef.getTopicId().equals(topicId))
        throw new NotFoundException(DOCUMENT_NOT_FOUND_IN_TOPIC);

      Dao<BcfTopic, String> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.findById(topicId);

      if (!topic.getProjectId().equals(projectId))
        throw new NotFoundException(DOCUMENT_NOT_FOUND_IN_PROJECT);

      checkProjectAccess(conn, projectId, DELETE);

      docRefDao.deleteById(documentReferenceId);
    }
  }

  /* private methods */

  private String getTemplateProjectName()
  {
    Optional<String> templateProjectName =
      config.getOptionalValue(BASE + "templateProjectName", String.class);
    return templateProjectName.orElse(null);
  }

  private void removeTemplateProject(List<BcfProject> projects)
  {
    String templateProjectName = getTemplateProjectName();
    Iterator<BcfProject> iter = projects.iterator();
    while (iter.hasNext())
    {
      if (iter.next().getName().equals(templateProjectName))
      {
        iter.remove();
        break;
      }
    }
  }

  private BcfExtensions getDefaultExtensions(BcfDaoConnection conn)
  {
    long now = System.currentTimeMillis();
    long ellapsed = now - lastExtensionsRefresh;
    if (defaultExtensions == null || ellapsed > extensionsExpiration)
    {
      lastExtensionsRefresh = now;
      Dao<BcfProject, String> projectDao = conn.getProjectDao();
      Dao<BcfExtensions, String> extensionsDao = conn.getExtensionsDao();

      BcfExtensions extensions = null;
      String templateProjectName = getTemplateProjectName();
      if (templateProjectName != null)
      {
        Expression filter = fn(EQ, property("name"), templateProjectName);
        List<BcfProject> projects =
          projectDao.find(filter, Collections.emptyList());
        if (!projects.isEmpty())
        {
          String templateProjectId = projects.get(0).getId();
          extensions = extensionsDao.findById(templateProjectId);
        }
      }

      if (extensions == null)
      {
        extensions = new BcfExtensions();
        extensions.setDefaultValues();
      }
      defaultExtensions = extensions;
    }
    return defaultExtensions;
  }

  private void checkProjectAccess(BcfDaoConnection conn,
    String projectId, String action)
  {
    Dao<BcfExtensions, String> extensionsDao = conn.getExtensionsDao();
    BcfExtensions extensions = extensionsDao.findById(projectId);
    if (extensions == null) extensions = getDefaultExtensions(conn);

    User user = securityService.getCurrentUser();
    Set<String> roleIds = user.getRoleIds();

    Set<String> actionRoleIds;
    actionRoleIds = switch (action)
    {
      case READ -> extensions.getReadRoleIds();
      case COMMENT -> extensions.getCommentRoleIds();
      case CREATE -> extensions.getCreateRoleIds();
      case UPDATE -> extensions.getUpdateRoleIds();
      case DELETE -> extensions.getDeleteRoleIds();
      default -> null;
    };

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
